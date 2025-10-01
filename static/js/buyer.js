const authToken = localStorage.getItem('authToken');
const userData = JSON.parse(localStorage.getItem('userData') || '{}');

if (!authToken || userData.role !== 'buyer') {
    window.location.href = '/';
}

document.getElementById('userName').textContent = userData.full_name || '';

async function loadProducts() {
    try {
        const response = await fetch('/api/products/');
        const products = await response.json();
        
        const grid = document.getElementById('productsGrid');
        grid.innerHTML = products.map(p => `
            <div class="product-card">
                <div class="product-details">
                    <h3 class="product-title">${p.title}</h3>
                    <p>${p.description}</p>
                    <p class="product-price">₹${p.price}</p>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

loadProducts();
