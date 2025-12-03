from flask import Blueprint, render_template, jsonify, request, g
from flask_jwt_extended import jwt_required, get_jwt_identity
import json

bp = Blueprint('features', __name__, url_prefix='/features')

@bp.route('/success-stories')
def success_stories():
    """Artisan Success Stories Page"""
    return render_template('success-stories.html')

@bp.route('/translation-demo')
def translation_demo():
    """AI Cultural Translation Engine Demo"""
    return render_template('features/translation-demo.html')

@bp.route('/quality-grading')
def quality_grading():
    """Computer Vision Quality Grading Demo"""
    return render_template('features/quality-grading.html')

@bp.route('/currency-converter')
def currency_converter():
    """Multi-Currency Transaction System Demo"""
    return render_template('features/currency-converter.html')

@bp.route('/shipping-calculator')
def shipping_calculator():
    """International Shipping Calculator Demo"""
    return render_template('features/shipping-calculator.html')

@bp.route('/blockchain-trace')
def blockchain_trace():
    """Blockchain Traceability Demo"""
    return render_template('features/blockchain-trace.html')

@bp.route('/analytics')
def analytics():
    """Analytics Dashboard Demo"""
    return render_template('features/analytics.html')

# API Endpoints for Translation Demo
@bp.route('/api/translate', methods=['POST'])
def translate_message():
    """Translate buyer message with business context"""
    data = request.json
    message = data.get('message', '')
    target_language = data.get('target_language', 'hindi')
    
    # Translation examples database
    translation_db = {
        "Can you reduce the price?": {
            "intent": "PRICE_NEGOTIATION",
            "hindi": "क्या आप कीमत कम कर सकते हैं?",
            "gujarati": "શું તમે કિંમત ઘટાડી શકો છો?",
            "tamil": "விலையை குறைக்க முடியுமா?",
            "telugu": "మీరు ధరను తగ్గించగలరా?",
            "context": "💡 Buyer चाहते हैं discount। यह normal negotiation है।",
            "suggestion": "📊 Similar orders में 10-12% discount से 73% deals close हुईं। आप ₹450 offer करें (regular ₹500 से 10% कम)।",
            "success_rate": 73
        },
        "I need 100 pieces, what's bulk pricing?": {
            "intent": "BULK_ORDER_INQUIRY",
            "hindi": "मुझे 100 pieces चाहिए, bulk pricing क्या है?",
            "gujarati": "મને 100 ટુકડાઓ જોઈએ છે, બલ્ક કિંમત શું છે?",
            "tamil": "எனக்கு 100 துண்டுகள் வேண்டும், மொத்த விலை என்ன?",
            "telugu": "నాకు 100 ముక్కలు కావాలి, బల్క్ ధర ఏమిటి?",
            "context": "💡 बड़ा order है! Buyer serious है। Bulk discount देना normal practice है।",
            "suggestion": "📊 100+ pieces पर आप 15-18% discount दे सकते हैं। ₹425 per piece suggest करें। Monthly income ₹42,500 होगा!",
            "success_rate": 87
        },
        "Can you customize the design?": {
            "intent": "CUSTOMIZATION_REQUEST",
            "hindi": "क्या आप design customize कर सकते हैं?",
            "gujarati": "શું તમે ડિઝાઇન કસ્ટમાઇઝ કરી શકો છો?",
            "tamil": "வடிவமைப்பை தனிப்பயனாக்க முடியுமா?",
            "telugu": "మీరు డిజైన్‌ను అనుకూలీకరించగలరా?",
            "context": "💡 Premium opportunity! Custom orders usually pay 20-30% extra।",
            "suggestion": "📊 हाँ कहें और extra ₹150-200 per piece charge करें। Design discussion के लिए sample photos मांगें।",
            "success_rate": 92
        },
        "What's your delivery time?": {
            "intent": "LOGISTICS_INQUIRY",
            "hindi": "Delivery में कितना समय लगेगा?",
            "gujarati": "ડિલિવરીમાં કેટલો સમય લાગશે?",
            "tamil": "விநியோகத்திற்கு எவ்வளவு நேரம் ஆகும்?",
            "telugu": "డెలివరీకి ఎంత సమయం పడుతుంది?",
            "context": "💡 Buyer timeline check कर रहा है। Fast delivery = better pricing।",
            "suggestion": "📊 Standard delivery: 15-20 days बताएं। Express available है तो mention करें (7-10 days)। Urgent order के लिए 10% extra charge reasonable है।",
            "success_rate": 95
        }
    }
    
    # Find matching translation or return generic
    result = translation_db.get(message, {
        "intent": "GENERAL_INQUIRY",
        "hindi": "आपका message translate हो रहा है...",
        "gujarati": "તમારો સંદેશ અનુવાદિત થઈ રહ્યો છે...",
        "tamil": "உங்கள் செய்தி மொழிபெயர்க்கப்படுகிறது...",
        "telugu": "మీ సందేశం అనువదించబడుతోంది...",
        "context": "💡 General buyer inquiry। Professional response दें।",
        "suggestion": "📊 Polite और detailed reply दें। Response time fast रखें।",
        "success_rate": 85
    })
    
    return jsonify({
        'success': True,
        'translation': result.get(target_language, result.get('hindi')),
        'context': result.get('context'),
        'suggestion': result.get('suggestion'),
        'success_rate': result.get('success_rate'),
        'intent': result.get('intent')
    })

