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
    try:
        from flask_jwt_extended import get_jwt
        import threading
        from flask import current_app
        
        user_id = int(get_jwt_identity())
        claims = get_jwt()
        role = claims.get('role')
        
        if role != 'artisan':
            return jsonify({'error': 'Only artisans can create products'}), 403
        
        artisan = g.db.query(ArtisanProfile).filter_by(user_id=user_id).first()
        if not artisan:
            return jsonify({'error': 'Artisan profile not found'}), 404
        
        data = request.form
        files = request.files.getlist('images')
        
        if not all(k in data for k in ['title', 'description', 'price']):
            return jsonify({'error': 'Missing required fields: title, description, or price'}), 400
        
        # Ensure upload directory exists
        upload_dir = 'static/uploads'
        if not os.path.exists(upload_dir):
            os.makedirs(upload_dir, exist_ok=True)
        
        image_paths = []
        ai_check_image_path = None
        
        for i, file in enumerate(files):
            if file and allowed_file(file.filename):
                filename = secure_filename(file.filename)
                filepath = os.path.join(upload_dir, f"{user_id}_{filename}")
                file.save(filepath)
                
                # Resize image for display
                try:
                    img = Image.open(filepath)
                    # Convert to RGB if necessary
                    if img.mode in ('RGBA', 'P'):
                        img = img.convert('RGB')
                        
                    img.thumbnail((1200, 1200))
                    img.save(filepath, optimize=True, quality=85)
                    
                    # Create a smaller version for AI check from the first image
                    if i == 0:
                        ai_check_image_path = os.path.join(upload_dir, f"temp_ai_{user_id}_{filename}")
                        img_small = img.copy()
                        img_small.thumbnail((512, 512))
                        img_small.save(ai_check_image_path, optimize=True, quality=60)
                except Exception as img_error:
                    print(f"Image processing error: {img_error}")
                
                image_paths.append(filepath)
        
        if not image_paths:
            return jsonify({'error': 'At least one valid image is required'}), 400
        
        # Create product immediately with default values
        # We will update quality asynchronously
        product = Product(
            artisan_id=artisan.id,
            title=data['title'],
            description=data['description'],
            craft_type=data.get('craft_type', artisan.craft_type),
            price=float(data['price']),
            quality_grade=QualityGrade.STANDARD, # Default
            ai_quality_score=0.75, # Default
            images=json.dumps(image_paths),
            stock_quantity=int(data.get('stock_quantity', 1)),
            production_time_days=int(data.get('production_time_days', 7))
        )
        
        g.db.add(product)
        g.db.commit()
        
        # Capture session factory for the thread
        session_factory = current_app.session_factory
        
        # Define background task for AI assessment
        def update_product_quality(product_id, image_path, Session):
            try:
                # Create new session for background thread
                db_session = Session()
                
                # Run AI assessment
                ai_score = assess_quality(image_path)
                
                # Determine grade
                quality_grade = QualityGrade.STANDARD
                if ai_score >= 0.8:
                    quality_grade = QualityGrade.PREMIUM
                elif ai_score < 0.5:
                    quality_grade = QualityGrade.BASIC
                
                # Update product
                prod = db_session.query(Product).get(product_id)
                if prod:
                    prod.ai_quality_score = ai_score
                    prod.quality_grade = quality_grade
                    db_session.commit()
                    print(f"Background AI update for product {product_id}: Score {ai_score}")
                
                db_session.close()
                
                # Clean up temp file
                if os.path.exists(image_path):
                    try:
                        os.remove(image_path)
                    except:
                        pass
                        
            except Exception as e:
                print(f"Background AI task error: {e}")
        
        # Start background thread if we have an image to check
        if ai_check_image_path:
            thread = threading.Thread(target=update_product_quality, args=(product.id, ai_check_image_path, session_factory))
            thread.daemon = True
            thread.start()
        
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
    
    except ValueError as ve:
        g.db.rollback()
        return jsonify({'error': f'Invalid data format: {str(ve)}'}), 400
    except Exception as e:
        g.db.rollback()
        print(f"Error creating product: {str(e)}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': f'Error creating product: {str(e)}'}), 500

@bp.route('/', methods=['GET'])
def get_products():
    from flask_jwt_extended import verify_jwt_in_request, get_jwt_identity
    from models import BuyerProfile, User
    from utils.currency import convert_price
    
    # Check for logged in user (optional)
    target_currency = 'INR'
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity()
        if user_id:
            user = g.db.query(User).get(int(user_id))
            if user and user.role.value == 'buyer' and user.buyer_profile:
                target_currency = user.buyer_profile.currency or 'USD'
    except Exception:
        pass

    filters = {}
    
    if request.args.get('craft_type'):
        filters['craft_type'] = request.args.get('craft_type')
    if request.args.get('quality_grade'):
        filters['quality_grade'] = QualityGrade[request.args.get('quality_grade').upper()]
    
    from sqlalchemy.orm import joinedload
    
    query = g.db.query(Product).options(
        joinedload(Product.artisan).joinedload(ArtisanProfile.user)
    ).filter_by(is_available=True, **filters)
    
    if request.args.get('min_price'):
        query = query.filter(Product.price >= float(request.args.get('min_price')))
    if request.args.get('max_price'):
        query = query.filter(Product.price <= float(request.args.get('max_price')))
    
    products = query.all()
    
    results = []
    for p in products:
        converted_price = convert_price(p.price, target_currency)
        results.append({
            'id': p.id,
            'title': p.title,
            'description': p.description,
            'craft_type': p.craft_type,
            'price': p.price, # Original INR price
            'display_price': converted_price,
            'currency': target_currency,
            'original_currency': p.currency,
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
        })
    
    return jsonify(results), 200

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
    from flask_jwt_extended import get_jwt
    
    user_id = int(get_jwt_identity())
    claims = get_jwt()
    role = claims.get('role')
    
    if role != 'artisan':
        return jsonify({'error': 'Only artisans can update products'}), 403
    
    product = g.db.query(Product).filter_by(id=product_id).first()
    
    if not product:
        return jsonify({'error': 'Product not found'}), 404
    
    if product.artisan.user_id != user_id:
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
    from flask_jwt_extended import get_jwt
    
    user_id = int(get_jwt_identity())
    claims = get_jwt()
    role = claims.get('role')
    
    if role != 'artisan':
        return jsonify({'error': 'Only artisans can view their products'}), 403
    
    artisan = g.db.query(ArtisanProfile).filter_by(user_id=user_id).first()
    if not artisan:
        return jsonify({'error': 'Artisan profile not found'}), 404
    
    products = g.db.query(Product).filter_by(artisan_id=artisan.id).all()
    
    return jsonify([{
        'id': p.id,
        'title': p.title,
        'description': p.description,
        'price': p.price,
        'quality_grade': p.quality_grade.value if p.quality_grade else None,
        'ai_quality_score': p.ai_quality_score,
        'stock_quantity': p.stock_quantity,
        'is_available': p.is_available,
        'images': json.loads(p.images) if p.images else [],
        'craft_type': p.craft_type,
        'production_time_days': p.production_time_days,
        'created_at': p.created_at.isoformat()
    } for p in products]), 200

@bp.route('/<int:product_id>', methods=['DELETE'])
@jwt_required()
def delete_product(product_id):
    from flask_jwt_extended import get_jwt
    
    user_id = int(get_jwt_identity())
    claims = get_jwt()
    role = claims.get('role')
    
    if role != 'artisan':
        return jsonify({'error': 'Only artisans can delete products'}), 403
    
    product = g.db.query(Product).filter_by(id=product_id).first()
    
    if not product:
        return jsonify({'error': 'Product not found'}), 404
    
    if product.artisan.user_id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    # Delete associated images
    try:
        if product.images:
            image_paths = json.loads(product.images)
            for path in image_paths:
                if os.path.exists(path):
                    os.remove(path)
    except Exception as e:
        print(f"Error deleting product images: {e}")

    g.db.delete(product)
    g.db.commit()
    
    return jsonify({'message': 'Product deleted successfully'}), 200
