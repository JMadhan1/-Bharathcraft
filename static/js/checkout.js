// Exchange rates (Base: INR -> Target)
// In production, fetch from API
const EXCHANGE_RATES = {
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
};

const SYMBOLS = {
    'INR': '₹', 'USD': '$', 'GBP': '£', 'EUR': '€',
    'JPY': '¥', 'AED': 'د.إ', 'AUD': 'A$', 'CAD': 'C$'
};

// State (will be initialized after DOM loads)
let state = {};

document.addEventListener('DOMContentLoaded', () => {
    // Initialize state after DOM is ready
    state = {
        currency: 'USD',
        shippingOption: 'standard',
        shippingCosts: null,
        basePriceINR: parseFloat(document.getElementById('basePriceINR').value),
        weight: parseFloat(document.getElementById('productWeight').value) || 0.5,
        category: document.getElementById('productCategory').value || 'textiles',
        quantity: 1
    };

    // Initialize
    fetchBuyerInitData().then(() => {
        const savedCurrency = localStorage.getItem('preferredCurrency');
        if (savedCurrency && document.querySelector(`#currencySelector option[value="${savedCurrency}"]`)) {
            document.getElementById('currencySelector').value = savedCurrency;
            state.currency = savedCurrency;
        } else {
            state.currency = document.getElementById('currencySelector').value;
        }

        updateCurrency();
        calculateShipping();
    });
});

async function fetchBuyerInitData() {
    try {
        const response = await fetch('/checkout/api/init', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            }
        });
        if (response.ok) {
            const data = await response.json();
            if (data.success && data.buyer) {
                if (data.buyer.currency) {
                    // Only set if not already in localStorage
                    if (!localStorage.getItem('preferredCurrency')) {
                        const currencySelector = document.getElementById('currencySelector');
                        if (currencySelector.querySelector(`option[value="${data.buyer.currency}"]`)) {
                            currencySelector.value = data.buyer.currency;
                            state.currency = data.buyer.currency;
                        }
                    }
                }
                if (data.buyer.country) {
                    const countrySelector = document.getElementById('destCountry');
                    let countryCode = data.buyer.country;
                    // Simple mapping based on template values
                    const countryMap = {
                        'India': 'IN', 'USA': 'US', 'United States': 'US', 'UK': 'GB', 'United Kingdom': 'GB',
                        'UAE': 'AE', 'Australia': 'AU', 'Germany': 'DE', 'Canada': 'CA'
                    };
                    if (countryMap[data.buyer.country]) {
                        countryCode = countryMap[data.buyer.country];
                    }

                    if (countrySelector.querySelector(`option[value="${countryCode}"]`)) {
                        countrySelector.value = countryCode;
                    }
                }
            }
        }
    } catch (e) {
        console.error("Failed to fetch buyer init data", e);
    }
}

function updateQuantity() {
    const qtyInput = document.getElementById('quantityInput');
    let qty = parseInt(qtyInput.value);
    if (qty < 1) qty = 1;
    // Optional: check max stock if available in a hidden field or data attribute
    // const maxStock = parseInt(qtyInput.getAttribute('max'));
    // if (qty > maxStock) qty = maxStock;

    state.quantity = qty;
    calculateShipping(); // Recalculate shipping as weight increases
    updateSummary();
}

function updateCurrency() {
    state.currency = document.getElementById('currencySelector').value;
    localStorage.setItem('preferredCurrency', state.currency);

    // Update conversion info
    const rate = EXCHANGE_RATES[state.currency];
    const inverseRate = (1 / rate).toFixed(2);
    document.getElementById('conversionRateDisplay').textContent =
        `1 ${state.currency} = ₹${inverseRate} INR | Last updated: Just now`;

    updateSummary();

    // Re-render shipping prices if available
    if (state.shippingCosts) {
        renderShippingOptions();
    }
}

async function calculateShipping() {
    const destCountry = document.getElementById('destCountry').value;
    // Product value increases with quantity
    const productValueUSD = (state.basePriceINR * state.quantity) * EXCHANGE_RATES['USD'];
    // Total weight increases with quantity
    const totalWeight = state.weight * state.quantity;

    // Show loading state
    document.getElementById('shippingResults').style.display = 'none';

    try {
        const response = await fetch('/checkout/api/calculate-shipping', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
                dest_country: destCountry,
                weight: totalWeight,
                category: state.category,
                product_value_usd: productValueUSD
            })
        });

        const data = await response.json();

        if (data.success) {
            state.shippingCosts = data.shipping;
            document.getElementById('shippingResults').style.display = 'block';
            renderShippingOptions();
            selectShipping(state.shippingOption); // Re-select current option
        } else {
            alert('Error calculating shipping: ' + data.error);
        }
    } catch (error) {
        console.error('Shipping calculation error:', error);
    }
}

