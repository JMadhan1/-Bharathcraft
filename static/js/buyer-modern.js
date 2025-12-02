/**
 * Modern Buyer Dashboard
 * Attractive, functional interface for global buyers
 */

(function () {
    'use strict';

    const authToken = localStorage.getItem('authToken');
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');

    if (!authToken || userData.role !== 'buyer') {
        window.location.href = '/';
        return;
    }

    let allProducts = [];
    let filteredProducts = [];
    let wishlist = JSON.parse(localStorage.getItem('wishlist') || '[]');
    let cart = JSON.parse(localStorage.getItem('cart') || '[]');

    // Initialize
    document.addEventListener('DOMContentLoaded', function () {
        document.getElementById('userName').textContent = userData.full_name || 'Buyer';
        updateWishlistCount();
        updateCartCount();
        loadProducts();
    });

    // Load Products
    async function loadProducts() {
        try {
            const response = await authenticatedFetch('/api/products/', {
                method: 'GET'
            });

            if (response.ok) {
                allProducts = await response.json();
                filteredProducts = [...allProducts];
                displayProducts(filteredProducts);
                updateResultsCount();
            } else {
                document.getElementById('productsGrid').innerHTML = `
                    <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                        <p>No products available at the moment.</p>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error loading products:', error);
            document.getElementById('productsGrid').innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                    <p>Error loading products. Please refresh the page.</p>
                </div>
            `;
        }
    }

    // Display Products
    function displayProducts(products) {
        const grid = document.getElementById('productsGrid');

        if (products.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                    <i class="fas fa-search" style="font-size: 3rem; color: var(--gray-300); margin-bottom: 1rem;"></i>
                    <p style="font-size: 1.25rem; color: var(--gray-500);">No products found matching your filters.</p>
                    <button onclick="clearFilters()" style="margin-top: 1rem; padding: 0.75rem 2rem; background: var(--primary); color: white; border: none; border-radius: 50px; cursor: pointer; font-weight: 600;">
                        Clear Filters
                    </button>
                </div>
            `;
            return;
        }

        grid.innerHTML = products.map(product => createProductCard(product)).join('');
    }

    // Create Product Card HTML
    function createProductCard(product) {
        const isWishlisted = wishlist.includes(product.id);
        const images = product.images || [];
        const imageSrc = images.length > 0 ? `/${images[0]}` : '/static/uploads/placeholder.jpg';
        const qualityColor = product.quality_grade === 'PREMIUM' ? '#F59E0B' :
            product.quality_grade === 'STANDARD' ? '#3B82F6' : '#6B7280';

        const currencySymbol = getCurrencySymbol(product.currency || 'INR');
        const displayPrice = product.display_price || product.price;

        // Check stock
        const isOutOfStock = product.stock_quantity <= 0;
        const blurStyle = isOutOfStock ? 'filter: grayscale(100%) blur(2px); opacity: 0.7;' : '';
        const overlay = isOutOfStock ? '<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.7); color: white; padding: 0.5rem 1rem; border-radius: 4px; font-weight: bold; z-index: 10;">SOLD OUT</div>' : '';

        return `
            <div class="product-card" data-product-id="${product.id}" style="${isOutOfStock ? 'pointer-events: none;' : ''}">
                <div class="product-image-container" style="position: relative;">
                    <img src="${imageSrc}" alt="${product.title}" class="product-image" onerror="this.src='/static/uploads/placeholder.jpg'" style="${blurStyle}">
                    ${overlay}
                    <div class="product-badges">
                        ${product.quality_grade === 'PREMIUM' ? '<span class="badge-tag badge-premium">⭐ Premium</span>' : ''}
                    </div>
                    <button class="product-wishlist-btn ${isWishlisted ? 'active' : ''}" onclick="toggleWishlist(${product.id}); event.stopPropagation();" ${isOutOfStock ? 'disabled' : ''}>
                        <i class="fas fa-heart"></i>
                    </button>
                </div>
                <div class="product-details" style="${isOutOfStock ? 'opacity: 0.6;' : ''}">
                    <h3 class="product-title">${product.title}</h3>
                    <div class="product-artisan">
                        <i class="fas fa-user"></i>
                        <span>${product.artisan?.name || 'Artisan'}</span>
                    </div>
                    <div class="product-rating">
                        <div class="stars">
                            ${'★'.repeat(Math.floor(product.artisan?.quality_rating || 4))}${'☆'.repeat(5 - Math.floor(product.artisan?.quality_rating || 4))}
                        </div>
                        <span class="rating-count">(${Math.floor(Math.random() * 50) + 10})</span>
                    </div>
                    <div class="product-price">${currencySymbol}${displayPrice.toLocaleString()}</div>
                    <div class="product-actions">
                        <button class="btn-add-cart" onclick="addToCart(${product.id}); event.stopPropagation();" ${isOutOfStock ? 'disabled' : ''}>
                            <i class="fas fa-cart-plus"></i> Add to Cart
                        </button>
                        <button class="btn-buy-now" onclick="window.location.href='/checkout/${product.id}'; event.stopPropagation();" style="background: #10B981; color: white; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer; font-weight: 600; margin-left: 0.5rem;" ${isOutOfStock ? 'disabled' : ''}>
                            <i class="fas fa-bolt"></i> Buy Now
                        </button>
                        <button class="btn-contact-seller" onclick="openChatWithSeller(${product.artisan?.id || 0}, '${(product.artisan?.name || 'Artisan').replace(/'/g, "\\'")}', ${product.id}); event.stopPropagation();" title="Contact Seller">
                            <i class="fas fa-comments"></i>
                        </button>
                        <button class="btn-quick-view" onclick="showQuickView(${product.id}); event.stopPropagation();">
                            <i class="fas fa-eye"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    function getCurrencySymbol(currency) {
        const symbols = {
            'INR': '₹',
            'USD': '$',
            'GBP': '£',
            'EUR': '€',
            'JPY': '¥'
        };
        return symbols[currency] || currency + ' ';
    }

    // Update Results Count
    function updateResultsCount() {
        document.getElementById('resultsCount').textContent =
            `Showing ${filteredProducts.length} of ${allProducts.length} products`;
    }

    // Apply Filters
    window.applyFilters = function () {
        filteredProducts = allProducts.filter(product => {
            // Category filter
            const categoryCheckboxes = document.querySelectorAll('.filter-options input[value]:checked');
            const selectedCategories = Array.from(categoryCheckboxes).map(cb => cb.value);
            if (selectedCategories.length > 0 && !selectedCategories.some(cat =>
                product.craft_type?.toLowerCase().includes(cat.toLowerCase()))) {
                return false;
            }

            // Price filter
            const minPrice = parseFloat(document.getElementById('minPrice')?.value || 0);
            const maxPrice = parseFloat(document.getElementById('maxPrice')?.value || Infinity);
            if (product.price < minPrice || product.price > maxPrice) {
                return false;
            }

            // Quality filter
            const qualityCheckboxes = document.querySelectorAll('.filter-section:nth-child(4) .filter-options input:checked');
            const selectedQualities = Array.from(qualityCheckboxes).map(cb => cb.value.toUpperCase());
            if (selectedQualities.length > 0 && !selectedQualities.includes(product.quality_grade)) {
                return false;
            }

            return true;
        });

        displayProducts(filteredProducts);
        updateResultsCount();
    };

    // Clear Filters
    window.clearFilters = function () {
        document.querySelectorAll('.filter-options input[type="checkbox"]').forEach(cb => cb.checked = false);
        document.getElementById('minPrice').value = '';
        document.getElementById('maxPrice').value = '';
        document.getElementById('priceRange').value = 10000;
        document.getElementById('priceRangeValue').textContent = 'Up to ₹10,000';
        document.querySelector('.region-select').value = '';

        filteredProducts = [...allProducts];
        displayProducts(filteredProducts);
        updateResultsCount();
    };

    // Sort Products
    window.sortProducts = function (sortBy) {
        switch (sortBy) {
            case 'price-low':
                filteredProducts.sort((a, b) => a.price - b.price);
                break;
            case 'price-high':
                filteredProducts.sort((a, b) => b.price - a.price);
                break;
            case 'newest':
                filteredProducts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
                break;
            case 'rating':
                filteredProducts.sort((a, b) => (b.artisan?.quality_rating || 0) - (a.artisan?.quality_rating || 0));
                break;
            default: // featured
                filteredProducts.sort((a, b) => (b.ai_quality_score || 0) - (a.ai_quality_score || 0));
        }
        displayProducts(filteredProducts);
    };

    // Update Price Range
    window.updatePriceRange = function (value) {
        document.getElementById('priceRangeValue').textContent = `Up to ₹${parseInt(value).toLocaleString()}`;
        document.getElementById('maxPrice').value = value;
        applyFilters();
    };

    // Quick Search
    window.quickSearch = function (query) {
        if (!query.trim()) {
            filteredProducts = [...allProducts];
        } else {
            const lowerQuery = query.toLowerCase();
            filteredProducts = allProducts.filter(product =>
                product.title.toLowerCase().includes(lowerQuery) ||
                product.description?.toLowerCase().includes(lowerQuery) ||
                product.craft_type?.toLowerCase().includes(lowerQuery) ||
                product.artisan?.name?.toLowerCase().includes(lowerQuery)
            );
        }
        displayProducts(filteredProducts);
        updateResultsCount();
    };

    // Wishlist Functions
    window.toggleWishlist = function (productId) {
        const index = wishlist.indexOf(productId);
        if (index > -1) {
            wishlist.splice(index, 1);
        } else {
            wishlist.push(productId);
        }
        localStorage.setItem('wishlist', JSON.stringify(wishlist));
        updateWishlistCount();
        displayProducts(filteredProducts); // Refresh to update button states
    };

    function updateWishlistCount() {
        document.getElementById('wishlistCount').textContent = wishlist.length;
    }

    window.showWishlist = function () {
        const modal = document.getElementById('wishlistModal');
        modal.classList.add('active');

        const wishlistedProducts = allProducts.filter(p => wishlist.includes(p.id));
        const wishlistItems = document.getElementById('wishlistItems');

        if (wishlistedProducts.length === 0) {
            wishlistItems.innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <i class="fas fa-heart-broken" style="font-size: 3rem; color: var(--gray-300);"></i>
                    <p style="margin-top: 1rem;">Your wishlist is empty</p>
                </div>
            `;
        } else {
            wishlistItems.innerHTML = wishlistedProducts.map(product => `
                <div style="display: flex; gap: 1rem; padding: 1rem; border-bottom: 1px solid var(--gray-200);">
                    <img src="/${product.images[0] || 'static/uploads/placeholder.jpg'}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;">
                    <div style="flex: 1;">
                        <h4>${product.title}</h4>
                        <p style="color: var(--primary); font-weight: 700;">₹${product.price}</p>
                    </div>
                    <button onclick="addToCart(${product.id})" style="padding: 0.5rem 1rem; background: var(--primary); color: white; border: none; border-radius: 8px; cursor: pointer;">
                        Add to Cart
                    </button>
                </div>
            `).join('');
        }
    };

    window.closeWishlist = function () {
        document.getElementById('wishlistModal').classList.remove('active');
    };

    // Cart Functions
    window.addToCart = function (productId) {
        const product = allProducts.find(p => p.id === productId);
        if (!product) return;

        const existingItem = cart.find(item => item.id === productId);
        if (existingItem) {
            existingItem.quantity++;
        } else {
            cart.push({ ...product, quantity: 1 });
        }

        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartCount();

        // Show feedback
        alert(`✓ ${product.title} added to cart!`);
    };

    function updateCartCount() {
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        document.getElementById('cartCount').textContent = totalItems;
    }

    window.showCart = function () {
        const modal = document.getElementById('cartModal');
        modal.classList.add('active');

        const cartItems = document.getElementById('cartItems');

        if (cart.length === 0) {
            cartItems.innerHTML = `
                <div style="text-align: center; padding: 3rem;">
                    <i class="fas fa-shopping-cart" style="font-size: 3rem; color: var(--gray-300);"></i>
                    <p style="margin-top: 1rem;">Your cart is empty</p>
                </div>
            `;
            document.getElementById('cartTotal').textContent = '₹0';
        } else {
            cartItems.innerHTML = cart.map(item => `
                <div style="display: flex; gap: 1rem; padding: 1rem; border-bottom: 1px solid var(--gray-200);">
                    <img src="/${item.images[0] || 'static/uploads/placeholder.jpg'}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;">
                    <div style="flex: 1;">
                        <h4>${item.title}</h4>
                        <p style="color: var(--primary); font-weight: 700;">₹${item.price} × ${item.quantity}</p>
                    </div>
                    <button onclick="removeFromCart(${item.id})" style="padding: 0.5rem; background: var(--danger); color: white; border: none; border-radius: 8px; cursor: pointer;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `).join('');

            const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            document.getElementById('cartTotal').textContent = `₹${total.toLocaleString()}`;
        }
    };

    window.closeCart = function () {
        document.getElementById('cartModal').classList.remove('active');
    };

    window.removeFromCart = function (productId) {
        cart = cart.filter(item => item.id !== productId);
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartCount();
        showCart(); // Refresh cart view
    };

    window.proceedToCheckout = function () {
        if (cart.length === 0) {
            alert('Your cart is empty!');
            return;
        }
        alert('Checkout feature coming soon! Total: ' + document.getElementById('cartTotal').textContent);
    };

    // Quick View
    window.showQuickView = function (productId) {
        const product = allProducts.find(p => p.id === productId);
        if (!product) return;

        const modal = document.getElementById('quickViewModal');
        const content = document.getElementById('quickViewContent');

        const currencySymbol = getCurrencySymbol(product.currency || 'INR');
        const displayPrice = product.display_price || product.price;

        content.innerHTML = `
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; padding: 2rem;">
                <div>
                    <img src="/${product.images[0] || 'static/uploads/placeholder.jpg'}" style="width: 100%; border-radius: 12px;">
                </div>
                <div>
                    <h2>${product.title}</h2>
                    <p style="color: var(--gray-500); margin: 1rem 0;">${product.description || 'Authentic handcrafted product'}</p>
                    <div style="font-size: 2rem; color: var(--primary); font-weight: 900; margin: 1rem 0;">${currencySymbol}${displayPrice.toLocaleString()}</div>
                    <p><strong>Craft Type:</strong> ${product.craft_type}</p>
                    <p><strong>Quality:</strong> ${product.quality_grade}</p>
                    <p><strong>Production Time:</strong> ${product.production_time_days} days</p>
                    <button onclick="addToCart(${product.id}); closeQuickView();" style="width: 48%; padding: 1rem; background: var(--primary); color: white; border: none; border-radius: 12px; font-size: 1.125rem; font-weight: 700; cursor: pointer; margin-top: 2rem;">
                        <i class="fas fa-cart-plus"></i> Add to Cart
                    </button>
                    <button onclick="window.location.href='/checkout/${product.id}';" style="width: 48%; padding: 1rem; background: #10B981; color: white; border: none; border-radius: 12px; font-size: 1.125rem; font-weight: 700; cursor: pointer; margin-top: 2rem; margin-left: 2%;">
                        <i class="fas fa-bolt"></i> Buy Now
                    </button>
                </div>
            </div>
        `;

        modal.classList.add('active');
    };

    window.closeQuickView = function () {
        document.getElementById('quickViewModal').classList.remove('active');
    };

    // User Menu
    window.toggleUserMenu = function () {
        document.getElementById('userDropdown').classList.toggle('active');
    };

    // AI Features
    window.showAIRecommendations = async function () {
        try {
            // Show loading state
            const modal = createModal('AI Recommendations', '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Generating personalized recommendations...</div>');

            const response = await authenticatedFetch('/api/ai/recommendations', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({})
            });

            if (response.ok) {
                const data = await response.json();
                displayRecommendations(data, modal);
            } else {
                modal.querySelector('.modal-content').innerHTML = `
                    <div style="padding: 2rem; text-align: center;">
                        <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #F59E0B; margin-bottom: 1rem;"></i>
                        <p>Unable to generate recommendations at this time. Please try again later.</p>
                        <button onclick="this.closest('.modal').remove()" style="margin-top: 1rem; padding: 0.75rem 2rem; background: var(--primary); color: white; border: none; border-radius: 8px; cursor: pointer;">Close</button>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error getting recommendations:', error);
            alert('Error loading recommendations. Please try again.');
        }
    };

    function displayRecommendations(data, modal) {
        const content = modal.querySelector('.modal-content');
        content.innerHTML = `
            <div style="padding: 1.5rem;">
                <div style="margin-bottom: 1rem; padding: 1rem; background: #FEF3C7; border-radius: 8px;">
                    <p style="margin: 0; color: #92400E;"><strong>🤖 AI Analysis:</strong> ${data.reasoning}</p>
                </div>
                <h3 style="margin-bottom: 1rem;">Recommended for You (${data.count} products)</h3>
                <div class="recommendations-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; max-height: 500px; overflow-y: auto;">
                    ${data.recommendations.map(product => {
            const currencySymbol = getCurrencySymbol(product.currency || 'INR');
            const displayPrice = product.display_price || product.price;
            return `
                        <div class="recommendation-card" onclick="window.location.href='#product-${product.id}'" style="cursor: pointer; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden; transition: transform 0.2s;">
                            <img src="/${product.images[0] || 'static/uploads/placeholder.jpg'}" 
                                 style="width: 100%; height: 150px; object-fit: cover;"
                                 onerror="this.src='/static/uploads/placeholder.jpg'">
                            <div style="padding: 0.75rem;">
                                <h4 style="font-size: 0.9rem; margin: 0 0 0.5rem 0; color: #1F2937;">${product.title}</h4>
                                <p style="font-size: 1.25rem; font-weight: 700; color: var(--primary); margin: 0;">${currencySymbol}${displayPrice.toLocaleString()}</p>
                                <span style="font-size: 0.75rem; color: #6B7280;">${product.craft_type}</span>
                            </div>
                        </div>
                    `}).join('')}
                </div>
                <button onclick="this.closest('.modal').remove()" style="margin-top: 1rem; width: 100%; padding: 0.75rem; background: var(--primary); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">Close</button>
            </div>
        `;
    }

    window.visualSearch = function () {
        // Create file input
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/*';
        input.style.display = 'none';

        input.onchange = async function (e) {
            const file = e.target.files[0];
            if (!file) return;

            // Show loading modal
            const modal = createModal('Visual Search', '<div class="loading-spinner"><i class="fas fa-spinner fa-spin"></i> Analyzing image and finding similar products...</div>');

            // Create form data
            const formData = new FormData();
            formData.append('image', file);

            try {
                const response = await authenticatedFetch('/api/ai/visual-search', {
                    method: 'POST',
                    body: formData
                });

                if (response.ok) {
                    const data = await response.json();
                    displayVisualSearchResults(data, modal);
                } else {
                    const error = await response.json();
                    modal.querySelector('.modal-content').innerHTML = `
                        <div style="padding: 2rem; text-align: center;">
                            <i class="fas fa-exclamation-triangle" style="font-size: 3rem; color: #EF4444; margin-bottom: 1rem;"></i>
                            <p>${error.error || 'Unable to process image. Please try again.'}</p>
                            <button onclick="this.closest('.modal').remove()" style="margin-top: 1rem; padding: 0.75rem 2rem; background: var(--primary); color: white; border: none; border-radius: 8px; cursor: pointer;">Close</button>
                        </div>
                    `;
                }
            } catch (error) {
                console.error('Error in visual search:', error);
                modal.querySelector('.modal-content').innerHTML = `
                    <div style="padding: 2rem; text-align: center;">
                        <p>Error processing image. Please try again.</p>
                        <button onclick="this.closest('.modal').remove()" style="margin-top: 1rem; padding: 0.75rem 2rem; background: var(--primary); color: white; border: none; border-radius: 8px; cursor: pointer;">Close</button>
                    </div>
                `;
            }
        };

        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
    };

    function displayVisualSearchResults(data, modal) {
        const content = modal.querySelector('.modal-content');
        content.innerHTML = `
            <div style="padding: 1.5rem;">
                <div style="margin-bottom: 1rem; padding: 1rem; background: #DBEAFE; border-radius: 8px;">
                    <p style="margin: 0; color: #1E40AF;"><strong>📸 Image Analysis:</strong></p>
                    <p style="margin: 0.5rem 0 0 0; font-size: 0.9rem;">
                        Type: ${data.image_analysis.product_type || 'Unknown'}<br>
                        Style: ${data.image_analysis.style || 'N/A'}<br>
                        Material: ${data.image_analysis.material || 'N/A'}
                    </p>
                </div>
                <h3 style="margin-bottom: 1rem;">Similar Products Found (${data.count})</h3>
                <div class="search-results-grid" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 1rem; max-height: 500px; overflow-y: auto;">
                    ${data.matches.map(product => {
            const currencySymbol = getCurrencySymbol(product.currency || 'INR');
            const displayPrice = product.display_price || product.price;
            return `
                        <div class="result-card" onclick="window.location.href='#product-${product.id}'" style="cursor: pointer; border: 1px solid #E5E7EB; border-radius: 8px; overflow: hidden; transition: transform 0.2s;">
                            <img src="/${product.images[0] || 'static/uploads/placeholder.jpg'}" 
                                 style="width: 100%; height: 150px; object-fit: cover;"
                                 onerror="this.src='/static/uploads/placeholder.jpg'">
                            <div style="padding: 0.75rem;">
                                <h4 style="font-size: 0.9rem; margin: 0 0 0.5rem 0; color: #1F2937;">${product.title}</h4>
                                <p style="font-size: 1.25rem; font-weight: 700; color: var(--primary); margin: 0;">${currencySymbol}${displayPrice.toLocaleString()}</p>
                                <span style="font-size: 0.75rem; color: #6B7280;">${product.craft_type}</span>
                            </div>
                        </div>
                    `}).join('')}
                </div>
                <button onclick="this.closest('.modal').remove()" style="margin-top: 1rem; width: 100%; padding: 0.75rem; background: var(--primary); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;">Close</button>
            </div>
        `;
    }

    // Helper function to create modal
    function createModal(title, content) {
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.7); z-index: 2000; display: flex; align-items: center; justify-content: center;';
        modal.innerHTML = `
            <div style="background: white; border-radius: 16px; max-width: 800px; width: 90%; max-height: 90vh; overflow-y: auto; position: relative;">
                <div style="padding: 1.5rem; border-bottom: 1px solid #E5E7EB; display: flex; justify-content: space-between; align-items: center;">
                    <h2 style="margin: 0; color: #1F2937;">${title}</h2>
                    <button onclick="this.closest('.modal').remove()" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: #6B7280;">&times;</button>
                </div>
                <div class="modal-content">${content}</div>
            </div>
        `;
        document.body.appendChild(modal);
        return modal;
    }

    // View Toggle
    window.setView = function (viewType) {
        document.querySelectorAll('.view-btn').forEach(btn => btn.classList.remove('active'));
        event.target.closest('.view-btn').classList.add('active');

        const grid = document.getElementById('productsGrid');
        if (viewType === 'list') {
            grid.style.gridTemplateColumns = '1fr';
        } else {
            grid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(280px, 1fr))';
        }
    };

    // Load More
    window.loadMoreProducts = function () {
        alert('Load more products feature - for pagination');
    };

    // Other Functions
    window.showOrders = function () {
        alert('My Orders page coming soon!');
    };

    window.showProfile = function () {
        alert('Profile page coming soon!');
    };

    window.logout = function () {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = '/';
    };

    // Close modals on outside click
    document.addEventListener('click', function (e) {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });
})();

