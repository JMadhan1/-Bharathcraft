# 🧪 Testing Guide - 3 Killer Features

Complete end-to-end testing guide for all implemented features!

---

## ✅ **Prerequisites**

1. **Flask is running:** `python app.py`
2. **Gemini API Key set:** Check `.env` file has `GEMINI_API_KEY=your_key`
3. **Database initialized:** `bharatcraft.db` exists
4. **Browser:** Open `http://localhost:5000`

---

## 🎯 **FEATURE #1: Cultural Context AI Negotiation**

### **Test Scenario: Buyer → Artisan Price Negotiation**

#### **Step 1: Create Test Users**

**Register Artisan:**
```bash
POST http://localhost:5000/api/auth/register
{
  "email": "artisan@test.com",
  "password": "test123",
  "full_name": "Rajesh Kumar",
  "role": "artisan",
  "phone": "9876543210",
  "craft_specialization": "pottery",
  "village": "Jaipur",
  "district": "Jaipur",
  "state": "Rajasthan"
}
```

**Register Buyer:**
```bash
POST http://localhost:5000/api/auth/register
{
  "email": "buyer@test.com",
  "password": "test123",
  "full_name": "John Smith",
  "role": "buyer",
  "country": "US",
  "company_name": "Global Imports Inc"
}
```

#### **Step 2: Create a Product**

Login as artisan, then:
```bash
POST http://localhost:5000/api/products/
Headers: Authorization: Bearer <artisan_token>
{
  "title": "Handmade Blue Pottery Vase",
  "description": "Traditional Jaipur blue pottery",
  "price": 500,
  "stock": 10,
  "craft_type": "pottery"
}
```

#### **Step 3: Test AI Negotiation**

**Buyer sends message (English):**
```bash
POST http://localhost:5000/api/negotiation/send-message
Headers: Authorization: Bearer <buyer_token>
{
  "recipient_id": <artisan_id>,
  "message": "Can you improve the price for 50 pieces?",
  "product_id": <product_id>,
  "sender_language": "en",
  "recipient_language": "hi"
}
```

**Expected Response:**
```json
{
  "success": true,
  "ai_analysis": {
    "intent": "bulk_order_negotiation",
    "translated_message": "क्या आप 50 pieces के लिए कीमत कम कर सकते हैं?",
    "context_explanation": "यह buyer bulk order चाहते हैं। आप 10-15% छूट दे सकते हैं।",
    "suggested_responses": [
      "हाँ! 50 pieces पर मैं 12% छूट दे सकता हूं - ₹440 per piece",
      "मैं 10% छूट दे सकता हूं (₹450) अगर payment advance में हो",
      "क्षमा करें, मैं केवल 5% कम कर सकता हूं"
    ],
    "cultural_notes": "...",
    "negotiation_insight": "Bulk orders typically get 10-15% discount..."
  }
}
```

#### **Step 4: Get Conversation**

**Artisan views conversation:**
```bash
GET http://localhost:5000/api/negotiation/get-conversation/<buyer_id>
Headers: Authorization: Bearer <artisan_token>
```

**Expected:**
- Original English message
- Hindi translation
- Cultural context explanation
- Smart reply suggestions
- Negotiation tips

#### **✅ SUCCESS CRITERIA:**
- ✅ Message translated correctly
- ✅ Context explanation in target language
- ✅ 3 smart reply suggestions provided
- ✅ Negotiation intent detected
- ✅ Cultural notes included

---

## 🎯 **FEATURE #2: Export Documentation Generator**

### **Test Scenario: Generate Export Documents for Order**

#### **Step 1: Create an Order**

```bash
POST http://localhost:5000/api/orders/
Headers: Authorization: Bearer <buyer_token>
{
  "product_id": <product_id>,
  "quantity": 20,
  "shipping_address": "123 Main Street, New York, NY 10001, USA"
}
```

#### **Step 2: Generate All Export Documents**