# API Endpoint for Quality Grading
@bp.route('/api/analyze-quality', methods=['POST'])
def analyze_quality():
    """Analyze product quality from image"""
    # Mock quality analysis result
    result = {
        "grade": "PREMIUM",
        "confidence": 94,
        "dimensions": "45cm x 45cm (±1cm)",
        "weight": "185g",
        "material": "100% cotton with polyester thread",
        "threadCount": "180",
        "stitchDensity": "18 stitches/cm²",
        "strengths": [
            "Uniform stitch density across entire surface",
            "Precise pattern alignment with no distortion",
            "High-quality cotton base fabric (180 thread count)",
            "Professional finishing with hidden seams",
            "Colorfast dyes (tested visually)"
        ],
        "issues": [
            "2 loose threads on back side (easily fixable in 2 minutes)",
            "Slight color variation in border region (within 5% tolerance)"
        ],
        "hsCode": "6304.93.00",
        "dutyRate": "6.7%",
        "requirements": [
            {"name": "Textile fiber content label", "met": True},
            {"name": "Country of origin marking", "met": True},
            {"name": "OEKO-TEX certification (recommended)", "met": False},
            {"name": "Flammability test for children's items", "met": True}
        ],
        "improvementTips": [
            {"icon": "✂️", "hindi": "पीछे की तरफ के 2 धागे काट दें (2 मिनट में fix हो जाएगा)"},
            {"icon": "🎨", "hindi": "बॉर्डर का रंग थोड़ा और consistent बनाएं"},
            {"icon": "🏆", "hindi": "Perfect! यह PREMIUM category में बेच सकते हैं"},
            {"icon": "💰", "hindi": "इस quality के लिए ₹500-600 price justify होगी"}
        ],
        "exportReady": True
    }
    
    return jsonify({
        'success': True,
        'result': result
    })

# API Endpoint for Shipping Calculator
@bp.route('/api/calculate-shipping', methods=['POST'])
def calculate_shipping():
    """Calculate international shipping costs"""
    data = request.json
    dest_country = data.get('country', 'US')
    weight = float(data.get('weight', 1.0))
    product_value = float(data.get('value', 4500))
    
    # Shipping rates database
    shipping_rates = {
        'US': {'standard': 25, 'express': 45, 'delivery': {'standard': '15-20', 'express': '7-10'}, 'customs': 0.067},
        'GB': {'standard': 22, 'express': 40, 'delivery': {'standard': '12-18', 'express': '6-9'}, 'customs': 0.12},
        'AE': {'standard': 18, 'express': 32, 'delivery': {'standard': '10-15', 'express': '5-7'}, 'customs': 0.05},
        'AU': {'standard': 28, 'express': 50, 'delivery': {'standard': '18-25', 'express': '10-14'}, 'customs': 0.10},
        'DE': {'standard': 20, 'express': 38, 'delivery': {'standard': '14-20', 'express': '7-10'}, 'customs': 0.12},
        'CA': {'standard': 26, 'express': 48, 'delivery': {'standard': '16-22', 'express': '8-12'}, 'customs': 0.18},
    }
    
    rates = shipping_rates.get(dest_country, shipping_rates['US'])
    
    # Calculate costs
    base_standard = rates['standard'] * weight
    base_express = rates['express'] * weight
    handling = 5.00
    insurance = (product_value / 83.45) * 0.02  # 2% of USD value
    customs = (product_value / 83.45) * rates['customs']
    
    from datetime import datetime, timedelta
    today = datetime.now()
    standard_days = int(rates['delivery']['standard'].split('-')[1])
    express_days = int(rates['delivery']['express'].split('-')[1])
    
    standard_arrival = (today + timedelta(days=standard_days)).strftime('%b %d, %Y')
    express_arrival = (today + timedelta(days=express_days)).strftime('%b %d, %Y')
    
    return jsonify({
        'success': True,
        'standard': {
            'total': round(base_standard + handling + insurance + customs, 2),
            'baseShipping': round(base_standard, 2),
            'handling': round(handling, 2),
            'insurance': round(insurance, 2),
            'customs': round(customs, 2),
            'deliveryDays': rates['delivery']['standard'],
            'arrivalDate': standard_arrival
        },
        'express': {
            'total': round(base_express + handling + insurance + customs, 2),
            'baseShipping': round(base_express, 2),
            'handling': round(handling, 2),
            'insurance': round(insurance, 2),
            'customs': round(customs, 2),
            'deliveryDays': rates['delivery']['express'],
            'arrivalDate': express_arrival
        },
        'customsPercent': round(rates['customs'] * 100, 1)
    })
