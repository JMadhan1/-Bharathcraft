"""
Real-time Multilingual Translation Service
Handles translation between artisan languages (Hindi, Telugu, Tamil, etc.) 
and buyer languages (English, German, French, etc.)
"""

from utils.ai_service_gemini import get_gemini_response
import json


# Supported languages
ARTISAN_LANGUAGES = {
    'hi': 'Hindi',
    'te': 'Telugu',
    'ta': 'Tamil',
    'kn': 'Kannada',
    'bn': 'Bengali',
    'ml': 'Malayalam',
    'gu': 'Gujarati',
    'mr': 'Marathi',
    'pa': 'Punjabi',
    'od': 'Odia',
    'as': 'Assamese'
}

BUYER_LANGUAGES = {
    'en': 'English',
    'de': 'German',
    'fr': 'French',
    'es': 'Spanish',
    'it': 'Italian',
    'ja': 'Japanese',
    'zh': 'Chinese',
    'ar': 'Arabic'
}

ALL_LANGUAGES = {**ARTISAN_LANGUAGES, **BUYER_LANGUAGES}

# Simple in-memory cache for translations
TRANSLATION_CACHE = {}


def translate_message(text, source_lang, target_lang, context="general"):
    """
    Translate message with cultural context
    
    Args:
        text: Message to translate
        source_lang: Source language code (e.g., 'en', 'hi')
        target_lang: Target language code
        context: Type of message (general, negotiation, technical, friendly)
    
    Returns:
        dict with translation and cultural notes
    """
    
    if source_lang == target_lang:
        return {
            'translated_text': text,
            'original_text': text,
            'cultural_notes': None
        }
    
    # Check cache
    cache_key = f"{text}:{source_lang}:{target_lang}:{context}"
    if cache_key in TRANSLATION_CACHE:
        print(f"Cache hit for translation: {text[:20]}...")
        return TRANSLATION_CACHE[cache_key]

    source_lang_name = ALL_LANGUAGES.get(source_lang, 'Unknown')
    target_lang_name = ALL_LANGUAGES.get(target_lang, 'Unknown')
    
    prompt = f"""You are a professional translator specializing in business communication for handicraft trade.

**Translation Task:**
- Source Language: {source_lang_name}
- Target Language: {target_lang_name}
- Context: {context}
- Original Message: "{text}"

**Your Task:**
Translate the message naturally and professionally. Return a JSON object with:

1. **translated_text**: The translated message in {target_lang_name}. Make it natural and conversational, not robotic.

2. **tone**: The emotional tone of the message (e.g., "friendly", "formal", "urgent", "apologetic", "excited")

3. **cultural_notes**: If there are any cultural nuances or business etiquette considerations, explain them briefly. For example:
   - If translating from English to Hindi: mention if the message should use आप (formal) vs तुम (informal)
   - If translating from Hindi to English: explain if the artisan is being particularly respectful/humble
   - If discussing prices: note if the number needs cultural context

4. **alternative_phrasing**: If there's a better way to phrase this for the target culture, suggest it

**Guidelines:**
- Preserve the intent and emotion of the message
- Use appropriate formality level for business communication
- Keep technical terms (product names, measurements) in original or transliterate
- For prices, keep currency symbols and numbers as-is
- Use natural idioms in target language when appropriate

Return ONLY valid JSON, no other text.

Example output:
{{
  "translated_text": "क्या आप इस उत्पाद की कीमत में छूट दे सकते हैं?",
  "tone": "polite_inquiry",
  "cultural_notes": "The buyer is asking politely. In Indian business culture, some negotiation is expected.",
  "alternative_phrasing": "क्या bulk order के लिए कोई विशेष छूट मिल सकती है?"
}}
"""
    
    try:
        response_text = get_gemini_response(prompt)
        
        # Clean JSON response
        if '```json' in response_text:
            json_start = response_text.find('```json') + 7
            json_end = response_text.find('```', json_start)
            response_text = response_text[json_start:json_end].strip()
        elif '```' in response_text:
            json_start = response_text.find('```') + 3
            json_end = response_text.find('```', json_start)
            response_text = response_text[json_start:json_end].strip()
        
        result = json.loads(response_text)
        result['original_text'] = text
        result['source_lang'] = source_lang
        result['target_lang'] = target_lang
        
        # Store in cache
        TRANSLATION_CACHE[cache_key] = result
        
        return result
        
    except Exception as e:
        print(f"Translation error: {str(e)}")
        # Fallback: return original text
        return {
            'translated_text': text,
            'original_text': text,
            'tone': 'unknown',
            'cultural_notes': 'Translation service temporarily unavailable',
            'alternative_phrasing': None,
            'source_lang': source_lang,
            'target_lang': target_lang,
            'error': str(e)
        }


