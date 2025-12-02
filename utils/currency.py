
# Simple mapping of countries to currencies
COUNTRY_CURRENCY_MAP = {
    'India': 'INR',
    'United States': 'USD',
    'USA': 'USD',
    'United Kingdom': 'GBP',
    'UK': 'GBP',
    'Canada': 'CAD',
    'Australia': 'AUD',
    'Germany': 'EUR',
    'France': 'EUR',
    'Italy': 'EUR',
    'Spain': 'EUR',
    'Netherlands': 'EUR',
    'Japan': 'JPY',
    'China': 'CNY',
    'Singapore': 'SGD',
    'UAE': 'AED',
    'Saudi Arabia': 'SAR',
    'Brazil': 'BRL',
    'Russia': 'RUB',
    'South Africa': 'ZAR'
}

# Approximate exchange rates (Base: INR)
# In a real app, fetch this from an API
# Approximate exchange rates (Base: INR)
# In a real app, fetch this from an API
EXCHANGE_RATES = {
    'INR': 1.0,
    'USD': 0.012,
    'GBP': 0.0095,
    'EUR': 0.011,
    'CAD': 0.016,
    'AUD': 0.018,
    'JPY': 1.78,
    'CNY': 0.086,
    'SGD': 0.016,
    'AED': 0.044,
    'SAR': 0.045,
    'BRL': 0.059,
    'RUB': 1.08,
    'ZAR': 0.22
}

# Inverse rates (Base: Foreign Currency -> INR)
# 1 Unit of Foreign Currency = X INR
INVERSE_RATES = {
    'INR': 1.0,
    'USD': 83.45,
    'GBP': 105.30,
    'EUR': 90.20,
    'CAD': 61.50,
    'AUD': 54.80,
    'JPY': 0.56,
    'CNY': 11.60,
    'SGD': 62.10,
    'AED': 22.70,
    'SAR': 22.20,
    'BRL': 16.90,
    'RUB': 0.92,
    'ZAR': 4.50
}

def get_currency_for_country(country):
    """Get currency code for a given country"""
    if not country:
        return 'USD'
    
    # Normalize country name
    country = country.strip()
    
    # Check map
    for key, value in COUNTRY_CURRENCY_MAP.items():
        if key.lower() == country.lower():
            return value
            
    return 'USD'  # Default

def get_exchange_rate(target_currency):
    """Get exchange rate from INR to target currency"""
    return EXCHANGE_RATES.get(target_currency, EXCHANGE_RATES['USD'])

def get_inverse_rate(source_currency):
    """Get exchange rate from source currency to INR"""
    return INVERSE_RATES.get(source_currency, INVERSE_RATES['USD'])

def convert_price(price_inr, target_currency):
    """Convert INR price to target currency"""
    if not price_inr:
        return 0.0
        
    if target_currency == 'INR':
        return float(price_inr)
        
    rate = get_exchange_rate(target_currency)
    return round(price_inr * rate, 2)

def convert_to_inr(price_foreign, source_currency):
    """Convert foreign price to INR"""
    if not price_foreign:
        return 0.0
        
    if source_currency == 'INR':
        return float(price_foreign)
        
    rate = get_inverse_rate(source_currency)
    return round(price_foreign * rate, 2)

def format_price(price, currency):
    """Format price with currency symbol"""
    symbols = {
        'INR': '₹',
        'USD': '$',
        'GBP': '£',
        'EUR': '€',
        'JPY': '¥',
        'AED': 'د.إ',
        'AUD': 'A$',
        'CAD': 'C$'
    }
    
    symbol = symbols.get(currency, currency + ' ')
    return f"{symbol}{price}"
