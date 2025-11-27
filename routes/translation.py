"""
Translation API Routes
Real-time translation endpoints for artisan-buyer communication
"""

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from utils.translation_service import (
    translate_message, 
    translate_batch, 
    detect_language,
    get_negotiation_phrases,
    explain_cultural_context,
    ALL_LANGUAGES,
    ARTISAN_LANGUAGES,
    BUYER_LANGUAGES
)

bp = Blueprint('translation', __name__, url_prefix='/api/translation')


@bp.route('/translate', methods=['POST'])
@jwt_required()
def translate():
    """
    Translate a single message
    
    POST /api/translation/translate
    {
        "text": "Can you improve the price?",
        "source_lang": "en",
        "target_lang": "hi",
        "context": "negotiation"
    }
    """
    try:
        data = request.json
        
        text = data.get('text')
        source_lang = data.get('source_lang')
        target_lang = data.get('target_lang')
        context = data.get('context', 'general')
        
        if not text:
            return jsonify({'error': 'text is required'}), 400
        
        # Auto-detect source language if not provided
        if not source_lang:
            source_lang = detect_language(text)
        
        # Default target language based on user role
        if not target_lang:
            target_lang = 'hi'  # Default to Hindi
        
        # Perform translation
        result = translate_message(text, source_lang, target_lang, context)
        
        return jsonify({
            'success': True,
            'translation': result
        }), 200
        
    except Exception as e:
        print(f"Translation error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/translate-batch', methods=['POST'])
@jwt_required()
def translate_batch_messages():
    """
    Translate multiple messages at once (for chat history)
    
    POST /api/translation/translate-batch
    {
        "messages": ["Hello", "How are you?", "What is the price?"],
        "source_lang": "en",
        "target_lang": "hi"
    }
    """
    try:
        data = request.json
        
        messages = data.get('messages', [])
        source_lang = data.get('source_lang', 'en')
        target_lang = data.get('target_lang', 'hi')
        
        if not messages:
            return jsonify({'error': 'messages array is required'}), 400
        
        # Translate all messages
        results = translate_batch(messages, source_lang, target_lang)
        
        return jsonify({
            'success': True,
            'translations': results,
            'count': len(results)
        }), 200
        
    except Exception as e:
        print(f"Batch translation error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/detect-language', methods=['POST'])
@jwt_required()
def detect_lang():
    """
    Auto-detect the language of a text
    
    POST /api/translation/detect-language
    {
        "text": "नमस्ते, कैसे हो?"
    }
    """
    try:
        data = request.json
        text = data.get('text')
        
        if not text:
            return jsonify({'error': 'text is required'}), 400
        
        detected_lang = detect_language(text)
        lang_name = ALL_LANGUAGES.get(detected_lang, 'Unknown')
        
        return jsonify({
            'success': True,
            'detected_language': detected_lang,
            'language_name': lang_name
        }), 200
        
    except Exception as e:
        print(f"Language detection error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/negotiation-phrases/<lang_code>', methods=['GET'])
@jwt_required()
def get_phrases(lang_code):
    """
    Get common negotiation phrases in a specific language
    Helps artisans communicate effectively
    
    GET /api/translation/negotiation-phrases/hi
    """
    try:
        phrases = get_negotiation_phrases(lang_code)
        
        return jsonify({
            'success': True,
            'language': lang_code,
            'language_name': ALL_LANGUAGES.get(lang_code, 'Unknown'),
            'phrases': phrases
        }), 200
        
    except Exception as e:
        print(f"Error getting phrases: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/cultural-context', methods=['POST'])
@jwt_required()
def get_cultural_context():
    """
    Get cultural context explanation for a message
    
    POST /api/translation/cultural-context
    {
        "text": "Can you do better on price?",
        "source_lang": "en",
        "target_lang": "hi",
        "scenario": "negotiation"
    }
    """
    try:
        data = request.json
        
        text = data.get('text')
        source_lang = data.get('source_lang', 'en')
        target_lang = data.get('target_lang', 'hi')
        scenario = data.get('scenario', 'negotiation')
        
        if not text:
            return jsonify({'error': 'text is required'}), 400
        
        context = explain_cultural_context(text, source_lang, target_lang, scenario)
        
        return jsonify({
            'success': True,
            'cultural_context': context
        }), 200
        
    except Exception as e:
        print(f"Cultural context error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/supported-languages', methods=['GET'])
def get_supported_languages():
    """
    Get list of all supported languages
    No authentication required
    """
    return jsonify({
        'success': True,
        'artisan_languages': ARTISAN_LANGUAGES,
        'buyer_languages': BUYER_LANGUAGES,
        'all_languages': ALL_LANGUAGES,
        'total_count': len(ALL_LANGUAGES)
    }), 200


@bp.route('/quick-translate', methods=['POST'])
def quick_translate():
    """
    Quick translation endpoint (no auth required for demo)
    Useful for homepage demo or testing
    
    POST /api/translation/quick-translate
    {
        "text": "Hello, I love your products!",
        "target_lang": "hi"
    }
    """
    try:
        data = request.json
        
        text = data.get('text')
        target_lang = data.get('target_lang', 'hi')
        
        if not text:
            return jsonify({'error': 'text is required'}), 400
        
        # Auto-detect source language
        source_lang = detect_language(text)
        
        # Translate
        result = translate_message(text, source_lang, target_lang, 'general')
        
        return jsonify({
            'success': True,
            'original': text,
            'translated': result['translated_text'],
            'source_language': ALL_LANGUAGES.get(source_lang),
            'target_language': ALL_LANGUAGES.get(target_lang)
        }), 200
        
    except Exception as e:
        print(f"Quick translate error: {str(e)}")
        return jsonify({'error': str(e)}), 500

