from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity
from models import User, ArtisanProfile, BuyerProfile, UserRole
import bcrypt

bp = Blueprint('auth', __name__, url_prefix='/api/auth')

def create_user_token(user):
    """Helper function to create JWT token for a user"""
    if not user or not user.id:
        raise ValueError("Invalid user object")
    
    user_id_str = str(user.id)
    
    return create_access_token(
        identity=user_id_str,
        additional_claims={'role': user.role.value}
    )

@bp.route('/register', methods=['POST'])
def register():
    data = request.json
    
    # Allow phone-only registration
    if not all(k in data for k in ['password', 'role', 'full_name']):
        return jsonify({'error': 'Missing required fields'}), 400
    
    if not data.get('email') and not data.get('phone'):
        return jsonify({'error': 'Either email or phone is required'}), 400
    
    if data['role'] not in ['artisan', 'buyer']:
        return jsonify({'error': 'Invalid role'}), 400
    
    # Use phone as email if not provided
    email = data.get('email') or f"{data['phone']}@bharatcraft.local"
    
    existing_user = g.db.query(User).filter_by(email=email).first()
    if existing_user:
        return jsonify({'error': 'Already registered'}), 400
    
    password_hash = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    user = User(
        email=email,
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
            craft_type=data.get('craft_type') or 'General',  # Default to 'General'
            skills=data.get('skills', ''),
            experience_years=data.get('experience_years', 0),
            latitude=data.get('latitude'),
            longitude=data.get('longitude'),
            address=data.get('address', '')
        )
        g.db.add(profile)
    else:
        from utils.currency import get_currency_for_country
        country = data.get('country', '')
        currency = get_currency_for_country(country)
        
        profile = BuyerProfile(
            user_id=user.id,
            company_name=data.get('company_name', ''),
            company_address=data.get('company_address', ''),
            country=country,
            currency=currency
        )
        g.db.add(profile)
    
    g.db.commit()
    
    try:
        access_token = create_user_token(user)
    except ValueError as e:
        return jsonify({'error': str(e)}), 500
    
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
    
    if not data.get('email') and not data.get('phone'):
        return jsonify({'error': 'Email or phone required'}), 400
    
    if not data.get('password'):
        return jsonify({'error': 'Password required'}), 400
    
    if data.get('email'):
        user = g.db.query(User).filter_by(email=data['email']).first()
    else:
        email = f"{data['phone']}@bharatcraft.local"
        user = g.db.query(User).filter_by(email=email).first()
    
    if not user or not bcrypt.checkpw(data['password'].encode('utf-8'), user.password_hash.encode('utf-8')):
        return jsonify({'error': 'Invalid credentials'}), 401
    
    if not user.is_active:
        return jsonify({'error': 'Account is inactive'}), 403
    
    try:
        access_token = create_user_token(user)
    except ValueError as e:
        return jsonify({'error': str(e)}), 500
    
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
    from flask_jwt_extended import get_jwt
    
    user_id = int(get_jwt_identity())
    user = g.db.query(User).filter_by(id=user_id).first()
    
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
            'total_orders': profile.total_orders
        }
    elif user.role == UserRole.BUYER and user.buyer_profile:
        profile = user.buyer_profile
        profile_data['buyer'] = {
            'company_name': profile.company_name,
            'country': profile.country,
            'currency': profile.currency
        }
    
    return jsonify(profile_data), 200

@bp.route('/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    user_id = int(get_jwt_identity())
    data = request.json
    
    user = g.db.query(User).filter_by(id=user_id).first()
    if not user:
        return jsonify({'error': 'User not found'}), 404
    
    if 'full_name' in data:
        user.full_name = data['full_name']
    if 'phone' in data:
        user.phone = data['phone']
    if 'language_preference' in data:
        user.language_preference = data['language_preference']
    
    g.db.commit()
    
    return jsonify({'message': 'Profile updated successfully'}), 200
