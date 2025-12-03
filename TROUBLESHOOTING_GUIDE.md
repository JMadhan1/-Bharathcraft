# 🔧 Quick Fix Guide - Artisan Dashboard Issues

## Issues Fixed

### ✅ 1. Notification Container Added
- **Simple Mode:** Added notification container at top-right
- **Advanced Mode:** Already has notification container
- **Location:** Fixed position, top-right corner, z-index 10000

### ✅ 2. Socket.IO Integration
- **Simple Mode:** Now loads Socket.IO library
- **Advanced Mode:** Already has Socket.IO
- **Script:** `https://cdnjs.cloudflare.com/ajax/libs/socket.io/4.0.1/socket.io.js`

### ✅ 3. Correct JavaScript File
- **Simple Mode:** Now uses `artisan-simple.js` (with notifications)
- **Previous:** Was using `artisan-simple-multilingual.js` (no notifications)

---

## 🧪 How to Test Notifications

### Test 1: Check if Notifications Work

1. **Restart the Flask server:**
   ```bash
   # Stop current server (Ctrl+C)
   python app.py
   ```

2. **Open TWO browser windows:**
   - Window 1: Login as **Buyer**
   - Window 2: Login as **Artisan** (Simple or Advanced mode)

3. **As Buyer:** Place an order on any product

4. **As Artisan:** You should see:
   - **Advanced Mode:** 
     - Purple gradient notification toast (top-right)
     - Shows: "New Order! [Buyer] ordered [Product]"
     - Order list auto-refreshes
   
   - **Simple Mode:**
     - Purple gradient notification (top-right)
     - **Voice announcement in Hindi:** "नया ऑर्डर आया है!..."
     - Order count badge updates

### Test 2: Check Order Count in Simple Mode

1. **Login as Artisan** → Simple Mode
2. **Look at the "Orders" card** (shopping cart icon)
3. **Badge should show:** Number of pending orders
4. **Click the card:** Should prompt to switch to Advanced Mode

### Test 3: Check Browser Console

1. **Open Developer Tools** (F12)
2. **Go to Console tab**
3. **Look for:**
   ```
   Connected to notification service
   Socket.IO connection established
   ```

4. **When order is placed, you should see:**
   ```
   New order received: {buyer_name: "...", product_title: "...", ...}
   ```

---

## 🐛 Troubleshooting

### Problem: No Notifications Appearing

**Check 1: Socket.IO Connection**
```javascript
// Open browser console (F12) and type:
io
// Should show Socket.IO object, not "undefined"
```

**Check 2: Notification Container Exists**
```javascript
// In browser console:
document.getElementById('notification-container')
// Should show: <div id="notification-container"...>
// NOT: null
```

**Check 3: Server Logs**
- Look at your terminal where `python app.py` is running
- When order is placed, should see: "Socket.IO notification error: ..." or success

**Fix:** Hard refresh browser (Ctrl+F5) to clear cache

### Problem: Order Count Shows 0

**Possible Causes:**
1. No orders exist in database
2. API endpoint not returning orders
3. JavaScript error

**Debug Steps:**
```javascript
// In browser console:
fetch('/api/orders/', {
    headers: {
        'Authorization': 'Bearer ' + localStorage.getItem('authToken')
    }
})
.then(r => r.json())
.then(data => console.log('Orders:', data))
```

Should show array of orders. If empty `[]`, no orders exist.

### Problem: Voice Not Working (Simple Mode)

**Check Browser Support:**
```javascript
// In browser console:
'speechSynthesis' in window
// Should return: true
```

**Best Browsers for Hindi Voice:**
- ✅ Google Chrome
- ✅ Microsoft Edge
- ⚠️ Firefox (limited Hindi support)
- ⚠️ Safari (limited Hindi support)

**Test Voice Manually:**
```javascript
// In browser console:
const utterance = new SpeechSynthesisUtterance('नमस्ते');
utterance.lang = 'hi-IN';
window.speechSynthesis.speak(utterance);
```

Should hear "Namaste" in Hindi.

---

## 📋 Quick Checklist

Before testing, verify:

- [ ] Flask server is running (`python app.py`)
- [ ] No errors in terminal
- [ ] Browser is Chrome or Edge (for best voice support)
- [ ] Hard refresh done (Ctrl+F5)
- [ ] Two browser windows/tabs open (buyer + artisan)
- [ ] Both users logged in successfully
- [ ] Developer console open (F12) to see logs

---

## 🎯 Expected Behavior

### When Buyer Places Order:

**Backend:**
1. Order saved to database
2. Socket.IO event emitted to artisan's room
3. Terminal shows: No errors

**Artisan Dashboard (Advanced):**
1. Toast notification appears (top-right)
2. Shows buyer name, product, amount
3. Order list refreshes automatically
4. Click notification → scrolls to orders

**Artisan Dashboard (Simple):**
1. Visual notification appears (top-right)
2. Voice says: "नया ऑर्डर आया है! [details]"
3. Order count badge updates
4. Stats refresh automatically

---

## 🔍 Debugging Commands

### Check if Socket.IO is loaded:
```javascript
typeof io
// Should return: "function"
```

### Check if artisan is connected:
```javascript
// After page loads, in console:
// Look for: "Connected to notification service"
```

### Manually trigger notification (for testing):
```javascript
// In artisan dashboard console:
const testData = {
    buyer_name: 'Test Buyer',
    product_title: 'Test Product',
    amount: '100.00',
    currency: 'INR'
};

// For advanced mode:
showOrderNotification(testData);

// For simple mode:
handleNewOrderNotification(testData);
```

---

## 📞 Still Not Working?

### Collect This Information:

1. **Browser Console Errors:**
   - Open F12 → Console tab
   - Copy any red error messages

2. **Network Tab:**
   - Open F12 → Network tab
   - Filter: WS (WebSocket)
   - Check if Socket.IO connection exists

3. **Server Terminal:**
   - Copy any error messages from `python app.py`

4. **Test API Directly:**
   ```bash
   # Get orders (replace TOKEN with your auth token)
   curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/orders/
   ```

---

## ✅ Success Indicators

You'll know it's working when:

1. ✅ No JavaScript errors in console
2. ✅ "Connected to notification service" appears in console
3. ✅ Order count shows correct number
4. ✅ Notification appears when order is placed
5. ✅ Voice speaks in simple mode (if browser supports)
6. ✅ Order list shows pending orders

---

## 🚀 Next Steps After Testing

Once notifications work:

1. **Test with real orders** - Place actual orders as buyer
2. **Test voice in different languages** - Change language in simple mode
3. **Test messages** - Send messages between buyer and artisan
4. **Test on mobile** - Simple mode is designed for mobile devices

---

**Last Updated:** 2025-12-03
**Files Modified:**
- `templates/artisan/dashboard-simple.html`
- `static/js/artisan-simple.js`
- `static/js/artisan.js`
- `routes/checkout.py`
- `routes/messages.py`
