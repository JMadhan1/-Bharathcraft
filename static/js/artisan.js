(function () {
    'use strict';

    const authToken = localStorage.getItem('authToken');
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');

    if (!authToken || userData.role !== 'artisan') {
        window.location.href = '/';
    }

    document.getElementById('userName').textContent = userData.full_name || '';

    // Initialize Socket.IO for real-time notifications
    let socket = null;
    if (typeof io !== 'undefined') {
        socket = io();
        socket.on('connect', () => {
            console.log('Connected to notification service');
            socket.emit('join', { room: `user_${userData.id}` });
        });

        // Listen for new order notifications
        socket.on('new_order', (data) => {
            console.log('New order notification:', data);
            showOrderNotification(data);
            loadMyOrders(); // Refresh orders list
        });

        // Listen for new messages
        socket.on('new_message', (data) => {
            console.log('New message notification:', data);
            showMessageNotification(data);
            updateUnreadCount();
        });
    }

    // Expose functions globally for onclick handlers
    window.showUploadProduct = function () {
        document.getElementById('uploadModal').classList.add('active');
    };

    window.closeUploadModal = function () {
        document.getElementById('uploadModal').classList.remove('active');
        document.getElementById('productUploadForm').reset();
    };

    document.addEventListener('DOMContentLoaded', function () {
        // Show loading state
        document.getElementById('myProducts').innerHTML = '<p>Loading products...</p>';

        // Load products and orders
        loadMyProducts();
        loadMyOrders();
        loadUnreadMessages();

        document.getElementById('productUploadForm').addEventListener('submit', async function (e) {
            e.preventDefault();
            await uploadProduct();
        });

        // Poll for new orders every 30 seconds (fallback if Socket.IO fails)
        setInterval(() => {
            loadMyOrders();
            updateUnreadCount();
        }, 30000);
    });

    async function uploadProduct() {
        const form = document.getElementById('productUploadForm');
        const formData = new FormData(form);

        try {
            const response = await authenticatedFetch('/api/products/', {
                method: 'POST',
                body: formData
            });

            const result = await response.json();

            if (response.ok) {
                alert('Product uploaded successfully!');
                window.closeUploadModal();
                loadMyProducts();
            } else {
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
            const response = await authenticatedFetch('/api/products/my-products', {
                method: 'GET'
            });

            // Handle invalid token errors FIRST (401, 422)
            if (response.status === 422 || response.status === 401) {
                console.error('Invalid token detected - clearing storage and redirecting...');
                localStorage.clear();
                sessionStorage.clear();
                window.location.href = '/?expired=1';
                return;
            }

            let data;
            try {
                data = await response.json();
            } catch (jsonError) {
                console.error('Failed to parse JSON response:', jsonError);
                document.getElementById('myProducts').innerHTML = '<p>Error: Invalid response from server. Please refresh the page.</p>';
                return;
            }

            // Check if response is successful and data is an array
            if (!response.ok) {
                console.error('Error loading products:', data);
                document.getElementById('myProducts').innerHTML = `
                    <div style="padding: 20px; background: #FEE; border: 1px solid #F88; border-radius: 8px; color: #C33;">
                        <strong>⚠️ Error loading products:</strong><br>
                        ${data.error || data.message || 'Unknown error'}
                    </div>
                `;
                return;
            }

            if (!Array.isArray(data)) {
                console.error('Invalid response format - expected array, got:', typeof data, data);
                document.getElementById('myProducts').innerHTML = `
                    <div style="padding: 20px; background: #FEE; border: 1px solid #F88; border-radius: 8px; color: #C33;">
                        <strong>⚠️ Invalid response from server</strong><br>
                        Please refresh the page or contact support if the issue persists.
                    </div>
                `;
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

    // Switch to simple dashboard
    window.switchToSimpleMode = function () {
        if (confirm('Switch to Simple Dashboard?\n\n✓ Voice-enabled in 12 Indian languages\n✓ Easy photo upload\n✓ Perfect for first-time users\n\nस्विच करें सरल डैशबोर्ड पर?\n\n✓ आवाज सहायता\n✓ आसान उपयोग')) {
            localStorage.setItem('artisanDashboardMode', 'simple');
            window.location.href = '/artisan/dashboard-simple';
        }
    };

    // Load artisan's orders
    async function loadMyOrders() {
        try {
            const response = await authenticatedFetch('/api/orders/', {
                method: 'GET'
            });

            if (!response.ok) {
                console.error('Error loading orders');
                return;
            }

            const orders = await response.json();
            const ordersContainer = document.getElementById('recentOrders');

            if (!ordersContainer) {
                console.log('Orders container not found in DOM');
                return;
            }

            if (orders.length === 0) {
                ordersContainer.innerHTML = '<p>No orders yet.</p>';
                return;
            }

            // Separate pending and other orders
            const pendingOrders = orders.filter(o => o.status === 'pending');
            const otherOrders = orders.filter(o => o.status !== 'pending');

            let html = '';

            // Show pending orders first (need approval)
            if (pendingOrders.length > 0) {
                html += '<h3 style="color: #ff9800; margin-top: 0;">⏳ Pending Approval (' + pendingOrders.length + ')</h3>';
                html += pendingOrders.map(order => `
                    <div class="order-item" style="background: #fff3e0; padding: 15px; border-radius: 8px; border-left: 4px solid #ff9800; margin-bottom: 15px;">
                        <div style="display: flex; justify-content: space-between; align-items: start;">
                            <div>
                                <h4 style="margin: 0 0 10px 0;">Order #${order.id}</h4>
                                <p style="margin: 5px 0;"><strong>Amount:</strong> ${order.currency} ${order.total_amount.toFixed(2)}</p>
                                <p style="margin: 5px 0;"><strong>Items:</strong> ${order.items_count}</p>
                                <p style="margin: 5px 0;"><strong>Payment:</strong> <span style="color: #ff9800;">${order.payment_status}</span></p>
                                <p style="margin: 5px 0; font-size: 12px; color: #666;">Created: ${new Date(order.created_at).toLocaleString()}</p>
                            </div>
                            <button onclick="approveOrder(${order.id})" 
                                    style="background: #4CAF50; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer; font-weight: bold;">
                                ✓ Approve Order
                            </button>
                        </div>
                    </div>
                `).join('');
            }

            // Show other orders
            if (otherOrders.length > 0) {
                html += '<h3 style="margin-top: 20px;">📦 All Orders (' + otherOrders.length + ')</h3>';
                html += otherOrders.map(order => {
                    const statusColors = {
                        'confirmed': '#2196F3',
                        'in_production': '#FF9800',
                        'shipped': '#9C27B0',
                        'delivered': '#4CAF50',
                        'completed': '#4CAF50',
                        'cancelled': '#F44336'
                    };
                    const statusColor = statusColors[order.status] || '#666';

                    return `
                        <div class="order-item" style="background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); margin-bottom: 15px;">
                            <div style="display: flex; justify-content: space-between;">
                                <div>
                                    <h4 style="margin: 0 0 10px 0;">Order #${order.id}</h4>
                                    <p style="margin: 5px 0;"><strong>Amount:</strong> ${order.currency} ${order.total_amount.toFixed(2)}</p>
                                    <p style="margin: 5px 0;"><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${order.status.replace('_', ' ').toUpperCase()}</span></p>
                                    <p style="margin: 5px 0;"><strong>Payment:</strong> ${order.payment_status}</p>
                                    <p style="margin: 5px 0; font-size: 12px; color: #666;">Created: ${new Date(order.created_at).toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            }

            ordersContainer.innerHTML = html;
        } catch (error) {
            console.error('Error loading orders:', error);
        }
    }

    // Approve an order
    window.approveOrder = async function (orderId) {
        if (!confirm('Approve this order? The buyer will be notified and can proceed with payment.')) {
            return;
        }

        try {
            const response = await authenticatedFetch(`/checkout/api/approve-order/${orderId}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (response.ok) {
                alert('Order approved successfully! Buyer has been notified.');
                loadMyOrders(); // Reload orders
            } else {
                alert('Error approving order: ' + (data.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error approving order:', error);
            alert('Error approving order. Please try again.');
        }
    };

    // Show order notification
    function showOrderNotification(data) {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = 'notification-toast order-notification';
        notification.style.cssText = `
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            padding: 16px;
            margin-bottom: 10px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            animation: slideIn 0.3s ease-out;
            max-width: 350px;
            cursor: pointer;
        `;

        notification.innerHTML = `
            <div style="flex-shrink: 0; margin-right: 12px; font-size: 24px;">🛍️</div>
            <div style="flex-grow: 1;">
                <h4 style="margin: 0 0 4px 0; font-size: 14px; font-weight: 600;">New Order!</h4>
                <p style="margin: 0; font-size: 13px; opacity: 0.95;">${data.buyer_name} ordered ${data.product_title}</p>
                <p style="margin: 4px 0 0 0; font-size: 12px; opacity: 0.9;">Amount: ${data.currency} ${data.amount}</p>
            </div>
            <button onclick="this.parentElement.remove()" style="background: rgba(255,255,255,0.2); border: none; color: white; cursor: pointer; padding: 4px 8px; border-radius: 4px;">✕</button>
        `;

        notification.onclick = () => {
            // Scroll to orders section
            document.getElementById('recentOrders')?.scrollIntoView({ behavior: 'smooth' });
            notification.remove();
        };

        container.appendChild(notification);

        // Auto remove after 10 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 10000);
    }

    // Show message notification
    function showMessageNotification(data) {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = 'notification-toast message-notification';
        notification.style.cssText = `
            background: white;
            border-left: 4px solid #10B981;
            box-shadow: 0 4px 12px rgba(0,0,0,0.1);
            padding: 16px;
            margin-bottom: 10px;
            border-radius: 8px;
            display: flex;
            align-items: flex-start;
            animation: slideIn 0.3s ease-out;
            max-width: 350px;
            cursor: pointer;
        `;

        const content = data.translated_content || data.content;
        notification.innerHTML = `
            <div style="flex-shrink: 0; margin-right: 12px; font-size: 20px;">💬</div>
            <div style="flex-grow: 1;">
                <h4 style="margin: 0 0 4px 0; color: #1F2937; font-size: 14px; font-weight: 600;">${data.sender_name}</h4>
                <p style="margin: 0; color: #4B5563; font-size: 13px;">${content.substring(0, 60)}${content.length > 60 ? '...' : ''}</p>
            </div>
            <button onclick="this.parentElement.remove()" style="background: none; border: none; color: #9CA3AF; cursor: pointer;">✕</button>
        `;

        notification.onclick = () => {
            openChat(data.sender_id, data.sender_name);
            notification.remove();
        };

        container.appendChild(notification);

        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 7000);
    }

    // Load unread messages count
    async function loadUnreadMessages() {
        try {
            const response = await authenticatedFetch('/api/messages/unread-count', {
                method: 'GET'
            });

            if (response.ok) {
                const data = await response.json();
                updateUnreadBadge(data.count || 0);
            }
        } catch (error) {
            console.error('Error loading unread count:', error);
        }
    }

    // Update unread count
    async function updateUnreadCount() {
        await loadUnreadMessages();
    }

    // Update unread badge
    function updateUnreadBadge(count) {
        let badge = document.getElementById('unreadBadge');
        if (!badge && count > 0) {
            // Create badge if it doesn't exist
            const header = document.querySelector('.header .nav');
            if (header) {
                const messagesBtn = document.createElement('button');
                messagesBtn.className = 'btn btn-primary';
                messagesBtn.onclick = showMessages;
                messagesBtn.innerHTML = `
                    <i class="fas fa-comments"></i> Messages 
                    <span id="unreadBadge" class="badge" style="background: #ef4444; color: white; padding: 2px 6px; border-radius: 10px; font-size: 11px; margin-left: 4px;">${count}</span>
                `;
                header.insertBefore(messagesBtn, header.firstChild);
            }
        } else if (badge) {
            if (count > 0) {
                badge.textContent = count;
                badge.style.display = 'inline';
            } else {
                badge.style.display = 'none';
            }
        }
    }

    // Show messages/chat interface
    window.showMessages = async function () {
        try {
            const response = await authenticatedFetch('/api/messages/conversations', {
                method: 'GET'
            });

            if (!response.ok) {
                alert('Error loading messages');
                return;
            }

            const conversations = await response.json();

            // Create modal for messages
            let modal = document.getElementById('messagesModal');
            if (!modal) {
                modal = document.createElement('div');
                modal.id = 'messagesModal';
                modal.className = 'modal';
                document.body.appendChild(modal);
            }

            modal.innerHTML = `
                <div class="modal-content" style="max-width: 600px;">
                    <div class="modal-header">
                        <h3><i class="fas fa-comments"></i> Messages</h3>
                        <span class="close" onclick="closeMessagesModal()">×</span>
                    </div>
                    <div style="padding: 20px;">
                        ${conversations.length === 0 ? '<p>No messages yet.</p>' : `
                            <div style="display: flex; flex-direction: column; gap: 10px;">
                                ${conversations.map(conv => `
                                    <div onclick="openChat(${conv.user_id}, '${conv.user_name}')" 
                                         style="padding: 15px; background: ${conv.unread_count > 0 ? '#EEF2FF' : 'white'}; 
                                                border: 1px solid #E5E7EB; border-radius: 8px; cursor: pointer;
                                                display: flex; justify-content: space-between; align-items: center;">
                                        <div>
                                            <h4 style="margin: 0 0 5px 0; color: #1F2937;">${conv.user_name}</h4>
                                            <p style="margin: 0; color: #6B7280; font-size: 14px;">${conv.last_message || 'No messages'}</p>
                                            ${conv.product_title ? `<p style="margin: 5px 0 0 0; color: #9CA3AF; font-size: 12px;">Re: ${conv.product_title}</p>` : ''}
                                        </div>
                                        ${conv.unread_count > 0 ? `<span style="background: #EF4444; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: 600;">${conv.unread_count}</span>` : ''}
                                    </div>
                                `).join('')}
                            </div>
                        `}
                    </div>
                </div>
            `;

            modal.classList.add('active');
        } catch (error) {
            console.error('Error showing messages:', error);
            alert('Error loading messages');
        }
    };

    window.closeMessagesModal = function () {
        const modal = document.getElementById('messagesModal');
        if (modal) {
            modal.classList.remove('active');
        }
    };

    // Open chat with specific user
    window.openChat = function (userId, userName) {
        closeMessagesModal();
        // Use existing chat functionality
        if (typeof window.openChatWith === 'function') {
            window.openChatWith(userId, userName);
        } else {
            alert(`Chat with ${userName} will open here. Chat functionality is being loaded...`);
        }
    };

    // Expose logout globally (used in header)
    window.logout = function () {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = '/';
    };
})();