```bash
POST http://localhost:5000/api/export-docs/generate/<order_id>
Headers: Authorization: Bearer <artisan_token>
{
  "documents": ["invoice", "packing_list", "certificate_of_origin"],
  "invoice_no": "INV-2024-001"
}
```

**Expected Response:**
- ZIP file download containing:
  - `commercial_invoice.pdf`
  - `packing_list.pdf`
  - `certificate_of_origin.pdf`

#### **Step 3: Check Individual Documents**

**A. Commercial Invoice:**
```bash
GET http://localhost:5000/api/export-docs/invoice/<order_id>
Headers: Authorization: Bearer <artisan_token>
```

**Expected in PDF:**
- Invoice number
- Artisan details (name, address, GSTIN)
- Buyer details (name, company, address, country)
- Product table with HS codes
- Price breakdown (subtotal, shipping, tax, total)
- Legal declaration
- Authorized signature

**B. Packing List:**
- Item descriptions
- Quantities
- Weights and dimensions
- Box count
- Packaging notes

**C. Certificate of Origin:**
- Certifies "Made in India"
- Product details with HS codes
- Issuing authority (FIEO)
- Official stamp placeholder

#### **Step 4: Check Compliance**

```bash
POST http://localhost:5000/api/export-docs/check-compliance
Headers: Authorization: Bearer <artisan_token>
{
  "order_id": <order_id>,
  "destination_country": "US"
}
```

**Expected Response:**
```json
{
  "compliance": {
    "issues": [],
    "warnings": [
      "Lead testing required if this is a children's product",
      "Textile labeling requirements must be met"
    ],
    "country_requirements": {
      "name": "United States",
      "customs_form": "CBP Form 3461",
      "special_notes": "FDA clearance may be required...",
      "duties": "0-6% for handicrafts under GSP",
      "documents": ["Commercial Invoice", "Packing List", "Certificate of Origin"]
    }
  }
}
```

#### **Step 5: Get HS Code**

```bash
GET http://localhost:5000/api/export-docs/hs-code/pottery
```

**Expected:**
```json
{
  "success": true,
  "craft_type": "pottery",
  "hs_code": "6912.00"
}
```

#### **✅ SUCCESS CRITERIA:**
- ✅ All 3 PDFs generated successfully
- ✅ Professional formatting
- ✅ Correct HS codes assigned
- ✅ Country-specific requirements shown
- ✅ Compliance warnings provided
- ✅ Download completes in < 5 seconds

---

## 🎯 **FEATURE #3: Cluster Logistics Pooling**

### **Test Scenario: Find Pooling Opportunities & Calculate Savings**

#### **Step 1: Create Multiple Orders**

Create 3-5 orders from different artisans in the same region (Jaipur, Rajasthan) going to the same destination (US).

**Artisan 1:**
```bash
POST http://localhost:5000/api/orders/
{
  "product_id": <product1_id>,
  "quantity": 10,
  "shipping_address": "123 Main St, New York, NY 10001, USA"
}
```

**Artisan 2 (same region):**
```bash
POST http://localhost:5000/api/orders/
{
  "product_id": <product2_id>,
  "quantity": 15,
  "shipping_address": "456 Broadway, New York, NY 10002, USA"
}
```

#### **Step 2: Find Pooling Opportunities**

**Artisan checks pooling:**
```bash
POST http://localhost:5000/api/cluster-pooling/find-opportunities
Headers: Authorization: Bearer <artisan1_token>
{
  "order_id": <order1_id>
}
```

