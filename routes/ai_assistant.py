"""
AI Assistant Routes - Powered by Gemini
Provides chat assistance and learning content for artisans
"""
from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity, get_jwt
import os
from utils.ai_service_gemini import get_gemini_response

bp = Blueprint('ai_assistant', __name__, url_prefix='/api/ai')

@bp.route('/chat-help', methods=['POST'])
@jwt_required()
def chat_help():
    """
    AI-powered chat assistance for artisans
    Helps with product descriptions, pricing, buyer communication
    """
    try:
        data = request.json
        user_id = int(get_jwt_identity())
        claims = get_jwt()
        
        user_message = data.get('message', '')
        language = data.get('language', 'hi')
        context = data.get('context', 'general')  # general, product, pricing, buyer
        
        if not user_message:
            return jsonify({'error': 'Message is required'}), 400
        
        # Create context-aware prompt for Gemini
        system_prompt = f"""You are a helpful AI assistant for Bharatcraft, a platform connecting Indian artisans with global buyers.

Context: {context}
User Language: {language}
User Role: Artisan

Guidelines:
1. Respond in {language} language (use native script)
2. Be simple, friendly, and encouraging
3. Keep responses under 100 words
4. Focus on practical, actionable advice
5. Respect Indian cultural context
6. Assume the artisan may have limited formal education

User's Question: {user_message}

Provide a helpful, encouraging response:"""

        # Get response from Gemini
        ai_response = get_gemini_response(system_prompt)
        
        return jsonify({
            'response': ai_response,
            'language': language,
            'context': context
        }), 200
        
    except Exception as e:
        print(f"Error in chat help: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/tutorial', methods=['POST'])
@jwt_required()
def get_tutorial():
    """
    Generate AI-powered tutorial content
    Creates step-by-step guides for artisans
    """
    try:
        data = request.json
        topic = data.get('topic', 'upload_product')
        language = data.get('language', 'hi')
        
        # Tutorial prompts for different topics
        tutorial_prompts = {
            'upload_product': f"""Create a simple, step-by-step tutorial in {language} for uploading a product on Bharatcraft platform.

Requirements:
1. Use {language} language with native script
2. Maximum 5 steps
3. Each step should be one short sentence
4. Include emojis for visual guidance
5. Assume user has basic smartphone knowledge

Topic: How to Upload Your First Product

Provide the tutorial:""",
            
            'pricing': f"""Create a simple guide in {language} for pricing handmade products fairly.

Requirements:
1. Use {language} language
2. 5 simple tips
3. Include examples with Indian Rupees
4. Consider material cost, time, skill level
5. Keep language simple

Topic: How to Price Your Crafts

Provide the guide:""",
            
            'quality_photos': f"""Create a simple guide in {language} for taking good product photos.

Requirements:
1. Use {language} language
2. 5 practical tips
3. Use items available in rural areas
4. No expensive equipment needed
5. Simple, everyday language

Topic: How to Take Beautiful Product Photos

Provide the guide:""",
            
            'buyer_communication': f"""Create a simple guide in {language} for communicating with international buyers.

Requirements:
1. Use {language} language
2. 5 key tips
3. Cover common questions buyers ask
4. How to be professional yet friendly
5. Cultural sensitivity tips

Topic: How to Talk to Buyers

Provide the guide:""",
            
            'shipping': f"""Create a simple guide in {language} for preparing products for shipping.

Requirements:
1. Use {language} language
2. 5 simple steps
3. Focus on safe packaging
4. Use affordable local materials
5. Easy to follow

Topic: How to Package Products Safely

Provide the guide:"""
        }
        
        prompt = tutorial_prompts.get(topic, tutorial_prompts['upload_product'])
        
        # Get tutorial from Gemini
        tutorial_content = get_gemini_response(prompt)
        
        return jsonify({
            'topic': topic,
            'language': language,
            'content': tutorial_content
        }), 200
        
    except Exception as e:
        print(f"Error generating tutorial: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/translate-message', methods=['POST'])
@jwt_required()
def translate_message():
    """
    Translate messages between artisan and buyer
    With cultural context preservation
    """
    try:
        data = request.json
        message = data.get('message', '')
        from_lang = data.get('from_language', 'hi')
        to_lang = data.get('to_language', 'en')
        
        if not message:
            return jsonify({'error': 'Message is required'}), 400
        
        prompt = f"""Translate this message from {from_lang} to {to_lang}.

Original Message ({from_lang}):
{message}

Guidelines:
1. Preserve the tone and cultural context
2. Keep it natural, not word-for-word
3. If there are idioms, translate the meaning
4. Maintain politeness level
5. For product descriptions, keep technical terms accurate

Provide ONLY the translation:"""

        translation = get_gemini_response(prompt)
        
        return jsonify({
            'original': message,
            'translation': translation,
            'from_language': from_lang,
            'to_language': to_lang
        }), 200
        
    except Exception as e:
        print(f"Error translating message: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/suggest-reply', methods=['POST'])
@jwt_required()
def suggest_reply():
    """
    Suggest smart replies for buyer messages
    Helps artisans respond professionally
    """
    try:
        data = request.json
        buyer_message = data.get('buyer_message', '')
        language = data.get('language', 'hi')
        
        if not buyer_message:
            return jsonify({'error': 'Buyer message is required'}), 400
        
        prompt = f"""A buyer sent this message. Suggest 3 short, appropriate responses in {language} for the artisan.

Buyer's Message:
{buyer_message}

Requirements:
1. Responses in {language} language
2. Professional yet warm tone
3. Each response max 30 words
4. Cover: accepting, asking question, polite decline
5. Use emojis appropriately

Provide 3 suggested replies:"""

        suggestions = get_gemini_response(prompt)
        
        return jsonify({
            'buyer_message': buyer_message,
            'suggested_replies': suggestions,
            'language': language
        }), 200
        
    except Exception as e:
        print(f"Error suggesting reply: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/video-tutorial-script', methods=['POST'])
@jwt_required()
def video_tutorial_script():
    """
    Generate video tutorial scripts
    For creating educational content
    """
    try:
        data = request.json
        topic = data.get('topic', 'platform_intro')
        language = data.get('language', 'hi')
        duration = data.get('duration', 3)  # minutes
        
        prompt = f"""Create a {duration}-minute video tutorial script in {language} for Bharatcraft platform.

Topic: {topic}
Language: {language}
Duration: {duration} minutes
Audience: Village artisans with basic education

Script Format:
[SCENE 1] - Description
Narration: What to say
On-Screen Text: Key points
Action: What viewer sees

Requirements:
1. Simple {language} language
2. Clear visual descriptions
3. Step-by-step narration
4. Encouraging tone
5. Practical examples
6. Use everyday analogies

Create the full video script:"""

        script = get_gemini_response(prompt)
        
        return jsonify({
            'topic': topic,
            'language': language,
            'duration': duration,
            'script': script
        }), 200
        
    except Exception as e:
        print(f"Error generating video script: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/faq', methods=['GET'])
def get_faq():
    """
    Get frequently asked questions and answers
    """
    try:
        language = request.args.get('language', 'hi')
        category = request.args.get('category', 'general')
        
        prompt = f"""Generate 10 FAQs in {language} for Bharatcraft artisan platform.

Category: {category}
Language: {language}

Format:
Q: Question
A: Answer (2-3 sentences)

Topics to cover:
- Account setup
- Product upload
- Pricing
- Orders and shipping
- Payments
- Platform fees
- Quality standards
- Buyer communication

Provide the FAQs:"""

        faqs = get_gemini_response(prompt)
        
        return jsonify({
            'language': language,
            'category': category,
            'faqs': faqs
        }), 200
        
    except Exception as e:
        print(f"Error generating FAQs: {e}")
        return jsonify({'error': str(e)}), 500


@bp.route('/recommendations', methods=['POST'])
@jwt_required()
def get_recommendations():
    """
    AI-powered product recommendations for buyers
    Analyzes browsing history, preferences, and purchase patterns
    """
    try:
        from models import Product, Order
        import json
        
        user_id = int(get_jwt_identity())
        data = request.json or {}
        
        # Get user's order history
        user_orders = g.db.query(Order).filter_by(buyer_id=user_id).limit(10).all()
        
        # Get all available products
        all_products = g.db.query(Product).filter_by(is_available=True).limit(50).all()
        
        if not all_products:
            return jsonify({
                'success': True,
                'recommendations': [],
                'count': 0,
                'reasoning': 'No products available at the moment. Check back soon!'
            }), 200
        
        # Build context from order history
        purchased_categories = []
        price_range = []
        for order in user_orders:
            for item in order.order_items:
                product = item.product
                if product:
                    purchased_categories.append(product.craft_type)
                    price_range.append(product.price)
        
        # Analyze preferences
        avg_price = sum(price_range) / len(price_range) if price_range else 0
        preferred_categories = list(set(purchased_categories))
        
        recommended_ids = []
        
        # Try AI recommendations first, but have robust fallback
        try:
            # Create prompt for Gemini
            prompt = f"""You are a product recommendation engine for Bharatcraft, a handicraft marketplace.

Buyer Profile:
- Previous purchases: {', '.join(preferred_categories) if preferred_categories else 'None yet'}
- Average price range: ₹{avg_price:.0f}
- Total orders: {len(user_orders)}

Available Products (sample):
{json.dumps([{'id': p.id, 'title': p.title, 'craft_type': p.craft_type, 'price': p.price, 'quality': p.quality_grade.value if p.quality_grade else 'standard'} for p in all_products[:10]], indent=2)}

Task: Recommend 5-8 products that match the buyer's preferences. Consider:
1. Similar craft types they've purchased
2. Price range they're comfortable with (±30%)
3. Quality level they prefer
4. Complementary products (if they bought pottery, suggest textiles that match)
5. Trending/popular items

Return ONLY a JSON array of product IDs in order of relevance:
[1, 5, 12, 8, 23, 15, 7, 19]

No explanations, just the array."""
            
            # Get recommendations from AI
            response_text = get_gemini_response(prompt)
            
            # Parse response (might be wrapped in markdown)
            if '```json' in response_text:
                json_start = response_text.find('```json') + 7
                json_end = response_text.find('```', json_start)
                response_text = response_text[json_start:json_end].strip()
            elif '```' in response_text:
                json_start = response_text.find('```') + 3
                json_end = response_text.find('```', json_start)
                response_text = response_text[json_start:json_end].strip()
            
            # Try to extract JSON array from response
            import re
            # Look for array pattern [1, 2, 3] or [1,2,3]
            array_match = re.search(r'\[[\d\s,]+]', response_text)
            if array_match:
                response_text = array_match.group(0)
            
            recommended_ids = json.loads(response_text)
            if not isinstance(recommended_ids, list):
                recommended_ids = []
        except Exception as ai_error:
            print(f"AI recommendation failed, using fallback: {ai_error}")
            # Fallback logic - use smart recommendations based on history
            pass
        
        # Fallback: recommend based on categories or all products
        if not recommended_ids:
            if preferred_categories:
                # Recommend products from preferred categories
                recommended_ids = [p.id for p in all_products if p.craft_type in preferred_categories][:8]
            else:
                # If no order history, recommend popular/quality products
                # Sort by quality grade and price
                sorted_products = sorted(all_products, key=lambda p: (
                    p.quality_grade.value if p.quality_grade else 'standard',
                    -p.price  # Higher price = premium
                ), reverse=True)
                recommended_ids = [p.id for p in sorted_products[:8]]
        
        # If still no recommendations, use all available products
        if not recommended_ids and all_products:
            recommended_ids = [p.id for p in all_products[:8]]
        
        # Get recommended products
        recommended_products = []
        for pid in recommended_ids[:8]:
            if pid:  # Make sure pid is not None
                product = g.db.query(Product).get(pid)
                if product and product.is_available:
                    recommended_products.append({
                        'id': product.id,
                        'title': product.title,
                        'description': product.description,
                        'price': product.price,
                        'craft_type': product.craft_type,
                        'quality_grade': product.quality_grade.value if product.quality_grade else 'standard',
                        'images': product.images.split(',') if product.images else [],
                        'artisan': {
                            'id': product.artisan_id,
                            'name': product.artisan.user.full_name if product.artisan and product.artisan.user else 'Unknown'
                        }
                    })
        
        # Ensure we have at least some recommendations
        if not recommended_products and all_products:
            # Last resort: just take first 8 products
            for product in all_products[:8]:
                recommended_products.append({
                    'id': product.id,
                    'title': product.title,
                    'description': product.description,
                    'price': product.price,
                    'craft_type': product.craft_type,
                    'quality_grade': product.quality_grade.value if product.quality_grade else 'standard',
                    'images': product.images.split(',') if product.images else [],
                    'artisan': {
                        'id': product.artisan_id,
                        'name': product.artisan.user.full_name if product.artisan and product.artisan.user else 'Unknown'
                    }
                })
        
        # Create reasoning message
        if len(user_orders) > 0:
            reasoning = f"Based on your {len(user_orders)} previous orders in {', '.join(preferred_categories) if preferred_categories else 'various'} categories"
        else:
            reasoning = "Popular products you might like - Start shopping to get personalized recommendations!"
        
        return jsonify({
            'success': True,
            'recommendations': recommended_products,
            'count': len(recommended_products),
            'reasoning': reasoning
        }), 200
        
    except Exception as e:
        print(f"Error getting recommendations: {e}")
        import traceback
        traceback.print_exc()
        # Return empty recommendations instead of error
        return jsonify({
            'success': True,
            'recommendations': [],
            'count': 0,
            'reasoning': 'Unable to generate recommendations at this time. Please try again later.',
            'error': str(e)
        }), 200  # Return 200 so frontend doesn't show error


@bp.route('/visual-search', methods=['POST'])
@jwt_required()
def visual_search():
    """
    Visual search: Upload image and find similar products using AI
    Uses Gemini Vision to analyze image and match products
    """
    try:
        from models import Product
        from PIL import Image
        import io
        import base64
        
        if 'image' not in request.files:
            return jsonify({'error': 'No image file provided'}), 400
        
        image_file = request.files['image']
        if image_file.filename == '':
            return jsonify({'error': 'No image file selected'}), 400
        
        # Save uploaded image temporarily
        image_path = f'static/uploads/temp_search_{int(get_jwt_identity())}.jpg'
        image_file.save(image_path)
        
        # Get all products with images
        all_products = g.db.query(Product).filter_by(is_available=True).limit(100).all()
        
        # Use Gemini Vision to analyze the uploaded image
        try:
            from utils.ai_service_gemini import GEMINI_AVAILABLE, genai
            
            if not GEMINI_AVAILABLE:
                return jsonify({
                    'error': 'Visual search requires google-generativeai. Install with: pip install google-generativeai'
                }), 503
            
            model = genai.GenerativeModel('gemini-2.5-flash')
            img = Image.open(image_path)
            
            prompt = """Analyze this image and describe what type of handicraft product it shows.

Focus on:
1. Product type (pottery, textile, jewelry, woodwork, metalwork, painting, etc.)
2. Style/design characteristics
3. Colors and patterns
4. Material (clay, fabric, metal, wood, etc.)
5. Cultural origin or technique (if visible)

Return ONLY a JSON object with:
{
  "product_type": "pottery",
  "style": "traditional blue pottery",
  "colors": ["blue", "white"],
  "material": "ceramic",
  "characteristics": ["hand-painted", "traditional pattern"]
}"""
            
            response = model.generate_content([prompt, img])
            description = response.text.strip()
            
            # Parse description
            if '```json' in description:
                json_start = description.find('```json') + 7
                json_end = description.find('```', json_start)
                description = description[json_start:json_end].strip()
            elif '```' in description:
                json_start = description.find('```') + 3
                json_end = description.find('```', json_start)
                description = description[json_start:json_end].strip()
            
            import json
            image_analysis = json.loads(description)
            
        except Exception as e:
            print(f"Error analyzing image: {e}")
            # Fallback: return all products
            image_analysis = {'product_type': 'unknown', 'characteristics': []}
        
        # Match products based on analysis
        matched_products = []
        product_type = image_analysis.get('product_type', '').lower()
        characteristics = image_analysis.get('characteristics', [])
        
        for product in all_products:
            score = 0
            
            # Match by craft type
            if product.craft_type and product_type in product.craft_type.lower():
                score += 10
            
            # Match by description keywords
            if product.description:
                desc_lower = product.description.lower()
                for char in characteristics:
                    if char.lower() in desc_lower:
                        score += 5
            
            # Match by title
            if product.title:
                title_lower = product.title.lower()
                if product_type in title_lower:
                    score += 8
                for char in characteristics:
                    if char.lower() in title_lower:
                        score += 3
            
            if score > 0:
                matched_products.append({
                    'product': {
                        'id': product.id,
                        'title': product.title,
                        'description': product.description,
                        'price': product.price,
                        'craft_type': product.craft_type,
                        'quality_grade': product.quality_grade,
                        'images': product.images or []
                    },
                    'match_score': score
                })
        
        # Sort by match score
        matched_products.sort(key=lambda x: x['match_score'], reverse=True)
        
        # Clean up temp file
        try:
            os.remove(image_path)
        except:
            pass
        
        return jsonify({
            'success': True,
            'image_analysis': image_analysis,
            'matches': [m['product'] for m in matched_products[:12]],
            'count': len(matched_products),
            'message': f"Found {len(matched_products)} similar products based on your image!"
        }), 200
        
    except Exception as e:
        print(f"Error in visual search: {e}")
        return jsonify({'error': str(e)}), 500

