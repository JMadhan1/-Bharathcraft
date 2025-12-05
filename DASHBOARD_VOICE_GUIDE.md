# 🔊 Dashboard Voice-Over Guide

## **What It Does**

Speaks the text of buttons, cards, and links when artisans hover over or click them!

---

## **How It Works**

### **Example:**

```
Artisan hovers over "నా ఉత్పత్తులు" (My Products) card
→ Voice says: "నా ఉత్పత్తులు" in Telugu

Artisan hovers over "Orders" button
→ Voice says: "Orders" in their selected language

Artisan clicks "Messages" card
→ Voice says: "Messages"
```

---

## **Setup**

### **Step 1: Add Script to Dashboard**

In `templates/artisan/dashboard.html`, add before closing `</body>`:

```html
<script src="/static/js/dashboard-voice.js"></script>
```

### **Step 2: That's It!**

Voice-over will automatically work for:
- ✅ All buttons
- ✅ All cards (dashboard-card, feature-card, stat-card)
- ✅ All links
- ✅ Navigation items

---

## **Features**

### **1. Auto-Detects Language**
- Reads from `localStorage.getItem('language')`
- Defaults to Telugu (`te`)
- Supports: Telugu, Hindi, Tamil, Kannada, Malayalam, English

### **2. Hover to Hear**
```javascript
// When mouse enters a card
card.addEventListener('mouseenter', () => {
    speak("నా ఉత్పత్తులు");  // Speaks in Telugu
});
```

### **3. Click to Hear**
```javascript
// When card is clicked
card.addEventListener('click', () => {
    speak("Orders");  // Speaks in selected language
});
```

---

## **Controls**

### **Toggle Voice On/Off**

In browser console or add a button:
```javascript
toggleVoice();  // Turns voice on/off
```

### **Change Language**

```javascript
setVoiceLanguage('te');  // Telugu
setVoiceLanguage('hi');  // Hindi
setVoiceLanguage('ta');  // Tamil
setVoiceLanguage('en');  // English
```

---

## **Add Toggle Button (Optional)**

Add this to your dashboard header:

```html
<button onclick="toggleVoice()" class="voice-toggle-btn">
    <i class="fas fa-volume-up"></i>
    <span>Voice On/Off</span>
</button>
```

---

## **Supported Languages**

| Code | Language | Voice |
|------|----------|-------|
| `te` | Telugu | te-IN |
| `hi` | Hindi | hi-IN |
| `ta` | Tamil | ta-IN |
| `kn` | Kannada | kn-IN |
| `ml` | Malayalam | ml-IN |
| `en` | English | en-IN |

---

## **Example Usage**

### **For Your Dashboard:**

```html
<!-- My Products Card -->
<div class="dashboard-card">
    <h3>నా ఉత్పత్తులు</h3>
    <p>My Products</p>
    <p>మీ ఉత్పత్తులను చూడండి</p>
</div>
<!-- When hovered: Speaks "నా ఉత్పత్తులు" in Telugu -->

<!-- Orders Card -->
<div class="dashboard-card">
    <h3>ఆర్డర్లు</h3>
    <p>Orders</p>
    <p>కొత్త ఆర్డర్లను చూడండి</p>
</div>
<!-- When hovered: Speaks "ఆర్డర్లు" in Telugu -->

<!-- Messages Card -->
<div class="dashboard-card">
    <h3>సందేశాలు</h3>
    <p>Messages</p>
    <p>కొనుగోలుదారులతో మాట్లాడండి</p>
</div>
<!-- When hovered: Speaks "సందేశాలు" in Telugu -->
```

---

## **Customization**

### **Speak Full Description Instead of Just Title:**

```javascript
card.addEventListener('mouseenter', () => {
    const title = card.querySelector('h3').textContent;
    const desc = card.querySelector('p').textContent;
    this.speak(title + ". " + desc);  // Speaks both
});
```

### **Only Speak on Click (Not Hover):**

```javascript
// Remove mouseenter listeners
// Keep only click listeners
```

### **Adjust Speech Rate:**

```javascript
utterance.rate = 0.8;  // Slower
utterance.rate = 1.0;  // Normal
utterance.rate = 1.2;  // Faster
```

---

## **Browser Support**

| Browser | Text-to-Speech |
|---------|----------------|
| Chrome | ✅ Full support |
| Edge | ✅ Full support |
| Safari | ✅ Full support |
| Firefox | ✅ Full support |

---

## **Benefits for Illiterate Artisans**

✅ **No reading required** - Just hover to hear
✅ **Works in native language** - Telugu, Hindi, etc.
✅ **Instant feedback** - Know what button does before clicking
✅ **Easy navigation** - Hear all options
✅ **Confidence building** - Understand the interface

---

## **Quick Test**

1. Add script to dashboard
2. Refresh page
3. Hover over any card/button
4. **Hear it speak!** 🔊

---

**Perfect for illiterate artisans who can't read but can understand spoken language!** 🌟