**Expected Response:**
```json
{
  "pooling_available": true,
  "your_order": {
    "order_id": 123,
    "individual_cost": 3200,
    "pooled_cost": 1920,
    "savings": 1280,
    "savings_percent": 40
  },
  "cluster_info": {
    "total_orders": 5,
    "total_artisans": 5,
    "total_savings": 4240,
    "warehouse_location": {
      "city": "Jaipur",
      "lat": 26.9124,
      "lon": 75.7873
    }
  },
  "schedule": {
    "pickup_start": "2024-12-01",
    "pickup_days_needed": 2,
    "consolidation_at": "Jaipur",
    "consolidation_date": "2024-12-03",
    "shipping_date": "2024-12-04",
    "estimated_delivery": "2024-12-11"
  },
  "message": "Great news! Your order can be pooled with 4 other orders. You'll save ₹1,280 (40%)!"
}
```

#### **Step 3: Opt-in to Pooling**

```bash
POST http://localhost:5000/api/cluster-pooling/opt-in/<order_id>
Headers: Authorization: Bearer <artisan_token>
```

**Expected:**
```json
{
  "success": true,
  "message": "Successfully opted-in to cluster pooling! We'll notify you when the consolidated shipment is ready.",
  "order_id": 123
}
```

#### **Step 4: Calculate Savings**

```bash
POST http://localhost:5000/api/cluster-pooling/calculate-savings
Headers: Authorization: Bearer <artisan_token>
{
  "orders": [
    {"order_id": 1, "weight_kg": 2.5, "artisan_id": 10},
    {"order_id": 2, "weight_kg": 3.0, "artisan_id": 11},
    {"order_id": 3, "weight_kg": 2.0, "artisan_id": 12}
  ],
  "destination_country": "US"
}
```

**Expected Response:**
```json
{
  "savings": {
    "total_weight_kg": 7.5,
    "total_individual_cost": 6000,
    "total_pooled_cost": 3600,
    "total_savings": 2400,
    "savings_percent": 40,
    "cost_splits": [
      {
        "order_id": 1,
        "artisan_id": 10,
        "weight_kg": 2.5,
        "individual_cost": 2000,
        "pooled_cost": 1200,
        "savings": 800,
        "savings_percent": 40
      },
      ...
    ]
  }
}
```

#### **Step 5: Get Regional Analytics**

```bash
GET http://localhost:5000/api/cluster-pooling/analytics
Headers: Authorization: Bearer <artisan_token>
```

**Expected:**
```json
{
  "analytics": {
    "region": "Jaipur, Rajasthan",
    "total_artisans": 45,
    "orders_last_30_days": 28,
    "total_shipping_spent": 89600,
    "potential_savings_with_pooling": 35840,
    "nearest_warehouse": "Jaipur",
    "active_clusters": 3,
    "average_savings_percent": 40
  }
}
```

#### **Step 6: Get Warehouse Location**

```bash
GET http://localhost:5000/api/cluster-pooling/warehouse/Rajasthan
```

**Expected:**
```json
{
  "success": true,
  "state": "Rajasthan",
  "warehouse": {
    "city": "Jaipur",
    "lat": 26.9124,
    "lon": 75.7873
  }
}
```

#### **✅ SUCCESS CRITERIA:**
- ✅ Multiple orders detected for pooling
- ✅ 40% savings calculated correctly
- ✅ Cost split proportionally by weight
- ✅ Pickup schedule generated
- ✅ Warehouse location identified
- ✅ Regional analytics show potential savings

---

## 🧪 **BONUS: Translation Service Tests**

### **Test Real-time Translation**

```bash
POST http://localhost:5000/api/translation/translate
Headers: Authorization: Bearer <token>
{
  "text": "Can you reduce the price for bulk orders?",
  "source_lang": "en",
  "target_lang": "hi",
  "context": "negotiation"
}
```

**Expected:**
```json
{
  "translation": {
    "translated_text": "क्या आप bulk orders के लिए कीमत कम कर सकते हैं?",
    "tone": "polite_inquiry",
    "cultural_notes": "...",
    "alternative_phrasing": "..."
  }
}
```

### **Test Batch Translation**