def translate_batch(messages, source_lang, target_lang):
    """
    Translate multiple messages at once (more efficient)
    
    Args:
        messages: List of message texts
        source_lang: Source language code
        target_lang: Target language code
    
    Returns:
        List of translation results
    """
    
    if source_lang == target_lang:
        return [{'translated_text': msg, 'original_text': msg} for msg in messages]
    
    source_lang_name = ALL_LANGUAGES.get(source_lang, 'Unknown')
    target_lang_name = ALL_LANGUAGES.get(target_lang, 'Unknown')
    
    # Create numbered list of messages
    messages_list = "\n".join([f"{i+1}. {msg}" for i, msg in enumerate(messages)])
    
    prompt = f"""Translate these messages from {source_lang_name} to {target_lang_name}.

Messages:
{messages_list}

Return a JSON array with translations in the same order. Each item should have:
- "translated_text": the translation
- "original_text": the original message

Keep business-appropriate tone and preserve intent.

Return ONLY valid JSON array, no other text.

Example:
[
  {{"translated_text": "Hello, how are you?", "original_text": "नमस्ते, आप कैसे हैं?"}},
  {{"translated_text": "I need 50 pieces", "original_text": "मुझे 50 pieces चाहिए"}}
]
"""
    
    try:
        response_text = get_gemini_response(prompt)
        
        # Clean JSON response
        if '```json' in response_text:
            json_start = response_text.find('```json') + 7
            json_end = response_text.find('```', json_start)
            response_text = response_text[json_start:json_end].strip()
        elif '```' in response_text:
            json_start = response_text.find('```') + 3
            json_end = response_text.find('```', json_start)
            response_text = response_text[json_start:json_end].strip()
        
        results = json.loads(response_text)
        return results
        
    except Exception as e:
        print(f"Batch translation error: {str(e)}")
        # Fallback: return original texts
        return [{'translated_text': msg, 'original_text': msg, 'error': str(e)} for msg in messages]


def detect_language(text):
    """
    Auto-detect the language of a message
    
    Returns:
        Language code (e.g., 'hi', 'en', 'te')
    """
    
    prompt = f"""Detect the language of this text: "{text}"

Return ONLY the language code from this list:
- 'hi' for Hindi
- 'en' for English
- 'te' for Telugu
- 'ta' for Tamil
- 'kn' for Kannada
- 'bn' for Bengali
- 'ml' for Malayalam
- 'gu' for Gujarati
- 'mr' for Marathi
- 'pa' for Punjabi
- 'od' for Odia
- 'as' for Assamese
- 'de' for German
- 'fr' for French
- 'es' for Spanish

Return ONLY the 2-letter code, nothing else.
"""
    
    try:
        response = get_gemini_response(prompt).strip().lower()
        
        # Extract just the code if there's extra text
        for code in ALL_LANGUAGES.keys():
            if code in response:
                return code
        
        # Default to English if can't detect
        return 'en'
        
    except Exception as e:
        print(f"Language detection error: {str(e)}")
        return 'en'  # Default to English


def get_negotiation_phrases(language_code):
    """
    Get common negotiation phrases in a specific language
    Helps artisans communicate effectively
    """
    
    phrases_by_language = {
        'hi': {
            'greeting': 'नमस्ते! मैं आपकी कैसे मदद कर सकता हूं?',
            'price_too_low': 'क्षमा करें, यह कीमत बहुत कम है। क्या हम [X]% बढ़ा सकते हैं?',
            'accept_offer': 'हाँ, मैं यह offer स्वीकार करता हूं। धन्यवाद! 😊',
            'counter_offer': 'मैं [X]% छूट दे सकता हूं अगर आप bulk order दें।',
            'ask_quantity': 'आपको कितनी quantity चाहिए?',
            'delivery_time': 'यह [X] दिनों में तैयार हो जाएगा।',
            'thank_you': 'आपकी रुचि के लिए धन्यवाद! 🙏'
        },
        'te': {
            'greeting': 'నమస్కారం! నేను మీకు ఎలా సహాయం చేయగలను?',
            'price_too_low': 'క్షమించండి, ఈ ధర చాలా తక్కువ. మనం [X]% పెంచవచ్చా?',
            'accept_offer': 'అవును, నేను ఈ offer అంగీకరిస్తున్నాను. ధన్యవాదాలు! 😊',
            'counter_offer': 'మీరు bulk order ఇస్తే నేను [X]% discount ఇవ్వగలను.',
            'ask_quantity': 'మీకు ఎంత quantity కావాలి?',
            'delivery_time': 'ఇది [X] రోజుల్లో ready అవుతుంది.',
            'thank_you': 'మీ ఆసక్తికి ధన్యవాదాలు! 🙏'
        },
        'ta': {
            'greeting': 'வணக்கம்! நான் உங்களுக்கு எப்படி உதவ முடியும்?',
            'price_too_low': 'மன்னிக்கவும், இந்த விலை மிகவும் குறைவு. [X]% அதிகரிக்கலாமா?',
            'accept_offer': 'ஆம், நான் இந்த offer ஏற்கிறேன். நன்றி! 😊',
            'counter_offer': 'நீங்கள் bulk order கொடுத்தால் நான் [X]% discount கொடுக்கிறேன்.',
            'ask_quantity': 'உங்களுக்கு எவ்வளவு quantity வேண்டும்?',
            'delivery_time': 'இது [X] நாட்களில் ready ஆகும்.',
            'thank_you': 'உங்கள் ஆர்வத்திற்கு நன்றி! 🙏'
        },
        'en': {
            'greeting': 'Hello! How can I help you?',
            'price_too_low': 'Sorry, this price is too low. Can we increase it by [X]%?',
            'accept_offer': 'Yes, I accept this offer. Thank you! 😊',
            'counter_offer': 'I can offer [X]% discount if you place a bulk order.',
            'ask_quantity': 'How much quantity do you need?',
            'delivery_time': 'This will be ready in [X] days.',
            'thank_you': 'Thank you for your interest! 🙏'
        }
    }
    
    return phrases_by_language.get(language_code, phrases_by_language['en'])


