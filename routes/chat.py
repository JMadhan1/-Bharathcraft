from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Message, User

bp = Blueprint('chat', __name__, url_prefix='/api/chat')

@bp.route('/messages', methods=['GET'])
@jwt_required()
def get_messages():
    identity = get_jwt_identity()
    
    other_user_id = request.args.get('user_id', type=int)
    
    if not other_user_id:
        return jsonify({'error': 'user_id parameter required'}), 400
    
    messages = g.db.query(Message).filter(
        ((Message.sender_id == identity['id']) & (Message.receiver_id == other_user_id)) |
        ((Message.sender_id == other_user_id) & (Message.receiver_id == identity['id']))
    ).order_by(Message.created_at).all()
    
    for msg in messages:
        if msg.receiver_id == identity['id'] and not msg.is_read:
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
    identity = get_jwt_identity()
    
    sent = g.db.query(Message.receiver_id).filter(Message.sender_id == identity['id']).distinct()
    received = g.db.query(Message.sender_id).filter(Message.receiver_id == identity['id']).distinct()
    
    user_ids = set([u[0] for u in sent] + [u[0] for u in received])
    
    conversations = []
    for user_id in user_ids:
        user = g.db.query(User).filter_by(id=user_id).first()
        if user:
            last_message = g.db.query(Message).filter(
                ((Message.sender_id == identity['id']) & (Message.receiver_id == user_id)) |
                ((Message.sender_id == user_id) & (Message.receiver_id == identity['id']))
            ).order_by(Message.created_at.desc()).first()
            
            unread_count = g.db.query(Message).filter(
                Message.sender_id == user_id,
                Message.receiver_id == identity['id'],
                Message.is_read == False
            ).count()
            
            conversations.append({
                'user_id': user.id,
                'user_name': user.full_name,
                'user_role': user.role.value,
                'last_message': last_message.content if last_message else '',
                'last_message_time': last_message.created_at.isoformat() if last_message else None,
                'unread_count': unread_count
            })
    
    return jsonify(sorted(conversations, key=lambda x: x['last_message_time'] or '', reverse=True)), 200
