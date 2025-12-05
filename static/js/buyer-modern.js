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
        loadBuyerOrdersCount();
        // Load orders and clusters automatically
        loadBuyerOrdersAndClusters();
    });
    
    // Load buyer orders count
    async function loadBuyerOrdersCount() {
        try {
            const response = await authenticatedFetch('/api/orders/', {
                method: 'GET'
            });
            
            if (response.ok) {
                const orders = await response.json();
                const ordersCountEl = document.getElementById('ordersCount');
                if (ordersCountEl) {
                    ordersCountEl.textContent = orders.length || 0;
                }
            }
        } catch (error) {
            console.error('Error loading orders count:', error);
        }
    }

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
                        ${product.certificate_id ? '<span class="badge-tag badge-verified" style="background: #10B981; color: white; margin-left: 5px;"><i class="fas fa-check-circle"></i> AI Verified</span>' : ''}
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
                    ${product.digital_passport_hash ? `
                        <div style="margin-top: 1.5rem; padding: 1rem; background: #F3F4F6; border-radius: 8px; font-size: 0.9rem;">
                            <div style="display: flex; align-items: center; gap: 0.5rem; color: #4B5563; margin-bottom: 0.5rem;">
                                <i class="fas fa-fingerprint"></i> <strong>Digital Passport</strong>
                            </div>
                            <div style="word-break: break-all; font-family: monospace; color: #6B7280; font-size: 0.8rem;">
                                ${product.digital_passport_hash}
                            </div>
                            <a href="#" onclick="alert('Blockchain Explorer coming soon!'); return false;" style="display: block; margin-top: 0.5rem; color: #3B82F6; text-decoration: none; font-weight: 600;">
                                View on Blockchain <i class="fas fa-external-link-alt"></i>
                            </a>
                        </div>
                    ` : ''}
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

    window.virtualTryOn = function () {
        const modal = createModal('Virtual Try-On (AR)', `
            <div style="text-align: center; padding: 2rem;">
                <div style="position: relative; display: inline-block; margin-bottom: 2rem;">
                    <i class="fas fa-vr-cardboard" style="font-size: 5rem; color: var(--primary);"></i>
                    <div style="position: absolute; top: -10px; right: -10px; background: #10B981; color: white; padding: 0.25rem 0.5rem; border-radius: 50px; font-size: 0.8rem; font-weight: bold;">BETA</div>
                </div>
                <h3>Experience Products in Your Space</h3>
                <p style="color: var(--gray-500); margin-bottom: 2rem;">
                    Our Augmented Reality feature allows you to see how handicrafts look in your home before you buy.
                </p>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 2rem;">
                    <div style="padding: 1rem; border: 1px solid #E5E7EB; border-radius: 8px;">
                        <i class="fas fa-camera" style="font-size: 2rem; color: #3B82F6; margin-bottom: 0.5rem;"></i>
                        <h4>Use Camera</h4>
                        <p style="font-size: 0.8rem; color: var(--gray-500);">Point your camera at a surface</p>
                    </div>
                    <div style="padding: 1rem; border: 1px solid #E5E7EB; border-radius: 8px;">
                        <i class="fas fa-image" style="font-size: 2rem; color: #8B5CF6; margin-bottom: 0.5rem;"></i>
                        <h4>Upload Room Photo</h4>
                        <p style="font-size: 0.8rem; color: var(--gray-500);">Visualize on a static image</p>
                    </div>
                </div>
                <button onclick="alert('Camera access required. Please try on a mobile device.');" style="padding: 1rem 2rem; background: var(--primary); color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
                    <i class="fas fa-magic"></i> Launch AR Experience
                </button>
            </div>
        `);
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

    // Toggle orders section
    window.toggleOrdersSection = function() {
        const section = document.getElementById('ordersClustersSection');
        const content = document.getElementById('ordersClustersContent');
        const toggleIcon = document.getElementById('toggleIcon');
        
        if (content.style.display === 'none') {
            content.style.display = 'grid';
            if (toggleIcon) toggleIcon.className = 'fas fa-chevron-up';
            loadBuyerOrdersAndClusters();
        } else {
            content.style.display = 'none';
            if (toggleIcon) toggleIcon.className = 'fas fa-chevron-down';
        }
    };

    // My Orders & Clusters Functions
    window.showMyOrdersAndClusters = async function () {
        const section = document.getElementById('ordersClustersSection');
        const content = document.getElementById('ordersClustersContent');
        
        // Show section and scroll to it
        section.style.display = 'block';
        content.style.display = 'grid';
        await loadBuyerOrdersAndClusters();
        // Scroll to section
        section.scrollIntoView({ behavior: 'smooth', block: 'start' });
    };

    // Load buyer orders and associated clusters
    async function loadBuyerOrdersAndClusters() {
        const content = document.getElementById('ordersClustersContent');
        content.innerHTML = '<p style="text-align: center; padding: 2rem;">Loading your orders...</p>';
        
        try {
            const response = await authenticatedFetch('/api/orders/', {
                method: 'GET'
            });
            
            if (response.ok) {
                const orders = await response.json();
                document.getElementById('ordersCount').textContent = orders.length || 0;
                
                if (orders.length === 0) {
                    content.innerHTML = `
                        <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                            <i class="fas fa-box-open" style="font-size: 3rem; color: #9CA3AF; margin-bottom: 1rem;"></i>
                            <p style="font-size: 1.125rem; color: #6B7280;">No orders yet. Start shopping to see clusters!</p>
                        </div>
                    `;
                    return;
                }
                
                // Load cluster information for each order
                const ordersWithClusters = await Promise.all(
                    orders.map(async (order) => {
                        try {
                            const clusterResponse = await authenticatedFetch(`/api/cluster-pooling/find-opportunities`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ order_id: order.id })
                            });
                            
                            if (clusterResponse.ok) {
                                const clusterData = await clusterResponse.json();
                                return { ...order, cluster: clusterData };
                            }
                        } catch (error) {
                            console.error('Error loading cluster for order:', order.id, error);
                        }
                        return { ...order, cluster: null };
                    })
                );
                
                displayOrdersWithClusters(ordersWithClusters);
            } else {
                content.innerHTML = '<p style="text-align: center; color: #EF4444;">Error loading orders</p>';
            }
        } catch (error) {
            console.error('Error loading orders:', error);
            content.innerHTML = '<p style="text-align: center; color: #EF4444;">Error loading orders</p>';
        }
    }

    // Display orders with cluster information
    function displayOrdersWithClusters(orders) {
        const content = document.getElementById('ordersClustersContent');
        
        content.innerHTML = orders.map(order => {
            const cluster = order.cluster;
            const hasCluster = cluster && cluster.pooling_available;
            const savings = cluster?.your_order?.savings || 0;
            const savingsPercent = cluster?.your_order?.savings_percent || 0;
            
            return `
                <div class="order-cluster-card" style="background: white; border-radius: 16px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                        <div>
                            <h3 style="margin: 0 0 0.5rem 0; color: #1F2937;">Order #${order.id}</h3>
                            <p style="margin: 0; color: #6B7280; font-size: 0.875rem;">
                                ${order.product_title || 'Product'} • ${order.quantity || 1} item(s)
                            </p>
                            <p style="margin: 0.5rem 0 0 0; color: #6B7280; font-size: 0.875rem;">
                                Status: <span style="color: ${getStatusColor(order.status)}; font-weight: 600;">${order.status}</span>
                            </p>
                        </div>
                        <div style="text-align: right;">
                            <p style="margin: 0; font-size: 1.25rem; font-weight: 700; color: var(--primary);">
                                ${order.currency || 'USD'} ${order.total_amount?.toFixed(2) || '0.00'}
                            </p>
                        </div>
                    </div>
                    
                    ${hasCluster ? `
                        <div style="background: linear-gradient(135deg, #F0FDF4 0%, #D1FAE5 100%); border-left: 4px solid #10B981; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                                <h4 style="margin: 0; color: #166534; display: flex; align-items: center; gap: 0.5rem;">
                                    <i class="fas fa-users"></i> Cluster Available!
                                </h4>
                                <span style="background: #10B981; color: white; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.875rem; font-weight: 600;">
                                    Save ${savingsPercent}%
                                </span>
                            </div>
                            <p style="margin: 0.5rem 0; color: #166534; font-size: 0.875rem;">
                                ${cluster.cluster_info?.total_orders || 0} orders in this cluster • 
                                ${cluster.cluster_info?.total_artisans || 0} artisans
                            </p>
                            <p style="margin: 0.5rem 0 0 0; color: #15803d; font-weight: 600;">
                                <i class="fas fa-piggy-bank"></i> You save: ${order.currency || 'USD'} ${savings.toFixed(2)}
                            </p>
                        </div>
                    ` : `
                        <div style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                            <p style="margin: 0; color: #92400E; font-size: 0.875rem;">
                                <i class="fas fa-info-circle"></i> Individual shipping (no cluster available yet)
                            </p>
                        </div>
                    `}
                    
                    <div style="display: flex; gap: 0.75rem; flex-wrap: wrap;">
                        ${hasCluster ? `
                            <button onclick="viewBuyerClusterMap(${order.id}, '${order.artisan_location || 'Rajasthan'}')" 
                                style="flex: 1; min-width: 150px; padding: 0.75rem; background: #10B981; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                                <i class="fas fa-map-marked-alt"></i> View Cluster Map
                            </button>
                            <button onclick="viewClusterDetails(${order.id})" 
                                style="flex: 1; min-width: 150px; padding: 0.75rem; background: white; color: #10B981; border: 2px solid #10B981; border-radius: 8px; cursor: pointer; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                                <i class="fas fa-info-circle"></i> Cluster Details
                            </button>
                        ` : `
                            <button onclick="checkClusterAvailability(${order.id})" 
                                style="flex: 1; padding: 0.75rem; background: #3B82F6; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                                <i class="fas fa-search"></i> Check for Clusters
                            </button>
                        `}
                        <button onclick="contactArtisan(${order.artisan_id || 0})" 
                            style="flex: 1; min-width: 150px; padding: 0.75rem; background: white; color: #FF6B35; border: 2px solid #FF6B35; border-radius: 8px; cursor: pointer; font-weight: 600; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                            <i class="fas fa-comments"></i> Contact Artisan
                        </button>
                    </div>
                </div>
            `;
        }).join('');
    }

    function getStatusColor(status) {
        const colors = {
            'PENDING': '#F59E0B',
            'APPROVED': '#3B82F6',
            'SHIPPED': '#10B981',
            'DELIVERED': '#059669',
            'CANCELLED': '#EF4444'
        };
        return colors[status] || '#6B7280';
    }

    // View cluster map for buyer
    window.viewBuyerClusterMap = function(orderId, artisanLocation) {
        const modal = document.getElementById('buyerClusterMapModal');
        const mapDiv = document.getElementById('buyerClusterMap');
        const infoDiv = document.getElementById('clusterInfo');
        
        modal.style.display = 'flex';
        
        // Initialize map
        setTimeout(() => {
            if (typeof L !== 'undefined') {
                // Clear existing map if any
                if (window.buyerClusterMap) {
                    window.buyerClusterMap.remove();
                }
                
                // Create new map centered on artisan location
                const locationCoords = getLocationCoordinates(artisanLocation);
                window.buyerClusterMap = L.map('buyerClusterMap').setView(locationCoords, 7);
                
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors'
                }).addTo(window.buyerClusterMap);
                
                // Add cluster markers
                const clusters = [
                    { name: 'Jaipur Textile Pool', lat: 26.9124, lon: 75.7873, members: 42, savings: '40%', destination: 'USA' },
                    { name: 'Jodhpur Woodwork', lat: 26.2389, lon: 73.0243, members: 28, savings: '35%', destination: 'UK' },
                    { name: 'Udaipur Pottery', lat: 24.5854, lon: 73.7125, members: 15, savings: '25%', destination: 'Germany' },
                    { name: 'Ajmer Jewelry', lat: 26.4499, lon: 74.6399, members: 31, savings: '38%', destination: 'USA' }
                ];
                
                clusters.forEach(cluster => {
                    L.circleMarker([cluster.lat, cluster.lon], {
                        radius: 15,
                        fillColor: '#10B981',
                        color: '#059669',
                        weight: 2,
                        opacity: 1,
                        fillOpacity: 0.7
                    }).addTo(window.buyerClusterMap).bindPopup(`
                        <div style="text-align: center; min-width: 200px;">
                            <h4 style="margin: 0 0 0.5rem 0; color: #166534;">${cluster.name}</h4>
                            <p style="margin: 0.25rem 0;"><strong>${cluster.members}</strong> Artisans</p>
                            <p style="margin: 0.25rem 0; color: #15803d; font-weight: bold;">${cluster.savings} Savings</p>
                            <p style="margin: 0.25rem 0; font-size: 0.875rem; color: #6B7280;">To: ${cluster.destination}</p>
                            <button onclick="joinBuyerCluster('${cluster.name}', ${orderId})" 
                                style="margin-top: 0.5rem; padding: 0.5rem 1rem; background: #10B981; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;">
                                Join This Cluster
                            </button>
                        </div>
                    `);
                });
                
                // Show cluster info
                infoDiv.innerHTML = `
                    <div style="background: #F0FDF4; padding: 1rem; border-radius: 8px; border-left: 4px solid #10B981;">
                        <h4 style="margin: 0 0 0.5rem 0; color: #166534;">
                            <i class="fas fa-info-circle"></i> About Shipping Clusters
                        </h4>
                        <p style="margin: 0; color: #15803d; font-size: 0.875rem; line-height: 1.6;">
                            Clusters combine multiple orders from nearby artisans for consolidated shipping. 
                            This reduces shipping costs by up to 60%! Click on a cluster marker to see details and join.
                        </p>
                    </div>
                `;
            }
        }, 100);
    };

    window.closeBuyerClusterMap = function() {
        const modal = document.getElementById('buyerClusterMapModal');
        modal.style.display = 'none';
        if (window.buyerClusterMap) {
            window.buyerClusterMap.remove();
            window.buyerClusterMap = null;
        }
    };

    function getLocationCoordinates(location) {
        const locations = {
            'Rajasthan': [26.9124, 75.7873],
            'Gujarat': [23.0225, 72.5714],
            'Kashmir': [34.0837, 74.7973],
            'West Bengal': [22.9868, 87.8550],
            'Tamil Nadu': [13.0827, 80.2707],
            'Kerala': [10.8505, 76.2711]
        };
        return locations[location] || [20.5937, 78.9629]; // Default to India center
    }

    window.viewClusterDetails = async function(orderId) {
        try {
            const response = await authenticatedFetch(`/api/cluster-pooling/find-opportunities`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ order_id: orderId })
            });
            
            if (response.ok) {
                const data = await response.json();
                const content = `
                    <div style="padding: 2rem;">
                        <h3 style="margin: 0 0 1rem 0; color: #1F2937;">
                            <i class="fas fa-users"></i> Cluster Details
                        </h3>
                        ${data.pooling_available ? `
                            <div style="background: #F0FDF4; padding: 1.5rem; border-radius: 12px; margin-bottom: 1rem;">
                                <h4 style="margin: 0 0 1rem 0; color: #166534;">Your Savings</h4>
                                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                                    <div>
                                        <p style="margin: 0; color: #6B7280; font-size: 0.875rem;">Individual Shipping</p>
                                        <p style="margin: 0.25rem 0 0 0; font-size: 1.5rem; font-weight: 700; color: #1F2937;">
                                            $${data.your_order?.individual_cost?.toFixed(2) || '0.00'}
                                        </p>
                                    </div>
                                    <div>
                                        <p style="margin: 0; color: #6B7280; font-size: 0.875rem;">Pooled Shipping</p>
                                        <p style="margin: 0.25rem 0 0 0; font-size: 1.5rem; font-weight: 700; color: #10B981;">
                                            $${data.your_order?.pooled_cost?.toFixed(2) || '0.00'}
                                        </p>
                                    </div>
                                </div>
                                <div style="margin-top: 1rem; padding-top: 1rem; border-top: 2px solid #D1FAE5;">
                                    <p style="margin: 0; font-size: 1.25rem; font-weight: 700; color: #166534;">
                                        <i class="fas fa-piggy-bank"></i> You Save: $${data.your_order?.savings?.toFixed(2) || '0.00'} (${data.your_order?.savings_percent || 0}%)
                                    </p>
                                </div>
                            </div>
                            
                            <div style="background: white; padding: 1.5rem; border-radius: 12px; border: 2px solid #E5E7EB; margin-bottom: 1rem;">
                                <h4 style="margin: 0 0 1rem 0; color: #1F2937;">Cluster Information</h4>
                                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 1rem;">
                                    <div>
                                        <p style="margin: 0; color: #6B7280; font-size: 0.875rem;">Total Orders</p>
                                        <p style="margin: 0.25rem 0 0 0; font-size: 1.25rem; font-weight: 700; color: #1F2937;">
                                            ${data.cluster_info?.total_orders || 0}
                                        </p>
                                    </div>
                                    <div>
                                        <p style="margin: 0; color: #6B7280; font-size: 0.875rem;">Total Artisans</p>
                                        <p style="margin: 0.25rem 0 0 0; font-size: 1.25rem; font-weight: 700; color: #1F2937;">
                                            ${data.cluster_info?.total_artisans || 0}
                                        </p>
                                    </div>
                                </div>
                                ${data.cluster_info?.warehouse_location ? `
                                    <div style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #E5E7EB;">
                                        <p style="margin: 0; color: #6B7280; font-size: 0.875rem;">Warehouse Location</p>
                                        <p style="margin: 0.25rem 0 0 0; color: #1F2937; font-weight: 600;">
                                            <i class="fas fa-warehouse"></i> ${data.cluster_info.warehouse_location.city || 'N/A'}, ${data.cluster_info.warehouse_location.state || 'N/A'}
                                        </p>
                                    </div>
                                ` : ''}
                            </div>
                            
                            ${data.schedule ? `
                                <div style="background: #EFF6FF; padding: 1.5rem; border-radius: 12px; border-left: 4px solid #3B82F6;">
                                    <h4 style="margin: 0 0 1rem 0; color: #1E40AF;">
                                        <i class="fas fa-calendar-alt"></i> Estimated Schedule
                                    </h4>
                                    <p style="margin: 0; color: #1E3A8A; font-size: 0.875rem;">
                                        <strong>Pickup:</strong> ${data.schedule.estimated_pickup || 'TBD'}<br>
                                        <strong>Shipment:</strong> ${data.schedule.estimated_shipment || 'TBD'}<br>
                                        <strong>Delivery:</strong> ${data.schedule.estimated_delivery || 'TBD'}
                                    </p>
                                </div>
                            ` : ''}
                        ` : `
                            <div style="background: #FEF3C7; padding: 1.5rem; border-radius: 12px; border-left: 4px solid #F59E0B;">
                                <p style="margin: 0; color: #92400E;">
                                    <i class="fas fa-info-circle"></i> ${data.message || 'No cluster available at this time.'}
                                </p>
                            </div>
                        `}
                    </div>
                `;
                
                createModal('Cluster Details', content);
            }
        } catch (error) {
            console.error('Error loading cluster details:', error);
            alert('Error loading cluster details');
        }
    };

    window.joinBuyerCluster = async function(clusterName, orderId) {
        if (confirm(`Join "${clusterName}" for this order? This will enable pooled shipping and save you money!`)) {
            try {
                const response = await authenticatedFetch(`/api/cluster-pooling/opt-in/${orderId}`, {
                    method: 'POST'
                });
                
                if (response.ok) {
                    alert('Successfully joined cluster! You will be notified when the shipment is ready.');
                    loadBuyerOrdersAndClusters();
                    closeBuyerClusterMap();
                } else {
                    const error = await response.json();
                    alert('Error: ' + (error.error || 'Failed to join cluster'));
                }
            } catch (error) {
                console.error('Error joining cluster:', error);
                alert('Error joining cluster');
            }
        }
    };

    window.checkClusterAvailability = async function(orderId) {
        alert('Checking for available clusters...');
        await loadBuyerOrdersAndClusters();
    };

    window.contactArtisan = function(artisanId) {
        if (artisanId) {
            // Open chat with artisan
            alert('Opening chat with artisan...');
            // This would open the chat interface
        } else {
            alert('Artisan information not available');
        }
    };

    // Other Functions
    window.showOrders = function () {
        showMyOrdersAndClusters();
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

