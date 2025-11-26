(function () {
    'use strict';

    const authToken = localStorage.getItem('authToken');
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');

    if (!authToken || userData.role !== 'artisan') {
        window.location.href = '/';
    }

    document.getElementById('userName').textContent = userData.full_name || '';

    // Expose functions globally for onclick handlers
    window.showUploadProduct = function () {
        document.getElementById('uploadModal').classList.add('active');
    };

    window.closeUploadModal = function () {
        document.getElementById('uploadModal').classList.remove('active');
        document.getElementById('productUploadForm').reset();
    };

    document.addEventListener('DOMContentLoaded', function () {
        loadMyProducts();

        document.getElementById('productUploadForm').addEventListener('submit', async function (e) {
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
                window.closeUploadModal();
                loadMyProducts();
            } else {
                // Handle invalid token errors (401, 422)
                if (response.status === 422 || response.status === 401) {
                    alert('Your session has expired or is invalid. Please log in again.');
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('userData');
                    window.location.href = '/';
                    return;
                }
                
                // Show detailed error message
                const errorMsg = result.error || result.message || 'Unknown error';
                alert('Error uploading product: ' + errorMsg);
                console.error('Upload error details:', result);
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Error uploading product: ' + error.message + '. Please check the console for details.');
        }
    }

    async function loadMyProducts() {
        try {
            const response = await fetch('/api/products/my-products', {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            const data = await response.json();

            // Check if response is successful and data is an array
            if (!response.ok) {
                console.error('Error loading products:', data);
                
                // Handle invalid token errors (401, 422)
                if (response.status === 422 || response.status === 401) {
                    alert('Your session has expired or is invalid. Please log in again.');
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('userData');
                    window.location.href = '/';
                    return;
                }
                
                document.getElementById('myProducts').innerHTML = '<p>Error loading products: ' + (data.error || 'Unknown error') + '</p>';
                return;
            }

            if (!Array.isArray(data)) {
                console.error('Invalid response format:', data);
                document.getElementById('myProducts').innerHTML = '<p>Error: Invalid response from server</p>';
                return;
            }

            const container = document.getElementById('myProducts');
            if (data.length === 0) {
                container.innerHTML = '<p>No products uploaded yet.</p>';
            } else {
                container.innerHTML = data.map(product => {
                    // Get first image or use placeholder
                    const imageUrl = (product.images && product.images.length > 0) 
                        ? '/' + product.images[0] 
                        : '/static/uploads/placeholder.jpg';
                    
                    // Format quality score
                    const qualityScore = product.ai_quality_score 
                        ? (product.ai_quality_score * 100).toFixed(0) + '%' 
                        : 'N/A';
                    
                    return `
                        <div class="product-item" style="display: flex; gap: 15px; background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); margin-bottom: 15px;">
                            <div style="flex-shrink: 0;">
                                <img src="${imageUrl}" 
                                     alt="${product.title}" 
                                     style="width: 150px; height: 150px; object-fit: cover; border-radius: 8px;"
                                     onerror="this.src='/static/uploads/placeholder.jpg'">
                            </div>
                            <div style="flex-grow: 1;">
                                <h4 style="margin: 0 0 10px 0; color: #333;">${product.title}</h4>
                                <p style="margin: 5px 0; color: #666; font-size: 14px;">${product.description || 'No description'}</p>
                                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 10px;">
                                    <p style="margin: 0;"><strong>Price:</strong> ₹${product.price}</p>
                                    <p style="margin: 0;"><strong>Stock:</strong> ${product.stock_quantity}</p>
                                    <p style="margin: 0;"><strong>Quality:</strong> <span style="color: ${product.quality_grade === 'premium' ? '#28a745' : product.quality_grade === 'standard' ? '#007bff' : '#6c757d'};">${product.quality_grade || 'N/A'}</span> (${qualityScore})</p>
                                    <p style="margin: 0;"><strong>Status:</strong> <span style="color: ${product.is_available ? '#28a745' : '#dc3545'};">${product.is_available ? '✓ Available' : '✗ Unavailable'}</span></p>
                                    <p style="margin: 0;"><strong>Craft Type:</strong> ${product.craft_type || 'N/A'}</p>
                                    <p style="margin: 0;"><strong>Production Time:</strong> ${product.production_time_days || 'N/A'} days</p>
                                </div>
                                <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">Created: ${new Date(product.created_at).toLocaleDateString()}</p>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        } catch (error) {
            console.error('Error loading products:', error);
            document.getElementById('myProducts').innerHTML = '<p>Error loading products.</p>';
        }
    }

    // Expose logout globally (used in header)
    window.logout = function () {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = '/';
    };
})();
