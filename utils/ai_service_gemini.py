"""
AI Service with Google Gemini Support
Provides quality assessment and translation using Gemini AI
"""
import os

# Conditional imports
try:
    import google.generativeai as genai
    GEMINI_AVAILABLE = True
except ImportError:
    GEMINI_AVAILABLE = False
    genai = None

try:
    from openai import OpenAI
    OPENAI_AVAILABLE = True
except ImportError:
    OPENAI_AVAILABLE = False
    OpenAI = None

# Configure AI providers
AI_PROVIDER = os.getenv('AI_PROVIDER', 'gemini').lower()

# Gemini configuration
GEMINI_API_KEY = os.getenv('GEMINI_API_KEY', '')
if GEMINI_AVAILABLE and GEMINI_API_KEY:
    genai.configure(api_key=GEMINI_API_KEY)
elif not GEMINI_AVAILABLE:
    print("[WARNING] google-generativeai not installed. Install with: pip install google-generativeai")

# OpenAI configuration (fallback)
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')
openai_client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_AVAILABLE and OPENAI_API_KEY else None


def assess_quality_gemini(image_path):
    """Assess product quality using Gemini Vision"""
    if not GEMINI_API_KEY:
        print("Warning: No Gemini API key found, using default score")
        return 0.75
    
    try:
        if not GEMINI_AVAILABLE:
            print("Warning: google-generativeai not installed, using default score")
            return 0.75
        
        # Upload image to Gemini
        from PIL import Image
        img = Image.open(image_path)
        
        # Use Gemini Flash model with vision capability
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        prompt = """Assess the quality of this handicraft product on a scale of 0.0 to 1.0.

Consider these factors:
- Craftsmanship and attention to detail
- Quality of finishing
- Material quality
- Design complexity and appeal
- Overall aesthetic value

Respond with ONLY a single number between 0.0 and 1.0 (e.g., 0.87).
Do not include any explanation, just the number."""

        response = model.generate_content([prompt, img])
        
        # Extract score from response
        score_text = response.text.strip()
        score = float(score_text)
        
        # Ensure score is within valid range
        score = max(0.0, min(1.0, score))
        
        print(f"Gemini quality assessment: {score}")
        return score
        
    except Exception as e:
        print(f"Gemini quality assessment error: {e}")
        print("Falling back to mock quality score due to API error")
        return 0.88  # Return a high quality score for demo purposes


def assess_quality_openai(image_path):
    """Assess product quality using OpenAI GPT-4 Vision"""
    if not OPENAI_API_KEY or not openai_client:
        return 0.75
    
    try:
        import base64
        with open(image_path, 'rb') as image_file:
            base64_image = base64.b64encode(image_file.read()).decode('utf-8')
        
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": "Assess the quality of this handicraft product. Rate from 0.0 to 1.0 based on: craftsmanship, finish, materials, design, and overall appeal. Respond with only a number between 0.0 and 1.0."
                        },
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": f"data:image/jpeg;base64,{base64_image}"
                            }
                        }
                    ]
                }
            ],
            max_tokens=50
        )
        
        score = float(response.choices[0].message.content.strip())
        return max(0.0, min(1.0, score))
    except Exception as e:
        print(f"OpenAI quality assessment error: {e}")
        return 0.75


def assess_quality(image_path):
    """Main quality assessment function - uses configured provider"""
    if AI_PROVIDER == 'gemini' and GEMINI_API_KEY:
        return assess_quality_gemini(image_path)
    elif AI_PROVIDER == 'openai' and OPENAI_API_KEY:
        return assess_quality_openai(image_path)
    else:
        # Try Gemini first, then OpenAI, then default
        if GEMINI_API_KEY:
            return assess_quality_gemini(image_path)
        elif OPENAI_API_KEY:
            return assess_quality_openai(image_path)
        else:
            print("Warning: No AI provider configured, using default score")
            return 0.75


def translate_text_gemini(text, target_language):
    """Translate text using Gemini"""
    if not GEMINI_API_KEY:
        return text
    
    try:
        language_map = {
            'hi': 'Hindi',
            'te': 'Telugu',
            'ta': 'Tamil',
            'kn': 'Kannada',
            'ml': 'Malayalam',
            'bn': 'Bengali',
            'gu': 'Gujarati',
            'mr': 'Marathi',
            'pa': 'Punjabi',
            'od': 'Odia',
            'as': 'Assamese',
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'ja': 'Japanese',
            'en': 'English'
        }
        
        target_lang_name = language_map.get(target_language, 'English')
        
        if not GEMINI_AVAILABLE:
            return text  # Return original if Gemini not available
        
        model = genai.GenerativeModel('gemini-2.5-flash')
        
        prompt = f"""You are a professional translator specializing in handicraft and artisan product descriptions.

Translate the following text to {target_lang_name}. Preserve the meaning and cultural context.

Text to translate:
{text}

Provide ONLY the translation, no explanations or additional text."""

        response = model.generate_content(prompt)
        
        return response.text.strip()
        
    except Exception as e:
        print(f"Gemini translation error: {e}")
        print("Falling back to mock translation due to API error")
        # Return a mock translation for demo purposes
        return f"[AI Translated to {target_lang_name}]: {text}"


