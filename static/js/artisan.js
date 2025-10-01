
const authToken = localStorage.getItem('authToken');
const userData = JSON.parse(localStorage.getItem('userData') || '{}');

if (!authToken || userData.role !== 'artisan') {
    window.location.href = '/';
}

document.getElementById('userName').textContent = userData.full_name || '';

async function showUploadProduct() {
    document.getElementById('uploadModal').style.display = 'flex';
}

function closeUploadModal() {
    document.getElementById('uploadModal').style.display = 'none';
    document.getElementById('productUploadForm').reset();
}

document.addEventListener('DOMContentLoaded', function() {
    loadMyProducts();
    
    document.getElementById('productUploadForm').addEventListener('submit', async function(e) {
        e.preventDefault();
        await uploadProduct();
    });
});

async function uploadProduct() {
    const form = document.getElementById('productUploadForm');
    const formData = new FormData(form);
    
    try {
        const response = await fetch('/api/products/', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${authToken}`
            },
            body: formData
        });
        
        const result = await response.json();
        
        if (response.ok) {
            alert('Product uploaded successfully!');
            closeUploadModal();
            loadMyProducts();
        } else {
            alert('Error uploading product: ' + (result.error || 'Unknown error'));
        }
    } catch (error) {
        console.error('Upload error:', error);
        alert('Error uploading product. Please try again.');
    }
}

async function loadMyProducts() {
    try {
        const response = await fetch('/api/products/my-products', {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const products = await response.json();
        
        const container = document.getElementById('myProducts');
        if (products.length === 0) {
            container.innerHTML = '<p>No products uploaded yet.</p>';
        } else {
            container.innerHTML = products.map(product => `
                <div class="product-item">
                    <h4>${product.title}</h4>
                    <p><strong>Price:</strong> ₹${product.price}</p>
                    <p><strong>Quality Grade:</strong> ${product.quality_grade || 'Not assessed'}</p>
                    <p><strong>Stock:</strong> ${product.stock_quantity}</p>
                    <p><strong>Status:</strong> ${product.is_available ? 'Available' : 'Unavailable'}</p>
                    <p><strong>Created:</strong> ${new Date(product.created_at).toLocaleDateString()}</p>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading products:', error);
        document.getElementById('myProducts').innerHTML = '<p>Error loading products.</p>';
    }
}

async function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    window.location.href = '/';
}
