# Bharatcraft - AI-Powered Export Marketplace

## Overview

Bharatcraft is a comprehensive web application that connects Indian artisan clusters directly with international buyers, eliminating middlemen and increasing artisan earnings by 3-5x. The platform features AI-powered tools for quality assessment, multilingual translation, and smart logistics optimization. It provides dual interfaces: a simplified, mobile-first portal for artisans with vernacular language support, and a sophisticated desktop-optimized dashboard for buyers.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Backend Framework
- **Flask-based REST API** with microservices-style route organization
- JWT authentication with role-based access control (artisan, buyer, admin)
- WebSocket support via Flask-SocketIO for real-time chat functionality using eventlet async mode
- Session management using SQLAlchemy scoped sessions with before/after request hooks
- File upload handling with image optimization using PIL (compression, thumbnailing)

### Database Layer
- **SQLAlchemy ORM** with declarative base models
- PostgreSQL as the primary relational database (configured via DATABASE_URL environment variable)
- Database schema includes:
  - User management with role-based profiles (User, ArtisanProfile, BuyerProfile)
  - Product catalog with quality grading system
  - Order management with milestone-based tracking
  - Real-time messaging system with translation support
  - Cluster coordination for grouping artisans geographically
  - Export documentation tracking

### Authentication & Authorization
- **Flask-JWT-Extended** for token-based authentication
- Password hashing using bcrypt
- Role-based decorators for protecting admin endpoints
- JWT tokens stored client-side with user data in localStorage

### AI/ML Integration
- **OpenAI GPT-4 Vision API** for handicraft quality assessment (visual inspection scoring 0.0-1.0)
- **OpenAI API** for multilingual translation with cultural context preservation
- Translation supports: English, Hindi, Spanish, Bengali, Kashmiri, Tamil, German, French, Japanese
- Fallback mechanisms when API keys are unavailable (returns default scores/original text)

### Real-Time Communication
- **Flask-SocketIO** with eventlet for WebSocket connections
- Room-based chat system for buyer-artisan negotiations
- Auto-translation of messages based on user language preferences
- Message read receipts and conversation threading

### Payment Processing
- **Stripe integration** for payment handling (configured via STRIPE_SECRET_KEY)
- Escrow-style milestone-based payment releases
- Multi-currency support for international transactions

### Frontend Architecture
- **Vanilla JavaScript** with no framework dependencies
- Multi-page application with role-specific dashboards (artisan, buyer, admin)
- Client-side routing and authentication checks
- Translation system with JSON-based language files
- Progressive Web App capabilities planned (offline support for low-connectivity areas)

### File Management
- Upload directory: `static/uploads/`
- Allowed image formats: PNG, JPG, JPEG, GIF, WEBP
- Automatic image optimization (max 1200x1200, 85% quality)
- User-namespaced file storage

### API Structure
Routes organized by domain:
- `/api/auth` - User registration, login, profile management
- `/api/products` - Product CRUD operations with AI quality assessment
- `/api/orders` - Order creation, tracking, milestone management
- `/api/chat` - Message retrieval, conversation listing
- `/api/admin` - Platform statistics, user management
- `/api/logistics` - Shipping calculation, export documentation generation

### Logistics & Export
- Multi-carrier shipping estimation (DHL, FedEx, IndiaPost)
- Weight-based pricing calculation
- Automated export document generation for country-specific compliance
- Consolidated shipping optimization for cluster orders

### Security Considerations
- CORS enabled for all origins (production deployment should restrict this)
- File upload size limit: 16MB
- Environment-based secret key configuration
- SQL injection protection via SQLAlchemy ORM parameterization

## External Dependencies

### Third-Party APIs
- **OpenAI API** (GPT-4 Vision, GPT-4) - Product quality assessment and multilingual translation
- **Stripe API** - Payment processing and escrow management
- **Leaflet.js** - Interactive mapping for artisan cluster visualization

### Python Packages
- **Flask** - Web framework
- **Flask-CORS** - Cross-origin resource sharing
- **Flask-SocketIO** - WebSocket support
- **Flask-JWT-Extended** - JWT authentication
- **SQLAlchemy** - Database ORM
- **bcrypt** - Password hashing
- **Pillow (PIL)** - Image processing
- **python-dotenv** - Environment variable management
- **eventlet** - Async WebSocket support
- **stripe** - Payment processing SDK
- **openai** - AI service integration

### Frontend Libraries
- **Leaflet.js** (v1.9.4) - Geospatial mapping library for cluster visualization

### Infrastructure Requirements
- PostgreSQL database server
- Environment variables required:
  - `DATABASE_URL` - PostgreSQL connection string
  - `SESSION_SECRET` - JWT signing key
  - `OPENAI_API_KEY` - OpenAI API access
  - `STRIPE_SECRET_KEY` - Stripe payment processing

### Data Storage
- Relational database for transactional data (users, orders, products)
- File system storage for uploaded images
- Future consideration: Neo4j mentioned in requirements for cluster relationship mapping (not yet implemented)
- Future consideration: MongoDB mentioned for product catalog (currently using PostgreSQL)