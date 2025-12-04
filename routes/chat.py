from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Message, User

bp = Blueprint('chat', __name__, url_prefix='/api/chat')

@bp.route('/messages', methods=['GET'])
@jwt_required()
def get_messages():
    user_id = int(get_jwt_identity())
    
    other_user_id = request.args.get('user_id', type=int)
    
    if not other_user_id:
        return jsonify({'error': 'user_id parameter required'}), 400
    
    messages = g.db.query(Message).filter(
        ((Message.sender_id == user_id) & (Message.receiver_id == other_user_id)) |
        ((Message.sender_id == other_user_id) & (Message.receiver_id == user_id))
    ).order_by(Message.created_at).all()
    
    for msg in messages:
        if msg.receiver_id == user_id and not msg.is_read:
            msg.is_read = True
    
    g.db.commit()
    
    return jsonify([{
        'id': m.id,
        'sender_id': m.sender_id,
        'receiver_id': m.receiver_id,
        'content': m.content,
        'translated_content': m.translated_content,
        'original_language': m.original_language,
        'is_read': m.is_read,
        'created_at': m.created_at.isoformat()
    } for m in messages]), 200

@bp.route('/conversations', methods=['GET'])
@jwt_required()
def get_conversations():
    current_user_id = int(get_jwt_identity())
    
    # Optimize: Fetch all messages involving the current user in one query
    from sqlalchemy import or_
    
    all_messages = g.db.query(Message).filter(
        or_(Message.sender_id == current_user_id, Message.receiver_id == current_user_id)
    ).order_by(Message.created_at.desc()).all()
    
    conversations_map = {}
    unread_counts = {}
    
    for msg in all_messages:
        other_id = msg.sender_id if msg.receiver_id == current_user_id else msg.receiver_id
        
        # Count unread messages
        if msg.receiver_id == current_user_id and not msg.is_read:
            unread_counts[other_id] = unread_counts.get(other_id, 0) + 1
            
        # Track latest message for each conversation
        if other_id not in conversations_map:
            conversations_map[other_id] = msg
            
    # Fetch all user details in one query
    if not conversations_map:
        return jsonify([]), 200
        
    other_user_ids = list(conversations_map.keys())
    users = g.db.query(User).filter(User.id.in_(other_user_ids)).all()
    user_map = {u.id: u for u in users}
    
    conversations = []
    for other_id, last_msg in conversations_map.items():
        user = user_map.get(other_id)
        if user:
            conversations.append({
                'user_id': user.id,
                'user_name': user.full_name,
                'user_role': user.role.value,
                'last_message': last_msg.content,
                'last_message_time': last_msg.created_at.isoformat(),
                'unread_count': unread_counts.get(other_id, 0)
            })
            
    return jsonify(sorted(conversations, key=lambda x: x['last_message_time'], reverse=True)), 200
