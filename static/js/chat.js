/**
 * Cultural Context AI Chat
 * Real-time translation with business context
 */

(function() {
    'use strict';

    const authToken = localStorage.getItem('authToken');
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    
    let currentConversation = null;
    let currentLanguage = userData.role === 'artisan' ? 'hi' : 'en';
    let isTyping = false;
    let messageCheckInterval = null;

    // Initialize chat
    function initChat(recipientId, recipientName) {
        currentConversation = {
            recipientId: recipientId,
            recipientName: recipientName
        };

        // Create chat UI
        createChatUI();
        
        // Load conversation history
        loadConversation();
        
        // Start checking for new messages
        startMessagePolling();
    }

    // Create Chat UI HTML
    function createChatUI() {
        const chatHTML = `
            <div id="chatContainer" class="chat-container">
                <div class="chat-header" onclick="toggleChatMinimize()">
                    <div class="chat-header-info">
                        <div class="chat-avatar">
                            ${currentConversation.recipientName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div class="chat-user-name">${currentConversation.recipientName}</div>
                            <div class="chat-status">
                                <span class="status-indicator"></span>
                                <span>Online</span>
                            </div>
                        </div>
                    </div>
                    <div class="chat-header-actions">
                        <button class="chat-btn" onclick="toggleChat(); event.stopPropagation();" title="Close">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>
                
                <div class="chat-messages" id="chatMessages">
                    <div class="chat-loading">
                        <div class="spinner"></div>
                    </div>
                </div>
                
                <div class="chat-input-area">
                    <div class="language-selector">
                        <button class="lang-btn ${currentLanguage === 'en' ? 'active' : ''}" 
                                onclick="switchChatLanguage('en')">English</button>
                        <button class="lang-btn ${currentLanguage === 'hi' ? 'active' : ''}" 
                                onclick="switchChatLanguage('hi')">हिंदी</button>
                        <button class="lang-btn ${currentLanguage === 'te' ? 'active' : ''}" 
                                onclick="switchChatLanguage('te')">తెలుగు</button>
                    </div>
                    
                    <div class="input-wrapper">
                        <input type="text" 
                               class="chat-input" 
                               id="chatInput" 
                               placeholder="Type your message..."
                               onkeypress="handleChatKeyPress(event)">
                        <button class="voice-btn" onclick="startVoiceInput()" title="Voice Input">
                            <i class="fas fa-microphone"></i>
                        </button>
                        <button class="send-btn" onclick="sendChatMessage()" title="Send">
                            <i class="fas fa-paper-plane"></i>
                        </button>
                    </div>
                </div>
            </div>
        `;

        // Remove existing chat if any
        const existingChat = document.getElementById('chatContainer');
        if (existingChat) {
            existingChat.remove();
        }

        // Add chat to body
        document.body.insertAdjacentHTML('beforeend', chatHTML);
    }

    // Load Conversation History
    async function loadConversation() {
        try {
            const response = await fetch(`/api/negotiation/get-conversation/${currentConversation.recipientId}`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                displayMessages(data.conversation);
            } else {
                displayEmptyState();
            }
        } catch (error) {
            console.error('Error loading conversation:', error);
            displayEmptyState();
        }
    }

    // Display Messages
    function displayMessages(messages) {
        const messagesContainer = document.getElementById('chatMessages');
        
        if (messages.length === 0) {
            displayEmptyState();
            return;
        }

        messagesContainer.innerHTML = '';

        messages.forEach(msg => {
            const isSent = msg.sender_id === userData.id;
            const messageHTML = createMessageHTML(msg, isSent);
            messagesContainer.insertAdjacentHTML('beforeend', messageHTML);
        });

        // Scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    // Create Message HTML
    function createMessageHTML(message, isSent) {
        const aiContext = message.ai_context || {};
        const time = new Date(message.timestamp).toLocaleTimeString('en-US', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });

        let html = `
            <div class="message-wrapper ${isSent ? 'sent' : 'received'}">
                <div class="message-bubble ${isSent ? 'sent' : 'received'}">
                    <div class="message-text">${message.message}</div>
                    <div class="message-time">${time}</div>
                </div>
        `;

        // Add AI context card for received messages with context
        if (!isSent && aiContext.context_explanation) {
            html += `
                <div class="ai-context-card">
                    <div class="ai-badge">
                        <i class="fas fa-robot"></i>
                        AI Context
                    </div>
                    
                    ${aiContext.original_message ? `
                        <div style="font-size: 0.75rem; color: #6B7280; margin-top: 0.5rem;">
                            <strong>Original:</strong> "${aiContext.original_message}"
                        </div>
                    ` : ''}
                    
                    <div class="context-explanation">
                        ${aiContext.context_explanation}
                    </div>
                    
                    ${aiContext.negotiation_insight ? `
                        <div class="context-insight">
                            <strong>💡 Tip:</strong> ${aiContext.negotiation_insight}
                        </div>
                    ` : ''}
                </div>
            `;

            // Add smart replies
            if (aiContext.suggested_responses && aiContext.suggested_responses.length > 0) {
                html += `
                    <div class="smart-replies">
                        <div class="smart-reply-label">
                            <i class="fas fa-lightbulb"></i>
                            Quick Replies:
                        </div>
                `;
                
                aiContext.suggested_responses.forEach((reply, index) => {
                    html += `
                        <button class="smart-reply-btn" onclick="sendSmartReply('${reply.replace(/'/g, "\\'")}')">
                            ${reply}
                        </button>
                    `;
                });
                
                html += `</div>`;
            }
        }

        // Add translation indicator
        if (aiContext.intent) {
            html += `
                <div class="translation-indicator">
                    <i class="fas fa-language"></i>
                    <span>Auto-translated</span>
                </div>
            `;
        }

        html += `</div>`;

        return html;
    }

    // Display Empty State
    function displayEmptyState() {
        const messagesContainer = document.getElementById('chatMessages');
        messagesContainer.innerHTML = `
            <div class="chat-empty-state">
                <i class="fas fa-comments"></i>
                <h3>Start a Conversation</h3>
                <p>Send a message to ${currentConversation.recipientName}</p>
                <p style="margin-top: 1rem; font-size: 0.8rem; color: #F59E0B;">
                    🤖 AI will translate and provide cultural context
                </p>
            </div>
        `;
    }

    // Send Message
    window.sendChatMessage = async function() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();

        if (!message) return;

        // Disable input
        input.disabled = true;

        // Show typing indicator
        showTypingIndicator();

        try {
            const response = await fetch('/api/negotiation/send-message', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    recipient_id: currentConversation.recipientId,
                    message: message,
                    sender_language: currentLanguage,
                    recipient_language: userData.role === 'artisan' ? 'en' : 'hi'
                })
            });

            if (response.ok) {
                input.value = '';
                await loadConversation();
            } else {
                alert('Failed to send message. Please try again.');
            }
        } catch (error) {
            console.error('Error sending message:', error);
            alert('Error sending message. Please check your connection.');
        } finally {
            input.disabled = false;
            input.focus();
            hideTypingIndicator();
        }
    };

    // Send Smart Reply
    window.sendSmartReply = function(reply) {
        const input = document.getElementById('chatInput');
        input.value = reply;
        sendChatMessage();
    };

    // Handle Enter Key
    window.handleChatKeyPress = function(event) {
        if (event.key === 'Enter') {
            sendChatMessage();
        }
    };

    // Switch Language
    window.switchChatLanguage = function(lang) {
        currentLanguage = lang;
        
        // Update button states
        document.querySelectorAll('.lang-btn').forEach(btn => {
            btn.classList.remove('active');
        });
        event.target.classList.add('active');
        
        // Update placeholder
        const placeholders = {
            'en': 'Type your message...',
            'hi': 'अपना संदेश लिखें...',
            'te': 'మీ సందేశాన్ని టైప్ చేయండి...'
        };
        document.getElementById('chatInput').placeholder = placeholders[lang] || placeholders['en'];
    };

    // Voice Input
    window.startVoiceInput = function() {
        if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
            alert('Voice input is not supported in your browser.');
            return;
        }

        const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
        const recognition = new SpeechRecognition();
        
        const langMap = {
            'en': 'en-US',
            'hi': 'hi-IN',
            'te': 'te-IN'
        };
        
        recognition.lang = langMap[currentLanguage] || 'en-US';
        recognition.continuous = false;

        const voiceBtn = event.target.closest('.voice-btn');
        voiceBtn.classList.add('recording');

        recognition.onresult = function(event) {
            const transcript = event.results[0][0].transcript;
            document.getElementById('chatInput').value = transcript;
        };

        recognition.onerror = function(event) {
            console.error('Speech recognition error:', event.error);
            alert('Voice input failed. Please try again.');
        };

        recognition.onend = function() {
            voiceBtn.classList.remove('recording');
        };

        recognition.start();
    };

    // Show/Hide Typing Indicator
    function showTypingIndicator() {
        const messagesContainer = document.getElementById('chatMessages');
        const typingHTML = `
            <div id="typingIndicator" class="message-wrapper received">
                <div class="typing-indicator">
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                    <div class="typing-dot"></div>
                </div>
            </div>
        `;
        messagesContainer.insertAdjacentHTML('beforeend', typingHTML);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }

    function hideTypingIndicator() {
        const indicator = document.getElementById('typingIndicator');
        if (indicator) {
            indicator.remove();
        }
    }

    // Start Message Polling
    function startMessagePolling() {
        // Check for new messages every 5 seconds
        messageCheckInterval = setInterval(loadConversation, 5000);
    }

    // Stop Message Polling
    function stopMessagePolling() {
        if (messageCheckInterval) {
            clearInterval(messageCheckInterval);
            messageCheckInterval = null;
        }
    }

    // Toggle Chat
    window.toggleChat = function() {
        const chatContainer = document.getElementById('chatContainer');
        if (chatContainer) {
            chatContainer.classList.toggle('hidden');
            if (chatContainer.classList.contains('hidden')) {
                stopMessagePolling();
            } else {
                startMessagePolling();
            }
        }
    };

    // Toggle Minimize
    window.toggleChatMinimize = function() {
        const chatContainer = document.getElementById('chatContainer');
        if (chatContainer) {
            chatContainer.classList.toggle('minimized');
        }
    };

    // Open Chat (called from dashboard)
    window.openChat = function(recipientId, recipientName) {
        initChat(recipientId, recipientName);
    };

    // Export for use in dashboards
    window.ChatUI = {
        init: initChat,
        toggle: toggleChat,
        open: openChat
    };
})();

