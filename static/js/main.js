let currentUser = null;
let authToken = null;

document.addEventListener('DOMContentLoaded', function() {
    // Check if user was redirected due to expired session
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('expired') === '1') {
        setTimeout(() => {
            alert('Your session has expired. Please log in again.');
        }, 500);
    }
    
    checkAuth();
    loadTranslations();
    initializeMap();
    
    const langSelector = document.getElementById('languageSelector');
    if (langSelector) {
        langSelector.addEventListener('change', function(e) {
            loadTranslations(e.target.value);
        });
    }
    
    // Setup login form
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', handleLoginSubmit);
    }
    
    // Setup register form
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', handleRegisterSubmit);
        
        // Show/hide artisan fields based on role selection
        const roleSelect = registerForm.querySelector('select[name="role"]');
        if (roleSelect) {
            roleSelect.addEventListener('change', function() {
                const artisanFields = document.getElementById('artisanFields');
                if (artisanFields) {
                    artisanFields.style.display = this.value === 'artisan' ? 'block' : 'none';
                }
            });
        }
    }
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        const loginModal = document.getElementById('loginModal');
        const registerModal = document.getElementById('registerModal');
        
        if (event.target === loginModal) {
            closeModal('loginModal');
        }
        if (event.target === registerModal) {
            closeModal('registerModal');
        }
    });
});

function checkAuth() {
    authToken = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    if (authToken && userData) {
        currentUser = JSON.parse(userData);
        redirectToDashboard();
    }
}

function redirectToDashboard() {
    if (!currentUser) return;
    
    const path = window.location.pathname;
    if (path === '/') {
        if (currentUser.role === 'artisan') {
            // Check user's dashboard preference (default: simple for accessibility)
            const dashboardMode = localStorage.getItem('artisanDashboardMode') || 'simple';
            if (dashboardMode === 'advanced') {
                window.location.href = '/artisan';
            } else {
                window.location.href = '/artisan/dashboard-simple';
            }
        } else if (currentUser.role === 'buyer') {
            window.location.href = '/buyer';
        } else if (currentUser.role === 'admin') {
            window.location.href = '/admin';
        }
    }
}

