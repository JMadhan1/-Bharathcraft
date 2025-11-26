let currentUser = null;
let authToken = null;

document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    loadTranslations();
    initializeMap();
    
    const langSelector = document.getElementById('languageSelector');
    if (langSelector) {
        langSelector.addEventListener('change', function(e) {
            loadTranslations(e.target.value);
        });
    }
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
            window.location.href = '/artisan';
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
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                const keys = key.split('.');
                let value = translations;
                for (let k of keys) {
                    value = value[k];
                }
                if (value) el.textContent = value;
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
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <h2>Login</h2>
        <form onsubmit="handleLogin(event)">
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="loginEmail" required>
            </div>
            <div class="form-group">
                <label>Password</label>
                <input type="password" id="loginPassword" required>
            </div>
            <button type="submit" class="btn btn-primary">Login</button>
        </form>
    `;
    document.getElementById('authModal').classList.add('active');
}

function showRegister() {
    const modalBody = document.getElementById('modalBody');
    modalBody.innerHTML = `
        <h2>Register</h2>
        <form onsubmit="handleRegister(event)">
            <div class="form-group">
                <label>I am a:</label>
                <select id="role" required>
                    <option value="">Select...</option>
                    <option value="artisan">Artisan</option>
                    <option value="buyer">Buyer</option>
                </select>
            </div>
            <div class="form-group">
                <label>Full Name</label>
                <input type="text" id="fullName" required>
            </div>
            <div class="form-group">
                <label>Email</label>
                <input type="email" id="email" required>
            </div>
            <div class="form-group">
                <label>Password</label>
                <input type="password" id="password" required>
            </div>
            <div class="form-group">
                <label>Phone</label>
                <input type="tel" id="phone">
            </div>
            <button type="submit" class="btn btn-primary">Register</button>
        </form>
    `;
    document.getElementById('authModal').classList.add('active');
}

function registerAs(role) {
    showRegister();
    setTimeout(() => {
        document.getElementById('role').value = role;
    }, 100);
}

function closeModal() {
    document.getElementById('authModal').classList.remove('active');
}

async function handleLogin(event) {
    event.preventDefault();
    
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    
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
            redirectToDashboard();
        } else {
            alert(data.error || 'Login failed');
        }
    } catch (error) {
        alert('Login error: ' + error.message);
    }
}

async function handleRegister(event) {
    event.preventDefault();
    
    const formData = {
        role: document.getElementById('role').value,
        full_name: document.getElementById('fullName').value,
        email: document.getElementById('email').value,
        password: document.getElementById('password').value,
        phone: document.getElementById('phone').value
    };
    
    try {
        const response = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('authToken', data.access_token);
            localStorage.setItem('userData', JSON.stringify(data.user));
            currentUser = data.user;
            authToken = data.access_token;
            redirectToDashboard();
        } else {
            alert(data.error || 'Registration failed');
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
