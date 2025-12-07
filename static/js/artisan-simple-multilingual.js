/**
 * Simplified Artisan Dashboard - Multilingual
 * Designed for low-literacy village artisans
 * Features: Voice support in 12 Indian languages, visual-first interface
 */

(function () {
    'use strict';

    const authToken = localStorage.getItem('authToken');
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');

    if (!authToken || userData.role !== 'artisan') {
        window.location.href = '/';
    }

    // Language to voice code mapping
    const languageVoiceCodes = {
        'hi': 'hi-IN',      // Hindi
        'te': 'te-IN',      // Telugu
        'ta': 'ta-IN',      // Tamil
        'kn': 'kn-IN',      // Kannada
        'ml': 'ml-IN',      // Malayalam
        'bn': 'bn-IN',      // Bengali
        'gu': 'gu-IN',      // Gujarati
        'mr': 'mr-IN',      // Marathi
        'pa': 'pa-IN',      // Punjabi
        'od': 'or-IN',      // Odia
        'as': 'as-IN',      // Assamese
        'en': 'en-IN'       // English (India)
    };

    let currentLanguage = localStorage.getItem('artisanLanguage') || 'hi';
    let translations = {};

    // Load translations
    async function loadTranslations(lang) {
        try {
            const response = await fetch(`/static/translations/artisan-dashboard-${lang}.json`);
            if (response.ok) {
                translations = await response.json();
                currentLanguage = lang;
                localStorage.setItem('artisanLanguage', lang);
                applyTranslations();
                return true;
            }
        } catch (error) {
            console.error('Error loading translations:', error);
        }
        return false;
    }

    // Apply translations to UI
    function applyTranslations() {
        if (!translations) return;

        const t = translations;

        // Update listen button
        const listenText = document.getElementById('listenText');
        if (listenText) listenText.textContent = t.listen || 'Listen';

        // Update card texts
        const cards = [
            { id: 'upload', key: 'upload' },
            { id: 'products', key: 'products' },
            { id: 'orders', key: 'orders' },
            { id: 'earnings', key: 'earnings' },
            { id: 'messages', key: 'messages' },
            { id: 'help', key: 'help' }
        ];

        // Update each card (if they have data-card attribute)
        document.querySelectorAll('[data-card]').forEach(card => {
            const cardType = card.getAttribute('data-card');
            const cardData = t.cards[cardType];
            if (cardData) {
                const primaryText = card.querySelector('.card-primary');
                const secondaryText = card.querySelector('.card-secondary');
                const subtitleText = card.querySelector('.card-subtitle-text');

                if (primaryText) primaryText.textContent = cardData.primary;
                if (secondaryText) secondaryText.textContent = cardData.secondary;
                if (subtitleText) subtitleText.textContent = cardData.subtitle;
            }
        });

        // Update upload modal texts
        const uploadTitle = document.querySelector('#uploadModal h2 .upload-title-text');
        if (uploadTitle && t.upload) uploadTitle.textContent = t.upload.title;
    }

    // Text-to-Speech function with language support and visual feedback
    window.playVoice = function (messageKey, customText, buttonElement) {
        if ('speechSynthesis' in window) {
            // Cancel any ongoing speech immediately
            window.speechSynthesis.cancel();

            let text = customText;
            if (!text && translations.cards && translations.cards[messageKey]) {
                text = translations.cards[messageKey].voice;
            } else if (!text && translations[`voice${messageKey.charAt(0).toUpperCase() + messageKey.slice(1)}`]) {
                text = translations[`voice${messageKey.charAt(0).toUpperCase() + messageKey.slice(1)}`];
            }

            if (!text) {
                console.log('No translation found for:', messageKey);
                return;
            }

            // Replace {name} placeholder
            text = text.replace('{name}', userData.full_name || 'Friend');

            // Show visual feedback on button if available
            if (buttonElement) {
                const originalHTML = buttonElement.innerHTML;
                buttonElement.innerHTML = '<i class="fas fa-circle-notch fa-spin"></i>';
                buttonElement.style.opacity = '0.7';

                // Restore after speech ends
                setTimeout(() => {
                    buttonElement.innerHTML = originalHTML;
                    buttonElement.style.opacity = '1';
                }, 1000);
            }

            // Small delay to ensure cancel completed
            setTimeout(() => {
                const utterance = new SpeechSynthesisUtterance(text);
                utterance.lang = languageVoiceCodes[currentLanguage] || 'hi-IN';
                utterance.rate = 0.9;
                utterance.pitch = 1;

                // Add event listeners for better feedback
                utterance.onstart = function () {
                    console.log('Voice started speaking');
                };

                utterance.onend = function () {
                    console.log('Voice finished speaking');
                };

                utterance.onerror = function (event) {
                    console.error('Speech error:', event);
                    if (buttonElement) {
                        buttonElement.innerHTML = originalHTML;
                        buttonElement.style.opacity = '1';
                    }
                };

                window.speechSynthesis.speak(utterance);
            }, 100);
        } else {
            console.log('Speech synthesis not supported');
            alert(translations.alerts?.voiceNotSupported || 'Voice not supported on this device');
        }
    };

    // Change language
    window.changeLanguage = async function (lang) {
        await loadTranslations(lang);
        const selector = document.getElementById('languageSelector');
        if (selector) selector.value = lang;
    };

    // Start voice help
    window.startVoiceHelp = function () {
        const greetingText = translations.voiceGreeting || `Hello ${userData.full_name || 'Friend'}. Welcome to Bharatcraft.`;
        const text = greetingText.replace('{name}', userData.full_name || 'Friend');
        playVoice('greeting', text);
    };

    // Show simplified upload modal
    window.showSimpleUpload = function () {
        document.getElementById('uploadModal').classList.add('active');
        document.getElementById('step1').classList.add('active');
    };

    // Close upload modal
    window.closeUploadModal = function () {
        document.getElementById('uploadModal').classList.remove('active');
        document.getElementById('simpleUploadForm').reset();
        document.querySelectorAll('.upload-step').forEach(step => step.classList.remove('active'));
        document.getElementById('photoPreview').innerHTML = '';
        document.getElementById('photoNextBtn').style.display = 'none';
    };

    // Show photo preview
    window.showPhotoPreview = function (input) {
        const preview = document.getElementById('photoPreview');
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

            document.getElementById('photoNextBtn').style.display = 'flex';
        }
    };

    // Navigate between steps
    window.nextStep = function (stepNumber) {
        if (stepNumber === 2) {
            const photoInput = document.getElementById('photoInput');
            if (!photoInput.files || photoInput.files.length === 0) {
                const msg = translations.alerts?.photoRequired || 'Please take a photo';
                alert(msg);
                return;
            }
        }

        if (stepNumber === 3) {
            const priceInput = document.getElementById('priceInput');
            if (!priceInput.value || parseFloat(priceInput.value) <= 0) {
                const msg = translations.alerts?.priceRequired || 'Please enter a price';
                alert(msg);
                return;
            }
        }

        document.querySelectorAll('.upload-step').forEach(step => {
            step.classList.remove('active');
        });

        document.getElementById(`step${stepNumber}`).classList.add('active');
    };

    window.prevStep = function (stepNumber) {
        document.querySelectorAll('.upload-step').forEach(step => {
            step.classList.remove('active');
        });
        document.getElementById(`step${stepNumber}`).classList.add('active');
    };

    // Quick price buttons
    window.setPrice = function (amount) {
        document.getElementById('priceInput').value = amount;
    };

    // Voice description recording
    window.startVoiceDescription = function () {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();

            recognition.lang = languageVoiceCodes[currentLanguage] || 'hi-IN';
            recognition.continuous = false;
            recognition.interimResults = false;

            const btn = document.querySelector('.voice-record-btn');
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-circle" style="color: red; animation: pulse 1s infinite;"></i> <span class="hindi">सुन रहे हैं...</span>';

            recognition.onresult = function (event) {
                const transcript = event.results[0][0].transcript;
                document.getElementById('descriptionInput').value = transcript;

                if (!document.getElementById('titleInput').value) {
                    document.getElementById('titleInput').value = transcript.substring(0, 50);
                }

                btn.innerHTML = originalHTML;
            };

            recognition.onerror = function (event) {
                console.error('Speech recognition error:', event.error);
                const msg = translations.alerts?.sessionExpired || 'Sorry, could not hear you';
                alert(msg);
                btn.innerHTML = originalHTML;
            };

            recognition.onend = function () {
                btn.innerHTML = originalHTML;
            };

            recognition.start();
        } else {
            const msg = translations.alerts?.voiceNotSupported || 'Sorry, voice input not supported';
            alert(msg);
        }
    };

    // Helper to compress image
    async function compressImage(file) {
        if (!file.type.match(/image.*/)) return file;

        return new Promise((resolve) => {
            try {
                // Aggressive compression for live demo speed
                const maxWidth = 800;
                const maxHeight = 800;
                const reader = new FileReader();
                reader.readAsDataURL(file);
                reader.onload = function (event) {
                    const img = new Image();
                    img.src = event.target.result;
                    img.onload = function () {
                        let width = img.width;
                        let height = img.height;

                        if (width > height) {
                            if (width > maxWidth) {
                                height *= maxWidth / width;
                                width = maxWidth;
                            }
                        } else {
                            if (height > maxHeight) {
                                width *= maxHeight / height;
                                height = maxHeight;
                            }
                        }

                        const canvas = document.createElement('canvas');
                        canvas.width = width;
                        canvas.height = height;
                        const ctx = canvas.getContext('2d');
                        ctx.drawImage(img, 0, 0, width, height);

                        canvas.toBlob((blob) => {
                            if (!blob) {
                                resolve(file); // Fallback
                                return;
                            }
                            const newFile = new File([blob], file.name, {
                                type: 'image/jpeg',
                                lastModified: Date.now()
                            });
                            resolve(newFile);
                        }, 'image/jpeg', 0.6); // Lower quality for speed
                    };
                    img.onerror = () => resolve(file);
                };
                reader.onerror = () => resolve(file);
            } catch (e) {
                console.error("Compression error", e);
                resolve(file);
            }
        });
    }

    // Handle form submission
    document.getElementById('simpleUploadForm').addEventListener('submit', async function (e) {
        e.preventDefault();

        const formData = new FormData(this);

        // Validate required fields
        const price = formData.get('price');
        const description = formData.get('description') || '';

        // Check if price is provided
        if (!price || parseFloat(price) <= 0) {
            const priceError = translations.alerts?.priceRequired || 'Please enter a valid price';
            alert(priceError);
            document.getElementById('step2').classList.add('active');
            return;
        }

        // Check if images are provided - get from input element directly
        const photoInput = document.getElementById('photoInput');
        const imageFiles = photoInput ? Array.from(photoInput.files || []) : [];

        if (imageFiles.length === 0) {
            const imageError = translations.alerts?.imageRequired || 'Please add at least one photo';
            alert(imageError);
            document.getElementById('step1').classList.add('active');
            return;
        }

        document.getElementById('uploadingState').style.display = 'block';
        document.querySelectorAll('.upload-step').forEach(step => step.classList.remove('active'));

        // Compress images
        const compressedImages = await Promise.all(imageFiles.map(file => compressImage(file)));

        // Clear any existing images in formData and add fresh ones
        formData.delete('images');
        compressedImages.forEach(file => {
            if (file && file.size > 0) {
                formData.append('images', file);
            }
        });

        // Double check we have images
        if (formData.getAll('images').length === 0) {
            const imageError = translations.alerts?.imageRequired || 'Please add at least one photo';
            alert(imageError);
            document.getElementById('step1').classList.add('active');
            document.getElementById('uploadingState').style.display = 'none';
            return;
        }

        // Set title from description or default
        if (!formData.get('title')) {
            const titleText = description.trim() || 'Handmade Product';
            formData.set('title', titleText.substring(0, 50));
        }

        // Ensure description exists
        if (!formData.get('description') || formData.get('description').trim() === '') {
            formData.set('description', 'Handmade craft product');
        }

        // Set craft type if not provided
        if (!formData.get('craft_type')) {
            formData.set('craft_type', userData.craft_type || 'handicraft');
        }

        // Set default values
        if (!formData.get('stock_quantity')) {
            formData.set('stock_quantity', '1');
        }
        if (!formData.get('production_time_days')) {
            formData.set('production_time_days', '7');
        }

        document.querySelectorAll('.upload-step').forEach(step => step.classList.remove('active'));
        document.getElementById('uploadingState').style.display = 'block';

        try {
            const response = await fetch('/api/products/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`
                },
                body: formData
            });

            if (response.ok) {
                closeUploadModal();
                showSuccessAnimation();

                setTimeout(() => {
                    loadStats();
                }, 2000);
            } else {
                let errorMessage = translations.alerts?.uploadProblem || 'Upload problem. Try again';
                try {
                    const errorData = await response.json();
                    if (errorData.error) {
                        errorMessage = errorData.error;
                    }
                } catch (parseError) {
                    console.error('Error parsing response:', parseError);
                    errorMessage = `Server error: ${response.status} ${response.statusText}`;
                }
                alert(errorMessage);
                document.getElementById('uploadingState').style.display = 'none';
                document.getElementById('step1').classList.add('active');
            }
        } catch (error) {
            console.error('Upload error:', error);
            let errorMessage = translations.alerts?.uploadProblem || 'Upload problem. Try again';
            if (error.message) {
                errorMessage += ': ' + error.message;
            }
            alert(errorMessage);
            document.getElementById('uploadingState').style.display = 'none';
            document.getElementById('step1').classList.add('active');
        }
    });

    // Show success animation
    function showSuccessAnimation() {
        const successDiv = document.getElementById('successAnimation');
        successDiv.style.display = 'flex';

        const successText = translations.voiceUploadSuccess || 'Excellent! Your product has been uploaded. Buyers can now see it.';
        playVoice('uploadSuccess', successText);

        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 3000);
    }

    // Load statistics
    async function loadStats() {
        try {
            const productsResponse = await fetch('/api/products/my-products', {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (productsResponse.ok) {
                const products = await productsResponse.json();
                document.getElementById('productCount').textContent = products.length;
            }

            document.getElementById('orderCount').textContent = '0';
            document.getElementById('totalEarnings').textContent = '0';
            document.getElementById('messageCount').textContent = '0';

        } catch (error) {
            console.error('Error loading stats:', error);
        }
    }

    // Navigation functions
    window.showMyProducts = function () {
        const productsModal = document.getElementById('productsModal');
        if (productsModal) {
            productsModal.style.display = 'flex';
            productsModal.style.position = 'fixed';
            productsModal.style.top = '0';
            productsModal.style.left = '0';
            productsModal.style.width = '100%';
            productsModal.style.height = '100%';
            productsModal.style.zIndex = '9999';
            productsModal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            productsModal.style.backdropFilter = 'blur(4px)';
            productsModal.style.alignItems = 'center';
            productsModal.style.justifyContent = 'center';
            productsModal.classList.add('active');

            // Prevent body scroll
            document.body.style.overflow = 'hidden';

            // Close on background click
            productsModal.addEventListener('click', function (e) {
                if (e.target === productsModal) {
                    closeProductsModal();
                }
            });

            loadMyProducts();
        } else {
            // Fallback to advanced dashboard if modal not found
            window.location.href = '/artisan/dashboard';
        }
    };

    // Load products for the modal
    async function loadMyProducts() {
        const container = document.getElementById('allProducts');
        if (!container) return;

        container.innerHTML = '<div style="text-align: center; padding: 2rem;"><i class="fas fa-circle-notch fa-spin" style="font-size: 2rem; color: #FF6B35;"></i><p>Loading...</p></div>';

        try {
            const response = await fetch('/api/products/my-products', {
                headers: { 'Authorization': `Bearer ${authToken}` }
            });

            if (response.ok) {
                const products = await response.json();
                if (products.length === 0) {
                    const msg = translations.alerts?.noProducts || 'No products found.';
                    container.innerHTML = `<p style="text-align: center; padding: 2rem; color: #6B7280;">${msg}</p>`;
                    return;
                }

                container.innerHTML = products.map(p => {
                    const imageUrl = p.images && p.images.length > 0 ? p.images[0] : '/static/placeholder.jpg';
                    // Ensure image path is correct (handle relative paths if needed)
                    const finalImageUrl = imageUrl.startsWith('http') || imageUrl.startsWith('/') ? imageUrl : '/' + imageUrl;

                    return `
                    <div class="product-item" style="display: flex; gap: 1rem; padding: 1rem; border-bottom: 1px solid #E5E7EB; align-items: center; background: white; border-radius: 8px; margin-bottom: 0.5rem;">
                        <img src="${finalImageUrl}" style="width: 80px; height: 80px; object-fit: cover; border-radius: 8px; border: 1px solid #E5E7EB;">
                        <div style="flex: 1;">
                            <h4 style="margin: 0 0 0.25rem 0; font-size: 1.1rem; color: #1F2937;">${p.title}</h4>
                            <p style="margin: 0; color: #FF6B35; font-weight: 600;">₹${p.price}</p>
                            <span style="font-size: 0.8rem; color: #6B7280;">Stock: ${p.stock_quantity}</span>
                        </div>
                        <button onclick="deleteProduct(${p.id})" style="background: #EF4444; color: white; border: none; width: 40px; height: 40px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s;">
                            <i class="fas fa-trash-alt"></i>
                        </button>
                    </div>
                `}).join('');
            } else {
                container.innerHTML = '<p style="text-align: center; color: #EF4444; padding: 2rem;">Error loading products</p>';
            }
        } catch (e) {
            console.error(e);
            container.innerHTML = '<p style="text-align: center; color: #EF4444; padding: 2rem;">Error loading products</p>';
        }
    }

    // Delete product function
    window.deleteProduct = async function (id) {
        const confirmMsg = translations.alerts?.deleteConfirm || 'Are you sure you want to delete this product?';
        if (!confirm(confirmMsg)) return;

        // Show deleting state on the button if possible, or just global loader
        // For simplicity, we'll just proceed

        try {
            const response = await fetch(`/api/products/${id}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });

            if (response.ok) {
                // Play success sound/voice
                const successMsg = translations.alerts?.deleteSuccess || 'Product deleted successfully';
                playVoice('delete-success', successMsg);

                // Reload list
                loadMyProducts();
                // Update stats
                loadStats();
            } else {
                const errorMsg = translations.alerts?.deleteError || 'Failed to delete product';
                alert(errorMsg);
            }
        } catch (e) {
            console.error(e);
            alert('Error deleting product');
        }
    };

    window.showOrders = function () {
        const ordersModal = document.getElementById('ordersModal');
        if (ordersModal) {
            ordersModal.style.display = 'flex';
            ordersModal.style.position = 'fixed';
            ordersModal.style.top = '0';
            ordersModal.style.left = '0';
            ordersModal.style.width = '100%';
            ordersModal.style.height = '100%';
            ordersModal.style.zIndex = '9999';
            ordersModal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            ordersModal.style.backdropFilter = 'blur(4px)';
            ordersModal.style.alignItems = 'center';
            ordersModal.style.justifyContent = 'center';
            ordersModal.classList.add('active');

            // Prevent body scroll
            document.body.style.overflow = 'hidden';

            // Close on background click
            ordersModal.addEventListener('click', function (e) {
                if (e.target === ordersModal) {
                    closeOrdersModal();
                }
            });

            // Load orders if function exists
            if (typeof loadOrders === 'function') {
                loadOrders();
            } else {
                // Show message if no orders
                const ordersDiv = document.getElementById('allOrders');
                if (ordersDiv) {
                    const msg = translations.alerts?.noOrders || 'You have no orders yet.';
                    ordersDiv.innerHTML = `<p style="text-align: center; color: #6B7280; padding: 2rem;">${msg}</p>`;
                }
            }
        } else {
            const msg = `${translations.alerts?.noOrders || 'You have no orders yet.'} (${translations.alerts?.noOrdersEn || 'Check back later'})`;
            alert(msg);
        }
    };

    window.closeOrdersModal = function () {
        const ordersModal = document.getElementById('ordersModal');
        if (ordersModal) {
            ordersModal.style.display = 'none';
            ordersModal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    };

    window.showEarnings = function () {
        const msg = `${translations.alerts?.earningsPrefix || 'Your earnings: ₹'}0\n(${translations.alerts?.earningsEn || 'Total money earned'})`;
        alert(msg);
    };

    window.showMessages = function () {
        playVoice('chat');
        // Open the messages modal if it exists (centered popup)
        const messagesModal = document.getElementById('messagesModal');
        if (messagesModal) {
            messagesModal.style.display = 'flex';
            messagesModal.style.position = 'fixed';
            messagesModal.style.top = '0';
            messagesModal.style.left = '0';
            messagesModal.style.width = '100%';
            messagesModal.style.height = '100%';
            messagesModal.style.zIndex = '9999';
            messagesModal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
            messagesModal.style.backdropFilter = 'blur(4px)';
            messagesModal.style.alignItems = 'center';
            messagesModal.style.justifyContent = 'center';
            messagesModal.classList.add('active');

            // Prevent body scroll
            document.body.style.overflow = 'hidden';

            // Close on background click
            messagesModal.addEventListener('click', function (e) {
                if (e.target === messagesModal) {
                    closeMessagesModal();
                }
            });

            // Load messages if function exists
            if (typeof loadMessages === 'function') {
                loadMessages();
            } else {
                // Fallback: show AI chat assistant
                showAIChatAssistant();
            }
        } else {
            // Fallback: show AI chat assistant
            showAIChatAssistant();
        }
    };

    window.closeMessagesModal = function () {
        const messagesModal = document.getElementById('messagesModal');
        if (messagesModal) {
            messagesModal.style.display = 'none';
            messagesModal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    };

    // Load messages function
    async function loadMessages() {
        const messagesDiv = document.getElementById('allMessages');
        if (!messagesDiv) return;

        messagesDiv.innerHTML = '<p style="text-align: center; color: #6B7280;">संदेश लोड हो रहे हैं... / Loading messages...</p>';

        // Get auth token from localStorage
        const token = localStorage.getItem('authToken');
        if (!token) {
            messagesDiv.innerHTML = '<p style="text-align: center; color: #EF4444;">Please log in to view messages</p>';
            return;
        }

        try {
            const response = await fetch('/api/messages/conversations', {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const conversations = await response.json();

                if (conversations.length === 0) {
                    messagesDiv.innerHTML = `
                        <div style="text-align: center; padding: 2rem;">
                            <i class="fas fa-comments" style="font-size: 3rem; color: #9CA3AF; margin-bottom: 1rem;"></i>
                            <p style="color: #6B7280;">कोई संदेश नहीं / No messages yet</p>
                        </div>
                    `;
                } else {
                    messagesDiv.innerHTML = conversations.map(conv => `
                        <div style="padding: 1rem; border-bottom: 1px solid #E5E7EB; cursor: pointer;" onclick="openConversation(${conv.id})">
                            <div style="display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <strong>${conv.other_user_name || 'Buyer'}</strong>
                                    <p style="margin: 0.5rem 0 0 0; color: #6B7280; font-size: 0.875rem;">${conv.last_message || 'No messages'}</p>
                                </div>
                                <span style="color: #9CA3AF; font-size: 0.75rem;">${new Date(conv.last_message_time).toLocaleDateString()}</span>
                            </div>
                        </div>
                    `).join('');
                }
            } else {
                messagesDiv.innerHTML = '<p style="text-align: center; color: #EF4444;">Error loading messages</p>';
            }
        } catch (error) {
            console.error('Error loading messages:', error);
            messagesDiv.innerHTML = '<p style="text-align: center; color: #EF4444;">Error loading messages</p>';
        }
    }

    // Open conversation function
    window.openConversation = function (conversationId) {
        // This can be implemented to show individual conversation
        alert('Opening conversation ' + conversationId);
    };

    window.showVideoTutorial = function () {
        // Open AI Learning Center Modal
        showLearningCenter();
    };

    // Switch to advanced dashboard
    window.switchToAdvancedMode = function () {
        if (confirm('Switch to Advanced Dashboard? (More features, for experienced users)\n\nउन्नत डैशबोर्ड पर स्विच करें? (अधिक सुविधाएं, अनुभवी उपयोगकर्ताओं के लिए)')) {
            localStorage.setItem('artisanDashboardMode', 'advanced');
            window.location.href = '/artisan';
        }
    };

    // AI Chat Assistant
    function showAIChatAssistant() {
        // Remove any existing modal first
        const existingModal = document.querySelector('.ai-modal');
        if (existingModal) {
            existingModal.remove();
        }

        const modal = document.createElement('div');
        modal.className = 'ai-modal';
        modal.innerHTML = `
            <div class="ai-modal-content">
                <div class="ai-modal-header">
                    <h2>
                        <i class="fas fa-robot"></i>
                        ${currentLanguage === 'hi' ? 'AI सहायक - पूछें कुछ भी!' : 'AI Assistant - Ask Anything!'}
                    </h2>
                    <button class="ai-close-btn" onclick="this.closest('.ai-modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="ai-chat-container" id="aiChatContainer">
                    <div class="ai-chat-welcome">
                        <i class="fas fa-robot" style="font-size: 3rem; color: #FF6B35;"></i>
                        <p>${currentLanguage === 'hi' ? 'नमस्ते! मैं आपकी मदद कैसे कर सकता हूं?' : 'Hello! How can I help you today?'}</p>
                        <div class="ai-quick-questions">
                            <button onclick="askAI('How do I price my products?')" class="ai-quick-btn">
                                ${currentLanguage === 'hi' ? '💰 कीमत कैसे लगाएं?' : '💰 How to price?'}
                            </button>
                            <button onclick="askAI('How to take good photos?')" class="ai-quick-btn">
                                ${currentLanguage === 'hi' ? '📸 अच्छी फोटो कैसे लें?' : '📸 How to take photos?'}
                            </button>
                            <button onclick="askAI('How to package products for shipping?')" class="ai-quick-btn">
                                ${currentLanguage === 'hi' ? '📦 पैकेजिंग कैसे करें?' : '📦 How to package?'}
                            </button>
                        </div>
                    </div>
                    <div class="ai-messages" id="aiMessages"></div>
                </div>
                <div class="ai-input-container">
                    <input type="text" id="aiQuestionInput" placeholder="${currentLanguage === 'hi' ? 'अपना सवाल यहाँ लिखें...' : 'Type your question here...'}" />
                    <button onclick="askAIFromInput()" class="ai-send-btn">
                        <i class="fas fa-paper-plane"></i>
                    </button>
                    <button onclick="askAIWithVoice()" class="ai-mic-btn">
                        <i class="fas fa-microphone"></i>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        document.getElementById('aiQuestionInput').focus();
    }

    window.askAI = async function (question) {
        const messagesDiv = document.getElementById('aiMessages');
        if (!messagesDiv) return;

        // Add user message
        messagesDiv.innerHTML += `
            <div class="ai-message user-message">
                <div class="ai-message-content">${question}</div>
            </div>
        `;

        // Add loading indicator
        messagesDiv.innerHTML += `
            <div class="ai-message bot-message loading-message">
                <div class="ai-message-content">
                    <i class="fas fa-circle-notch fa-spin"></i> ${currentLanguage === 'hi' ? 'सोच रहे हैं...' : 'Thinking...'}
                </div>
            </div>
        `;
        messagesDiv.scrollTop = messagesDiv.scrollHeight;

        try {
            const response = await fetch('/api/ai/chat-help', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    message: question,
                    language: currentLanguage,
                    context: 'general'
                })
            });

            const data = await response.json();

            // Remove loading message
            const loadingMsg = messagesDiv.querySelector('.loading-message');
            if (loadingMsg) loadingMsg.remove();

            // Add AI response
            messagesDiv.innerHTML += `
                <div class="ai-message bot-message">
                    <div class="ai-message-content">${data.response}</div>
                    <button onclick="playVoice('ai-response', '${data.response.replace(/'/g, "\\'")}')">
                        <i class="fas fa-volume-up"></i>
                    </button>
                </div>
            `;
            messagesDiv.scrollTop = messagesDiv.scrollHeight;

        } catch (error) {
            console.error('AI error:', error);
            const loadingMsg = messagesDiv.querySelector('.loading-message');
            if (loadingMsg) loadingMsg.remove();
            messagesDiv.innerHTML += `
                <div class="ai-message bot-message error-message">
                    <div class="ai-message-content">${currentLanguage === 'hi' ? 'क्षमा करें, कुछ गलत हो गया। फिर से कोशिश करें।' : 'Sorry, something went wrong. Please try again.'}</div>
                </div>
            `;
        }
    };

    window.askAIFromInput = function () {
        const input = document.getElementById('aiQuestionInput');
        const question = input.value.trim();
        if (question) {
            askAI(question);
            input.value = '';
        }
    };

    window.askAIWithVoice = function () {
        if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            const recognition = new SpeechRecognition();
            recognition.lang = languageVoiceCodes[currentLanguage] || 'hi-IN';
            recognition.continuous = false;
            recognition.interimResults = false;

            recognition.onresult = function (event) {
                const transcript = event.results[0][0].transcript;
                askAI(transcript);
            };

            recognition.onerror = function (event) {
                console.error('Speech recognition error:', event.error);
            };

            recognition.start();
        } else {
            alert(translations.alerts?.voiceNotSupported || 'Voice input not supported');
        }
    };

    // Learning Center
    function showLearningCenter() {
        // Remove any existing modal first
        const existingModal = document.querySelector('.ai-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Hide any tutorial sections at bottom of page
        const bottomSections = document.querySelectorAll('.ai-learning-container, .learning-section, [class*="tutorial"]');
        bottomSections.forEach(section => {
            if (section.closest('.modal') === null) {
                section.style.display = 'none';
            }
        });

        const modal = document.createElement('div');
        modal.className = 'ai-modal';
        modal.style.display = 'flex';
        modal.style.position = 'fixed';
        modal.style.top = '0';
        modal.style.left = '0';
        modal.style.width = '100%';
        modal.style.height = '100%';
        modal.style.zIndex = '2000';
        modal.style.backgroundColor = 'rgba(0, 0, 0, 0.7)';
        modal.style.backdropFilter = 'blur(4px)';
        modal.style.alignItems = 'center';
        modal.style.justifyContent = 'center';
        modal.style.padding = '1rem';

        modal.innerHTML = `
            <div class="ai-modal-content" style="background: white; border-radius: 24px; max-width: 800px; width: 100%; max-height: 90vh; display: flex; flex-direction: column; box-shadow: 0 24px 60px rgba(0,0,0,0.3);">
                <div class="ai-modal-header" style="padding: 1.5rem 2rem; border-bottom: 2px solid #E7DFD5; display: flex; justify-content: space-between; align-items: center;">
                    <h2 style="font-size: 1.5rem; color: #1F2937; display: flex; align-items: center; gap: 0.75rem; margin: 0;">
                        <i class="fas fa-graduation-cap"></i>
                        ${currentLanguage === 'hi' ? 'सीखें - AI ट्यूटोरियल' : 'Learn - AI Tutorials'}
                    </h2>
                    <button class="ai-close-btn" onclick="this.closest('.ai-modal').remove(); document.body.style.overflow = 'auto';" style="background: #EF4444; border: none; color: white; width: 44px; height: 44px; border-radius: 50%; font-size: 1.25rem; cursor: pointer; transition: all 0.3s ease;">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="ai-learning-container" style="flex: 1; overflow-y: auto; padding: 2rem; background: #FFF8F0;">
                    <div class="learning-topics" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem; margin-bottom: 2rem;">
                        <button onclick="loadTutorial('upload_product')" class="learning-topic-btn" style="background: white; border: 2px solid #E7DFD5; border-radius: 16px; padding: 1.5rem; text-align: center; cursor: pointer; transition: all 0.3s; display: flex; flex-direction: column; align-items: center; gap: 0.75rem;">
                            <i class="fas fa-upload" style="font-size: 2rem; color: #FF6B35;"></i>
                            <span style="font-weight: 600; color: #1F2937;">${currentLanguage === 'hi' ? 'उत्पाद अपलोड करें' : 'Upload Products'}</span>
                        </button>
                        <button onclick="loadTutorial('pricing')" class="learning-topic-btn" style="background: white; border: 2px solid #E7DFD5; border-radius: 16px; padding: 1.5rem; text-align: center; cursor: pointer; transition: all 0.3s; display: flex; flex-direction: column; align-items: center; gap: 0.75rem;">
                            <i class="fas fa-tag" style="font-size: 2rem; color: #FF6B35;"></i>
                            <span style="font-weight: 600; color: #1F2937;">${currentLanguage === 'hi' ? 'कीमत लगाना' : 'Pricing'}</span>
                        </button>
                        <button onclick="loadTutorial('quality_photos')" class="learning-topic-btn" style="background: white; border: 2px solid #E7DFD5; border-radius: 16px; padding: 1.5rem; text-align: center; cursor: pointer; transition: all 0.3s; display: flex; flex-direction: column; align-items: center; gap: 0.75rem;">
                            <i class="fas fa-camera" style="font-size: 2rem; color: #FF6B35;"></i>
                            <span style="font-weight: 600; color: #1F2937;">${currentLanguage === 'hi' ? 'फोटो लेना' : 'Taking Photos'}</span>
                        </button>
                        <button onclick="loadTutorial('buyer_communication')" class="learning-topic-btn" style="background: white; border: 2px solid #E7DFD5; border-radius: 16px; padding: 1.5rem; text-align: center; cursor: pointer; transition: all 0.3s; display: flex; flex-direction: column; align-items: center; gap: 0.75rem;">
                            <i class="fas fa-comments" style="font-size: 2rem; color: #FF6B35;"></i>
                            <span style="font-weight: 600; color: #1F2937;">${currentLanguage === 'hi' ? 'खरीदार से बात' : 'Buyer Communication'}</span>
                        </button>
                        <button onclick="loadTutorial('shipping')" class="learning-topic-btn" style="background: white; border: 2px solid #E7DFD5; border-radius: 16px; padding: 1.5rem; text-align: center; cursor: pointer; transition: all 0.3s; display: flex; flex-direction: column; align-items: center; gap: 0.75rem;">
                            <i class="fas fa-box" style="font-size: 2rem; color: #FF6B35;"></i>
                            <span style="font-weight: 600; color: #1F2937;">${currentLanguage === 'hi' ? 'शिपिंग/पैकेजिंग' : 'Shipping/Packaging'}</span>
                        </button>
                    </div>
                    <div class="learning-content" id="learningContent" style="text-align: center; padding: 2rem;">
                        <div class="learning-welcome">
                            <i class="fas fa-graduation-cap" style="font-size: 3rem; color: #FF6B35;"></i>
                            <p style="font-size: 1.25rem; color: #1F2937; margin-top: 1rem;">${currentLanguage === 'hi' ? 'एक विषय चुनें और सीखना शुरू करें!' : 'Choose a topic to start learning!'}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;

        // Prevent body scroll when modal is open
        document.body.style.overflow = 'hidden';

        // Close on background click
        modal.addEventListener('click', function (e) {
            if (e.target === modal) {
                modal.remove();
                document.body.style.overflow = 'auto';
            }
        });

        document.body.appendChild(modal);
    }

    window.loadTutorial = async function (topic) {
        const contentDiv = document.getElementById('learningContent');
        if (!contentDiv) return;

        contentDiv.innerHTML = `
            <div class="loading-tutorial">
                <i class="fas fa-circle-notch fa-spin" style="font-size: 2rem; color: #FF6B35;"></i>
                <p>${currentLanguage === 'hi' ? 'ट्यूटोरियल तैयार हो रहा है...' : 'Preparing tutorial...'}</p>
            </div>
        `;

        try {
            const response = await fetch('/api/ai/tutorial', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    topic: topic,
                    language: currentLanguage
                })
            });

            const data = await response.json();

            contentDiv.innerHTML = `
                <div class="tutorial-content">
                    <div class="tutorial-text">${data.content.replace(/\n/g, '<br>')}</div>
                    <button onclick="playVoice('tutorial', '${data.content.replace(/'/g, "\\'")})" class="tutorial-voice-btn">
                        <i class="fas fa-volume-up"></i>
                        ${currentLanguage === 'hi' ? 'यह सुनें' : 'Listen to this'}
                    </button>
                </div>
            `;

        } catch (error) {
            console.error('Tutorial error:', error);
            contentDiv.innerHTML = `
                <div class="tutorial-error">
                    <i class="fas fa-exclamation-circle" style="font-size: 2rem; color: #EF4444;"></i>
                    <p>${currentLanguage === 'hi' ? 'ट्यूटोरियल लोड नहीं हो सका। फिर से कोशिश करें।' : 'Could not load tutorial. Please try again.'}</p>
                </div>
            `;
        }
    };

    // Cluster Map function
    let clusterMapInstance = null;

    window.viewClusterMap = function () {
        playVoice('logistics');
        const modal = document.getElementById('mapModal');
        if (!modal) {
            console.error('Map modal not found');
            return;
        }

        modal.style.display = 'flex';
        modal.classList.add('active');

        // Initialize map if not already done
        if (typeof L !== 'undefined' && !clusterMapInstance) {
            setTimeout(() => {
                try {
                    clusterMapInstance = L.map('clusterMap').setView([26.9124, 75.7873], 6);

                    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                        attribution: '© OpenStreetMap contributors'
                    }).addTo(clusterMapInstance);

                    const clusters = [
                        { name: 'Jaipur Textile Pool', lat: 26.9124, lon: 75.7873, members: 42, savings: '40%' },
                        { name: 'Jodhpur Woodwork', lat: 26.2389, lon: 73.0243, members: 28, savings: '35%' },
                        { name: 'Udaipur Pottery', lat: 24.5854, lon: 73.7125, members: 15, savings: '25%' },
                        { name: 'Ajmer Jewelry', lat: 26.4499, lon: 74.6399, members: 31, savings: '38%' }
                    ];

                    clusters.forEach(cluster => {
                        L.circleMarker([cluster.lat, cluster.lon], {
                            radius: 15,
                            fillColor: '#10B981',
                            color: '#059669',
                            weight: 2,
                            opacity: 1,
                            fillOpacity: 0.7
                        }).addTo(clusterMapInstance).bindPopup(`
                            <b>${cluster.name}</b><br>
                            Members: ${cluster.members}<br>
                            Savings: ${cluster.savings}
                        `);
                    });

                    // Trigger resize to ensure map renders correctly
                    setTimeout(() => {
                        if (clusterMapInstance) {
                            clusterMapInstance.invalidateSize();
                        }
                    }, 200);
                } catch (error) {
                    console.error('Error initializing map:', error);
                }
            }, 100);
        } else if (clusterMapInstance) {
            // Map already exists, just invalidate size
            setTimeout(() => {
                clusterMapInstance.invalidateSize();
            }, 100);
        }
    };

    // Close map modal function
    window.closeMapModal = function () {
        const modal = document.getElementById('mapModal');
        if (modal) {
            modal.classList.remove('active');
            modal.style.display = 'none';
            document.body.style.overflow = 'auto';
        }
    };

    // Close products modal function
    window.closeProductsModal = function () {
        const modal = document.getElementById('productsModal');
        if (modal) {
            modal.style.display = 'none';
            modal.classList.remove('active');
            document.body.style.overflow = 'auto';
        }
    };

    // Logout function
    window.logout = function () {
        const thanksText = translations.alerts?.thankYou || 'Thank you! See you again.';
        playVoice('logout', thanksText);

        setTimeout(() => {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            window.location.href = '/';
        }, 1000);
    };

    // Initialize
    document.addEventListener('DOMContentLoaded', async function () {
        // Set user name
        document.getElementById('userName').textContent = userData.full_name || 'Artisan';

        // Load translations for current language
        await loadTranslations(currentLanguage);

        // Set language selector
        const selector = document.getElementById('languageSelector');
        if (selector) selector.value = currentLanguage;

        // Load stats
        loadStats();

        // Auto-play greeting on first visit
        const hasPlayedGreeting = sessionStorage.getItem('hasPlayedGreeting');
        if (!hasPlayedGreeting) {
            setTimeout(() => {
                startVoiceHelp();
                sessionStorage.setItem('hasPlayedGreeting', 'true');
            }, 1000);
        }
    });
})();

