/**
 * Dashboard Voice-Over System
 * Speaks button/card text in user's selected language
 */

class DashboardVoiceOver {
    constructor() {
        this.synthesis = window.speechSynthesis;
        this.currentLang = localStorage.getItem('language') || 'te'; // Default Telugu
        this.enabled = true;
        this.init();
    }

    init() {
        // Add voice-over to all clickable elements
        this.addVoiceToButtons();
        this.addVoiceToCards();
        this.addVoiceToLinks();
    }

    speak(text, lang = this.currentLang) {
        if (!this.enabled || !text) return;

        // Cancel any ongoing speech
        this.synthesis.cancel();

        const utterance = new SpeechSynthesisUtterance(text);

        // Set language based on user preference
        const langMap = {
            'te': 'te-IN',  // Telugu
            'hi': 'hi-IN',  // Hindi
            'ta': 'ta-IN',  // Tamil
            'kn': 'kn-IN',  // Kannada
            'ml': 'ml-IN',  // Malayalam
            'en': 'en-IN'   // English
        };

        utterance.lang = langMap[lang] || 'te-IN';
        utterance.rate = 0.9;  // Slightly slower for clarity
        utterance.pitch = 1.0;
        utterance.volume = 1.0;

        this.synthesis.speak(utterance);
    }

    addVoiceToButtons() {
        // Add voice to all buttons
        document.querySelectorAll('button, .btn, .action-btn').forEach(button => {
            button.addEventListener('mouseenter', () => {
                const text = button.textContent.trim();
                if (text) this.speak(text);
            });
        });
    }

    addVoiceToCards() {
        // Add voice to dashboard cards
        document.querySelectorAll('.dashboard-card, .feature-card, .stat-card').forEach(card => {
            card.addEventListener('mouseenter', () => {
                // Get the main heading text
                const heading = card.querySelector('h3, h2, .card-title');
                if (heading) {
                    this.speak(heading.textContent.trim());
                }
            });

            // Also speak on click
            card.addEventListener('click', () => {
                const heading = card.querySelector('h3, h2, .card-title');
                if (heading) {
                    this.speak(heading.textContent.trim());
                }
            });
        });
    }

    addVoiceToLinks() {
        // Add voice to navigation links
        document.querySelectorAll('a, .nav-link').forEach(link => {
            link.addEventListener('mouseenter', () => {
                const text = link.textContent.trim();
                if (text && text.length < 50) { // Don't speak long text
                    this.speak(text);
                }
            });
        });
    }

    // Toggle voice on/off
    toggle() {
        this.enabled = !this.enabled;
        return this.enabled;
    }

    // Change language
    setLanguage(lang) {
        this.currentLang = lang;
        localStorage.setItem('language', lang);
    }
}

// Initialize voice-over when page loads
let dashboardVoice;

document.addEventListener('DOMContentLoaded', () => {
    dashboardVoice = new DashboardVoiceOver();
    console.log('🔊 Dashboard voice-over enabled!');
});

// Global function to toggle voice
function toggleVoice() {
    if (dashboardVoice) {
        const enabled = dashboardVoice.toggle();
        console.log('Voice-over:', enabled ? 'ON' : 'OFF');
        return enabled;
    }
}

// Global function to change language
function setVoiceLanguage(lang) {
    if (dashboardVoice) {
        dashboardVoice.setLanguage(lang);
        console.log('Voice language set to:', lang);
    }
}
