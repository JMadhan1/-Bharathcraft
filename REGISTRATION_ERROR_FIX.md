# 🔧 Registration Error Fix

## **Problem:**
```
Registration error: Unexpected token '<', "<!doctype "... is not valid JSON
```

## **Root Cause:**
1. The registration form is submitting as **HTML form data**
2. The backend `/register` endpoint expects **JSON**
3. The form has `phone` field but backend requires `email` field

## **Quick Fix:**

The voice assistant needs to submit data as JSON to the `/auth/register` endpoint.

### **Update needed in auth-modals.html:**

The registration form should have:
```html
<form id="registerForm" onsubmit="handleRegistration(event)">
    <input type="text" name="full_name" required>
    <input type="tel" name="phone" required>
    <input type="email" name="email" required>  <!-- ADD THIS -->
    <input type="password" name="password" required>
    <input type="hidden" name="role" id="registerRole">
    <select name="language"></select>
</form>

<script>
function handleRegistration(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const data = {
        full_name: formData.get('full_name'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        password: formData.get('password'),
        role: formData.get('role'),
        language: formData.get('language') || 'en'
    };
    
    fetch('/auth/register', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
    })
    .then(response => response.json())
    .then(data => {
        if (data.access_token) {
            localStorage.setItem('token', data.access_token);
            // Redirect based on role
            if (data.user.role === 'artisan') {
                window.location.href = '/artisan/dashboard';
            } else {
                window.location.href = '/buyer/dashboard';
            }
        } else {
            alert('Registration error: ' + (data.error || 'Unknown error'));
        }
    })
    .catch(error => {
        console.error('Registration error:', error);
        alert('Registration failed. Please try again.');
    });
}
</script>
```

## **Alternative: Phone-Only Registration**

If you want to allow registration with just phone number (no email), update the backend:

### **In `routes/auth.py`:**

```python
@bp.route('/register', methods=['POST'])
def register():
    data = request.json
    
    # Allow either email OR phone
    if not all(k in data for k in ['password', 'role', 'full_name']):
        return jsonify({'error': 'Missing required fields'}), 400
    
    if not data.get('email') and not data.get('phone'):
        return jsonify({'error': 'Either email or phone is required'}), 400
    
    # Use phone as email if email not provided
    email = data.get('email') or f"{data['phone']}@bharatcraft.local"
    
    existing_user = g.db.query(User).filter_by(email=email).first()
    if existing_user:
        return jsonify({'error': 'Already registered'}), 400
    
    password_hash = bcrypt.hashpw(data['password'].encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
    
    user = User(
        email=email,
        password_hash=password_hash,
        role=UserRole.ARTISAN if data['role'] == 'artisan' else UserRole.BUYER,
        full_name=data['full_name'],
        phone=data.get('phone'),
        language_preference=data.get('language', 'en')
    )
    
    # ... rest of the code
```

## **Recommended Solution:**

For **illiterate artisans**, use **phone-only registration**:
1. Update backend to accept phone instead of email
2. Generate email as `{phone}@bharatcraft.local`
3. Voice assistant only asks for: name, phone, password, role
4. No email needed!

This makes it much simpler for artisans who may not have email addresses.

---

**Choose one approach and I'll implement it!**
