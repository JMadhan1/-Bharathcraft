/**
 * Simplified Artisan Dashboard
 * Designed for low-literacy village artisans
 * Features: Voice support, visual-first interface, minimal text
 */

(function () {
    'use strict';

    const authToken = localStorage.getItem('authToken');
    const userData = JSON.parse(localStorage.getItem('userData') || '{}');

    if (!authToken || userData.role !== 'artisan') {
        window.location.href = '/';
    }

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
            console.log('New order received:', data);
            handleNewOrderNotification(data);
        });

        // Listen for new messages
        socket.on('new_message', (data) => {
            console.log('New message received:', data);
            handleNewMessageNotification(data);
        });
    }

    // Voice messages in Hindi (will use browser's speech synthesis)
    const voiceMessages = {
        greeting: `नमस्ते ${userData.full_name || 'आर्टिजन'}। भरतक्राफ्ट में आपका स्वागत है।`,
        upload: 'अपने काम की फोटो लेने के लिए यहां दबाएं। फोटो लेना आसान है।',
        products: 'आपके सभी उत्पाद यहां दिखाई देंगे। आप देख सकते हैं कि कितने बेचे गए।',
        orders: 'यहां आपके नए ऑर्डर दिखाई देंगे। जब कोई खरीदता है तो आपको पता चल जाएगा।',
        earnings: 'यहां आपकी कमाई दिखाई देती है। आपको कितना पैसा मिलेगा।',
        messages: 'खरीदार से बात करें। अगर आपको कोई सवाल है तो यहां पूछें।',
        help: 'वीडियो देखकर सीखें। हम आपको दिखाएंगे कैसे यूज करना है।',
        'upload-instruction': 'पहले फोटो लें। फिर कीमत बताएं। बस इतना ही!',
        'price-instruction': 'आप कितने में बेचना चाहते हैं? नीचे के बटन दबाकर कीमत चुनें।'
    };

    // Text-to-Speech function
    window.playVoice = function (key) {
        if ('speechSynthesis' in window) {
            // Cancel any ongoing speech
            window.speechSynthesis.cancel();

            const utterance = new SpeechSynthesisUtterance(voiceMessages[key]);
            utterance.lang = 'hi-IN'; // Hindi
            utterance.rate = 0.9; // Slower for better comprehension
            utterance.pitch = 1;

            window.speechSynthesis.speak(utterance);
        } else {
            console.log('Speech synthesis not supported');
        }
    };

    // Start voice help (plays greeting)
    window.startVoiceHelp = function () {
        playVoice('greeting');
    };

    // Show simplified upload modal
    window.showSimpleUpload = function () {
        document.getElementById('uploadModal').classList.add('active');
        document.getElementById('step1').classList.add('active');
    };

    // Close upload modal
    window.closeUploadModal = function () {
        document.getElementById('uploadModal').classList.remove('active');
        // Reset form
        document.getElementById('simpleUploadForm').reset();
        document.querySelectorAll('.upload-step').forEach(step => step.classList.remove('active'));
        document.getElementById('photoPreview').innerHTML = '';
        document.getElementById('photoNextBtn').style.display = 'none';
    };

    // Show photo preview after selection
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

            // Show next button
            document.getElementById('photoNextBtn').style.display = 'flex';
        }
    };

    // Navigate between steps
    window.nextStep = function (stepNumber) {
        // Validation
        if (stepNumber === 2) {
            const photoInput = document.getElementById('photoInput');
            if (!photoInput.files || photoInput.files.length === 0) {
                alert('कृपया फोटो लें (Please take a photo)');
                return;
            }
        }

        if (stepNumber === 3) {
            const priceInput = document.getElementById('priceInput');
            if (!priceInput.value || parseFloat(priceInput.value) <= 0) {
                alert('कृपया कीमत बताएं (Please enter a price)');
                return;
            }
        }

        // Hide all steps
        document.querySelectorAll('.upload-step').forEach(step => {
            step.classList.remove('active');
        });

        // Show target step
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

            recognition.lang = 'hi-IN';
            recognition.continuous = false;
            recognition.interimResults = false;

            const btn = document.querySelector('.voice-record-btn');
            const originalHTML = btn.innerHTML;
            btn.innerHTML = '<i class="fas fa-circle" style="color: red; animation: pulse 1s infinite;"></i> <span class="hindi">सुन रहे हैं...</span>';

            recognition.onresult = function (event) {
                const transcript = event.results[0][0].transcript;
                document.getElementById('descriptionInput').value = transcript;

                // Also use as title if not set
                if (!document.getElementById('titleInput').value) {
                    document.getElementById('titleInput').value = transcript.substring(0, 50);
                }

                btn.innerHTML = originalHTML;
            };

            recognition.onerror = function (event) {
                console.error('Speech recognition error:', event.error);
                alert('माफ़ करें, हम आपकी आवाज़ नहीं सुन पाए। (Sorry, could not hear you)');
                btn.innerHTML = originalHTML;
            };

            recognition.onend = function () {
                btn.innerHTML = originalHTML;
            };

            recognition.start();
        } else {
            alert('माफ़ करें, यह फीचर आपके फोन में काम नहीं करता। (Sorry, voice input not supported)');
        }
    };

    // Handle form submission
    document.getElementById('simpleUploadForm').addEventListener('submit', async function (e) {
        e.preventDefault();

        const formData = new FormData(this);

        // Auto-generate title if not provided
        if (!formData.get('title')) {
            const description = formData.get('description') || 'Handmade Product';
            formData.set('title', description.substring(0, 50));
        }

        // Add default craft type from user profile
        if (!formData.get('craft_type')) {
            formData.set('craft_type', userData.craft_type || 'handicraft');
        }

        // Show uploading state
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
                // Show success animation
                closeUploadModal();
                showSuccessAnimation();

                // Reload products after 2 seconds
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
            alert('अपलोड में समस्या। फिर से कोशिश करें। (Upload problem. Try again)');
            document.getElementById('uploadingState').style.display = 'none';
            document.getElementById('step1').classList.add('active');
        }
    });

    // Show success animation
    function showSuccessAnimation() {
        const successDiv = document.getElementById('successAnimation');
        successDiv.style.display = 'flex';

        // Play success voice
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance('बहुत बढ़िया! आपका उत्पाद अपलोड हो गया। अब खरीदार इसे देख सकते हैं।');
            utterance.lang = 'hi-IN';
            window.speechSynthesis.speak(utterance);
        }

        window.location.href = '/artisan/dashboard.html';
    };

    window.showOrders = function () {
        // Switch to advanced mode to see orders
        if (confirm('ऑर्डर देखने के लिए Advanced Mode में जाएं?\n\nGo to Advanced Mode to see orders?')) {
            localStorage.setItem('artisanDashboardMode', 'advanced');
            window.location.href = '/artisan';
        }
    };

    window.showEarnings = function () {
        alert('आपकी कमाई: ₹0\n(Your earnings: ₹0)');
    };

    window.showMessages = function () {
        // Switch to advanced mode to see messages
        if (confirm('संदेश देखने के लिए Advanced Mode में जाएं?\n\nGo to Advanced Mode to see messages?')) {
            localStorage.setItem('artisanDashboardMode', 'advanced');
            window.location.href = '/artisan';
        }
    };

    window.showVideoTutorial = function () {
        // Open a tutorial video or guide
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance('हम जल्द ही वीडियो ट्यूटोरियल जोड़ेंगे। अभी के लिए, फोटो लें बटन दबाएं और अपना पहला उत्पाद अपलोड करें।');
            utterance.lang = 'hi-IN';
            window.speechSynthesis.speak(utterance);
        }
        alert('वीडियो ट्यूटोरियल जल्द आ रहा है!\n(Video tutorial coming soon!)');
    };

    // Logout function
    window.logout = function () {
        if ('speechSynthesis' in window) {
            const utterance = new SpeechSynthesisUtterance('धन्यवाद! फिर मिलेंगे।');
            utterance.lang = 'hi-IN';
            window.speechSynthesis.speak(utterance);
        }

        setTimeout(() => {
            localStorage.removeItem('authToken');
            localStorage.removeItem('userData');
            window.location.href = '/';
        }, 1000);
    };

    // Add CSS animations
    const style = document.createElement('style');
    style.textContent = `
        @keyframes slideInRight {
            from { transform: translateX(100%); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOutRight {
            from { transform: translateX(0); opacity: 1; }
            to { transform: translateX(100%); opacity: 0; }
        }
    `;
    document.head.appendChild(style);

    // Initialize
    document.addEventListener('DOMContentLoaded', function () {
        // Set user name
        document.getElementById('userName').textContent = userData.full_name || 'आर्टिजन';

        // Load stats
        loadStats();

        // Poll for updates every 30 seconds
        setInterval(() => {
            loadStats();
        }, 30000);

        // Auto-play greeting on first visit
        const hasPlayedGreeting = sessionStorage.getItem('hasPlayedGreeting');
        if (!hasPlayedGreeting) {
            setTimeout(() => {
                playVoice('greeting');
                sessionStorage.setItem('hasPlayedGreeting', 'true');
            }, 1000);
        }
    });
})();

