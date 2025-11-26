# Debug Instructions for Product Upload Error

## Step 1: Check Browser Console

1. Open your browser's Developer Tools:
   - Press **F12** or **Ctrl + Shift + I**
   - Click on the **Console** tab

2. Try uploading a product again

3. Look for error messages in red - they will show the detailed error

## Step 2: Check Network Tab

1. In Developer Tools, click on the **Network** tab
2. Try uploading a product
3. Look for the request to `/api/products/`
4. Click on it and check:
   - **Headers** tab - see the request details
   - **Response** tab - see the error message from server
   - **Preview** tab - see formatted error response

## Step 3: Check Your Profile

Open this URL in your browser while logged in:
```
http://127.0.0.1:5000/api/auth/profile
```

This will show your user profile data. Check if:
- You have an `artisan` object
- The `craft_type` field has a value

## Step 4: Common Issues

### Issue 1: Artisan Profile Not Found
**Symptom:** Error says "Artisan profile not found"
**Solution:** You need to register again as an artisan, or update your profile

### Issue 2: Missing craft_type
**Symptom:** Error about craft_type or empty craft_type
**Solution:** The product form has a craft_type dropdown - make sure it's selected

### Issue 3: Image Upload Fails
**Symptom:** Error says "At least one valid image is required"
**Solution:** 
- Make sure you selected an image file
- File must be PNG, JPG, JPEG, GIF, or WEBP
- File size should be reasonable (< 10MB)

### Issue 4: CORS or Network Error
**Symptom:** Network error in console
**Solution:** Make sure the Flask server is running on http://127.0.0.1:5000

## Step 5: Manual Test

Try this in the browser console while on the artisan dashboard:

```javascript
// Check if you're logged in
console.log('Auth Token:', localStorage.getItem('authToken'));
console.log('User Data:', JSON.parse(localStorage.getItem('userData')));

// Test API access
fetch('/api/auth/profile', {
    headers: {
        'Authorization': `Bearer ${localStorage.getItem('authToken')}`
    }
})
.then(r => r.json())
.then(data => console.log('Profile:', data))
.catch(err => console.error('Profile Error:', err));
```

## Step 6: Check Server Logs

Look at the terminal where `python app.py` is running. Any errors will be printed there with full stack traces.

## Step 7: If Still Not Working

Please provide:
1. The exact error message from the browser console
2. The response from `/api/auth/profile`
3. Any error messages from the terminal
4. Screenshot of the Network tab showing the failed request

This will help identify the exact issue!
