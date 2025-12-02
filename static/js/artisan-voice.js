(function () {
    'use strict';

    const userData = JSON.parse(localStorage.getItem('userData') || '{}');
    const authToken = localStorage.getItem('authToken');

    if (!userData.id || userData.role !== 'artisan') {
        return; // Only for logged-in artisans
    }

    // Initialize Socket.IO
    const socket = io();

    // Join user's personal room
    socket.on('connect', () => {
        console.log('Connected to notification service');
        socket.emit('join', { room: `user_${userData.id}` });
    });

    // Listen for notifications
    socket.on('notification', (data) => {
        console.log('Notification received:', data);

        if (data.type === 'message') {
            showNotification(data);
            speakMessage(data);
        }
    });

    function showNotification(data) {
        const container = document.getElementById('notification-container');
        if (!container) return;

        const notification = document.createElement('div');
        notification.className = 'notification-toast';
        notification.style.cssText = `
            background: white;
            border-left: 4px solid #4F46E5;
            box-shadow: 0 4px 6px rgba(0,0,0,0.1);
            padding: 16px;
            margin-bottom: 10px;
            border-radius: 4px;
            display: flex;
            align-items: flex-start;
            animation: slideIn 0.3s ease-out;
            max-width: 300px;
        `;

        const content = data.translated_content || data.content;

        notification.innerHTML = `
            <div style="flex-grow: 1;">
                <h4 style="margin: 0 0 4px 0; color: #1F2937; font-size: 14px;">${data.sender_name}</h4>
                <p style="margin: 0; color: #4B5563; font-size: 13px;">${content}</p>
            </div>
            <button onclick="this.parentElement.remove()" style="background: none; border: none; color: #9CA3AF; cursor: pointer;">&times;</button>
        `;

        container.appendChild(notification);

        // Auto remove after 5 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }

    function speakMessage(data) {
        if (!window.speechSynthesis) return;

        // Cancel any current speech
        window.speechSynthesis.cancel();

        const senderName = data.sender_name;
        const messageText = data.translated_content || data.content;

        // Determine language for TTS
        // Default to Hindi for artisans if not specified
        const lang = userData.language_preference || 'hi-IN';

        // Construct the text to speak
        // We try to make it sound natural in the target language
        let textToSpeak = "";

        if (lang.startsWith('hi')) {
            textToSpeak = `${senderName} का संदेश आया है: ${messageText}`;
        } else if (lang.startsWith('te')) {
            textToSpeak = `${senderName} నుండి సందేశం వచ్చింది: ${messageText}`;
        } else if (lang.startsWith('ta')) {
            textToSpeak = `${senderName} இடமிருந்து செய்தி வந்துள்ளது: ${messageText}`;
        } else {
            textToSpeak = `Message from ${senderName}: ${messageText}`;
        }

        const utterance = new SpeechSynthesisUtterance(textToSpeak);

        // Try to set the voice
        const voices = window.speechSynthesis.getVoices();
        const targetVoice = voices.find(v => v.lang.includes(lang));
        if (targetVoice) {
            utterance.voice = targetVoice;
        }

        utterance.lang = lang;
        utterance.rate = 0.9; // Slightly slower for better clarity

        window.speechSynthesis.speak(utterance);
    }

    // Add CSS animation
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideIn {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
    `;
    document.head.appendChild(style);

})();
