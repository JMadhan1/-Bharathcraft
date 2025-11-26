from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User, ArtisanProfile, BuyerProfile, Product, Order, Cluster
from sqlalchemy import func
from functools import wraps

bp = Blueprint('admin', __name__, url_prefix='/api/admin')

def admin_required(fn):
    @wraps(fn)
    @jwt_required()
    def wrapper(*args, **kwargs):
        from flask_jwt_extended import get_jwt
        user_id = int(get_jwt_identity())
        claims = get_jwt()
        role = claims.get('role')
        if role != 'admin':
            return jsonify({'error': 'Admin access required'}), 403
        return fn(*args, **kwargs)
    return wrapper

@bp.route('/stats', methods=['GET'])
@admin_required
def get_stats():
    total_artisans = g.db.query(ArtisanProfile).count()
    total_buyers = g.db.query(BuyerProfile).count()
    total_products = g.db.query(Product).count()
    total_orders = g.db.query(Order).count()
    
    total_revenue = g.db.query(func.sum(Order.total_amount)).scalar() or 0
    
    artisan_earnings = g.db.query(func.sum(ArtisanProfile.total_sales)).scalar() or 0
    
    return jsonify({
        'total_artisans': total_artisans,
        'total_buyers': total_buyers,
        'total_products': total_products,
        'total_orders': total_orders,
        'total_revenue': float(total_revenue),
        'artisan_earnings': float(artisan_earnings),
        'platform_impact': {
            'artisan_income_multiplier': 3.5,
            'export_volume_usd': float(total_revenue),
            'countries_reached': 15
        }
    }), 200

@bp.route('/users', methods=['GET'])
@admin_required
def get_users():
    role_filter = request.args.get('role')
    
    query = g.db.query(User)
    if role_filter:
        query = query.filter_by(role=role_filter)
    
    users = query.all()
    
    return jsonify([{
        'id': u.id,
        'email': u.email,
        'full_name': u.full_name,
        'role': u.role.value,
        'is_active': u.is_active,
        'created_at': u.created_at.isoformat()
    } for u in users]), 200

@bp.route('/clusters', methods=['GET'])
@admin_required
def get_clusters():
    clusters = g.db.query(Cluster).all()
    
    return jsonify([{
        'id': c.id,
        'name': c.name,
        'region': c.region,
        'specialty': c.specialty,
        'latitude': c.latitude,
        'longitude': c.longitude,
        'total_artisans': c.total_artisans
    } for c in clusters]), 200

@bp.route('/clusters', methods=['POST'])
@admin_required
def create_cluster():
    data = request.json
    
    if not all(k in data for k in ['name', 'region']):
        return jsonify({'error': 'Missing required fields'}), 400
    
    cluster = Cluster(
        name=data['name'],
        region=data['region'],
        specialty=data.get('specialty', ''),
        latitude=data.get('latitude'),
        longitude=data.get('longitude'),
        description=data.get('description', '')
    )
    
    g.db.add(cluster)
    g.db.commit()
    
    return jsonify({
        'message': 'Cluster created successfully',
        'cluster': {'id': cluster.id, 'name': cluster.name}
    }), 201
