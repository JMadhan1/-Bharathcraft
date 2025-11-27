/**
 * Enhanced Chat System with Voice Support & Real-time Translation
 * For buyer-artisan communication with cultural context
 */

(function() {
    'use strict';

    const authToken = localStorage.getItem('authToken');
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    
    let currentChat = null;
    let currentLanguage = userData.role === 'artisan' ? 'hi' : 'en';
    let recipientLanguage = userData.role === 'artisan' ? 'en' : 'hi';
    let isRecording = false;
    let recognition = null;
    let messageCheckInterval = null;
    let synth = window.speechSynthesis;

    // Language mapping for voice
    const voiceLanguageMap = {
        'hi': 'hi-IN',
        'te': 'te-IN',
        'ta': 'ta-IN',
        'en': 'en-US',
        'kn': 'kn-IN',
        'bn': 'bn-IN',
        'ml': 'ml-IN',
        'gu': 'gu-IN',
        'mr': 'mr-IN',
        'pa': 'pa-IN',
        'od': 'od-IN',
        'as': 'as-IN'
    };

    // Open Chat with Seller (Buyer side)
    window.openChatWithSeller = function(artisanId, artisanName, productId) {
        if (!artisanId) {
            alert('Artisan information not available');
            return;
        }

        currentChat = {
            recipientId: artisanId,
            recipientName: artisanName,
            productId: productId,
            recipientRole: 'artisan'
        };

        recipientLanguage = 'hi'; // Artisans typically speak Hindi/regional languages
        createChatUI();
        loadConversation();
        startMessagePolling();
    };

    // Open Chat with Buyer (Artisan side)
    window.openChatWithBuyer = function(buyerId, buyerName, productId) {
        if (!buyerId) {
            alert('Buyer information not available');
            return;
        }

        currentChat = {
            recipientId: buyerId,
            recipientName: buyerName,
            productId: productId,
            recipientRole: 'buyer'
        };

        recipientLanguage = 'en'; // Buyers typically speak English
        createChatUI();
        loadConversation();
        startMessagePolling();
    };

    // Create Chat UI
    function createChatUI() {
        // Remove existing chat if any
        const existingChat = document.getElementById('enhancedChatContainer');
        if (existingChat) {
            existingChat.remove();
        }

        const isArtisan = userData.role === 'artisan';
        const chatHTML = `
            <div id="enhancedChatContainer" class="enhanced-chat-container">
                <div class="chat-header-enhanced">
                    <div class="chat-header-info">
                        <div class="chat-avatar">
                            ${currentChat.recipientName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div class="chat-user-name">${currentChat.recipientName}</div>
                            <div class="chat-status">
                                <span class="status-indicator"></span>
                                <span>Online</span>
                            </div>
                        </div>
                    </div>
                    <div class="chat-header-actions">
                        ${isArtisan ? `
                            <button class="chat-btn" onclick="toggleVoiceAssistant()" title="Voice Assistant">
                                <i class="fas fa-microphone-alt"></i>
                            </button>
                        ` : ''}
                        <button class="chat-btn" onclick="closeEnhancedChat()" title="Close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                
                <div class="chat-messages-enhanced" id="chatMessagesEnhanced">
                    <div class="chat-loading">
                        <div class="spinner"></div>
                    </div>
                </div>
                
                <div class="chat-input-area-enhanced">
                    ${isArtisan ? `
                        <div class="language-selector-enhanced">
                            <label>Your Language:</label>
                            <select id="artisanLanguageSelect" onchange="changeArtisanLanguage(this.value)">
                                <option value="hi" ${currentLanguage === 'hi' ? 'selected' : ''}>हिंदी</option>
                                <option value="te" ${currentLanguage === 'te' ? 'selected' : ''}>తెలుగు</option>
                                <option value="ta" ${currentLanguage === 'ta' ? 'selected' : ''}>தமிழ்</option>
                                <option value="kn" ${currentLanguage === 'kn' ? 'selected' : ''}>ಕನ್ನಡ</option>
                                <option value="bn" ${currentLanguage === 'bn' ? 'selected' : ''}>বাংলা</option>
                                <option value="ml" ${currentLanguage === 'ml' ? 'selected' : ''}>മലയാളം</option>
                                <option value="gu" ${currentLanguage === 'gu' ? 'selected' : ''}>ગુજરાતી</option>
                                <option value="mr" ${currentLanguage === 'mr' ? 'selected' : ''}>मराठी</option>
                            </select>
                        </div>
                    ` : ''}
                    
                    <div class="input-wrapper-enhanced">
                        <button class="voice-input-btn" id="voiceInputBtn" onclick="toggleVoiceInput()" title="Voice Input">
                            <i class="fas fa-microphone"></i>
                        </button>
                        <input type="text" 
                               class="chat-input-enhanced" 
                               id="chatInputEnhanced" 
                               placeholder="${isArtisan ? 'Type or speak your message...' : 'Type your message...'}"
                               onkeypress="handleChatKeyPressEnhanced(event)">
                        <button class="send-btn-enhanced" onclick="sendChatMessageEnhanced()" title="Send">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        document.body.insertAdjacentHTML('beforeend', chatHTML);
    }

    // Load Conversation
    async function loadConversation() {
        try {
            const response = await authenticatedFetch(`/api/negotiation/get-conversation/${currentChat.recipientId}`, {
                method: 'GET'
            });

            if (response.ok) {
                const data = await response.json();
                const previousMessageCount = document.querySelectorAll('.message-wrapper-enhanced').length;
                displayMessagesEnhanced(data.conversation);
                
                // Auto-speak new messages if voice assistant enabled (for artisans)
                if (userData.role === 'artisan' && localStorage.getItem('voiceAssistantEnabled') === 'true') {
                    const newMessages = data.conversation.slice(previousMessageCount);
                    newMessages.forEach(msg => {
                        if (msg.sender_id !== parseInt(userData.id)) {
                            // This is a message from buyer - speak it in artisan's language
                            const aiContext = msg.ai_context || {};
                            const messageToSpeak = aiContext.translated_message || msg.message;
                            speakMessage(messageToSpeak, currentLanguage);
                        }
                    });
                }
            } else {
                displayEmptyStateEnhanced();
            }
        } catch (error) {
            console.error('Error loading conversation:', error);
            displayEmptyStateEnhanced();
        }
    }

    // Display Messages
    function displayMessagesEnhanced(messages) {
        const messagesContainer = document.getElementById('chatMessagesEnhanced');
        
        if (messages.length === 0) {
            displayEmptyStateEnhanced();
            return;
        }

        messagesContainer.innerHTML = '';

        messages.forEach(msg => {
            const isSent = msg.sender_id === parseInt(userData.id);
            const messageHTML = createMessageHTMLEnhanced(msg, isSent);
            messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
        });

        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Create Message HTML
    function createMessageHTMLEnhanced(message, isSent) {
        const aiContext = message.ai_context || {};
        const time = new Date(message.timestamp).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        // Determine which message to display
        // If message has translation and user is receiver, show translated
        // If user is sender, show original
        let displayMessage = message.message;
        let showOriginal = false;
        let originalText = null;

        if (!isSent && message.translated_message && message.translated_message !== message.original_message) {
            // Receiver sees translated version
            displayMessage = message.translated_message;
            originalText = message.original_message;
            showOriginal = true;
        } else if (isSent && message.translated_message) {
            // Sender sees their original message
            displayMessage = message.message;
            // Don't show original for sent messages (they already know what they sent)
        } else if (!isSent && message.original_message && message.original_message !== message.message) {
            // Fallback: if original_message exists and differs, show it as context
            originalText = message.original_message;
            showOriginal = true;
        }

        let html = `
            <div class="message-wrapper-enhanced ${isSent ? 'sent' : 'received'}">
                <div class="message-bubble-enhanced ${isSent ? 'sent' : 'received'}">
                    <div class="message-text-enhanced">${displayMessage}</div>
                    <div class="message-time-enhanced">${time}</div>
                </div>
        `;

        // Show original message if it was translated (for received messages)
        if (showOriginal && originalText && originalText !== displayMessage) {
            html += `
                <div class="original-message">
                    <small><i class="fas fa-language"></i> Original (${message.original_language || 'en'}): "${originalText}"</small>
                </div>
            `;
        }

        // Add AI context card for received messages
        if (!isSent && aiContext.context_explanation) {
            html += `
                <div class="ai-context-card-enhanced">
                    <div class="ai-badge-enhanced">
                        <i class="fas fa-robot"></i>
                        AI Context
                    </div>
                    <div class="context-explanation-enhanced">
                        ${aiContext.context_explanation}
                    </div>
                    ${aiContext.negotiation_insight ? `
                        <div class="context-insight-enhanced">
                            <strong>💡 Tip:</strong> ${aiContext.negotiation_insight}
                        </div>
                    ` : ''}
                </div>
            `;

            // Add smart replies for artisans
            if (userData.role === 'artisan' && aiContext.suggested_responses && aiContext.suggested_responses.length > 0) {
                html += `
                    <div class="smart-replies-enhanced">
                        <div class="smart-reply-label-enhanced">
                            <i class="fas fa-lightbulb"></i>
                            Quick Replies:
                        </div>
                `;
                
                aiContext.suggested_responses.forEach((reply, index) => {
                    html += `
                        <button class="smart-reply-btn-enhanced" onclick="sendSmartReplyEnhanced('${reply.replace(/'/g, "\\'")}')">
                            ${reply}
                        </button>
                    `;
                });
                
                html += `</div>`;
            }
        }

        // Add voice play button for artisans (for received messages)
        if (userData.role === 'artisan' && !isSent) {
            html += `
                <button class="voice-play-btn" onclick="speakMessage('${message.message.replace(/'/g, "\\'")}', '${recipientLanguage}')" title="Listen">
                    <i class="fas fa-volume-up"></i>
                </button>
            `;
        }

        html += `</div>`;

        return html;
    }

    // Display Empty State
    function displayEmptyStateEnhanced() {
        const messagesContainer = document.getElementById('chatMessagesEnhanced');
        messagesContainer.innerHTML = `
            <div class="chat-empty-state-enhanced">
                <i class="fas fa-comments"></i>
                <h3>Start a Conversation</h3>
                <p>Send a message to ${currentChat.recipientName}</p>
                ${userData.role === 'artisan' ? `
                    <p style="margin-top: 1rem; font-size: 0.8rem; color: #F59E0B;">
                        🤖 AI will translate and provide cultural context<br>
                        🔊 Use voice assistant to speak your message
                    </p>
                ` : `
                    <p style="margin-top: 1rem; font-size: 0.8rem; color: #059669;">
                        🤖 Your messages will be translated to the artisan's language
                    </p>
                `}
            </div>
        `;
    }

    // Send Message
    window.sendChatMessageEnhanced = async function() {
        const input = document.getElementById('chatInputEnhanced');
        const message = input.value.trim();

        if (!message) return;

        input.disabled = true;
        showTypingIndicatorEnhanced();

        try {
            const response = await authenticatedFetch('/api/negotiation/send-message', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    recipient_id: currentChat.recipientId,
                    message: message,
                    product_id: currentChat.productId,
                    sender_language: currentLanguage,
                    recipient_language: recipientLanguage
                })
            });

            if (response.ok) {
                const responseData = await response.json();
                input.value = '';
                
                // Reload conversation to show new message with translation
                await loadConversation();
                
                // Auto-translate and speak based on role
                if (userData.role === 'artisan') {
                    // Artisan sent message - it's already in their language
                    // The backend will translate it to buyer's language (English)
                    // No need to speak here as buyer will see translated version
                } else {
                    // Buyer sent message - it's in English
                    // Backend translates to artisan's language
                    // If voice assistant is enabled, speak the translated version
                    const translatedMsg = responseData.translated_message || 
                                         (responseData.ai_analysis && responseData.ai_analysis.translated_message);
                    if (translatedMsg && localStorage.getItem('voiceAssistantEnabled') === 'true') {
                        // Speak the translated message in artisan's language
                        speakMessage(translatedMsg, recipientLanguage);
                    }
                }
            } else {
                const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
                const errorMessage = errorData.error || 'Failed to send message. Please try again.';
                console.error('Send message error:', errorMessage);
                alert(`Error: ${errorMessage}`);
            }
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Error sending message. Please check your connection.');
        } finally {
            input.disabled = false;
            input.focus();
            hideTypingIndicatorEnhanced();
        }
    };

    // Send Smart Reply
    window.sendSmartReplyEnhanced = function(reply) {
        const input = document.getElementById('chatInputEnhanced');
        input.value = reply;
        sendChatMessageEnhanced();
    };

    // Handle Enter Key
    window.handleChatKeyPressEnhanced = function(event) {
        if (event.key === 'Enter') {
            sendChatMessageEnhanced();
        }
    };

    // Change Artisan Language
    window.changeArtisanLanguage = function(lang) {
        currentLanguage = lang;
    };

    // Voice Input
    window.toggleVoiceInput = function() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Voice input is not supported in your browser.');
            return;
        }

        if (isRecording) {
            stopVoiceInput();
        } else {
            startVoiceInput();
        }
    };

    function startVoiceInput() {
        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        recognition = new SpeechRecognition();
        
        const langCode = voiceLanguageMap[currentLanguage] || 'hi-IN';
        recognition.lang = langCode;
        recognition.continuous = false;
        recognition.interimResults = false;

        const voiceBtn = document.getElementById('voiceInputBtn');
        voiceBtn.classList.add('recording');
        isRecording = true;

        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            document.getElementById('chatInputEnhanced').value = transcript;
            isRecording = false;
            voiceBtn.classList.remove('recording');
        };

        recognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
            alert('Voice input failed. Please try again.');
            isRecording = false;
            voiceBtn.classList.remove('recording');
        };

        recognition.onend = function() {
            isRecording = false;
            voiceBtn.classList.remove('recording');
        };

        recognition.start();
    }

    function stopVoiceInput() {
        if (recognition) {
            recognition.stop();
        }
        isRecording = false;
        document.getElementById('voiceInputBtn').classList.remove('recording');
    }

    // Speak Message (Text-to-Speech)
    window.speakMessage = function(text, lang) {
        if (!synth) return;

        // Stop any ongoing speech
        synth.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        const langCode = voiceLanguageMap[lang] || 'hi-IN';
        utterance.lang = langCode;
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;

        // Try to find appropriate voice
        const voices = synth.getVoices();
        const preferredVoice = voices.find(v => v.lang.startsWith(lang.split('-')[0])) || voices[0];
        if (preferredVoice) {
            utterance.voice = preferredVoice;
        }

        synth.speak(utterance);
    };

    // Translate and Speak (for artisans when buyer sends message)
    async function translateAndSpeak(text, targetLang) {
        try {
            const response = await (window.authenticatedFetch || fetch)('/api/translation/translate', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
                },
                body: JSON.stringify({
                    text: text,
                    source_lang: 'en',
                    target_lang: targetLang,
                    context: 'negotiation'
                })
            });

            if (response.ok) {
                const data = await response.json();
                const translated = data.translation.translated_text;
                speakMessage(translated, targetLang);
            }
        } catch (error) {
            console.error('Error translating and speaking:', error);
        }
    }

    // Toggle Voice Assistant (for artisans)
    window.toggleVoiceAssistant = function() {
        // Auto-speak all received messages
        const voiceAssistantEnabled = localStorage.getItem('voiceAssistantEnabled') === 'true';
        localStorage.setItem('voiceAssistantEnabled', !voiceAssistantEnabled);
        
        const btn = event.target.closest('.chat-btn');
        if (!voiceAssistantEnabled) {
            btn.classList.add('active');
            btn.title = 'Voice Assistant: ON (Click to disable)';
            // Speak all new messages
            startAutoSpeak();
        } else {
            btn.classList.remove('active');
            btn.title = 'Voice Assistant: OFF (Click to enable)';
            synth.cancel();
        }
    };

    function startAutoSpeak() {
        // Check for new messages and speak them
        if (localStorage.getItem('voiceAssistantEnabled') === 'true') {
            const lastMessage = document.querySelector('.message-wrapper-enhanced.received:last-child .message-text-enhanced');
            if (lastMessage) {
                const messageText = lastMessage.textContent;
                speakMessage(messageText, recipientLanguage);
            }
        }
    }

    // Show/Hide Typing Indicator
    function showTypingIndicatorEnhanced() {
        const messagesContainer = document.getElementById('chatMessagesEnhanced');
        const typingHTML = `
            <div id="typingIndicatorEnhanced" class="message-wrapper-enhanced received">
                <div class="typing-indicator-enhanced">
                    <div class="typing-dot-enhanced"></div>
                    <div class="typing-dot-enhanced"></div>
                    <div class="typing-dot-enhanced"></div>
                </div>
            </div>
        `;
        messagesContainer.insertAdjacentHTML('beforeend', typingHTML);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function hideTypingIndicatorEnhanced() {
        const indicator = document.getElementById('typingIndicatorEnhanced');
        if (indicator) {
            indicator.remove();
        }
    }

    // Start Message Polling
    function startMessagePolling() {
        messageCheckInterval = setInterval(async () => {
            await loadConversation();
            // Auto-speak if voice assistant enabled
            if (localStorage.getItem('voiceAssistantEnabled') === 'true' && userData.role === 'artisan') {
                startAutoSpeak();
            }
        }, 3000);
    }

    // Stop Message Polling
    function stopMessagePolling() {
        if (messageCheckInterval) {
            clearInterval(messageCheckInterval);
            messageCheckInterval = null;
        }
    }

    // Close Chat
    window.closeEnhancedChat = function() {
        const chatContainer = document.getElementById('enhancedChatContainer');
        if (chatContainer) {
            chatContainer.remove();
        }
        stopMessagePolling();
        if (recognition) {
            recognition.stop();
        }
        synth.cancel();
    };

    // Load voices when available
    if (synth) {
        if (synth.onvoiceschanged !== undefined) {
            synth.onvoiceschanged = function() {
                // Voices loaded
            };
        }
    }
})();

