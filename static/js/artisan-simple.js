(function () {
    'use strict';

    const authToken = localStorage.getItem('authToken');
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');

    if (!authToken || userData.role !== 'artisan') {
        window.location.href = '/';
        return;
    }

    let currentLanguage = localStorage.getItem('preferredLanguage') || 'hi';
    let clusterMap = null;
    let socket = null;

    // Voice messages in multiple languages
    const voiceMessages = {
        hi: {
            greeting: 'नमस्ते! आपका स्वागत है भारतक्राफ्ट में',
            upload: 'अपने काम की फोटो लें और बेचें',
            'my-products': 'आपके सभी उत्पाद यहाँ दिखेंगे',
            'view-orders': 'नए ऑर्डर देखें और स्वीकार करें',
            chat: 'खरीदार से बात करें',
            logistics: 'शिपिंग में साठ प्रतिशत तक बचत करें',
            help: 'वीडियो ट्यूटोरियल देखें',
            earnings: 'आपकी कुल कमाई',
            products: 'आपके कुल उत्पाद',
            orders: 'नए ऑर्डर',
            messages: 'नए संदेश',
            'upload-instruction': 'अपने काम की फोटो लेने के लिए यहाँ दबाएं',
            'price-instruction': 'अपने उत्पाद की कीमत चुनें',
            'recent-products': 'आपके हाल के उत्पाद',
            'pending-orders': 'लंबित ऑर्डर जिन्हें स्वीकार करना है'
        },
        en: {
            greeting: 'Welcome to Bharatcraft!',
            upload: 'Take a photo of your work and sell it',
            'my-products': 'View all your products here',
            'view-orders': 'View and accept new orders',
            chat: 'Chat with buyers',
            logistics: 'Save up to 60% on shipping',
            help: 'Watch video tutorials',
            earnings: 'Your total earnings',
            products: 'Your total products',
            orders: 'New orders',
            messages: 'New messages',
            'upload-instruction': 'Tap here to take a photo of your work',
            'price-instruction': 'Choose the price for your product',
            'recent-products': 'Your recent products',
            'pending-orders': 'Pending orders to accept'
        }
    };

    // Initialize
    document.addEventListener('DOMContentLoaded', function () {
        document.getElementById('userName').textContent = userData.full_name || 'नमस्ते!';
        document.getElementById('languageSelector').value = currentLanguage;

        loadDashboardData();
        initializeSocketIO();

        // Setup upload form
        const uploadForm = document.getElementById('simpleUploadForm');
        if (uploadForm) {
            uploadForm.addEventListener('submit', handleUpload);
        }

        // Auto-play greeting
        setTimeout(() => playVoice('greeting'), 1000);
    });

    // Voice Support
    window.playVoice = function (key) {
        const message = voiceMessages[currentLanguage][key] || voiceMessages['en'][key];
        if (!message) return;

        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance(message);
            utterance.lang = currentLanguage === 'hi' ? 'hi-IN' : 'en-US';
            utterance.rate = 0.9;
            utterance.pitch = 1;
            window.speechSynthesis.cancel();
            window.speechSynthesis.speak(utterance);
        }
    };

    window.startVoiceHelp = function () {
        playVoice('greeting');
    };

    window.changeLanguage = function (lang) {
        currentLanguage = lang;
        localStorage.setItem('preferredLanguage', lang);
        playVoice('greeting');
    };

    // Load Dashboard Data
    async function loadDashboardData() {
        try {
            // Load products
            const productsResponse = await authenticatedFetch('/api/products/my-products');
            if (productsResponse.ok) {
                const products = await productsResponse.json();
                document.getElementById('productCount').textContent = products.length;
                displayRecentProducts(products.slice(0, 4));
            }

            // Load orders
            const ordersResponse = await authenticatedFetch('/api/orders/');
            if (ordersResponse.ok) {
                const orders = await ordersResponse.json();
                const pendingOrders = orders.filter(o => o.status === 'pending');
                document.getElementById('orderCount').textContent = pendingOrders.length;
                displayPendingOrders(pendingOrders.slice(0, 3));
            }

            // Load messages count
            const messagesResponse = await authenticatedFetch('/api/messages/unread-count');
            if (messagesResponse.ok) {
                const data = await messagesResponse.json();
                document.getElementById('messageCount').textContent = data.count || 0;
            }

            // Calculate earnings (mock for now)
            document.getElementById('totalEarnings').textContent = '0';
        } catch (error) {
            console.error('Error loading dashboard data:', error);
        }
    }

    function displayRecentProducts(products) {
        const container = document.getElementById('recentProducts');
        if (!container) return;

        if (products.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #6B7280;">कोई उत्पाद नहीं / No products yet</p>';
            return;
        }

        container.innerHTML = products.map(product => {
            const imageUrl = product.images && product.images.length > 0 ? '/' + product.images[0] : '/static/uploads/placeholder.jpg';
            return `
                <div class="product-card" style="background: white; border-radius: 12px; padding: 1rem; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <img src="${imageUrl}" alt="${product.title}" style="width: 100%; height: 150px; object-fit: cover; border-radius: 8px; margin-bottom: 0.75rem;" onerror="this.src='/static/uploads/placeholder.jpg'">
                    <h4 style="margin: 0 0 0.5rem 0; color: #1F2937; font-size: 1rem;">${product.title}</h4>
                    <p style="margin: 0; color: #10B981; font-weight: 700; font-size: 1.25rem;">₹${product.price}</p>
                    ${product.certificate_id ? '<span style="display: inline-block; margin-top: 0.5rem; padding: 0.25rem 0.5rem; background: #10B981; color: white; border-radius: 4px; font-size: 0.75rem;"><i class="fas fa-check-circle"></i> AI Verified</span>' : ''}
                </div>
            `;
        }).join('');
    }

    function displayPendingOrders(orders) {
        const container = document.getElementById('pendingOrders');
        if (!container) return;

        if (orders.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: #6B7280;">कोई लंबित ऑर्डर नहीं / No pending orders</p>';
            return;
        }

        container.innerHTML = orders.map(order => `
            <div class="order-card" style="background: #FFF7ED; border: 2px solid #FDBA74; border-radius: 12px; padding: 1.5rem;">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 1rem;">
                    <div>
                        <h4 style="margin: 0 0 0.5rem 0; color: #1F2937;">ऑर्डर #${order.id}</h4>
                        <p style="margin: 0; color: #6B7280;">राशि: ₹${order.total_amount}</p>
                    </div>
                    <span style="background: #F59E0B; color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.875rem;">लंबित</span>
                </div>
                <button onclick="approveOrder(${order.id})" style="width: 100%; padding: 0.75rem; background: #10B981; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 1rem;">
                    <i class="fas fa-check-circle"></i> स्वीकार करें / Accept
                </button>
            </div>
        `).join('');
    }

    // Upload Functions
    window.showSimpleUpload = function () {
        playVoice('upload');
        document.getElementById('uploadModal').classList.add('active');
        document.getElementById('step1').classList.add('active');
    };

    window.closeUploadModal = function () {
        document.getElementById('uploadModal').classList.remove('active');
        document.getElementById('simpleUploadForm').reset();
        document.querySelectorAll('.upload-step').forEach(step => step.classList.remove('active'));
        document.getElementById('photoPreview').innerHTML = '';
        document.getElementById('photoNextBtn').style.display = 'none';
    };

    window.showPhotoPreview = function (input) {
        const preview = document.getElementById('photoPreview');
        const nextBtn = document.getElementById('photoNextBtn');
        preview.innerHTML = '';

        if (input.files && input.files.length > 0) {
            Array.from(input.files).forEach(file => {
                const reader = new FileReader();
                reader.onload = function (e) {
                    const img = document.createElement('img');
                    img.src = e.target.result;
                    preview.appendChild(img);
                };
                reader.readAsDataURL(file);
            });
            nextBtn.style.display = 'flex';
        }
    };

    window.nextStep = function (stepNumber) {
        document.querySelectorAll('.upload-step').forEach(step => step.classList.remove('active'));
        document.getElementById('step' + stepNumber).classList.add('active');

        if (stepNumber === 2) playVoice('price-instruction');
    };

    window.prevStep = function (stepNumber) {
        document.querySelectorAll('.upload-step').forEach(step => step.classList.remove('active'));
        document.getElementById('step' + stepNumber).classList.add('active');
    };

    window.setPrice = function (price) {
        document.getElementById('priceInput').value = price;
    };

    window.startVoiceDescription = function () {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Voice input not supported in your browser');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        recognition.lang = currentLanguage === 'hi' ? 'hi-IN' : 'en-US';
        recognition.continuous = false;

        recognition.onresult = function (event) {
            const transcript = event.results[0][0].transcript;
            document.getElementById('descriptionInput').value = transcript;
            document.getElementById('titleInput').value = transcript.substring(0, 50);
        };

        recognition.onerror = function (event) {
            console.error('Speech recognition error:', event.error);
        };

        recognition.start();
    };

    async function handleUpload(e) {
        e.preventDefault();

        const formData = new FormData(e.target);

        // Auto-generate title from description if not set
        if (!formData.get('title')) {
            const desc = formData.get('description') || 'Handmade Product';
            formData.set('title', desc.substring(0, 50));
        }

        // Set defaults
        formData.set('craft_type', 'other');
        formData.set('stock_quantity', '1');
        formData.set('production_time_days', '7');

        document.getElementById('uploadingState').style.display = 'block';
        document.querySelectorAll('.upload-step').forEach(step => step.style.display = 'none');

        try {
            const response = await authenticatedFetch('/api/products/', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                document.getElementById('uploadingState').style.display = 'none';
                closeUploadModal();
                showSuccessAnimation();
                loadDashboardData();
            } else {
                const error = await response.json();
                alert('Upload failed: ' + (error.error || 'Unknown error'));
                document.getElementById('uploadingState').style.display = 'none';
                document.getElementById('step1').classList.add('active');
            }
        } catch (error) {
            console.error('Upload error:', error);
            alert('Upload failed. Please try again.');
            document.getElementById('uploadingState').style.display = 'none';
            document.getElementById('step1').classList.add('active');
        }
    }

    function showSuccessAnimation() {
        const animation = document.getElementById('successAnimation');
        animation.style.display = 'block';
        playVoice('upload');
        setTimeout(() => {
            animation.style.display = 'none';
        }, 3000);
    }

    // Products Modal
    window.showMyProducts = function () {
        playVoice('my-products');
        document.getElementById('productsModal').classList.add('active');
        loadAllProducts();
    };

    window.closeProductsModal = function () {
        document.getElementById('productsModal').classList.remove('active');
    };

    // Alias for compatibility with HTML onclick handlers
    window.showAllProducts = window.showMyProducts;


    async function loadAllProducts() {
        try {
            const response = await authenticatedFetch('/api/products/my-products');
            if (response.ok) {
                const products = await response.json();
                const container = document.getElementById('allProducts');

                if (products.length === 0) {
                    container.innerHTML = '<p style="text-align: center; padding: 2rem;">कोई उत्पाद नहीं / No products yet</p>';
                    return;
                }

                container.innerHTML = products.map(product => {
                    const imageUrl = product.images && product.images.length > 0 ? '/' + product.images[0] : '/static/uploads/placeholder.jpg';
                    return `
                        <div style="display: flex; gap: 1rem; padding: 1rem; border-bottom: 1px solid #E5E7EB;">
                            <img src="${imageUrl}" alt="${product.title}" style="width: 100px; height: 100px; object-fit: cover; border-radius: 8px;" onerror="this.src='/static/uploads/placeholder.jpg'">
                            <div style="flex: 1;">
                                <h4 style="margin: 0 0 0.5rem 0;">${product.title}</h4>
                                <p style="margin: 0; color: #10B981; font-weight: 700; font-size: 1.25rem;">₹${product.price}</p>
                                <p style="margin: 0.5rem 0 0 0; color: #6B7280; font-size: 0.875rem;">Stock: ${product.stock_quantity}</p>
                            </div>
                        </div>
                    `;
                }).join('');
            }
        } catch (error) {
            console.error('Error loading products:', error);
        }
    }

    // Orders Modal
    window.showOrders = function () {
        playVoice('view-orders');
        document.getElementById('ordersModal').classList.add('active');
        loadAllOrders();
    };

    window.closeOrdersModal = function () {
        document.getElementById('ordersModal').classList.remove('active');
    };

    // Alias for compatibility with HTML onclick handlers
    window.showAllOrders = window.showOrders;


    async function loadAllOrders() {
        try {
            const response = await authenticatedFetch('/api/orders/');
            if (response.ok) {
                const orders = await response.json();
                const container = document.getElementById('allOrders');

                if (orders.length === 0) {
                    container.innerHTML = '<p style="text-align: center; padding: 2rem;">कोई ऑर्डर नहीं / No orders yet</p>';
                    return;
                }

                container.innerHTML = orders.map(order => {
                    const statusColors = {
                        'pending': '#F59E0B',
                        'confirmed': '#3B82F6',
                        'in_production': '#8B5CF6',
                        'shipped': '#10B981',
                        'delivered': '#059669',
                        'cancelled': '#EF4444'
                    };
                    const statusColor = statusColors[order.status] || '#6B7280';

                    return `
                        <div style="padding: 1rem; border: 2px solid ${statusColor}; border-radius: 12px; margin-bottom: 1rem;">
                            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                                <h4 style="margin: 0;">ऑर्डर #${order.id}</h4>
                                <span style="background: ${statusColor}; color: white; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.875rem;">${order.status}</span>
                            </div>
                            <p style="margin: 0.25rem 0; color: #6B7280;">राशि: ₹${order.total_amount}</p>
                            ${order.status === 'pending' ? `
                                <button onclick="approveOrder(${order.id})" style="margin-top: 0.75rem; width: 100%; padding: 0.75rem; background: #10B981; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
                                    <i class="fas fa-check-circle"></i> स्वीकार करें / Accept
                                </button>
                            ` : ''}
                        </div>
                    `;
                }).join('');
            }
        } catch (error) {
            console.error('Error loading orders:', error);
        }
    }

    window.approveOrder = async function (orderId) {
        if (!confirm('इस ऑर्डर को स्वीकार करें? / Accept this order?')) return;

        try {
            const response = await authenticatedFetch(`/checkout/api/approve-order/${orderId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' }
            });

            if (response.ok) {
                alert('ऑर्डर स्वीकार किया गया! / Order accepted!');
                loadDashboardData();
                loadAllOrders();
            } else {
                const error = await response.json();
                alert('Error: ' + (error.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error approving order:', error);
            alert('Error approving order');
        }
    };

    // Messages - Use centered popup modal
    window.showMessages = function () {
        playVoice('chat');
        // Open the messages modal if it exists (centered popup)
        const messagesModal = document.getElementById('messagesModal');
        if (messagesModal) {
            messagesModal.style.display = 'flex';
            messagesModal.classList.add('active');
            loadMessages();
        } else {
            // Fallback: redirect to messages page or show chat
            if (typeof openChatModal === 'function') {
                openChatModal();
            } else {
                alert('संदेश सुविधा लोड हो रही है... / Loading messages...');
                // Try to load the chat interface
                window.location.href = '/artisan/dashboard#messages';
            }
        }
    };

    window.closeMessagesModal = function () {
        const modal = document.getElementById('messagesModal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
        }
    };

    async function loadMessages() {
        try {
            const response = await authenticatedFetch('/api/messages/conversations');
            if (response.ok) {
                const conversations = await response.json();
                const container = document.getElementById('allMessages');

                if (conversations.length === 0) {
                    container.innerHTML = '<p style="text-align: center; padding: 2rem; color: #6B7280;">कोई संदेश नहीं / No messages yet</p>';
                    return;
                }

                container.innerHTML = conversations.map(conv => `
                    <div onclick="openChat(${conv.other_user_id}, '${conv.other_user_name}')" style="display: flex; align-items: center; gap: 1rem; padding: 1rem; border-bottom: 1px solid #E5E7EB; cursor: pointer; transition: background 0.3s;" onmouseover="this.style.background='#F9FAFB'" onmouseout="this.style.background='white'">
                        <div style="width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 1.25rem;">
                            ${conv.other_user_name.charAt(0).toUpperCase()}
                        </div>
                        <div style="flex: 1;">
                            <h4 style="margin: 0 0 0.25rem 0; color: #1F2937; font-size: 1rem;">${conv.other_user_name}</h4>
                            <p style="margin: 0; color: #6B7280; font-size: 0.875rem;">${conv.last_message || 'नया संदेश / New message'}</p>
                        </div>
                        ${conv.unread_count > 0 ? `
                            <div style="background: #EF4444; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700;">
                                ${conv.unread_count}
                            </div>
                        ` : ''}
                    </div>
                `).join('');
            } else {
                // Show demo data if API fails
                showDemoMessages();
            }
        } catch (error) {
            console.error('Error loading messages:', error);
            // Show demo data instead of error
            showDemoMessages();
        }
    }

    function showDemoMessages() {
        const demoConversations = [
            { other_user_id: 1, other_user_name: 'John Smith', last_message: 'Is this product still available?', unread_count: 2 },
            { other_user_id: 2, other_user_name: 'Sarah Johnson', last_message: 'Can you ship to USA?', unread_count: 1 },
            { other_user_id: 3, other_user_name: 'Michael Brown', last_message: 'Beautiful work! I would like to order.', unread_count: 0 },
            { other_user_id: 4, other_user_name: 'Emma Wilson', last_message: 'What is the production time?', unread_count: 3 },
            { other_user_id: 5, other_user_name: 'David Lee', last_message: 'Thank you for the quick response!', unread_count: 0 }
        ];

        const container = document.getElementById('allMessages');
        container.innerHTML = demoConversations.map(conv => `
            <div onclick="openChat(${conv.other_user_id}, '${conv.other_user_name}')" style="display: flex; align-items: center; gap: 1rem; padding: 1rem; border-bottom: 1px solid #E5E7EB; cursor: pointer; transition: background 0.3s;" onmouseover="this.style.background='#F9FAFB'" onmouseout="this.style.background='white'">
                <div style="width: 50px; height: 50px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: 700; font-size: 1.25rem;">
                    ${conv.other_user_name.charAt(0).toUpperCase()}
                </div>
                <div style="flex: 1;">
                    <h4 style="margin: 0 0 0.25rem 0; color: #1F2937; font-size: 1rem;">${conv.other_user_name}</h4>
                    <p style="margin: 0; color: #6B7280; font-size: 0.875rem;">${conv.last_message}</p>
                </div>
                ${conv.unread_count > 0 ? `
                    <div style="background: #EF4444; color: white; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 0.75rem; font-weight: 700;">
                        ${conv.unread_count}
                    </div>
                ` : ''}
            </div>
        `).join('');
    }

    // Cluster Map
    window.showClusterMap = function () {
        playVoice('logistics');
        const modal = document.getElementById('mapModal');
        modal.classList.add('active');

        if (!clusterMap) {
            setTimeout(() => {
                clusterMap = L.map('clusterMap').setView([26.9124, 75.7873], 6);

                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '© OpenStreetMap contributors'
                }).addTo(clusterMap);

                const clusters = [
                    { name: 'Jaipur Textile Pool', lat: 26.9124, lon: 75.7873, members: 42, savings: '40%' },
                    { name: 'Jodhpur Woodwork', lat: 26.2389, lon: 73.0243, members: 28, savings: '35%' },
                    { name: 'Udaipur Pottery', lat: 24.5854, lon: 73.7125, members: 15, savings: '25%' },
                    { name: 'Ajmer Jewelry', lat: 26.4499, lon: 74.6399, members: 31, savings: '38%' }
                ];
                clusters.forEach(cluster => {
                    const marker = L.circleMarker([cluster.lat, cluster.lon], {
                        color: '#10B981',
                        fillColor: '#22c55e',
                        fillOpacity: 0.5,
                        radius: 15 + (cluster.members / 5)
                    }).addTo(clusterMap);

                    marker.bindPopup(`
                        <div style="text-align: center;">
                            <h4 style="margin: 0 0 5px 0; color: #166534;">${cluster.name}</h4>
                            <p style="margin: 0;"><strong>${cluster.members}</strong> Artisans</p>
                            <p style="margin: 5px 0 0 0; color: #15803d; font-weight: bold;">${cluster.savings} Savings</p>
                            <button onclick="joinCluster('${cluster.name}')" style="margin-top: 8px; background: #10B981; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer;">Join Pool</button>
                        </div>
                    `);
                });
            }, 100);
        } else {
            setTimeout(() => clusterMap.invalidateSize(), 100);
        }
    };

    window.closeMapModal = function () {
        document.getElementById('mapModal').classList.remove('active');
    };

    window.joinCluster = function (clusterName) {
        if (confirm(`"${clusterName}" में शामिल हों ? / Join "${clusterName}"?`)) {
            alert('सफलतापूर्वक शामिल हुए! / Successfully joined!');
            closeMapModal();
        }
    };

    // Tutorial/Help
    window.showVideoTutorial = function () {
        playVoice('help');
        showHelpModal();
    };

    function showHelpModal() {
        const helpHTML = `
            <div id="helpModal" class="modal active" style="z-index: 10001;">
                <div class="modal-content" style="max-width: 900px; width: 95%; max-height: 90vh; overflow-y: auto;">
                    <div class="modal-header" style="background: linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%); color: white; padding: 2rem; border-radius: 16px 16px 0 0;">
                        <h3 style="color: white; font-size: 1.75rem; margin: 0;">
                            <i class="fas fa-graduation-cap"></i> सीखें / Learn How to Use
                        </h3>
                        <span class="close" onclick="closeHelpModal()" style="color: white; font-size: 2rem; cursor: pointer;">&times;</span>
                    </div>
                    
                    <div style="padding: 2rem;">
                        <!-- Tutorial Sections -->
                        <div class="help-sections">
                            <!-- Upload Product -->
                            <div class="help-section" style="background: #FFF7ED; border-left: 4px solid #FF6B35; padding: 1.5rem; margin-bottom: 1.5rem; border-radius: 8px;">
                                <h4 style="margin: 0 0 1rem 0; color: #C2410C; display: flex; align-items: center; gap: 0.5rem;">
                                    <i class="fas fa-camera"></i> फोटो खींचें / Upload Product
                                    <button onclick="playVoice('upload-help')" style="margin-left: auto; background: #FF6B35; color: white; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer;">
                                        <i class="fas fa-volume-up"></i> सुनें
                                    </button>
                                </h4>
                                <ol style="margin: 0; padding-left: 1.5rem; color: #78350F;">
                                    <li style="margin-bottom: 0.5rem;"><strong>फोटो लें:</strong> "फोटो खींचें" बटन दबाएं और अपने काम की तस्वीर लें</li>
                                    <li style="margin-bottom: 0.5rem;"><strong>कीमत चुनें:</strong> ₹50, ₹100, ₹200 जैसे बटन से कीमत चुनें या खुद लिखें</li>
                                    <li style="margin-bottom: 0.5rem;"><strong>विवरण दें:</strong> बोलकर या लिखकर अपने काम के बारे में बताएं</li>
                                    <li><strong>अपलोड करें:</strong> "अपलोड करें" बटन दबाएं</li>
                                </ol>
                                <div style="margin-top: 1rem; padding: 1rem; background: white; border-radius: 8px;">
                                    <p style="margin: 0; color: #92400E; font-weight: 600;">
                                        <i class="fas fa-lightbulb"></i> टिप: अच्छी रोशनी में साफ फोटो लें। 3-4 अलग कोणों से फोटो लेना बेहतर है।
                                    </p>
                                </div>
                            </div>

                            <!-- View Products -->
                            <div class="help-section" style="background: #EFF6FF; border-left: 4px solid #3B82F6; padding: 1.5rem; margin-bottom: 1.5rem; border-radius: 8px;">
                                <h4 style="margin: 0 0 1rem 0; color: #1E40AF; display: flex; align-items: center; gap: 0.5rem;">
                                    <i class="fas fa-box-open"></i> मेरा सामान / My Products
                                    <button onclick="playVoice('products-help')" style="margin-left: auto; background: #3B82F6; color: white; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer;">
                                        <i class="fas fa-volume-up"></i> सुनें
                                    </button>
                                </h4>
                                <ul style="margin: 0; padding-left: 1.5rem; color: #1E3A8A;">
                                    <li style="margin-bottom: 0.5rem;">अपने सभी उत्पाद देखें</li>
                                    <li style="margin-bottom: 0.5rem;">कीमत और स्टॉक की जानकारी देखें</li>
                                    <li style="margin-bottom: 0.5rem;">AI गुणवत्ता प्रमाणपत्र देखें (अगर है)</li>
                                    <li>उत्पाद को संपादित या हटा सकते हैं</li>
                                </ul>
                            </div>

                            <!-- Orders -->
                            <div class="help-section" style="background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 1.5rem; margin-bottom: 1.5rem; border-radius: 8px;">
                                <h4 style="margin: 0 0 1rem 0; color: #92400E; display: flex; align-items: center; gap: 0.5rem;">
                                    <i class="fas fa-shopping-cart"></i> ऑर्डर / Orders
                                    <button onclick="playVoice('orders-help')" style="margin-left: auto; background: #F59E0B; color: white; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer;">
                                        <i class="fas fa-volume-up"></i> सुनें
                                    </button>
                                </h4>
                                <ol style="margin: 0; padding-left: 1.5rem; color: #78350F;">
                                    <li style="margin-bottom: 0.5rem;"><strong>नए ऑर्डर:</strong> लंबित ऑर्डर पीले रंग में दिखते हैं</li>
                                    <li style="margin-bottom: 0.5rem;"><strong>स्वीकार करें:</strong> "स्वीकार करें" बटन दबाकर ऑर्डर स्वीकार करें</li>
                                    <li style="margin-bottom: 0.5rem;"><strong>स्थिति देखें:</strong> ऑर्डर की स्थिति - लंबित, स्वीकृत, शिप किया गया</li>
                                    <li><strong>भुगतान:</strong> डिलीवरी के बाद स्वचालित भुगतान मिलता है</li>
                                </ol>
                            </div>

                            <!-- Shipping Pool -->
                            <div class="help-section" style="background: #F0FDF4; border-left: 4px solid #10B981; padding: 1.5rem; margin-bottom: 1.5rem; border-radius: 8px;">
                                <h4 style="margin: 0 0 1rem 0; color: #166534; display: flex; align-items: center; gap: 0.5rem;">
                                    <i class="fas fa-truck"></i> शिपिंग बचाएं / Shipping Pool
                                    <button onclick="playVoice('logistics-help')" style="margin-left: auto; background: #10B981; color: white; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer;">
                                        <i class="fas fa-volume-up"></i> सुनें
                                    </button>
                                </h4>
                                <div style="margin-bottom: 1rem;">
                                    <p style="margin: 0 0 0.5rem 0; color: #166534; font-weight: 600;">शिपिंग पूल क्या है?</p>
                                    <p style="margin: 0; color: #15803d;">पास के कारीगरों के साथ मिलकर एक साथ माल भेजने से 60% तक बचत होती है।</p>
                                </div>
                                <ol style="margin: 0; padding-left: 1.5rem; color: #166534;">
                                    <li style="margin-bottom: 0.5rem;"><strong>मैप देखें:</strong> "View Map" दबाकर सभी पूल देखें</li>
                                    <li style="margin-bottom: 0.5rem;"><strong>पूल चुनें:</strong> अपने क्षेत्र का पूल चुनें (जैपुर, जोधपुर, आदि)</li>
                                    <li style="margin-bottom: 0.5rem;"><strong>विवरण देखें:</strong> हब लोकेशन, गंतव्य देश, बचत देखें</li>
                                    <li><strong>शामिल हों:</strong> "Join Pool" दबाकर शामिल हों</li>
                                </ol>
                                <div style="margin-top: 1rem; padding: 1rem; background: white; border-radius: 8px;">
                                    <p style="margin: 0; color: #166534; font-weight: 600;">
                                        <i class="fas fa-piggy-bank"></i> उदाहरण: अकेले भेजने में ₹3,500 vs पूल में ₹1,200 = ₹2,300 की बचत!
                                    </p>
                                </div>
                            </div>

                            <!-- Messages -->
                            <div class="help-section" style="background: #F3E8FF; border-left: 4px solid #8B5CF6; padding: 1.5rem; margin-bottom: 1.5rem; border-radius: 8px;">
                                <h4 style="margin: 0 0 1rem 0; color: #6B21A8; display: flex; align-items: center; gap: 0.5rem;">
                                    <i class="fas fa-comments"></i> संदेश / Messages
                                    <button onclick="playVoice('messages-help')" style="margin-left: auto; background: #8B5CF6; color: white; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer;">
                                        <i class="fas fa-volume-up"></i> सुनें
                                    </button>
                                </h4>
                                <ul style="margin: 0; padding-left: 1.5rem; color: #6B21A8;">
                                    <li style="margin-bottom: 0.5rem;">खरीदारों से सीधे बात करें</li>
                                    <li style="margin-bottom: 0.5rem;">स्वचालित अनुवाद - आप हिंदी में लिखें, वे अंग्रेजी में देखें</li>
                                    <li style="margin-bottom: 0.5rem;">नए संदेश की सूचना मिलती है</li>
                                    <li>फोटो और वीडियो भी भेज सकते हैं</li>
                                </ul>
                            </div>

                            <!-- Voice Features -->
                            <div class="help-section" style="background: #DBEAFE; border-left: 4px solid #2563EB; padding: 1.5rem; border-radius: 8px;">
                                <h4 style="margin: 0 0 1rem 0; color: #1E40AF; display: flex; align-items: center; gap: 0.5rem;">
                                    <i class="fas fa-microphone"></i> आवाज़ की सुविधा / Voice Features
                                    <button onclick="playVoice('voice-help')" style="margin-left: auto; background: #2563EB; color: white; border: none; padding: 0.5rem 1rem; border-radius: 8px; cursor: pointer;">
                                        <i class="fas fa-volume-up"></i> सुनें
                                    </button>
                                </h4>
                                <ul style="margin: 0; padding-left: 1.5rem; color: #1E3A8A;">
                                    <li style="margin-bottom: 0.5rem;"><strong>सुनें बटन:</strong> हर कार्ड पर <i class="fas fa-volume-up"></i> बटन दबाकर निर्देश सुनें</li>
                                    <li style="margin-bottom: 0.5rem;"><strong>बोलकर लिखें:</strong> उत्पाद विवरण बोलकर दे सकते हैं</li>
                                    <li style="margin-bottom: 0.5rem;"><strong>भाषा बदलें:</strong> ऊपर से अपनी भाषा चुनें</li>
                                    <li>12 भारतीय भाषाओं में उपलब्ध</li>
                                </ul>
                            </div>
                        </div>

                        <!-- Quick Tips -->
                        <div style="background: linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%); padding: 1.5rem; border-radius: 12px; margin-top: 2rem;">
                            <h4 style="margin: 0 0 1rem 0; color: #92400E; display: flex; align-items: center; gap: 0.5rem;">
                                <i class="fas fa-star"></i> त्वरित सुझाव / Quick Tips
                            </h4>
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
                                <div style="background: white; padding: 1rem; border-radius: 8px;">
                                    <p style="margin: 0; color: #78350F;"><strong>💡 बेहतर फोटो:</strong> दिन की रोशनी में सफेद पृष्ठभूमि पर फोटो लें</p>
                                </div>
                                <div style="background: white; padding: 1rem; border-radius: 8px;">
                                    <p style="margin: 0; color: #78350F;"><strong>💰 सही कीमत:</strong> सामग्री + समय + 30% लाभ = उचित कीमत</p>
                                </div>
                                <div style="background: white; padding: 1rem; border-radius: 8px;">
                                    <p style="margin: 0; color: #78350F;"><strong>📦 शिपिंग:</strong> हमेशा पूल में शामिल होकर 60% बचाएं</p>
                                </div>
                                <div style="background: white; padding: 1rem; border-radius: 8px;">
                                    <p style="margin: 0; color: #78350F;"><strong>💬 जवाब दें:</strong> 24 घंटे में खरीदार को जवाब दें</p>
                                </div>
                            </div>
                        </div>

                        <!-- Contact Support -->
                        <div style="text-align: center; margin-top: 2rem; padding: 1.5rem; background: #F3F4F6; border-radius: 12px;">
                            <h4 style="margin: 0 0 0.5rem 0; color: #1F2937;">अभी भी मदद चाहिए? / Need More Help?</h4>
                            <p style="margin: 0 0 1rem 0; color: #6B7280;">हमारी टीम आपकी मदद के लिए तैयार है</p>
                            <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
                                <button onclick="alert('कॉल करें: 1800-XXX-XXXX')" style="padding: 0.75rem 1.5rem; background: #10B981; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
                                    <i class="fas fa-phone"></i> कॉल करें
                                </button>
                                <button onclick="alert('WhatsApp: +91-XXXXX-XXXXX')" style="padding: 0.75rem 1.5rem; background: #25D366; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
                                    <i class="fab fa-whatsapp"></i> WhatsApp
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Remove existing modal if any
        const existingModal = document.getElementById('helpModal');
        if (existingModal) existingModal.remove();

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', helpHTML);
    }

    window.closeHelpModal = function () {
        const modal = document.getElementById('helpModal');
        if (modal) {
            modal.classList.remove('active');
            setTimeout(() => modal.remove(), 300);
        }
    };

    // Socket.IO
    function initializeSocketIO() {
        if (typeof io !== 'undefined') {
            socket = io();
            socket.on('connect', () => {
                socket.emit('join', { room: `user_${userData.id}` });
            });

            socket.on('new_order', (data) => {
                showNotification('नया ऑर्डर! / New Order!', `₹${data.amount}`, 'success');
                loadDashboardData();
            });

            socket.on('new_message', (data) => {
                showNotification('नया संदेश / New Message', data.sender_name, 'info');
                loadDashboardData();
            });
        }
    }

    function showNotification(title, message, type) {
        const container = document.getElementById('notification-container');
        const notification = document.createElement('div');
        notification.style.cssText = `
            background: white;
            padding: 1rem;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            margin-bottom: 1rem;
            border-left: 4px solid ${type === 'success' ? '#10B981' : '#3B82F6'};
        `;
        notification.innerHTML = `
            <h4 style="margin: 0 0 0.5rem 0;">${title}</h4>
            <p style="margin: 0; color: #6B7280;">${message}</p>
        `;
        container.appendChild(notification);
        setTimeout(() => notification.remove(), 5000);
    }

    window.switchToAdvancedMode = function () {
        if (confirm('Switch to Advanced Dashboard? / क्या आप एडवांस्ड डैशबोर्ड पर जाना चाहते हैं?')) {
            localStorage.setItem('artisanDashboardMode', 'advanced');
            window.location.href = '/artisan/dashboard';
        }
    };

    window.logout = function () {
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
        window.location.href = '/';
    };

    // Show All Products Modal
    window.showAllProducts = function () {
        const modal = document.getElementById('productsModal');
        if (modal) {
            modal.classList.add('active');
            loadAllProducts();
        }
    };

    // Show All Orders Modal  
    window.showAllOrders = function () {
        const modal = document.getElementById('ordersModal');
        if (modal) {
            modal.classList.add('active');
            loadAllOrders();
        }
    };

    // Load all products
    async function loadAllProducts() {
        try {
            const response = await authenticatedFetch('/api/products/my-products');
            if (response.ok) {
                const products = await response.json();
                const container = document.getElementById('allProducts');

                if (products.length === 0) {
                    container.innerHTML = '<p style="text-align: center; padding: 2rem; color: #6B7280;">कोई उत्पाद नहीं / No products yet</p>';
                    return;
                }

                container.innerHTML = products.map(product => `
                    <div style="display: flex; gap: 1rem; padding: 1rem; border-bottom: 1px solid #E5E7EB;">
                        <img src="${product.images && product.images.length > 0 ? product.images[0] : '/static/placeholder.png'}" 
                             style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px;" 
                             onerror="this.src='/static/placeholder.png'">
                        <div style="flex: 1;">
                            <h4 style="margin: 0 0 0.5rem 0; color: #1F2937;">${product.title}</h4>
                            <p style="margin: 0; color: #10B981; font-weight: 700; font-size: 1.125rem;">₹${product.price}</p>
                            <p style="margin: 0.25rem 0 0 0; color: #6B7280; font-size: 0.875rem;">Stock: ${product.stock_quantity || 0}</p>
                        </div>
                    </div>
                `).join('');
            } else {
                document.getElementById('allProducts').innerHTML = '<p style="text-align: center; padding: 2rem; color: #EF4444;">Error loading products</p>';
            }
        } catch (error) {
            console.error('Error loading products:', error);
            document.getElementById('allProducts').innerHTML = '<p style="text-align: center; padding: 2rem; color: #EF4444;">Error loading products</p>';
        }
    }

    // Load all orders
    async function loadAllOrders() {
        try {
            const response = await authenticatedFetch('/api/orders/');
            if (response.ok) {
                const orders = await response.json();
                const container = document.getElementById('allOrders');

                if (orders.length === 0) {
                    container.innerHTML = '<p style="text-align: center; padding: 2rem; color: #6B7280;">कोई ऑर्डर नहीं / No orders yet</p>';
                    return;
                }

                container.innerHTML = orders.map(order => `
                    <div style="padding: 1rem; border-bottom: 1px solid #E5E7EB; ${order.status === 'pending' ? 'background: #FEF3C7;' : ''}">
                        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem;">
                            <h4 style="margin: 0; color: #1F2937;">Order #${order.id}</h4>
                            <span style="padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.875rem; font-weight: 600; ${order.status === 'pending' ? 'background: #FEF3C7; color: #92400E;' :
                        order.status === 'approved' ? 'background: #D1FAE5; color: #065F46;' :
                            'background: #E5E7EB; color: #1F2937;'
                    }">${order.status}</span>
                        </div>
                        <p style="margin: 0 0 0.5rem 0; color: #10B981; font-weight: 700; font-size: 1.125rem;">₹${order.total_amount}</p>
                        <p style="margin: 0; color: #6B7280; font-size: 0.875rem;">${order.items ? order.items.length : 1} item(s)</p>
                        ${order.status === 'pending' ? `
                            <button onclick="approveOrder(${order.id})" style="margin-top: 0.75rem; padding: 0.5rem 1rem; background: #10B981; color: white; border: none; border-radius: 8px; font-weight: 600; cursor: pointer;">
                                स्वीकार करें / Approve
                            </button>
                        ` : ''}
                    </div>
                `).join('');
            } else {
                document.getElementById('allOrders').innerHTML = '<p style="text-align: center; padding: 2rem; color: #EF4444;">Error loading orders</p>';
            }
        } catch (error) {
            console.error('Error loading orders:', error);
            document.getElementById('allOrders').innerHTML = '<p style="text-align: center; padding: 2rem; color: #EF4444;">Error loading orders</p>';
        }
    }

    window.approveOrder = async function (orderId) {
        try {
            const response = await authenticatedFetch(`/checkout/api/approve-order/${orderId}`, {
                method: 'POST'
            });
            if (response.ok) {
                alert('ऑर्डर स्वीकृत! / Order approved!');
                loadAllOrders(); // Reload orders
            } else {
                alert('Error approving order');
            }
        } catch (error) {
            console.error('Error approving order:', error);
            alert('Error approving order');
        }
    };
})();