function loadTranslations(lang = 'en') {
    fetch(`/static/translations/${lang}.json`)
        .then(res => res.json())
        .then(translations => {
            // Update logo
            const logo = document.querySelector('.logo');
            if (logo) logo.innerHTML = `🪔 ${translations.header.logo}`;
            
            // Update header buttons
            const loginBtn = document.querySelector('.btn-secondary');
            if (loginBtn) loginBtn.textContent = translations.header.login;
            
            const getStartedBtn = document.querySelector('.header .btn-primary');
            if (getStartedBtn) getStartedBtn.textContent = translations.header.getStarted;
            
            // Update hero badges
            const heroBadge = document.querySelector('.hero-badge');
            if (heroBadge) heroBadge.innerHTML = `<i class="fas fa-lightbulb"></i> ${translations.hero.badge}`;
            
            const heroSubBadge = document.querySelector('.hero-sub-badge');
            if (heroSubBadge) heroSubBadge.innerHTML = `<i class="fas fa-chart-line"></i> ${translations.hero.subBadge}`;
            
            // Update hero title
            const heroTitle = document.querySelector('.hero-title');
            if (heroTitle) {
                heroTitle.innerHTML = `${translations.hero.title} <span class="highlight-text">7 Million</span> ${heroTitle.innerHTML.includes('Indian') ? 'Indian Artisans' : ''}<br>
                ${translations.hero.connecting} <span class="highlight-text-gold">Global Buyers</span>`;
            }
            
            // Update hero subtitle
            const heroSubtitle = document.querySelector('.hero-subtitle');
            if (heroSubtitle) heroSubtitle.innerHTML = `<i class="fas fa-handshake"></i> ${translations.hero.subtitle}`;
            
            // Update metrics
            const metricCards = document.querySelectorAll('.metric-card');
            if (metricCards.length >= 4) {
                metricCards[0].querySelector('.metric-value').textContent = translations.metrics.income.value;
                metricCards[0].querySelector('.metric-label').textContent = translations.metrics.income.label;
                metricCards[0].querySelector('p').textContent = translations.metrics.income.description;
                
                metricCards[1].querySelector('.metric-value').textContent = translations.metrics.cost.value;
                metricCards[1].querySelector('.metric-label').textContent = translations.metrics.cost.label;
                metricCards[1].querySelector('p').textContent = translations.metrics.cost.description;
                
                metricCards[2].querySelector('.metric-value').textContent = translations.metrics.ai.value;
                metricCards[2].querySelector('.metric-label').textContent = translations.metrics.ai.label;
                metricCards[2].querySelector('p').textContent = translations.metrics.ai.description;
                
                metricCards[3].querySelector('.metric-value').textContent = translations.metrics.languages.value;
                metricCards[3].querySelector('.metric-label').textContent = translations.metrics.languages.label;
                metricCards[3].querySelector('p').textContent = translations.metrics.languages.description;
            }
            
            // Update portal cards
            const portalCards = document.querySelectorAll('.portal-card');
            if (portalCards.length >= 2) {
                portalCards[0].querySelector('h3').textContent = translations.portals.artisan.title;
                portalCards[0].querySelector('p').textContent = translations.portals.artisan.description;
                const artisanBadges = portalCards[0].querySelectorAll('.gi-badge');
                if (artisanBadges[0]) artisanBadges[0].innerHTML = `<i class="fas fa-certificate"></i> ${translations.portals.artisan.badge1}`;
                if (artisanBadges[1]) artisanBadges[1].innerHTML = `<i class="fas fa-robot"></i> ${translations.portals.artisan.badge2}`;
                const artisanBtn = portalCards[0].querySelector('.btn-primary');
                if (artisanBtn) artisanBtn.innerHTML = `<i class="fas fa-user-plus"></i> ${translations.portals.artisan.button}`;
                
                portalCards[1].querySelector('h3').textContent = translations.portals.buyer.title;
                portalCards[1].querySelector('p').textContent = translations.portals.buyer.description;
                const buyerBadges = portalCards[1].querySelectorAll('.gi-badge');
                if (buyerBadges[0]) buyerBadges[0].innerHTML = `<i class="fas fa-leaf"></i> ${translations.portals.buyer.badge1}`;
                if (buyerBadges[1]) buyerBadges[1].innerHTML = `<i class="fas fa-handshake"></i> ${translations.portals.buyer.badge2}`;
                const buyerBtn = portalCards[1].querySelector('.btn-primary');
                if (buyerBtn) buyerBtn.innerHTML = `<i class="fas fa-shopping-bag"></i> ${translations.portals.buyer.button}`;
            }
            
            // Update feature highlight
            const featureHighlight = document.querySelector('.feature-highlight');
            if (featureHighlight) {
                const fhTitle = featureHighlight.querySelector('h2');
                const fhDesc = featureHighlight.querySelector('p');
                if (fhTitle) fhTitle.innerHTML = `<i class="fas fa-brain"></i> ${translations.featureHighlight.title}`;
                if (fhDesc) fhDesc.innerHTML = `${translations.featureHighlight.description}<br><br><strong>🎯 ${translations.featureHighlight.result}</strong>`;
            }
            
            // Update features section
            const featuresTitle = document.querySelector('.features .section-title');
            if (featuresTitle) featuresTitle.textContent = translations.features.title;
            
            const featureCards = document.querySelectorAll('.feature-card');
            const featureKeys = ['quality', 'translation', 'logistics', 'documentation', 'payment', 'gi'];
            featureCards.forEach((card, index) => {
                if (featureKeys[index]) {
                    const title = card.querySelector('h3');
                    const desc = card.querySelector('p');
                    if (title) title.textContent = translations.features[featureKeys[index]].title;
                    if (desc) desc.textContent = translations.features[featureKeys[index]].description;
                }
            });
            
            // Update how it works
            const howItWorksTitle = document.querySelector('.how-it-works .section-title');
            if (howItWorksTitle) howItWorksTitle.textContent = translations.howItWorks.title;
            
            const steps = document.querySelectorAll('.step');
            const stepKeys = ['step1', 'step2', 'step3', 'step4', 'step5', 'step6'];
            steps.forEach((step, index) => {
                if (stepKeys[index]) {
                    const title = step.querySelector('h3');
                    const desc = step.querySelector('p');
                    if (title) title.textContent = translations.howItWorks[stepKeys[index]].title;
                    if (desc) desc.textContent = translations.howItWorks[stepKeys[index]].description;
                }
            });
            
            // Update stats section
            const statsTitle = document.querySelector('.stats .section-title');
            if (statsTitle) statsTitle.textContent = translations.stats.title;
            
            const statCards = document.querySelectorAll('.stat-card');
            const statKeys = ['artisans', 'exports', 'currentShare', 'withBharatcraft'];
            statCards.forEach((card, index) => {
                if (statKeys[index]) {
                    const value = card.querySelector('.stat-number');
                    const label = card.querySelector('.stat-label');
                    if (value) value.textContent = translations.stats[statKeys[index]].value;
                    if (label) label.textContent = translations.stats[statKeys[index]].label;
                }
            });
            
            // Legacy: Handle any remaining data-i18n attributes
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                const keys = key.split('.');
                let value = translations;
                for (let k of keys) {
                    value = value[k];
                }
                if (value && typeof value === 'string') el.textContent = value;
            });
        })
        .catch(err => console.log('Translation loading error:', err));
}

