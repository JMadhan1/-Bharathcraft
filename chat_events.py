from flask_socketio import emit, join_room, leave_room
from flask import request
from models import Message, User
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
import os
from utils.ai_service import translate_text

# Get DATABASE_URL with a default fallback
database_url = os.getenv('DATABASE_URL', 'sqlite:///bharatcraft.db')
engine = create_engine(database_url)
Session = sessionmaker(bind=engine)

def register_socketio_events(socketio):
    
    @socketio.on('join')
    def on_join(data):
        room = data['room']
        join_room(room)
        emit('status', {'msg': f'User joined room {room}'}, room=room)
    
    @socketio.on('leave')
    def on_leave(data):
        room = data['room']
        leave_room(room)
        emit('status', {'msg': f'User left room {room}'}, room=room)
    
    @socketio.on('send_message')
    def handle_message(data):
        session = Session()
        
        try:
            sender_id = data['sender_id']
            receiver_id = data['receiver_id']
            content = data['content']
            original_language = data.get('language', 'en')
            
            receiver = session.query(User).filter_by(id=receiver_id).first()
            translated_content = None
            
            if receiver and receiver.language_preference != original_language:
                translated_content = translate_text(content, receiver.language_preference)
            
            message = Message(
                sender_id=sender_id,
                receiver_id=receiver_id,
                product_id=data.get('product_id'),
                order_id=data.get('order_id'),
                content=content,
                translated_content=translated_content,
                original_language=original_language
            )
            
            session.add(message)
            session.commit()
            
            room = f"chat_{min(sender_id, receiver_id)}_{max(sender_id, receiver_id)}"
            
            emit('new_message', {
                'id': message.id,
                'sender_id': message.sender_id,
                'receiver_id': message.receiver_id,
                'content': message.content,
                'translated_content': message.translated_content,
                'created_at': message.created_at.isoformat()
            }, room=room)
            
        except Exception as e:
            print(f"Error handling message: {e}")
        finally:
            session.close()
    
    @socketio.on('typing')
    def handle_typing(data):
        room = data['room']
        emit('user_typing', {'user_id': data['user_id']}, room=room, include_self=False)
