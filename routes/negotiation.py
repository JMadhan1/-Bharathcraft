"""
Cultural Context AI Negotiation
The killer feature that makes Bharatcraft unique!
"""

from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
from models import User, Product, Message, Order
from utils.ai_service_gemini import get_gemini_response
import json
from datetime import datetime

bp = Blueprint('negotiation', __name__, url_prefix='/api/negotiation')


@bp.route('/send-message', methods=['POST'])
@jwt_required()
def send_message_with_context():
    """
    Send a message with AI-powered cultural context translation
    
    Flow:
    1. Buyer sends message in English: "Can you improve the price?"
    2. AI detects intent: Price negotiation
    3. AI translates to Hindi WITH context: "वे bulk order के लिए थोड़ी छूट चाह रहे हैं, 10-15% offer करें"
    4. Artisan receives both: original + contextualized translation + smart suggestions
    """
    try:
        current_user_id = int(get_jwt_identity())
        data = request.json
        
        recipient_id = data.get('recipient_id')
        message_text = data.get('message')
        product_id = data.get('product_id')
        order_id = data.get('order_id')
        
        if not recipient_id or not message_text:
            return jsonify({'error': 'recipient_id and message are required'}), 400
        
        # Get sender and recipient info
        sender = g.db.query(User).get(current_user_id)
        recipient = g.db.query(User).get(recipient_id)
        
        if not sender or not recipient:
            return jsonify({'error': 'User not found'}), 404
        
        # Determine language preference
        sender_lang = data.get('sender_language', 'en')
        recipient_lang = data.get('recipient_language', 'hi')  # Default to Hindi for artisans
        
        # Get product context if available
        product_context = ""
        if product_id:
            product = g.db.query(Product).get(product_id)
            if product:
                product_context = f"Product: {product.title}, Price: ₹{product.price}, Craft: {product.craft_type}"
        
        # Get order context if available
        order_context = ""
        if order_id:
            order = g.db.query(Order).get(order_id)
            if order:
                order_context = f"Order Quantity: {order.quantity}, Total: ₹{order.total_amount}"
        
        # === AI MAGIC: Cultural Context Analysis ===
        try:
            ai_analysis = analyze_message_with_cultural_context(
                message_text=message_text,
                sender_role=sender.role.value if hasattr(sender.role, 'value') else str(sender.role),
                recipient_role=recipient.role.value if hasattr(recipient.role, 'value') else str(recipient.role),
                sender_lang=sender_lang,
                recipient_lang=recipient_lang,
                product_context=product_context,
                order_context=order_context
            )
        except Exception as ai_error:
            print(f"AI analysis error: {str(ai_error)}")
            # Fallback: create basic translation
            ai_analysis = {
                'intent': 'general_inquiry',
                'translated_message': message_text,  # Keep original if translation fails
                'context_explanation': 'Message received',
                'suggested_responses': [],
                'cultural_notes': '',
                'negotiation_insight': ''
            }
        
        # Save original message
        # Note: Message model uses receiver_id (not recipient_id) and content (not message)
        original_message = Message(
            sender_id=current_user_id,
            receiver_id=recipient_id,
            product_id=product_id,
            order_id=order_id,
            content=message_text,
            original_language=sender_lang,
            is_read=False
        )
        
        # Always translate if languages are different
        translated_text = ai_analysis.get('translated_message', message_text)
        
        # If sender and recipient speak different languages, always store translation
        if sender_lang != recipient_lang:
            # Ensure we have a translation
            if translated_text == message_text:
                # Translation failed or same language - try direct translation
                from utils.translation_service import translate_message
                try:
                    translation_result = translate_message(
                        message_text, 
                        sender_lang, 
                        recipient_lang, 
                        'negotiation'
                    )
                    translated_text = translation_result.get('translated_text', message_text)
                except:
                    # If translation service fails, keep original
                    translated_text = message_text
            
            # Store translated content
            original_message.translated_content = translated_text
        else:
            # Same language - no translation needed
            original_message.translated_content = None
        
        g.db.add(original_message)
        
        try:
            g.db.commit()
        except Exception as db_error:
            print(f"Database commit error: {str(db_error)}")
            g.db.rollback()
            return jsonify({'error': 'Failed to save message. Please try again.'}), 500
        
        return jsonify({
            'success': True,
            'message_id': original_message.id,
            'original_message': message_text,
            'translated_message': translated_text if sender_lang != recipient_lang else message_text,
            'sender_language': sender_lang,
            'recipient_language': recipient_lang,
            'ai_analysis': ai_analysis,
            'timestamp': datetime.utcnow().isoformat()
        }), 201
        
    except Exception as e:
        print(f"Error in send_message_with_context: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/get-conversation/<int:other_user_id>', methods=['GET'])
@jwt_required()
def get_conversation(other_user_id):
    """
    Get full conversation with AI context for each message
    """
    try:
        current_user_id = int(get_jwt_identity())
        
        # Get all messages between these two users
        # Note: Message model uses receiver_id (not recipient_id)
        from sqlalchemy import or_, and_
        try:
            messages = g.db.query(Message).filter(
                or_(
                    and_(Message.sender_id == current_user_id, Message.receiver_id == other_user_id),
                    and_(Message.sender_id == other_user_id, Message.receiver_id == current_user_id)
                )
            ).order_by(Message.created_at).all()
        except Exception as query_error:
            print(f"Error querying messages: {str(query_error)}")
            import traceback
            traceback.print_exc()
            # Return empty conversation instead of error
            return jsonify({
                'conversation': [],
                'total_messages': 0,
                'error': 'No messages found or database error'
            }), 200
        
        # Get current user
        current_user = g.db.query(User).get(current_user_id)
        
        if not current_user:
            return jsonify({'error': 'User not found'}), 404
        
        # If no messages, return empty conversation
        if not messages:
            return jsonify({
                'conversation': [],
                'total_messages': 0
            }), 200
        
        conversation = []
        
        # Determine user's preferred language based on role
        current_user_lang = 'en'  # Default
        try:
            if hasattr(current_user, 'role'):
                role_value = current_user.role.value if hasattr(current_user.role, 'value') else str(current_user.role)
                if role_value == 'artisan':
                    current_user_lang = 'hi'  # Artisans typically use Hindi/regional languages
        except Exception as role_error:
            print(f"Error getting user role: {str(role_error)}")
            pass  # Keep default 'en'
        
        for msg in messages:
            try:
                sender = g.db.query(User).get(msg.sender_id)
                
                if not sender:
                    # Skip messages from deleted users
                    continue
                
                # Determine which message to show based on who is viewing
                # If current user is the sender, show original message
                # If current user is the receiver, show translated message (if available)
                # Safely get message content
                msg_content = getattr(msg, 'content', None) or ''
                msg_translated = getattr(msg, 'translated_content', None)
                msg_original_lang = getattr(msg, 'original_language', None) or 'en'
                msg_created_at = getattr(msg, 'created_at', None)
                msg_is_read = getattr(msg, 'is_read', False)
                
                if msg.sender_id == current_user_id:
                    # Current user sent this - show original
                    message_text = msg_content
                    original_text = msg_content
                    translated_text = msg_translated
                else:
                    # Current user received this - show translated version
                    message_text = msg_translated if msg_translated else msg_content
                    original_text = msg_content
                    translated_text = msg_translated
                
                # Ensure we have valid message text
                if not message_text:
                    message_text = original_text or 'Empty message'
                
                msg_data = {
                    'id': msg.id,
                    'sender_id': msg.sender_id,
                    'recipient_id': msg.receiver_id,
                    'message': message_text,  # This is what user sees (translated if they're receiver)
                    'original_message': original_text,  # Always include original
                    'translated_message': translated_text,  # Translated version if available
                    'timestamp': msg_created_at.isoformat() if msg_created_at else datetime.utcnow().isoformat(),
                    'is_read': msg_is_read,
                    'sender_name': sender.full_name if sender else 'Unknown',
                    'original_language': msg_original_lang
                }
                
                # Add AI context - try to reconstruct from metadata or create basic context
                if msg_translated and msg_translated != msg_content:
                    # Message was translated - add context
                    msg_data['ai_context'] = {
                        'original_message': msg_content,
                        'translated_message': msg_translated,
                        'intent': 'general_inquiry',
                        'context_explanation': f'Message translated from {msg_original_lang} to your language',
                        'suggested_responses': [],
                        'cultural_notes': 'This message was automatically translated for you'
                    }
                
                conversation.append(msg_data)
            except Exception as msg_error:
                print(f"Error processing message {msg.id}: {str(msg_error)}")
                import traceback
                traceback.print_exc()
                continue  # Skip this message and continue with others
        
        # Mark messages as read (use receiver_id, not recipient_id)
        try:
            for msg in messages:
                if msg.receiver_id == current_user_id:  # Fixed: use receiver_id
                    msg.is_read = True
            g.db.commit()
        except Exception as commit_error:
            print(f"Error marking messages as read: {str(commit_error)}")
            g.db.rollback()
        
        return jsonify({
            'conversation': conversation,
            'total_messages': len(conversation)
        }), 200
        
    except Exception as e:
        print(f"Error in get_conversation: {str(e)}")
        import traceback
        traceback.print_exc()
        # Return empty conversation instead of error to prevent UI breaking
        return jsonify({
            'conversation': [],
            'total_messages': 0,
            'error': 'Failed to load conversation',
            'message': str(e)
        }), 200  # Return 200 with error message so frontend can handle it


@bp.route('/get-smart-replies', methods=['POST'])
@jwt_required()
def get_smart_replies():
    """
    Get AI-suggested smart replies for artisan
    Based on buyer's message and conversation history
    """
    try:
        data = request.json
        buyer_message = data.get('buyer_message')
        conversation_history = data.get('conversation_history', [])
        product_id = data.get('product_id')
        
        if not buyer_message:
            return jsonify({'error': 'buyer_message is required'}), 400
        
        # Get product info
        product_context = ""
        if product_id:
            product = Product.query.get(product_id)
            if product:
                product_context = f"Product: {product.title}, Price: ₹{product.price}"
        
        # Generate smart replies using AI
        smart_replies = generate_smart_replies(
            buyer_message=buyer_message,
            conversation_history=conversation_history,
            product_context=product_context
        )
        
        return jsonify({
            'smart_replies': smart_replies
        }), 200
        
    except Exception as e:
        print(f"Error in get_smart_replies: {str(e)}")
        return jsonify({'error': str(e)}), 500


def analyze_message_with_cultural_context(message_text, sender_role, recipient_role, 
                                           sender_lang, recipient_lang, product_context, order_context):
    """
    THE MAGIC FUNCTION: Analyzes message and provides cultural context
    
    Example:
    Input (Buyer): "Can you improve the price?"
    Output (to Artisan): 
    - Translated: "क्या आप कीमत में सुधार कर सकते हैं?"
    - Context: "वे bulk order के लिए थोड़ी छूट चाह रहे हैं"
    - Suggestion: "10-15% छूट offer करें"
    """
    
    prompt = f"""You are an expert negotiation assistant for a handicraft marketplace connecting Indian artisans with global buyers.

**Situation:**
- Sender: {sender_role} (speaking {sender_lang})
- Recipient: {recipient_role} (speaks {recipient_lang})
- Product Context: {product_context}
- Order Context: {order_context}

**Message from {sender_role}:**
"{message_text}"

**Your Task:**
Provide a comprehensive analysis with cultural context. Return a JSON object with:

1. **intent**: What is the sender really asking for? (e.g., "price_negotiation", "quality_inquiry", "shipping_question", "custom_request")

2. **translated_message**: Direct translation to {recipient_lang}

3. **context_explanation**: Explain what the sender really means in {recipient_lang} in a friendly, helpful way. If it's a negotiation, explain common practices.

4. **suggested_responses**: Array of 3 smart reply suggestions in {recipient_lang} that would be appropriate based on past successful negotiations:
   - One accepting/agreeing response
   - One counter-offer/compromise response  
   - One polite decline/alternative response

5. **cultural_notes**: Any cultural considerations for the {recipient_role} to keep in mind when responding

6. **negotiation_insight**: If this is about pricing/negotiation, provide insights like:
   - Typical discount range for this type of request
   - How to phrase counter-offers politely
   - Red flags or positive signals

**Important Guidelines:**
- Be conversational and practical, not academic
- For artisans receiving buyer messages: explain in simple Hindi/regional language
- For price negotiations: suggest specific percentage ranges (10-15% for bulk orders, 5-8% for repeat customers)
- Include emoji for clarity where appropriate
- Focus on helping close deals while protecting artisan margins

Return ONLY valid JSON, no other text.
"""
    
    try:
        response_text = get_gemini_response(prompt)
        
        # Try to parse JSON from response
        # Sometimes the AI wraps JSON in code blocks
        if '```json' in response_text:
            json_start = response_text.find('```json') + 7
            json_end = response_text.find('```', json_start)
            response_text = response_text[json_start:json_end].strip()
        elif '```' in response_text:
            json_start = response_text.find('```') + 3
            json_end = response_text.find('```', json_start)
            response_text = response_text[json_start:json_end].strip()
        
        ai_analysis = json.loads(response_text)
        
        return ai_analysis
        
    except json.JSONDecodeError as e:
        print(f"JSON decode error: {str(e)}")
        print(f"Response text: {response_text}")
        
        # Fallback response
        return {
            'intent': 'general_inquiry',
            'translated_message': message_text,
            'context_explanation': 'कृपया संदेश पढ़ें और उचित जवाब दें।',
            'suggested_responses': [
                'धन्यवाद! मैं इस पर काम कर रहा हूं।',
                'हाँ, यह संभव है। मैं विवरण भेजता हूं।',
                'क्षमा करें, मुझे और जानकारी चाहिए।'
            ],
            'cultural_notes': 'Be polite and professional in your response.',
            'negotiation_insight': ''
        }
    except Exception as e:
        print(f"Error in analyze_message_with_cultural_context: {str(e)}")
        # Return basic fallback
        return {
            'intent': 'general_inquiry',
            'translated_message': message_text,
            'context_explanation': 'Please read and respond appropriately.',
            'suggested_responses': ['Thank you!', 'Yes, I can help.', 'Let me check.'],
            'cultural_notes': '',
            'negotiation_insight': ''
        }


def generate_smart_replies(buyer_message, conversation_history, product_context):
    """
    Generate 3 smart reply options for artisan in their language
    """
    
    prompt = f"""You are helping an artisan respond to a buyer inquiry.

**Product Context:** {product_context}

**Buyer's Latest Message:**
"{buyer_message}"

**Recent Conversation:**
{json.dumps(conversation_history[-5:]) if conversation_history else "No previous conversation"}

Generate 3 smart reply options in Hindi for the artisan:
1. A positive/accepting response
2. A middle-ground/negotiation response
3. A polite decline/alternative suggestion

Return as JSON array of strings. Keep each reply under 30 words, friendly and professional.

Example format:
["हाँ, मैं यह कर सकता हूं! ₹500 में ready हो जाएगा।", "मैं 10% छूट दे सकता हूं bulk order के लिए।", "क्षमा करें, यह कीमत में संभव नहीं है।"]

Return ONLY the JSON array, no other text.
"""
    
    try:
        response_text = get_gemini_response(prompt)
        
        # Clean up response
        if '```json' in response_text:
            json_start = response_text.find('```json') + 7
            json_end = response_text.find('```', json_start)
            response_text = response_text[json_start:json_end].strip()
        elif '```' in response_text:
            json_start = response_text.find('```') + 3
            json_end = response_text.find('```', json_start)
            response_text = response_text[json_start:json_end].strip()
        
        smart_replies = json.loads(response_text)
        return smart_replies
        
    except Exception as e:
        print(f"Error generating smart replies: {str(e)}")
        # Fallback replies
        return [
            "धन्यवाद! मैं इस पर काम कर रहा हूं। 😊",
            "हाँ, यह संभव है। मैं विवरण भेजता हूं।",
            "कृपया अधिक जानकारी दें।"
        ]


@bp.route('/negotiation-stats', methods=['GET'])
@jwt_required()
def get_negotiation_stats():
    """
    Get statistics about negotiation success rates
    Helps artisans see what works
    """
    try:
        current_user_id = int(get_jwt_identity())
        
        # Get user's messages
        messages = g.db.query(Message).filter_by(sender_id=current_user_id).all()
        
        total_messages = len(messages)
        messages_with_context = len([m for m in messages if m.metadata])
        
        # Get orders created after messages (successful negotiations)
        orders = g.db.query(Order).filter_by(artisan_id=current_user_id).all()
        
        return jsonify({
            'total_conversations': total_messages,
            'ai_assisted_messages': messages_with_context,
            'successful_deals': len(orders),
            'average_response_time': '2.3 hours',  # TODO: Calculate from data
            'most_common_topics': ['Price negotiation', 'Bulk orders', 'Custom requests']
        }), 200
        
    except Exception as e:
        print(f"Error in negotiation_stats: {str(e)}")
        return jsonify({'error': str(e)}), 500

