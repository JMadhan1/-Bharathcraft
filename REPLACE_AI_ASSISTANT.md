# 🔧 How to Replace Old AI Assistant with New Popup

## **Problem:**
You're still seeing the old AI Assistant at the bottom of the page instead of the new floating popup.

## **Solution:**

### **Step 1: Find the Old AI Assistant**

Open `templates/artisan/dashboard-simple.html` and search for:
- "AI Assistant"
- "Ask Anything"
- Any section that shows the AI chat at the bottom

### **Step 2: Remove the Old AI Assistant**

Delete or comment out the entire old AI assistant section. It might look like:

```html
<!-- OLD - REMOVE THIS -->
<div class="ai-assistant-section">
    <h2>AI Assistant - Ask Anything!</h2>
    <p>Hello! How can I help you today?</p>
    ...
</div>
```

### **Step 3: Add the New Popup Widget**

Add this line **before the closing `</body>` tag**:

```html
{% include 'includes/ai-chat-widget.html' %}
</body>
```

### **Step 4: Save and Refresh**

1. Save the file
2. Hard refresh browser (Ctrl + Shift + R)
3. You should see a **floating purple robot button** at bottom-right
4. Click it to open the popup!

---

## **Quick Fix (If You Can't Find Old AI Assistant)**

Just add the new widget to the end of the file:

```html
<!-- At the very end, before </body> -->
{% include 'includes/ai-chat-widget.html' %}

<!-- Optional: Hide old AI assistant with CSS -->
<style>
    /* Hide any old AI assistant sections */
    .ai-assistant-section,
    #ai-assistant,
    [class*="ai-chat"]:not(.ai-chat-popup):not(.ai-chat-button) {
        display: none !important;
    }
</style>

</body>
</html>
```

This will:
1. Add the new floating popup
2. Hide any old AI assistant sections with CSS

---

## **What You Should See:**

### **Before:**
- AI Assistant at bottom of page ❌
- Takes up space ❌
- Always visible ❌

### **After:**
- Floating purple robot button at bottom-right ✅
- Popup opens when clicked ✅
- Doesn't block content ✅

---

## **Test It:**

1. Look for purple robot button at bottom-right corner
2. Click it
3. Popup should slide up
4. Chat interface appears
5. Click X to close

---

**If you still see the old AI assistant after adding the new widget, use the CSS hide method above!**
