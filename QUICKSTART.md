# Bharatcraft - Quick Start Guide

## Get Started in 3 Minutes

### Step 1: Install Dependencies
```bash
pip install -r requirements.txt
```

### Step 2: Create .env File
Create a `.env` file in the root directory:
```env
DATABASE_URL=sqlite:///bharatcraft.db
SESSION_SECRET=dev-secret-key-12345
OPENAI_API_KEY=
STRIPE_SECRET_KEY=
```

### Step 3: Run the Application
```bash
python app.py
```

### Step 4: Access the Application
Open your browser and go to:
- **Main Site:** http://127.0.0.1:5000
- **Artisan Portal:** http://127.0.0.1:5000/artisan
- **Buyer Portal:** http://127.0.0.1:5000/buyer
- **Admin Portal:** http://127.0.0.1:5000/admin

## Test Accounts

You can register new accounts through the web interface:

1. Click "Get Started" on the homepage
2. Choose your role (Artisan or Buyer)
3. Fill in the registration form
4. Start using the platform!

## Key Features to Try

### As an Artisan:
1. **Create Products** - Upload photos of your handicrafts
2. **Manage Inventory** - Track stock and pricing
3. **Chat with Buyers** - Negotiate and answer questions
4. **Track Orders** - Monitor order progress

### As a Buyer:
1. **Browse Products** - Search by craft type, quality, price
2. **Chat with Artisans** - Ask questions in multiple languages
3. **Place Orders** - Add products to cart and checkout
4. **Track Deliveries** - Monitor shipment progress

## API Testing

Use tools like Postman or curl to test the API:

### Register a New User
```bash
curl -X POST http://127.0.0.1:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "artisan@example.com",
    "password": "password123",
    "full_name": "Test Artisan",
    "role": "artisan",
    "craft_type": "pottery",
    "language": "en"
  }'
```

### Login
```bash
curl -X POST http://127.0.0.1:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "artisan@example.com",
    "password": "password123"
  }'
```

Save the `access_token` from the response for authenticated requests.

### Get Products
```bash
curl http://127.0.0.1:5000/api/products/
```

## Troubleshooting

### Port Already in Use
Change the port in `.env`:
```env
PORT=8000
```

### Database Issues
Delete the database file and restart:
```bash
rm bharatcraft.db
python app.py
```

### Import Errors
Reinstall dependencies:
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

## What's Next?

- Read [SETUP_GUIDE.md](SETUP_GUIDE.md) for detailed documentation
- Check [FEATURES.md](FEATURES.md) for complete feature list
- Review [API documentation](#api-endpoints) for integration details

---

**Need Help?** Run the validation script:
```bash
python validate_imports.py
```

