/**
 * Voice Assistant for Artisan-Friendly Registration/Login
 * Submits data as JSON to /api/auth endpoints
 */

const VOICE_PROMPTS = {
    en: {
        askName: "Please tell me your name",
        askPhone: "Tell me your phone number",
        askPassword: "Tell me your password",
        askRole: "Are you an artisan or a buyer?",
        gotIt: "Got it!",
        tryAgain: "Try again",
        success: "Success! Logging you in...",
        lang: 'en-IN'
    }
};

class VoiceAssistant {
    constructor() {
        this.recognition = null;
        this.synthesis = window.speechSynthesis;
        this.currentLang = 'en';
        this.initRecognition();
    }

    initRecognition() {
        if ('webkitSpeechRecognition' in window) {
            this.recognition = new webkitSpeechRecognition();
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
        }
    }

    speak(text, lang = 'en') {
        return new Promise((resolve) => {
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = 'en-IN';
            utterance.onend = () => resolve();
            this.synthesis.speak(utterance);
        });
    }

    listen() {
        return new Promise((resolve, reject) => {
            if (!this.recognition) {
                reject(new Error('Not supported'));
                return;
            }
            this.recognition.lang = 'en-IN';
            this.recognition.onresult = (event) => {
                resolve(event.results[0][0].transcript);
            };
            this.recognition.onerror = () => reject();
            this.recognition.start();
        });
    }

    extractPhone(text) {
        const digits = text.replace(/\D/g, '');
        return digits.slice(-10);
    }

    extractName(text) {
        return text.replace(/[0-9]/g, '').trim();
    }

    detectRole(text) {
        if (text.toLowerCase().includes('artisan')) return 'artisan';
        if (text.toLowerCase().includes('buyer')) return 'buyer';
        return null;
    }

    async startGuidedRegistration(lang = 'en') {
        const prompts = VOICE_PROMPTS[lang];
        try {
            // Ask role
            await this.speak(prompts.askRole);
            const roleText = await this.listen();
            const role = this.detectRole(roleText);
            if (!role) return;
            await this.speak(prompts.gotIt);

            // Ask name
            await this.speak(prompts.askName);
            const name = await this.listen();
            await this.speak(prompts.gotIt);

            // Ask phone
            await this.speak(prompts.askPhone);
            const phoneText = await this.listen();
            const phone = this.extractPhone(phoneText);
            await this.speak(prompts.gotIt);

            // Ask password
            await this.speak(prompts.askPassword);
            const password = await this.listen();
            await this.speak(prompts.success);

            // Submit as JSON
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    full_name: name,
                    phone: phone,
                    password: password,
                    role: role,
                    language: lang
                })
            });

            const data = await response.json();
            if (data.access_token) {
                localStorage.setItem('token', data.access_token);
                window.location.href = data.user.role === 'artisan' ? '/artisan/dashboard' : '/buyer/dashboard';
            } else {
                alert('Error: ' + (data.error || 'Registration failed'));
            }
        } catch (error) {
            console.error('Voice error:', error);
            alert('Voice registration failed');
        }
    }
}

window.voiceAssistant = new VoiceAssistant();

function startVoiceRegistration(lang = 'en') {
    window.voiceAssistant.startGuidedRegistration(lang);
}

console.log('🎤 Voice Assistant ready! Use: startVoiceRegistration("en")');
