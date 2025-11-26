# Bharatcraft Setup Guide

## Prerequisites

- Python 3.10 or higher
- pip (Python package manager)

## Installation Steps

### 1. Install Dependencies

```bash
pip install -r requirements.txt
```

### 2. Environment Configuration

Create a `.env` file in the root directory with the following variables:

```env
# Flask Configuration
FLASK_ENV=development
SESSION_SECRET=your-super-secret-key-change-in-production
HOST=127.0.0.1
PORT=5000

# Database Configuration
DATABASE_URL=sqlite:///bharatcraft.db

# OpenAI API Key (for AI quality assessment and translation)
OPENAI_API_KEY=your-openai-api-key-here

# Stripe API Keys (for payment processing - optional for development)
STRIPE_SECRET_KEY=your-stripe-secret-key-here
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key-here
```

**Note:** For local development without OpenAI or Stripe, the application will use fallback mechanisms.

### 3. Validate Installation

Run the validation script to ensure all dependencies are correctly installed:

```bash
python validate_imports.py
```

You should see: `SUCCESS: Application is ready to run!`

### 4. Start the Application

#### Development Mode (Local)

```bash
python app.py
```

The application will start on `http://127.0.0.1:5000`

#### Production Mode

Using Gunicorn (recommended for production):

```bash
gunicorn -w 4 -b 0.0.0.0:5000 app:app
```

Using eventlet workers (for WebSocket support):

```bash
gunicorn -k eventlet -w 1 -b 0.0.0.0:5000 app:app
```

## Application Structure

```
Bharatcraft/
├── app.py                 # Main application entry point
├── models.py              # Database models
├── chat_events.py         # WebSocket chat events
├── requirements.txt       # Python dependencies
├── routes/                # API route blueprints
│   ├── auth.py           # Authentication endpoints
│   ├── products.py       # Product management
│   ├── orders.py         # Order management
│   ├── chat.py           # Chat/messaging
│   ├── admin.py          # Admin dashboard
│   └── logistics.py      # Shipping & export docs
├── templates/            # HTML templates
│   ├── index.html        # Landing page
│   ├── artisan/          # Artisan portal
│   ├── buyer/            # Buyer portal
│   └── admin/            # Admin dashboard
├── static/               # Static assets
│   ├── css/              # Stylesheets
│   ├── js/               # JavaScript files
│   ├── translations/     # i18n translations
│   └── uploads/          # User uploaded files
└── utils/                # Utility modules
    └── ai_service.py     # AI/ML services
```

## Key Features

### 1. Multi-Language Support
- 13 Indian languages + English, Spanish
- Real-time translation for chat messages
- Language preference per user

### 2. AI-Powered Quality Assessment
- Automated product quality scoring (0-1 scale)
- Image analysis for craftsmanship evaluation
- Quality grade classification (Premium/Standard/Basic)

### 3. Authentication & Authorization
- JWT-based authentication
- Role-based access control (Artisan/Buyer/Admin)
- Secure password hashing with bcrypt

### 4. Real-Time Chat
- WebSocket-based messaging
- Auto-translation based on user language preference
- Typing indicators and read receipts

### 5. Order Management
- Complete order lifecycle tracking
- Milestone-based progress updates
- Payment integration with Stripe

### 6. Export Documentation
- Automated generation of:
  - Commercial invoices
  - Packing lists
  - Certificates of origin
- HS code classification

### 7. Logistics
- Multi-carrier shipping estimates (DHL, FedEx, IndiaPost)
- Weight-based cost calculation
- Delivery time estimates

## API Endpoints

### Authentication
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Products
- `GET /api/products/` - List all products (with filters)
- `POST /api/products/` - Create new product (artisan only)
- `GET /api/products/<id>` - Get product details
- `PUT /api/products/<id>` - Update product (artisan only)
- `GET /api/products/my-products` - Get artisan's products

### Orders
- `POST /api/orders/` - Create new order (buyer only)
- `GET /api/orders/` - List orders (filtered by role)
- `GET /api/orders/<id>` - Get order details
- `PUT /api/orders/<id>/status` - Update order status
- `POST /api/orders/<id>/payment` - Create payment intent

### Chat
- `GET /api/chat/messages?user_id=<id>` - Get messages with user
- `GET /api/chat/conversations` - Get all conversations

### Admin
- `GET /api/admin/stats` - Platform statistics
- `GET /api/admin/users` - List all users
- `GET /api/admin/clusters` - List artisan clusters
- `POST /api/admin/clusters` - Create new cluster

### Logistics
- `POST /api/logistics/calculate` - Calculate shipping costs
- `POST /api/logistics/export-docs/<order_id>` - Generate export docs
- `GET /api/logistics/export-docs/<order_id>` - Get export docs

## WebSocket Events

### Client -> Server
- `join` - Join a chat room
- `leave` - Leave a chat room
- `send_message` - Send a chat message
- `typing` - Typing indicator

### Server -> Client
- `status` - Connection status updates
- `new_message` - New message received
- `user_typing` - User is typing

## Database Schema

The application uses SQLAlchemy ORM with the following main models:

- **User** - User accounts with role-based access
- **ArtisanProfile** - Extended profile for artisans
- **BuyerProfile** - Extended profile for buyers
- **Cluster** - Artisan cluster/community information
- **Product** - Handicraft products
- **Order** - Purchase orders
- **OrderItem** - Individual items in an order
- **OrderMilestone** - Order progress tracking
- **Message** - Chat messages
- **ExportDocument** - Export documentation

## Troubleshooting

### Issue: Database not found
**Solution:** The SQLite database is created automatically. If using PostgreSQL, ensure DATABASE_URL is correctly set.

### Issue: OpenAI API errors
**Solution:** If OPENAI_API_KEY is not set, the app uses fallback methods (default quality scores, no translation).

### Issue: WebSocket connection errors
**Solution:** Ensure eventlet is installed and the app is running with eventlet workers.

### Issue: Import errors
**Solution:** Run `pip install -r requirements.txt` to install all dependencies.

## Production Deployment

### Environment Variables (Production)
```env
FLASK_ENV=production
HOST=0.0.0.0
PORT=5000
DATABASE_URL=postgresql://user:password@host:port/database
SESSION_SECRET=<generate-secure-random-key>
OPENAI_API_KEY=<your-openai-key>
STRIPE_SECRET_KEY=<your-stripe-key>
```

### Recommended Stack
- **Web Server:** Gunicorn with eventlet workers
- **Reverse Proxy:** Nginx
- **Database:** PostgreSQL
- **Deployment:** Render, Heroku, or AWS
- **File Storage:** S3 or similar for uploads

### Security Checklist
- [ ] Change SESSION_SECRET to a secure random value
- [ ] Use PostgreSQL or another production database
- [ ] Enable HTTPS/SSL
- [ ] Set FLASK_ENV to 'production'
- [ ] Configure CORS appropriately
- [ ] Set up database backups
- [ ] Monitor logs and errors
- [ ] Implement rate limiting
- [ ] Use environment-specific API keys

## Support

For issues or questions, please refer to the documentation or contact the development team.

---

**Version:** 1.0.0  
**Last Updated:** November 2025

