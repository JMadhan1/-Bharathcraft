let currentUser = null;
let authToken = null;

// Global error handler to catch external script errors (like browser extensions)
(function() {
    'use strict';
    
    // Store original console methods
    const originalError = console.error;
    const originalWarn = console.warn;
    
    // Override console.error to filter external errors
    console.error = function(...args) {
        const errorStr = args.join(' ');
        if (errorStr.includes('giveFreely') || 
            errorStr.includes('extension://') ||
            errorStr.includes('chrome-extension://') ||
            errorStr.includes('payload') && errorStr.includes('undefined')) {
            // Suppress external errors
            return;
        }
        originalError.apply(console, args);
    };
    
    // Error event handler
    window.addEventListener('error', function(event) {
        const filename = event.filename || event.target?.src || '';
        const errorMessage = event.message || String(event.error || '');
        const errorStack = event.error?.stack || '';
        
        // Check if it's an external script error
        const isExternal = (
            filename.includes('giveFreely') ||
            filename.includes('extension://') ||
            filename.includes('chrome-extension://') ||
            filename.includes('moz-extension://') ||
            filename.includes('safari-extension://') ||
            filename.includes('edge-extension://') ||
            errorMessage.includes('giveFreely') ||
            errorMessage.includes('payload') && errorMessage.includes('undefined') ||
            errorStack.includes('giveFreely') ||
            (filename && !filename.includes(window.location.origin) && !filename.startsWith('/') && !filename.startsWith('http://localhost') && !filename.startsWith('http://127.0.0.1'))
        );
        
        if (isExternal) {
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            return false;
        }
        
        return true;
    }, true);
    
    // Handle unhandled promise rejections from external scripts
    window.addEventListener('unhandledrejection', function(event) {
        const errorMessage = event.reason?.message || String(event.reason || '');
        const errorStack = event.reason?.stack || '';
        const errorString = String(event.reason || '');
        
        // Check if it's an external script error
        const isExternal = (
            errorMessage.includes('giveFreely') || 
            errorMessage.includes('payload') && errorMessage.includes('undefined') ||
            errorStack.includes('giveFreely') ||
            errorString.includes('giveFreely') ||
            errorStack.includes('extension://') ||
            errorStack.includes('chrome-extension://') ||
            errorStack.includes('moz-extension://')
        );
        
        if (isExternal) {
            event.preventDefault();
            event.stopPropagation();
            return false;
        }
        return true;
    });
    
    // Also catch errors at the window level
    window.onerror = function(msg, url, line, col, error) {
        const errorStr = String(msg || '') + String(url || '') + String(error?.stack || '');
        if (errorStr.includes('giveFreely') || 
            errorStr.includes('payload') && errorStr.includes('undefined') ||
            (url && (url.includes('extension://') || url.includes('chrome-extension://')))) {
            return true; // Suppress the error
        }
        return false; // Let other errors through
    };
})();

// Ensure logo is visible immediately (before DOMContentLoaded)
(function ensureLogoVisible() {
    function forceLogoVisible() {
        const logoImgs = document.querySelectorAll('.logo img, .logo-section img, header img[src*="logo"], img[alt*="Bharatcraft"]');
        logoImgs.forEach(img => {
            if (img) {
                // Force visibility
                img.style.setProperty('display', 'block', 'important');
                img.style.setProperty('visibility', 'visible', 'important');
                img.style.setProperty('opacity', '1', 'important');
                img.style.setProperty('width', 'auto', 'important');
                
                // Ensure parent is visible
                const parent = img.parentElement;
                if (parent) {
                    parent.style.setProperty('display', 'flex', 'important');
                    parent.style.setProperty('visibility', 'visible', 'important');
                }
                
                // Add cache busting if not present
                if (!img.src.includes('?v=') && !img.src.includes('?t=')) {
                    const separator = img.src.includes('?') ? '&' : '?';
                    img.src = img.src + separator + 'v=3&t=' + Date.now();
                }
                
                // Force reload if image failed
                if (!img.complete || img.naturalHeight === 0) {
                    const src = img.src.split('?')[0];
                    img.src = '';
                    setTimeout(() => {
                        img.src = src + '?v=3&t=' + Date.now();
                    }, 100);
                }
            }
        });
    }
    
    // Run immediately
    forceLogoVisible();
    
    // Run after a short delay
    setTimeout(forceLogoVisible, 50);
    
    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', forceLogoVisible);
    } else {
        forceLogoVisible();
    }
    
    // Run after page load
    window.addEventListener('load', forceLogoVisible);
})();

