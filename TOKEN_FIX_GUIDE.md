# JWT Token Error Fix Guide

## Error: "Invalid token: Subject must be a string"

This error occurs when the JWT token's subject (user ID) is not properly formatted as a string.

## Root Cause

The error typically happens when:
1. Using an old token created before recent fixes
2. Token was created with a non-string identity
3. Token is malformed or corrupted
4. Browser/app cache has invalid tokens

## Solution: Get a Fresh Token

### Option 1: Re-login via API

```bash
# Login to get a new token
curl -X POST http://127.0.0.1:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "your-email@example.com",
    "password": "your-password"
  }'
```

Save the `access_token` from the response.

### Option 2: Re-login via Web Interface

1. Open your browser
2. Go to the application
3. Log out completely
4. Clear browser cache/localStorage
5. Log in again
6. Try uploading the product again

### Option 3: Clear Stored Tokens

If using a mobile app or custom client:
1. Clear all stored tokens
2. Clear local storage / session storage
3. Re-authenticate to get a new token

## Using the Token Correctly

### In API Requests

Always include the token in the Authorization header:

```bash
curl -X POST http://127.0.0.1:5000/api/products/ \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -H "Content-Type: multipart/form-data" \
  -F "title=My Product" \
  -F "description=Product description" \
  -F "price=100" \
  -F "images=@/path/to/image.jpg"
```

### In JavaScript/Fetch

```javascript
const token = localStorage.getItem('access_token');

fetch('http://127.0.0.1:5000/api/products/', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`
  },
  body: formData
})
```

### In Axios

```javascript
axios.post('http://127.0.0.1:5000/api/products/', formData, {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'multipart/form-data'
  }
})
```

## Fixes Applied

The following fixes have been applied to prevent this issue:

### 1. JWT Configuration Enhanced
- Added explicit JWT configuration in `app.py`
- Set proper identity claim handling
- Configured token location and headers

### 2. Token Creation Helper
- Added `create_user_token()` helper function in `routes/auth.py`
- Ensures identity is always converted to string
- Validates user object before token creation

### 3. Better Error Messages
- Enhanced JWT error handlers
- Added detailed error messages
- Included debugging information

### 4. Additional Validation
- Check user.id exists before token creation
- Validate user is active
- Proper error handling for edge cases

## Testing Your Token

Run the test script to verify token creation works:

```bash
python test_token.py
```

Expected output:
```
[SUCCESS] Token created successfully
Decoded identity: 123
Decoded role: artisan
```

## Preventing Future Issues

### For Developers

1. **Always use string identities:**
   ```python
   # CORRECT
   token = create_access_token(identity=str(user.id))
   
   # INCORRECT
   token = create_access_token(identity=user.id)
   ```

2. **Use the helper function:**
   ```python
   from routes.auth import create_user_token
   token = create_user_token(user)
   ```

3. **Validate before token creation:**
   ```python
   if not user or not user.id:
       return jsonify({'error': 'Invalid user'}), 400
   ```

### For Users

1. **Clear old tokens after updates**
2. **Re-login if seeing token errors**
3. **Check token hasn't expired**
4. **Ensure Authorization header is properly formatted**

## Common Mistakes

### ❌ Wrong: Missing "Bearer" prefix
```javascript
headers: {
  'Authorization': token  // WRONG
}
```

### ✅ Correct: Include "Bearer"
```javascript
headers: {
  'Authorization': `Bearer ${token}`  // CORRECT
}
```

### ❌ Wrong: Token in wrong location
```javascript
headers: {
  'Token': token  // WRONG
}
```

### ✅ Correct: Use Authorization header
```javascript
headers: {
  'Authorization': `Bearer ${token}`  // CORRECT
}
```

## Troubleshooting Checklist

If you're still seeing the error:

- [ ] Have you logged out and logged in again?
- [ ] Have you cleared browser cache/localStorage?
- [ ] Is the Authorization header properly formatted?
- [ ] Is the token expired? (Tokens expire after a certain time)
- [ ] Are you using the complete token (not truncated)?
- [ ] Is the backend application restarted after code changes?
- [ ] Are you sending the token in the correct header?

## Quick Fix Commands

```bash
# 1. Stop the application (if running)
# Press Ctrl+C

# 2. Clear the database (CAUTION: This deletes all data!)
rm bharatcraft.db

# 3. Restart the application
python app.py

# 4. Register a new account or login
# 5. Use the new token for all requests
```

## Support

If the issue persists after following this guide:

1. Check the application logs for detailed error messages
2. Run the validation script: `python validate_imports.py`
3. Run the token test: `python test_token.py`
4. Verify all dependencies are installed: `pip install -r requirements.txt`

## Technical Details

### JWT Token Structure

A JWT token has three parts separated by dots:
```
header.payload.signature
```

Example:
```
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJmcmVzaCI6ZmFsc2UsImlhdCI6MTYzNzc2NzIwMCwianRpIjoiZGY4ZjcyOGItOTM4Zi00YzI4LTgyMjYtYjBjNTY0NWU4NjZlIiwidHlwZSI6ImFjY2VzcyIsInN1YiI6IjEiLCJuYmYiOjE2Mzc3NjcyMDAsImV4cCI6MTYzNzc3MDgwMCwicm9sZSI6ImFydGlzYW4ifQ.signature_here
```

The payload contains:
- `sub`: Subject (user ID) - **must be a string**
- `role`: User role from additional_claims
- `exp`: Expiration time
- `iat`: Issued at time

### Why String Identity?

JWT specification requires the `sub` (subject) claim to be a string. While some JWT libraries accept other types, they convert them to strings. Using non-string values can cause:
- Validation errors
- Type conversion issues
- Interoperability problems

---

**Updated:** November 26, 2025  
**Status:** ✅ Fixed

