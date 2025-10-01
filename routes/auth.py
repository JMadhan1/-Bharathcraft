from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models import User, ArtisanProfile, BuyerProfile, UserRole
import bcrypt

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

@bp.route('/register', methods=['POST'])
def register():
    data = request.json
    
    if not all(k in data for k in ['email', 'password', 'role', 'full_name']):
        return jsonify({'error': 'Missing required fields'}), 400
    
    if data['role'] not in ['artisan', 'buyer']:
        return jsonify({'error': 'Invalid role'}), 400
    
    existing_user = g.db.query(User).filter_by(email=data['email']).first()
    if existing_user:
        return jsonify({'error': 'Email already registered'}), 400
    
    password_hash = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    user = User(
        email=data['email'],
        password_hash=password_hash,
        role=UserRole.ARTISAN if data['role'] == 'artisan' else UserRole.BUYER,
        full_name=data['full_name'],
        phone=data.get('phone'),
        language_preference=data.get('language', 'en')
    )
    
    g.db.add(user)
    g.db.flush()
    
    if data['role'] == 'artisan':
        profile = ArtisanProfile(
            user_id=user.id,
            craft_type=data.get('craft_type', ''),
            skills=data.get('skills', ''),
            experience_years=data.get('experience_years', 0),
            latitude=data.get('latitude'),
            longitude=data.get('longitude'),
            address=data.get('address', '')
        )
        g.db.add(profile)
    else:
        profile = BuyerProfile(
            user_id=user.id,
            company_name=data.get('company_name', ''),
            company_address=data.get('company_address', '')
        )
        g.db.add(profile)
    
    g.db.commit()
    
    access_token = create_access_token(identity={'id': user.id, 'role': user.role.value})
    
    return jsonify({
        'message': 'Registration successful',
        'access_token': access_token,
        'user': {
            'id': user.id,
            'email': user.email,
            'role': user.role.value,
            'full_name': user.full_name
        }
    }), 201

@bp.route('/login', methods=['POST'])
def login():
    data = request.json
    
    if not all(k in data for k in ['email', 'password']):
        return jsonify({'error': 'Missing email or password'}), 400
    
    user = g.db.query(User).filter_by(email=data['email']).first()
    
    if not user or not bcrypt.checkpw(data['password'].encode('utf-8'), user.password_hash.encode('utf-8')):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    access_token = create_access_token(identity={'id': user.id, 'role': user.role.value})
    
    return jsonify({
        'access_token': access_token,
        'user': {
            'id': user.id,
            'email': user.email,
            'role': user.role.value,
            'full_name': user.full_name,
            'language_preference': user.language_preference
        }
    }), 200

@bp.route('/profile', methods=['GET'])
@jwt_required()
def get_profile():
    identity = get_jwt_identity()
    user = g.db.query(User).filter_by(id=identity['id']).first()
    
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    profile_data = {
        'id': user.id,
        'email': user.email,
        'role': user.role.value,
        'full_name': user.full_name,
        'phone': user.phone,
        'language_preference': user.language_preference
    }
    
    if user.role == UserRole.ARTISAN and user.artisan_profile:
        profile = user.artisan_profile
        profile_data['artisan'] = {
            'craft_type': profile.craft_type,
            'skills': profile.skills,
            'experience_years': profile.experience_years,
            'quality_rating': profile.quality_rating,
            'total_sales': profile.total_sales,
            'total_orders': profile.total_orders,
            'latitude': profile.latitude,
            'longitude': profile.longitude,
            'address': profile.address
        }
    elif user.role == UserRole.BUYER and user.buyer_profile:
        profile = user.buyer_profile
        profile_data['buyer'] = {
            'company_name': profile.company_name,
            'company_address': profile.company_address,
            'total_purchases': profile.total_purchases,
            'total_orders': profile.total_orders
        }
    
    return jsonify(profile_data), 200

@bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    identity = get_jwt_identity()
    data = request.json
    
    user = g.db.query(User).filter_by(id=identity['id']).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    if 'full_name' in data:
        user.full_name = data['full_name']
    if 'phone' in data:
        user.phone = data['phone']
    if 'language_preference' in data:
        user.language_preference = data['language_preference']
    
    if user.role == UserRole.ARTISAN and user.artisan_profile:
        profile = user.artisan_profile
        if 'craft_type' in data:
            profile.craft_type = data['craft_type']
        if 'skills' in data:
            profile.skills = data['skills']
        if 'latitude' in data:
            profile.latitude = data['latitude']
        if 'longitude' in data:
            profile.longitude = data['longitude']
        if 'address' in data:
            profile.address = data['address']
    
    g.db.commit()
    
    return jsonify({'message': 'Profile updated successfully'}), 200
