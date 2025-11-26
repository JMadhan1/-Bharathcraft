(function () {
    'use strict';

    const authToken = localStorage.getItem('authToken');
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');

    if (!authToken || userData.role !== 'buyer') {
        window.location.href = '/';
    }

    document.getElementById('userName').textContent = userData.full_name || '';

    async function loadProducts() {
        try {
            const response = await fetch('/api/products/');
            
            // Handle authentication errors
            if (response.status === 422 || response.status === 401) {
                alert('Your session has expired or is invalid. Please log in again.');
                localStorage.removeItem('authToken');
                localStorage.removeItem('userData');
                window.location.href = '/';
                return;
            }
            
            const products = await response.json();

            const grid = document.getElementById('productsGrid');
            grid.innerHTML = products.map(p => {
                // Get first image or use placeholder
                const imageUrl = (p.images && p.images.length > 0) 
                    ? '/' + p.images[0] 
                    : '/static/uploads/placeholder.jpg';
                
                // Format quality
                const qualityBadge = p.quality_grade 
                    ? `<span style="background: ${p.quality_grade === 'premium' ? '#28a745' : p.quality_grade === 'standard' ? '#007bff' : '#6c757d'}; color: white; padding: 3px 8px; border-radius: 3px; font-size: 11px; text-transform: uppercase;">${p.quality_grade}</span>`
                    : '';
                
                return `
                    <div class="product-card" style="background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); transition: transform 0.2s;">
                        <img src="${imageUrl}" 
                             alt="${p.title}" 
                             style="width: 100%; height: 200px; object-fit: cover;"
                             onerror="this.src='/static/uploads/placeholder.jpg'">
                        <div class="product-details" style="padding: 15px;">
                            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                                <h3 class="product-title" style="margin: 0; font-size: 18px; color: #333;">${p.title}</h3>
                                ${qualityBadge}
                            </div>
                            <p style="color: #666; font-size: 14px; margin: 8px 0; line-height: 1.4;">${p.description || 'No description available'}</p>
                            <p class="product-price" style="font-size: 20px; font-weight: bold; color: #007bff; margin: 10px 0;">₹${p.price}</p>
                            <div style="display: flex; justify-content: space-between; font-size: 12px; color: #999; margin-top: 10px;">
                                <span>By ${p.artisan?.name || 'Unknown Artisan'}</span>
                                <span>${p.craft_type || 'Handicraft'}</span>
                            </div>
                            ${p.ai_quality_score ? `<p style="font-size: 12px; color: #666; margin-top: 5px;">Quality Score: ${(p.ai_quality_score * 100).toFixed(0)}%</p>` : ''}
                        </div>
                    </div>
                `;
            }).join('');
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }

    loadProducts();
})();
