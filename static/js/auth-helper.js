/**
 * Authentication Helper
 * Handles token expiration and automatic refresh/redirect
 * 
 * Usage: Replace fetch() with authenticatedFetch()
 * Example: authenticatedFetch('/api/endpoint', { method: 'GET' })
 */

// Ensure this runs immediately
(function() {
    'use strict';

    // Original fetch function
    const originalFetch = window.fetch;

    // Wrapper function that handles token expiration
    window.authenticatedFetch = async function(url, options = {}) {
        const authToken = localStorage.getItem('authToken');
        
        // Initialize headers if not present
        if (!options.headers) {
            options.headers = {};
        }
        
        // Add auth token to headers if available
        if (authToken && !options.headers['Authorization']) {
            options.headers['Authorization'] = `Bearer ${authToken}`;
        }
        
        // Ensure Content-Type is set for JSON requests
        if (options.body && typeof options.body === 'string' && !options.headers['Content-Type']) {
            options.headers['Content-Type'] = 'application/json';
        }

        try {
            const response = await originalFetch(url, options);
            
            // Check for token expiration
            if (response.status === 401) {
                const errorData = await response.json().catch(() => ({}));
                
                if (errorData.error === 'Token has expired' || 
                    errorData.message === 'Please log in again' ||
                    response.status === 401) {
                    
                    // Clear expired token
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('userData');
                    
                    // Show user-friendly message
                    if (confirm('Your session has expired. Please log in again to continue.')) {
                        // Redirect to login
                        if (window.location.pathname !== '/') {
                            window.location.href = '/?expired=1';
                        } else {
                            // If already on homepage, just show login modal
                            if (typeof showLogin === 'function') {
                                showLogin();
                            }
                        }
                    } else {
                        window.location.href = '/?expired=1';
                    }
                    
                    // Return a rejected promise to stop further execution
                    return Promise.reject(new Error('Token expired'));
                }
            }
            
            // Check for invalid token
            if (response.status === 422) {
                const errorData = await response.json().catch(() => ({}));
                
                if (errorData.error && errorData.error.includes('Invalid token')) {
                    // Clear invalid token
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('userData');
                    
                    alert('Your session is invalid. Please log in again.');
                    window.location.href = '/?expired=1';
                    return Promise.reject(new Error('Invalid token'));
                }
            }
            
            return response;
            
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    };

    // Helper to check if token is expired (without making a request)
    window.checkTokenValidity = async function() {
        const authToken = localStorage.getItem('authToken');
        if (!authToken) {
            return false;
        }

        try {
            // Try a lightweight endpoint to check token
            const response = await authenticatedFetch('/api/auth/profile', {
                method: 'GET'
            });
            
            return response.ok;
        } catch (error) {
            return false;
        }
    };

    // Auto-check token validity on page load
    if (localStorage.getItem('authToken')) {
        // Check token validity after a short delay
        setTimeout(() => {
            checkTokenValidity().then(isValid => {
                if (!isValid) {
                    console.log('Token expired, clearing...');
                    localStorage.removeItem('authToken');
                    localStorage.removeItem('userData');
                }
            });
        }, 1000);
    }

    // Listen for storage changes (in case token is cleared in another tab)
    window.addEventListener('storage', function(e) {
        if (e.key === 'authToken' && !e.newValue) {
            // Token was cleared in another tab
            if (window.location.pathname !== '/') {
                window.location.href = '/?expired=1';
            }
        }
    });
})();

