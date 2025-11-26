import os

# Try to import Gemini-enhanced service first
try:
    import google.generativeai as genai
    # If Gemini is available, use the enhanced service
    from utils.ai_service_gemini import assess_quality, translate_text, get_cultural_context
    _USING_GEMINI = True
    print("[OK] Using enhanced AI service with Gemini support")
except (ImportError, ModuleNotFoundError):
    # Fall back to OpenAI-only implementation
    _USING_GEMINI = False
    print("[WARNING] Gemini package not installed, using OpenAI only")
    from openai import OpenAI
    
    client = OpenAI(api_key=os.getenv('OPENAI_API_KEY', ''))

    def assess_quality(image_path):
        if not os.getenv('OPENAI_API_KEY'):
            return 0.75
        
        try:
            with open(image_path, 'rb') as image_file:
                import base64
                base64_image = base64.b64encode(image_file.read()).decode('utf-8')
            
            response = client.chat.completions.create(
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
            print(f"Quality assessment error: {e}")
            return 0.75

    def translate_text(text, target_language):
        if not os.getenv('OPENAI_API_KEY'):
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
            
            response = client.chat.completions.create(
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
            print(f"Translation error: {e}")
            return text

    def get_cultural_context(buyer_country, artisan_culture, negotiation_context):
        if not os.getenv('OPENAI_API_KEY'):
            return "Be respectful and professional in your communication."
        
        try:
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a cultural advisor helping with international business negotiations between artisans and buyers."
                    },
                    {
                        "role": "user",
                        "content": f"A buyer from {buyer_country} is negotiating with an artisan from {artisan_culture}. Context: {negotiation_context}. Provide brief, practical cultural context tips (2-3 sentences)."
                    }
                ],
                max_tokens=150
            )
            
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"Cultural context error: {e}")
            return "Be respectful and professional in your communication."