document.addEventListener('DOMContentLoaded', function () {
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
    setupLogoScrollAnimation();
    
    // Double-check logo visibility after DOM loads
    setTimeout(() => {
        const logoImgs = document.querySelectorAll('.logo img, .logo-section img, header img[src*="logo"]');
        logoImgs.forEach(img => {
            if (img && (img.offsetHeight === 0 || img.style.display === 'none')) {
                img.style.display = 'block';
                img.style.visibility = 'visible';
                img.style.opacity = '1';
                // Force reload
                const src = img.src.split('?')[0];
                img.src = src + '?v=3&t=' + Date.now();
            }
        });
    }, 100);

    // Mobile menu toggle
    const mobileMenuToggle = document.getElementById('mobileMenuToggle');
    const mainNav = document.getElementById('mainNav');
    if (mobileMenuToggle && mainNav) {
        mobileMenuToggle.addEventListener('click', function() {
            mobileMenuToggle.classList.toggle('active');
            mainNav.classList.toggle('active');
            document.body.style.overflow = mainNav.classList.contains('active') ? 'hidden' : '';
        });

        // Close menu when clicking outside
        document.addEventListener('click', function(e) {
            if (mainNav.classList.contains('active') && 
                !mainNav.contains(e.target) && 
                !mobileMenuToggle.contains(e.target)) {
                mobileMenuToggle.classList.remove('active');
                mainNav.classList.remove('active');
                document.body.style.overflow = '';
            }
        });

        // Close menu when clicking nav links
        const navLinks = mainNav.querySelectorAll('a, button');
        navLinks.forEach(link => {
            link.addEventListener('click', function() {
                mobileMenuToggle.classList.remove('active');
                mainNav.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
    }

    const langSelector = document.getElementById('languageSelector');
    if (langSelector) {
        langSelector.addEventListener('change', function (e) {
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
            roleSelect.addEventListener('change', function () {
                const artisanFields = document.getElementById('artisanFields');
                const buyerFields = document.getElementById('buyerFields');

                if (artisanFields) {
                    artisanFields.style.display = this.value === 'artisan' ? 'block' : 'none';
                }
                if (buyerFields) {
                    buyerFields.style.display = this.value === 'buyer' ? 'block' : 'none';
                }
            });
        }
    }

    // Close modal when clicking outside
    window.addEventListener('click', function (event) {
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
            // Logo is now an image, don't replace it with text
            // const logo = document.querySelector('.logo');
            // if (logo) logo.innerHTML = `🪔 ${translations.header.logo}`;

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

// Logo scroll animation - shrink and fade on scroll
function setupLogoScrollAnimation() {
    const header = document.querySelector('.header');
    const logoImg = document.querySelector('.logo img');
    const logo = document.querySelector('.logo');
    
    // Ensure logo is visible on page load
    if (logoImg) {
        logoImg.style.display = 'block';
        logoImg.style.visibility = 'visible';
        logoImg.style.opacity = '1';
        // Force reload if image failed to load
        if (!logoImg.complete || logoImg.naturalHeight === 0) {
            const src = logoImg.src;
            logoImg.src = '';
            logoImg.src = src + (src.includes('?') ? '&' : '?') + 't=' + Date.now();
        }
    }
    
    if (!header) return;

    const scrollThreshold = 100;
    let isScrolled = false;

    function handleScroll() {
        const currentScroll = window.pageYOffset || document.documentElement.scrollTop;
        
        if (currentScroll > scrollThreshold && !isScrolled) {
            // Scrolled down - shrink logo
            isScrolled = true;
            if (logoImg) {
                logoImg.style.height = '60px';
                logoImg.style.opacity = '0.9';
                logoImg.style.transition = 'all 0.3s ease';
            }
            header.style.padding = '0.5rem 0';
            header.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
            header.style.transition = 'all 0.3s ease';
        } else if (currentScroll <= scrollThreshold && isScrolled) {
            // At top - full size logo
            isScrolled = false;
            if (logoImg) {
                logoImg.style.height = '90px';
                logoImg.style.opacity = '1';
            }
            header.style.padding = '1rem 0';
            header.style.boxShadow = 'var(--shadow-md)';
        }
    }

    // Use throttled scroll for better performance
    let ticking = false;
    window.addEventListener('scroll', function() {
        if (!ticking) {
            window.requestAnimationFrame(function() {
                handleScroll();
                ticking = false;
            });
            ticking = true;
        }
    }, { passive: true });
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
        if (roleInput) {
            roleInput.value = role;
            // Select the role card visually
            const roleCards = document.querySelectorAll('.role-card');
            roleCards.forEach(card => {
                card.classList.remove('selected');
                const roleName = card.querySelector('.role-name');
                if (roleName && (
                    (role === 'artisan' && roleName.textContent.includes('Artisan')) ||
                    (role === 'buyer' && roleName.textContent.includes('Buyer'))
                )) {
                    card.classList.add('selected');
                }
            });
            // Trigger change event manually
            const event = new Event('change');
            roleInput.dispatchEvent(event);
        }
    }, 200);
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = 'auto';
        // Also remove any active classes
        modal.classList.remove('active');
    }
}

// Handle login form submission
async function handleLoginSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;

    // Show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Logging in...';

    // Get email OR phone
    const emailInput = form.querySelector('input[name="email"]');
    const phoneInput = form.querySelector('input[name="phone"]');

    const email = emailInput ? emailInput.value : null;
    const phone = phoneInput ? phoneInput.value : null;
    const password = form.querySelector('input[name="password"]').value;

    const payload = { password };
    if (email) payload.email = email;
    if (phone) payload.phone = phone;

    try {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
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
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    } catch (error) {
        alert('Login error: ' + error.message);
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
}

// Handle register form submission
async function handleRegisterSubmit(event) {
    event.preventDefault();

    const form = event.target;
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.innerHTML;

    // Show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';

    const formData = new FormData(form);
    const data = {
        role: formData.get('role'),
        full_name: formData.get('full_name'),
        password: formData.get('password'),
        phone: formData.get('phone'),
        language: formData.get('language')
    };

    // Add email only if present
    const email = formData.get('email');
    if (email) data.email = email;

    // Add role-specific fields
    if (data.role === 'artisan') {
        data.craft_type = formData.get('craft_type') || 'General'; // Default to General
        data.skills = formData.get('skills') || '';
        data.experience_years = parseInt(formData.get('experience_years')) || 0;
        data.address = formData.get('address') || '';
    } else if (data.role === 'buyer') {
        data.company_name = formData.get('company_name');
        data.company_address = formData.get('company_address');
        data.country = formData.get('country');
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
            submitBtn.disabled = false;
            submitBtn.innerHTML = originalBtnText;
        }
    } catch (error) {
        alert('Registration error: ' + error.message);
        submitBtn.disabled = false;
        submitBtn.innerHTML = originalBtnText;
    }
}

function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    currentUser = null;
    authToken = null;
    window.location.href = '/';
}
