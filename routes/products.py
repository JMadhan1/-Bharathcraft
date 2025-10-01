from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Product, ArtisanProfile, QualityGrade
from werkzeug.utils import secure_filename
from PIL import Image
import os
import json
from utils.ai_service import assess_quality, translate_text

bp = Blueprint('products', __name__, url_prefix='/api/products')

ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg', 'gif', 'webp'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

@bp.route('/', methods=['POST'])
@jwt_required()
def create_product():
    identity = get_jwt_identity()
    
    if identity['role'] != 'artisan':
        return jsonify({'error': 'Only artisans can create products'}), 403
    
    artisan = g.db.query(ArtisanProfile).filter_by(user_id=identity['id']).first()
    if not artisan:
        return jsonify({'error': 'Artisan profile not found'}), 404
    
    data = request.form
    files = request.files.getlist('images')
    
    if not all(k in data for k in ['title', 'description', 'price']):
        return jsonify({'error': 'Missing required fields'}), 400
    
    image_paths = []
    for file in files:
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            filepath = os.path.join('static/uploads', f"{identity['id']}_{filename}")
            file.save(filepath)
            
            img = Image.open(filepath)
            img.thumbnail((1200, 1200))
            img.save(filepath, optimize=True, quality=85)
            
            image_paths.append(filepath)
    
    ai_score = None
    if image_paths:
        ai_score = assess_quality(image_paths[0])
    
    quality_grade = QualityGrade.STANDARD
    if ai_score and ai_score >= 0.8:
        quality_grade = QualityGrade.PREMIUM
    elif ai_score and ai_score < 0.5:
        quality_grade = QualityGrade.BASIC
    
    product = Product(
        artisan_id=artisan.id,
        title=data['title'],
        description=data['description'],
        craft_type=data.get('craft_type', artisan.craft_type),
        price=float(data['price']),
        quality_grade=quality_grade,
        ai_quality_score=ai_score,
        images=json.dumps(image_paths),
        stock_quantity=int(data.get('stock_quantity', 1)),
        production_time_days=int(data.get('production_time_days', 7))
    )
    
    g.db.add(product)
    g.db.commit()
    
    return jsonify({
        'message': 'Product created successfully',
        'product': {
            'id': product.id,
            'title': product.title,
            'price': product.price,
            'quality_grade': product.quality_grade.value,
            'ai_quality_score': product.ai_quality_score
        }
    }), 201

@bp.route('/', methods=['GET'])
def get_products():
    filters = {}
    
    if request.args.get('craft_type'):
        filters['craft_type'] = request.args.get('craft_type')
    if request.args.get('quality_grade'):
        filters['quality_grade'] = QualityGrade[request.args.get('quality_grade').upper()]
    
    query = g.db.query(Product).filter_by(is_available=True, **filters)
    
    if request.args.get('min_price'):
        query = query.filter(Product.price >= float(request.args.get('min_price')))
    if request.args.get('max_price'):
        query = query.filter(Product.price <= float(request.args.get('max_price')))
    
    products = query.all()
    
    return jsonify([{
        'id': p.id,
        'title': p.title,
        'description': p.description,
        'craft_type': p.craft_type,
        'price': p.price,
        'currency': p.currency,
        'quality_grade': p.quality_grade.value if p.quality_grade else None,
        'ai_quality_score': p.ai_quality_score,
        'images': json.loads(p.images) if p.images else [],
        'stock_quantity': p.stock_quantity,
        'production_time_days': p.production_time_days,
        'artisan': {
            'id': p.artisan.id,
            'name': p.artisan.user.full_name,
            'craft_type': p.artisan.craft_type,
            'quality_rating': p.artisan.quality_rating
        }
    } for p in products]), 200

@bp.route('/<int:product_id>', methods=['GET'])
def get_product(product_id):
    product = g.db.query(Product).filter_by(id=product_id).first()
    
    if not product:
        return jsonify({'error': 'Product not found'}), 404
    
    lang = request.args.get('lang', 'en')
    description = product.description
    
    if lang != 'en':
        description = translate_text(product.description, lang)
    
    return jsonify({
        'id': product.id,
        'title': product.title,
        'description': description,
        'craft_type': product.craft_type,
        'price': product.price,
        'currency': product.currency,
        'quality_grade': product.quality_grade.value if product.quality_grade else None,
        'ai_quality_score': product.ai_quality_score,
        'images': json.loads(product.images) if product.images else [],
        'stock_quantity': product.stock_quantity,
        'production_time_days': product.production_time_days,
        'artisan': {
            'id': product.artisan.id,
            'name': product.artisan.user.full_name,
            'craft_type': product.artisan.craft_type,
            'quality_rating': product.artisan.quality_rating,
            'location': {
                'latitude': product.artisan.latitude,
                'longitude': product.artisan.longitude
            }
        }
    }), 200

@bp.route('/<int:product_id>', methods=['PUT'])
@jwt_required()
def update_product(product_id):
    identity = get_jwt_identity()
    
    if identity['role'] != 'artisan':
        return jsonify({'error': 'Only artisans can update products'}), 403
    
    product = g.db.query(Product).filter_by(id=product_id).first()
    
    if not product:
        return jsonify({'error': 'Product not found'}), 404
    
    if product.artisan.user_id != identity['id']:
        return jsonify({'error': 'Unauthorized'}), 403
    
    data = request.json
    
    if 'title' in data:
        product.title = data['title']
    if 'description' in data:
        product.description = data['description']
    if 'price' in data:
        product.price = float(data['price'])
    if 'stock_quantity' in data:
        product.stock_quantity = int(data['stock_quantity'])
    if 'is_available' in data:
        product.is_available = bool(data['is_available'])
    
    g.db.commit()
    
    return jsonify({'message': 'Product updated successfully'}), 200

@bp.route('/my-products', methods=['GET'])
@jwt_required()
def get_my_products():
    identity = get_jwt_identity()
    
    if identity['role'] != 'artisan':
        return jsonify({'error': 'Only artisans can view their products'}), 403
    
    artisan = g.db.query(ArtisanProfile).filter_by(user_id=identity['id']).first()
    if not artisan:
        return jsonify({'error': 'Artisan profile not found'}), 404
    
    products = g.db.query(Product).filter_by(artisan_id=artisan.id).all()
    
    return jsonify([{
        'id': p.id,
        'title': p.title,
        'price': p.price,
        'quality_grade': p.quality_grade.value if p.quality_grade else None,
        'stock_quantity': p.stock_quantity,
        'is_available': p.is_available,
        'created_at': p.created_at.isoformat()
    } for p in products]), 200