def explain_cultural_context(text, source_lang, target_lang, scenario="negotiation"):
    """
    Explain cultural context when translating business messages
    Helps both parties understand intent and expectations
    """
    
    source_lang_name = ALL_LANGUAGES.get(source_lang, 'Unknown')
    target_lang_name = ALL_LANGUAGES.get(target_lang, 'Unknown')
    
    prompt = f"""You are a cultural communication expert helping artisans and buyers understand each other.

**Scenario:** {scenario}
**Original Message ({source_lang_name}):** "{text}"
**Translating to:** {target_lang_name}

Explain the cultural context and business etiquette considerations in simple language.

For example:
- If a Western buyer says "Can you do better on price?", explain to the Indian artisan: "यह एक सामान्य negotiation तकनीक है। वे आपके product में interested हैं लेकिन budget के बारे में सोच रहे हैं। आप 10-15% की छूट offer कर सकते हैं।"

- If an artisan says "जी हाँ सर", explain to the Western buyer: "The artisan is being respectful and formal, which is common in Indian business culture. This doesn't mean they're subservient - just polite."

Return a JSON object with:
1. **cultural_insight**: Main cultural context explanation (2-3 sentences)
2. **what_they_really_mean**: Plain language interpretation
3. **how_to_respond**: Suggested approach for responding
4. **dos**: Array of 2-3 things TO DO
5. **donts**: Array of 2-3 things NOT to do

Return ONLY valid JSON.
"""
    
    try:
        response_text = get_gemini_response(prompt)
        
        # Clean JSON
        if '```json' in response_text:
            json_start = response_text.find('```json') + 7
            json_end = response_text.find('```', json_start)
            response_text = response_text[json_start:json_end].strip()
        elif '```' in response_text:
            json_start = response_text.find('```') + 3
            json_end = response_text.find('```', json_start)
            response_text = response_text[json_start:json_end].strip()
        
        return json.loads(response_text)
        
    except Exception as e:
        print(f"Cultural context error: {str(e)}")
        return {
            'cultural_insight': 'Cultural context analysis temporarily unavailable.',
            'what_they_really_mean': 'Please interpret the message in context.',
            'how_to_respond': 'Respond professionally and politely.',
            'dos': ['Be respectful', 'Be clear'],
            'donts': ['Dont be rude', 'Dont rush']
        }


def get_translation_confidence(text, source_lang, target_lang):
    """
    Estimate confidence level of translation
    Useful for flagging messages that might need human review
    """
    
    # Simple heuristics for now
    confidence = 100
    
    # Reduce confidence for very short messages (might be ambiguous)
    if len(text.split()) < 3:
        confidence -= 20
    
    # Reduce confidence if lots of numbers/technical terms
    if sum(c.isdigit() for c in text) > len(text) * 0.3:
        confidence -= 10
    
    # Reduce confidence for rare language pairs
    rare_pairs = [('te', 'de'), ('ta', 'ja'), ('bn', 'fr')]
    if (source_lang, target_lang) in rare_pairs or (target_lang, source_lang) in rare_pairs:
        confidence -= 15
    
    return max(confidence, 50)  # Minimum 50%