function initializeMap() {
    const mapElement = document.getElementById('clusterMap');
    if (!mapElement) return;
    
    const map = L.map('clusterMap').setView([20.5937, 78.9629], 5);
    
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors'
    }).addTo(map);
    
    const sampleClusters = [
        { name: 'Varanasi Silk', lat: 25.3176, lon: 82.9739, specialty: 'Silk Weaving' },
        { name: 'Jaipur Block Print', lat: 26.9124, lon: 75.7873, specialty: 'Block Printing' },
        { name: 'Kashmir Pashmina', lat: 34.0837, lon: 74.7973, specialty: 'Pashmina' },
        { name: 'Kanchipuram Silk', lat: 12.8342, lon: 79.7036, specialty: 'Silk Sarees' }
    ];
    
    sampleClusters.forEach(cluster => {
        L.marker([cluster.lat, cluster.lon])
            .bindPopup(`<b>${cluster.name}</b><br>${cluster.specialty}`)
            .addTo(map);
    });
}

function showLogin() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function showRegister() {
    const modal = document.getElementById('registerModal');
    if (modal) {
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }
}

function registerAs(role) {
    showRegister();
    setTimeout(() => {
        const roleInput = document.getElementById('registerRole');
        if (roleInput) roleInput.value = role;
        
        const artisanFields = document.getElementById('artisanFields');
        if (artisanFields && role === 'artisan') {
            artisanFields.style.display = 'block';
        }
    }, 100);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
}

// Handle login form submission
async function handleLoginSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const email = form.querySelector('input[name="email"]').value;
    const password = form.querySelector('input[name="password"]').value;
    
    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('authToken', data.access_token);
            localStorage.setItem('userData', JSON.stringify(data.user));
            currentUser = data.user;
            authToken = data.access_token;
            closeModal('loginModal');
            redirectToDashboard();
        } else {
            alert(data.error || 'Login failed');
        }
    } catch (error) {
        alert('Login error: ' + error.message);
    }
}

// Handle register form submission
async function handleRegisterSubmit(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    const data = {
        role: formData.get('role'),
        full_name: formData.get('full_name'),
        email: formData.get('email'),
        password: formData.get('password'),
        phone: formData.get('phone'),
        language: formData.get('language')
    };
    
    // Add artisan-specific fields if role is artisan
    if (data.role === 'artisan') {
        data.craft_type = formData.get('craft_type');
        data.skills = formData.get('skills');
        data.experience_years = parseInt(formData.get('experience_years')) || 0;
        data.address = formData.get('address');
    }
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            localStorage.setItem('authToken', result.access_token);
            localStorage.setItem('userData', JSON.stringify(result.user));
            currentUser = result.user;
            authToken = result.access_token;
            closeModal('registerModal');
            redirectToDashboard();
        } else {
            alert(result.error || 'Registration failed');
        }
    } catch (error) {
        alert('Registration error: ' + error.message);
    }
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    currentUser = null;
    authToken = null;
    window.location.href = '/';
}
