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

    // Handle form submission
    document.getElementById('simpleUploadForm').addEventListener('submit', async function (e) {
        e.preventDefault();

        const formData = new FormData(this);

        if (!formData.get('title')) {
            const description = formData.get('description') || 'Handmade Product';
            formData.set('title', description.substring(0, 50));
        }

        if (!formData.get('craft_type')) {
            formData.set('craft_type', userData.craft_type || 'handicraft');
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
                const error = await response.json();
                alert('Error: ' + (error.error || 'Upload failed'));
                document.getElementById('uploadingState').style.display = 'none';
                document.getElementById('step1').classList.add('active');
            }
        } catch (error) {
            console.error('Upload error:', error);
            const msg = translations.alerts?.uploadProblem || 'Upload problem. Try again';
            alert(msg);
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
        window.location.href = '/artisan/dashboard';
    };

    window.showOrders = function () {
        const msg = `${translations.alerts?.noOrders || 'You have no orders yet.'} (${translations.alerts?.noOrdersEn || 'Check back later'})`;
        alert(msg);
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
            messagesModal.classList.add('active');
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
    window.openConversation = function(conversationId) {
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
        
        const modal = document.createElement('div');
        modal.className = 'ai-modal';
        modal.innerHTML = `
            <div class="ai-modal-content">
                <div class="ai-modal-header">
                    <h2>
                        <i class="fas fa-graduation-cap"></i>
                        ${currentLanguage === 'hi' ? 'सीखें - AI ट्यूटोरियल' : 'Learn - AI Tutorials'}
                    </h2>
                    <button class="ai-close-btn" onclick="this.closest('.ai-modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="ai-learning-container">
                    <div class="learning-topics">
                        <button onclick="loadTutorial('upload_product')" class="learning-topic-btn">
                            <i class="fas fa-upload"></i>
                            ${currentLanguage === 'hi' ? 'उत्पाद अपलोड करें' : 'Upload Products'}
                        </button>
                        <button onclick="loadTutorial('pricing')" class="learning-topic-btn">
                            <i class="fas fa-tag"></i>
                            ${currentLanguage === 'hi' ? 'कीमत लगाना' : 'Pricing'}
                        </button>
                        <button onclick="loadTutorial('quality_photos')" class="learning-topic-btn">
                            <i class="fas fa-camera"></i>
                            ${currentLanguage === 'hi' ? 'फोटो लेना' : 'Taking Photos'}
                        </button>
                        <button onclick="loadTutorial('buyer_communication')" class="learning-topic-btn">
                            <i class="fas fa-comments"></i>
                            ${currentLanguage === 'hi' ? 'खरीदार से बात' : 'Buyer Communication'}
                        </button>
                        <button onclick="loadTutorial('shipping')" class="learning-topic-btn">
                            <i class="fas fa-box"></i>
                            ${currentLanguage === 'hi' ? 'शिपिंग/पैकेजिंग' : 'Shipping/Packaging'}
                        </button>
                    </div>
                    <div class="learning-content" id="learningContent">
                        <div class="learning-welcome">
                            <i class="fas fa-graduation-cap" style="font-size: 3rem; color: #FF6B35;"></i>
                            <p>${currentLanguage === 'hi' ? 'एक विषय चुनें और सीखना शुरू करें!' : 'Choose a topic to start learning!'}</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
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