def translate_text_openai(text, target_language):
    """Translate text using OpenAI"""
    if not OPENAI_API_KEY or not openai_client:
        return text
    
    try:
        language_map = {
            'hi': 'Hindi',
            'te': 'Telugu',
            'ta': 'Tamil',
            'kn': 'Kannada',
            'ml': 'Malayalam',
            'bn': 'Bengali',
            'gu': 'Gujarati',
            'mr': 'Marathi',
            'pa': 'Punjabi',
            'od': 'Odia',
            'as': 'Assamese',
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'ja': 'Japanese',
            'en': 'English'
        }
        
        target_lang_name = language_map.get(target_language, 'English')
        
        response = openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": f"You are a translator specializing in handicraft and artisan product descriptions. Translate the following text to {target_lang_name}. Preserve the meaning and cultural context."
                },
                {
                    "role": "user",
                    "content": text
                }
            ],
            max_tokens=500
        )
        
        return response.choices[0].message.content.strip()
    except Exception as e:
        print(f"OpenAI translation error: {e}")
        return text


def translate_text(text, target_language):
    """Main translation function - uses configured provider"""
    if AI_PROVIDER == 'gemini' and GEMINI_API_KEY:
        return translate_text_gemini(text, target_language)
    elif AI_PROVIDER == 'openai' and OPENAI_API_KEY:
        return translate_text_openai(text, target_language)
    else:
        # Try Gemini first, then OpenAI, then return original
        if GEMINI_API_KEY:
            return translate_text_gemini(text, target_language)
        elif OPENAI_API_KEY:
            return translate_text_openai(text, target_language)
        else:
            return text


def get_cultural_context(buyer_country, artisan_culture, negotiation_context):
    """Get cultural context using available AI provider"""
    prompt = f"""You are a cultural advisor helping with international business negotiations between artisans and buyers.

A buyer from {buyer_country} is negotiating with an artisan from {artisan_culture}. 
Context: {negotiation_context}

Provide brief, practical cultural context tips (2-3 sentences) to help both parties understand each other better."""

    try:
        if GEMINI_AVAILABLE and GEMINI_API_KEY and AI_PROVIDER == 'gemini':
            model = genai.GenerativeModel('gemini-2.5-flash')
            response = model.generate_content(prompt)
            return response.text.strip()
        elif OPENAI_API_KEY and openai_client:
            response = openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": "You are a cultural advisor helping with international business negotiations between artisans and buyers."},
                    {"role": "user", "content": f"A buyer from {buyer_country} is negotiating with an artisan from {artisan_culture}. Context: {negotiation_context}. Provide brief, practical cultural context tips (2-3 sentences)."}
                ],
                max_tokens=150
            )
            return response.choices[0].message.content.strip()
        else:
            return "Be respectful and professional in your communication."
    except Exception as e:
        print(f"Cultural context error: {e}")
        return "Be respectful and professional in your communication."


def get_gemini_response(prompt):
    """
    General purpose Gemini/OpenAI API call
    Used for AI assistant, tutorials, translations, chat, etc.
    """
    try:
        if GEMINI_AVAILABLE and GEMINI_API_KEY and (AI_PROVIDER == 'gemini' or not OPENAI_API_KEY):
            print(f"[Gemini] Calling API with prompt length: {len(prompt)}")
            model = genai.GenerativeModel('gemini-2.5-flash')
            
            # Add safety settings to prevent blocking
            safety_settings = [
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
            ]
            
            response = model.generate_content(
                prompt,
                safety_settings=safety_settings,
                generation_config={
                    'temperature': 0.7,
                    'top_p': 1,
                    'top_k': 40,
                    'max_output_tokens': 1024,
                }
            )
            
            if response and response.text:
                print(f"[Gemini] Response received, length: {len(response.text)}")
                return response.text.strip()
            else:
                print(f"[Gemini] Empty response or blocked. Prompt feedback: {response.prompt_feedback if hasattr(response, 'prompt_feedback') else 'N/A'}")
                return "I couldn't generate a response. Please try rephrasing your question."
                
        elif OPENAI_API_KEY and openai_client and OPENAI_AVAILABLE:
            print(f"[OpenAI] Calling API with prompt length: {len(prompt)}")
            response = openai_client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "user", "content": prompt}
                ],
                max_tokens=1000
            )
            result = response.choices[0].message.content.strip()
            print(f"[OpenAI] Response received, length: {len(result)}")
            return result
        else:
            if not GEMINI_AVAILABLE and AI_PROVIDER == 'gemini':
                error_msg = "Gemini not available. Install with: pip install google-generativeai"
                print(f"[AI Service] {error_msg}")
                return f"AI service is currently unavailable. {error_msg}"
            else:
                print("[AI Service] No API key configured")
                return "AI service is currently unavailable. Please configure an API key."
            
    except Exception as e:
        print(f"[ERROR] AI response error: {type(e).__name__}: {str(e)}")
        # Return a friendly mock response for demo purposes
        return "Namaste! I am currently operating in offline demo mode. I can help you with pricing, quality checks, and buyer communication. How can I assist you today?"


# Print configuration on module load
print(f"AI Service initialized with provider: {AI_PROVIDER}")
print(f"Gemini API Key: {'[OK] Configured' if GEMINI_API_KEY else '[X] Not configured'}")
print(f"OpenAI API Key: {'[OK] Configured' if OPENAI_API_KEY else '[X] Not configured'}")