```bash
POST http://localhost:5000/api/translation/translate-batch
Headers: Authorization: Bearer <token>
{
  "messages": [
    "Hello, how are you?",
    "I need 50 pieces",
    "What is the delivery time?"
  ],
  "source_lang": "en",
  "target_lang": "hi"
}
```

### **Test Language Detection**

```bash
POST http://localhost:5000/api/translation/detect-language
Headers: Authorization: Bearer <token>
{
  "text": "नमस्ते, मुझे 50 pieces चाहिए"
}
```

**Expected:**
```json
{
  "detected_language": "hi",
  "language_name": "Hindi"
}
```

---

## 📊 **Success Checklist**

### **Feature #1: Cultural Context AI Negotiation**
- [ ] Message sent successfully
- [ ] AI detects negotiation intent correctly
- [ ] Translation is accurate and natural
- [ ] Context explanation provided in target language
- [ ] 3 smart reply suggestions generated
- [ ] Negotiation insights included
- [ ] Cultural notes appropriate for context

### **Feature #2: Export Documentation**
- [ ] Commercial invoice PDF generated
- [ ] Packing list PDF generated
- [ ] Certificate of Origin PDF generated
- [ ] All PDFs have professional formatting
- [ ] HS codes correctly assigned
- [ ] Country-specific requirements shown
- [ ] Compliance warnings appropriate
- [ ] ZIP download works

### **Feature #3: Cluster Pooling**
- [ ] Poolable orders detected
- [ ] Savings calculated correctly (40%)
- [ ] Cost split proportionally
- [ ] Warehouse location identified
- [ ] Pickup schedule generated
- [ ] Regional analytics accurate
- [ ] Opt-in functionality works

---

## 🐛 **Common Issues & Fixes**

### **Issue: "AI Service Error"**
**Fix:** Check `GEMINI_API_KEY` in `.env` file. Get new key from https://makersuite.google.com/app/apikey

### **Issue: "Token Invalid"**
**Fix:** Clear browser localStorage and re-login

### **Issue: "Order not found"**
**Fix:** Ensure order was created by the correct artisan

### **Issue: "No pooling opportunities found"**
**Fix:** Create multiple orders from same region (district + state) to same destination country

### **Issue: "PDF generation failed"**
**Fix:** Ensure `reportlab` and `PyPDF2` are installed: `pip install reportlab PyPDF2`

---

## 🎬 **Demo Script for Presentation**

**"Let me show you Bharatcraft's 3 killer features:"**

### **1. Cultural Context AI (2 minutes)**
1. Login as buyer
2. Open product
3. Send message: "Can you improve the price for 50 pieces?"
4. Show artisan dashboard
5. **Point out:** Hindi translation + context + smart replies
6. **Say:** "No other platform does this!"

### **2. Export Docs (1 minute)**
1. Login as artisan
2. Go to orders
3. Click "Generate Export Documents"
4. Download ZIP
5. Open professional PDF invoice
6. **Say:** "3 weeks → 3 seconds!"

### **3. Cluster Pooling (2 minutes)**
1. Show multiple orders from Jaipur artisans
2. Click "Check Pooling Opportunities"
3. **Point out:** 40% savings, consolidated shipment
4. Show warehouse location on map (if available)
5. **Say:** "₹3,200 → ₹1,920 saved!"

---

## 📈 **Expected Results Summary**

| Feature | Test Time | Success Rate | Impact |
|---------|-----------|--------------|--------|
| **AI Negotiation** | 2-3 min | 95%+ | 3-5x deal closure |
| **Export Docs** | 30 sec | 100% | 3 weeks → 3 hours |
| **Cluster Pooling** | 1-2 min | 100% | 40% cost savings |

---

## 🚀 **Next Steps After Testing**

1. ✅ Add Chat UI to dashboards (include `chat.css` and `chat.js`)
2. ✅ Add visual indicators for AI features
3. ✅ Create demo video
4. ✅ Prepare presentation slides
5. ✅ Deploy to production (Render/Heroku)

---

**READY TO WIN! 🏆**

