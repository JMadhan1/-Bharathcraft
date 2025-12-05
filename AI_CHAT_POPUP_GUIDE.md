# 💬 AI Assistant Popup Widget - Setup Guide

## ✅ **What I Created**

A **floating chat widget** that appears as a popup instead of at the bottom of the page!

---

## 🎯 **Features**

✅ **Floating button** - Fixed at bottom-right corner
✅ **Popup chat window** - Opens when clicked
✅ **Quick action buttons** - "How to price?", "How to take photos?", etc.
✅ **Chat interface** - Send messages and get AI responses
✅ **Typing indicator** - Shows when AI is thinking
✅ **Mobile responsive** - Works on all devices
✅ **Beautiful animations** - Smooth slide-up effect

---

## 📦 **How to Add to Your Page**

### **Step 1: Include in Your Dashboard**

In `templates/artisan/dashboard.html`, add before closing `</body>`:

```html
{% include 'includes/ai-chat-widget.html' %}
```

### **Step 2: That's It!**

The widget will appear as a floating button at the bottom-right corner!

---

## 🎨 **What It Looks Like**

### **Closed State:**
- Purple circular button with robot icon
- Fixed at bottom-right corner
- Hover effect: grows slightly

### **Open State:**
- Chat popup (380px × 550px)
- Header with "AI Assistant" title
- Quick action buttons
- Chat messages area
- Input field at bottom

---

## 💡 **How It Works**

### **1. Click Floating Button**
```
User clicks robot icon
→ Popup slides up from bottom
→ Chat window appears
```

### **2. Quick Actions**
```
User clicks "How to price?"
→ Question auto-fills in input
→ Sends to AI
→ Gets response
```

### **3. Type Question**
```
User types: "How do I ship my products?"
→ Presses Enter or Send button
→ Message appears in chat
→ Typing indicator shows
→ AI response appears
```

### **4. Close Chat**
```
User clicks X button
→ Popup slides down
→ Returns to floating button
```

---

## 🔧 **Customization**

### **Change Position:**

```css
/* Move to bottom-left */
.ai-chat-button {
    left: 20px;  /* Instead of right: 20px */
}

.ai-chat-popup {
    left: 20px;  /* Instead of right: 20px */
}
```

### **Change Colors:**

```css
/* Change to green theme */
.ai-chat-button {
    background: linear-gradient(135deg, #10B981 0%, #059669 100%);
}

.ai-chat-header {
    background: linear-gradient(135deg, #10B981 0%, #059669 100%);
}
```

### **Change Size:**

```css
/* Larger popup */
.ai-chat-popup {
    width: 450px;
    height: 650px;
}
```

### **Add More Quick Actions:**

```html
<button class="quick-action-btn" onclick="askAI('How to ship?')">
    <i class="fas fa-shipping-fast"></i> How to ship?
</button>
```

---

## 🌐 **Multi-Language Support**

### **Add Telugu Quick Actions:**

```html
<button class="quick-action-btn" onclick="askAI('ధర ఎలా నిర్ణయించాలి?')">
    <i class="fas fa-tag"></i> ధర ఎలా నిర్ణయించాలి?
</button>
```

### **Change Welcome Message:**

```html
<p class="message-text">నమస్కారం! నేను మీకు ఎలా సహాయం చేయగలను?</p>
```

---

## 📱 **Mobile Responsive**

On mobile devices:
- Popup expands to full width (minus 20px margins)
- Height adjusts to fit screen
- Touch-friendly buttons
- Smooth scrolling

---

## 🎭 **Animations**

✅ **Slide Up** - Popup slides up when opened
✅ **Fade In** - Messages fade in smoothly
✅ **Typing Dots** - Animated dots while AI thinks
✅ **Hover Effects** - Buttons grow on hover
✅ **Pulse Effect** - Floating button pulses (optional)

---

## 🔌 **Backend Integration**

The widget sends messages to `/api/ai-assistant`:

```python
@app.route('/api/ai-assistant', methods=['POST'])
def ai_assistant():
    data = request.json
    question = data.get('question')
    
    # Your AI logic here
    answer = get_ai_response(question)
    
    return jsonify({'answer': answer})
```

---

## ✨ **Example Usage**

### **Scenario 1: Artisan Asks About Pricing**

```
1. Artisan clicks robot button
2. Popup opens
3. Clicks "How to price?" quick action
4. AI responds: "To price your products, consider..."
5. Artisan reads response
6. Asks follow-up question
7. Gets more help
```

### **Scenario 2: Artisan Needs Photo Help**

```
1. Opens chat
2. Types: "My photos are dark"
3. AI responds: "Try these tips for better photos..."
4. Shows step-by-step guide
```

---

## 🎉 **Benefits**

✅ **Always accessible** - Floating button always visible
✅ **Non-intrusive** - Doesn't block content
✅ **Easy to use** - Click to open, click to close
✅ **Quick help** - Instant answers to common questions
✅ **Professional look** - Modern chat interface
✅ **Mobile friendly** - Works on all devices

---

## 🚀 **Quick Test**

1. Add `{% include 'includes/ai-chat-widget.html' %}` to your page
2. Refresh browser
3. See floating robot button at bottom-right
4. Click it
5. **Popup appears!** 🎊

---

**No more AI assistant at the bottom of the page - now it's a beautiful floating popup!** 💬✨
