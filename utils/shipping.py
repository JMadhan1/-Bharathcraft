
# Shipping Rate Calculator Logic

# Base rates per kg for different destinations (in USD)
BASE_RATES = {
    'US': {'standard': 25, 'express': 45},
    'GB': {'standard': 22, 'express': 40},
    'AE': {'standard': 18, 'express': 32},
    'AU': {'standard': 28, 'express': 50},
    'DE': {'standard': 20, 'express': 38},
    'CA': {'standard': 26, 'express': 48},
    'IN': {'standard': 5, 'express': 10}, # Domestic
    'DEFAULT': {'standard': 30, 'express': 55}
}

# Category multipliers
CATEGORY_MULTIPLIERS = {
    'textiles': 1.0,
    'pottery': 1.3,  # Fragile, needs extra packaging
    'metalwork': 1.2,
    'wood': 1.1,
    'jewelry': 0.8,  # Small and light
    'painting': 1.1
}

# Customs duty estimates (percentage of product value)
CUSTOMS_RATES = {
    'US': 0.067,  # 6.7% for textiles
    'GB': 0.12,
    'AE': 0.05,
    'AU': 0.10,
    'DE': 0.12,
    'CA': 0.18,
    'IN': 0.0,
    'DEFAULT': 0.10
}

def calculate_shipping_cost(origin_country, dest_country, weight, category, product_value_usd):
    """
    Calculate shipping cost from origin to destination.
    Returns a dictionary with standard and express options and breakdown.
    """
    # Normalize inputs
    dest_country = dest_country.upper() if dest_country else 'US'
    category = category.lower() if category else 'textiles'
    weight = float(weight) if weight else 0.5
    product_value_usd = float(product_value_usd) if product_value_usd else 0.0
    
    # Get rates
    base_rate = BASE_RATES.get(dest_country, BASE_RATES['DEFAULT'])
    category_multiplier = CATEGORY_MULTIPLIERS.get(category, 1.0)
    customs_rate = CUSTOMS_RATES.get(dest_country, CUSTOMS_RATES['DEFAULT'])
    
    # Calculate costs
    base_shipping_std = base_rate['standard'] * weight * category_multiplier
    base_shipping_exp = base_rate['express'] * weight * category_multiplier
    
    handling = 5.00  # Fixed handling fee
    insurance = product_value_usd * 0.02  # 2% of product value
    customs_duty = product_value_usd * customs_rate
    
    # Total costs
    standard_total = base_shipping_std + handling + insurance + customs_duty
    express_total = base_shipping_exp + handling + insurance + customs_duty
    
    # Delivery dates
    from datetime import datetime, timedelta
    today = datetime.now()
    standard_arrival = today + timedelta(days=18)
    express_arrival = today + timedelta(days=9)
    
    return {
        'standard': round(standard_total, 2),
        'express': round(express_total, 2),
        'breakdown': {
            'base_standard': round(base_shipping_std, 2),
            'base_express': round(base_shipping_exp, 2),
            'customs': round(customs_duty, 2),
            'handling_insurance': round(handling + insurance, 2)
        },
        'delivery_dates': {
            'standard': standard_arrival.strftime('%Y-%m-%d'),
            'express': express_arrival.strftime('%Y-%m-%d')
        }
    }