function renderShippingOptions() {
    if (!state.shippingCosts) return;

    const rate = EXCHANGE_RATES[state.currency];
    const symbol = SYMBOLS[state.currency] || state.currency;

    // Update Standard Option
    const stdCost = state.shippingCosts.standard / EXCHANGE_RATES['USD'] * rate; // Convert USD -> Target
    document.getElementById('price-standard').textContent = `${symbol}${stdCost.toFixed(2)}`;
    document.getElementById('date-standard').textContent = `Est: ${state.shippingCosts.delivery_dates.standard}`;

    // Update Express Option
    const expCost = state.shippingCosts.express / EXCHANGE_RATES['USD'] * rate;
    document.getElementById('price-express').textContent = `${symbol}${expCost.toFixed(2)}`;
    document.getElementById('date-express').textContent = `Est: ${state.shippingCosts.delivery_dates.express}`;

    // Update Breakdown
    const breakdownHtml = `
        <li>Base Shipping: $${state.shippingCosts.breakdown.base_standard}</li>
        <li>Customs & Duties: $${state.shippingCosts.breakdown.customs}</li>
        <li>Handling & Insurance: $${state.shippingCosts.breakdown.handling_insurance}</li>
    `;
    document.getElementById('shippingBreakdown').innerHTML = breakdownHtml;
}

function selectShipping(option) {
    state.shippingOption = option;

    // Update UI selection
    document.querySelectorAll('.shipping-option').forEach(el => el.classList.remove('selected'));
    document.getElementById(`option-${option}`).classList.add('selected');

    updateSummary();
}

function updateSummary() {
    const rate = EXCHANGE_RATES[state.currency];
    const symbol = SYMBOLS[state.currency] || state.currency;

    // 1. Product Price (Unit Price * Quantity)
    const productPrice = (state.basePriceINR * state.quantity) * rate;
    document.getElementById('summaryProductPrice').textContent = `${symbol}${productPrice.toFixed(2)}`;

    // 2. Platform Fee (8%)
    const platformFee = productPrice * 0.08;
    document.getElementById('summaryPlatformFee').textContent = `${symbol}${platformFee.toFixed(2)}`;

    // 3. Shipping Cost
    let shippingCost = 0;
    if (state.shippingCosts) {
        // Shipping costs are in USD from API, convert to Target
        const costUSD = state.shippingCosts[state.shippingOption];
        shippingCost = costUSD / EXCHANGE_RATES['USD'] * rate;
        document.getElementById('summaryShipping').textContent = `${symbol}${shippingCost.toFixed(2)}`;
    } else {
        document.getElementById('summaryShipping').textContent = 'Calculating...';
    }

    // 4. Total
    const total = productPrice + platformFee + shippingCost;
    document.getElementById('summaryTotal').innerHTML = `<strong>${symbol}${total.toFixed(2)}</strong>`;
    document.getElementById('payBtn').textContent = `Place Order - ${symbol}${total.toFixed(2)}`;

    // 5. Artisan Receives (Base Price * Quantity - 8% Fee) in INR
    const artisanReceives = (state.basePriceINR * state.quantity) * 0.92;
    document.getElementById('artisanReceives').textContent = `₹${Math.floor(artisanReceives).toLocaleString()}`;
}

async function processPayment() {
    if (!state.shippingCosts) {
        alert('Please wait for shipping calculation.');
        return;
    }

    const btn = document.getElementById('payBtn');
    const originalText = btn.textContent;
    btn.textContent = 'Processing...';
    btn.disabled = true;

    try {
        // Calculate shipping cost in target currency for backend
        const rate = EXCHANGE_RATES[state.currency];
        const costUSD = state.shippingCosts[state.shippingOption];
        const shippingCostTarget = costUSD / EXCHANGE_RATES['USD'] * rate;

        const response = await fetch('/checkout/api/process-transaction', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${localStorage.getItem('authToken')}`
            },
            body: JSON.stringify({
                product_id: document.getElementById('productId').value,
                currency: state.currency,
                shipping_option: state.shippingOption,
                shipping_cost: shippingCostTarget,
                quantity: state.quantity
            })
        });

        const data = await response.json();

        if (data.success) {
            alert('Order Request Sent! The artisan will review your order. You will be notified when approved and can then proceed with payment. Order ID: ' + data.order_id);
            window.location.href = '/buyer'; // Redirect to dashboard
        } else {
            alert('Order request failed: ' + data.error);
            btn.textContent = originalText;
            btn.disabled = false;
        }
    } catch (error) {
        console.error('Payment error:', error);
        alert('An error occurred during payment.');
        btn.textContent = originalText;
        btn.disabled = false;
    }
}
