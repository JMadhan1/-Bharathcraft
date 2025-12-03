from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from models import Message, User, Product
from sqlalchemy import or_, and_, func
from datetime import datetime

bp = Blueprint('messages', __name__, url_prefix='/api/messages')

@bp.route('/unread-count', methods=['GET'])
@jwt_required()
def get_unread_count():
    """Get count of unread messages for current user"""
    user_id = int(get_jwt_identity())
    
    count = g.db.query(Message).filter(
        Message.receiver_id == user_id,
        Message.is_read == False
    ).count()
    
    return jsonify({'count': count}), 200

@bp.route('/conversations', methods=['GET'])
@jwt_required()
def get_conversations():
    """Get list of conversations with unread counts"""
    user_id = int(get_jwt_identity())
    
    # Get all users who have messaged this user or been messaged by this user
    # Group by conversation partner
    conversations = []
    
    # Subquery to get the latest message for each conversation
    latest_messages = g.db.query(
        Message,
        func.max(Message.created_at).label('latest_time')
    ).filter(
        or_(
            Message.sender_id == user_id,
            Message.receiver_id == user_id
        )
    ).group_by(
        func.case(
            (Message.sender_id == user_id, Message.receiver_id),
            else_=Message.sender_id
        )
    ).all()
    
    # Get unique conversation partners
    partners = set()
    for msg, _ in latest_messages:
        partner_id = msg.receiver_id if msg.sender_id == user_id else msg.sender_id
        partners.add(partner_id)
    
    # Build conversation list
    for partner_id in partners:
        partner = g.db.query(User).get(partner_id)
        if not partner:
            continue
        
        # Get last message
        last_message = g.db.query(Message).filter(
            or_(
                and_(Message.sender_id == user_id, Message.receiver_id == partner_id),
                and_(Message.sender_id == partner_id, Message.receiver_id == user_id)
            )
        ).order_by(Message.created_at.desc()).first()
        
        # Count unread messages from this partner
        unread_count = g.db.query(Message).filter(
            Message.sender_id == partner_id,
            Message.receiver_id == user_id,
            Message.is_read == False
        ).count()
        
        # Get product title if message is related to a product
        product_title = None
        if last_message and last_message.product_id:
            product = g.db.query(Product).get(last_message.product_id)
            if product:
                product_title = product.title
        
        conversations.append({
            'user_id': partner_id,
            'user_name': partner.full_name,
            'last_message': last_message.content if last_message else None,
            'last_message_time': last_message.created_at.isoformat() if last_message else None,
            'unread_count': unread_count,
            'product_title': product_title
        })
    
    # Sort by last message time
    conversations.sort(key=lambda x: x['last_message_time'] or '', reverse=True)
    
    return jsonify(conversations), 200

@bp.route('/conversation/<int:partner_id>', methods=['GET'])
@jwt_required()
def get_conversation_messages(partner_id):
    """Get all messages in a conversation with a specific user"""
    user_id = int(get_jwt_identity())
    
    messages = g.db.query(Message).filter(
        or_(
            and_(Message.sender_id == user_id, Message.receiver_id == partner_id),
            and_(Message.sender_id == partner_id, Message.receiver_id == user_id)
        )
    ).order_by(Message.created_at.asc()).all()
    
    # Mark messages from partner as read
    g.db.query(Message).filter(
        Message.sender_id == partner_id,
        Message.receiver_id == user_id,
        Message.is_read == False
    ).update({'is_read': True})
    g.db.commit()
    
    return jsonify([{
        'id': m.id,
        'sender_id': m.sender_id,
        'receiver_id': m.receiver_id,
        'content': m.content,
        'translated_content': m.translated_content,
        'created_at': m.created_at.isoformat(),
        'is_read': m.is_read,
        'product_id': m.product_id,
        'order_id': m.order_id
    } for m in messages]), 200

@bp.route('/send', methods=['POST'])
@jwt_required()
def send_message():
    """Send a message to another user"""
    user_id = int(get_jwt_identity())
    data = request.json
    
    receiver_id = data.get('receiver_id')
    content = data.get('content')
    product_id = data.get('product_id')
    order_id = data.get('order_id')
    
    if not receiver_id or not content:
        return jsonify({'error': 'Receiver ID and content required'}), 400
    
    message = Message(
        sender_id=user_id,
        receiver_id=receiver_id,
        content=content,
        product_id=product_id,
        order_id=order_id,
        is_read=False
    )
    
    g.db.add(message)
    g.db.commit()
    
    # TODO: Emit Socket.IO event for real-time notification
    # socketio.emit('new_message', {
    #     'sender_id': user_id,
    #     'sender_name': g.db.query(User).get(user_id).full_name,
    #     'content': content,
    #     'translated_content': message.translated_content
    # }, room=f'user_{receiver_id}')
    
    return jsonify({
        'success': True,
        'message_id': message.id
    }), 201

@bp.route('/<int:message_id>/read', methods=['PUT'])
@jwt_required()
def mark_as_read(message_id):
    """Mark a message as read"""
    user_id = int(get_jwt_identity())
    
    message = g.db.query(Message).get(message_id)
    if not message:
        return jsonify({'error': 'Message not found'}), 404
    
    if message.receiver_id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    message.is_read = True
    g.db.commit()
    
    return jsonify({'success': True}), 200
