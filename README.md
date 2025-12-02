# Bharatcraft

**Empowering Indian Artisans, Connecting Global Buyers**

A direct trade platform that increases artisan earnings by 3-5x through AI-powered tools and eliminating middlemen.

## 🎯 Features

### For Artisans
- 🧵 **Direct Sales** - Sell crafts directly to global buyers
- 🤖 **AI Quality Assessment** - Automated product grading using computer vision
- 💬 **Multi-Language Support** - Communicate in your native language
- 📊 **Dashboard** - Track orders, inventory, and earnings
- 📦 **Smart Logistics** - Simplified shipping and export documentation

### For Buyers
- 🛍️ **Authentic Handicrafts** - Source directly from Indian artisans
- 💬 **Real-Time Chat** - Direct negotiation with cultural context
- 🌍 **Global Shipping** - Consolidated shipping options
- 🔍 **Quality Assured** - AI-verified product quality
- 💳 **Secure Payments** - Integrated payment processing

### For Admins
- 📈 **Analytics Dashboard** - Monitor platform metrics
- 👥 **User Management** - Manage artisans and buyers
- 📦 **Order Tracking** - Oversee all transactions
- 🗺️ **Cluster Mapping** - Visualize artisan clusters across India

## 🚀 Technology Stack

- **Backend:** Flask, Python 3.9+
- **Database:** PostgreSQL (production), SQLite (development)
- **Real-Time:** Flask-SocketIO with eventlet
- **Authentication:** JWT (Flask-JWT-Extended)
- **AI/ML:** Google Gemini API for translations, quality assessment, and cultural context
- **Payments:** Stripe integration
- **Maps:** Leaflet.js for cluster visualization
- **Deployment:** Render (with auto-deploy from GitHub)

## 📦 Installation

### Prerequisites
- Python 3.9 or higher
- pip (Python package manager)
- Git

### Local Development Setup

1. **Clone the repository**
```bash
git clone https://github.com/yourusername/bharatcraft.git
cd bharatcraft
```

2. **Create virtual environment**
```bash
python -m venv .venv

# Windows
.venv\Scripts\activate

# Mac/Linux
source .venv/bin/activate
```

3. **Install dependencies**
```bash
pip install -r requirements.txt
```

4. **Set up environment variables**

Create a `.env` file in the root directory:
```env
SESSION_SECRET=your-secret-key-here
DATABASE_URL=sqlite:///bharatcraft.db
HOST=127.0.0.1
FLASK_ENV=development

# Optional API keys
# AI Configuration
AI_PROVIDER=gemini
GEMINI_API_KEY=your-gemini-api-key
STRIPE_SECRET_KEY=your-stripe-secret-key
STRIPE_PUBLISHABLE_KEY=your-stripe-publishable-key
```

5. **Run the application**
```bash
python app.py
```

6. **Access the application**
- Homepage: http://127.0.0.1:5000
- Artisan Portal: http://127.0.0.1:5000/artisan
- Buyer Portal: http://127.0.0.1:5000/buyer
- Admin Portal: http://127.0.0.1:5000/admin

## 🌐 Deployment

See [DEPLOYMENT.md](DEPLOYMENT.md) for detailed instructions on deploying to Render.

### Quick Deploy to Render

1. Push your code to GitHub
2. Connect your repository to Render
3. Set environment variables
4. Deploy!

The application will be available at: `https://your-app-name.onrender.com`

## 📁 Project Structure

```
bharatcraft/
├── app.py                 # Main application file
├── models.py             # Database models
├── chat_events.py        # SocketIO event handlers
├── requirements.txt      # Python dependencies
├── render.yaml          # Render deployment config
├── build.sh             # Build script for deployment
├── Procfile             # Alternative deployment config
├── .env                 # Environment variables (not in git)
├── .gitignore          # Git ignore rules
├── routes/             # API route blueprints
│   ├── auth.py        # Authentication routes
│   ├── products.py    # Product management
│   ├── orders.py      # Order processing
│   ├── chat.py        # Chat functionality
│   ├── admin.py       # Admin operations
│   └── logistics.py   # Shipping & logistics
├── static/            # Static assets
│   ├── css/          # Stylesheets
│   ├── js/           # JavaScript files
│   ├── translations/ # Language files
│   └── uploads/      # User uploaded files
├── templates/         # HTML templates
│   ├── index.html    # Landing page
│   ├── artisan/      # Artisan portal
│   ├── buyer/        # Buyer portal
│   └── admin/        # Admin portal
└── utils/            # Utility functions
```

## 🔑 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | Database connection string | Yes |
| `SESSION_SECRET` | Secret key for sessions/JWT | Yes |
| `HOST` | Server host (0.0.0.0 for production) | No |
| `PORT` | Server port (set by Render) | No |
| `FLASK_ENV` | Environment (development/production) | No |
| `GEMINI_API_KEY` | Google Gemini API key for AI features | No |
| `AI_PROVIDER` | AI provider selection ('gemini' or 'openai') | No |
| `STRIPE_SECRET_KEY` | Stripe secret key | No |
| `STRIPE_PUBLISHABLE_KEY` | Stripe publishable key | No |

## 🧪 Testing

```bash
# Run tests (when implemented)
pytest

# Check code style
flake8 .

# Type checking
mypy .
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- Indian artisan communities for inspiration
- Open source community for amazing tools
- Render for hosting platform

## 📞 Contact

- **Project Link:** https://github.com/yourusername/bharatcraft
- **Live Demo:** https://bharatcraft.onrender.com

## 🗺️ Roadmap

- [ ] Mobile app (React Native)
- [ ] Advanced AI quality grading
- [ ] Blockchain for supply chain transparency
- [ ] AR/VR product visualization
- [ ] Expanded payment options
- [ ] Multi-currency support
- [ ] Advanced analytics dashboard
- [ ] Artisan training programs integration

---

**Made with ❤️ for Indian Artisans**
