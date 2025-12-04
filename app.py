import os
from dotenv import load_dotenv

load_dotenv()

from flask import Flask, render_template, jsonify
from flask_cors import CORS
from flask_socketio import SocketIO
from flask_jwt_extended import JWTManager
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, scoped_session
from models import Base
import routes.auth
import routes.products
import routes.orders
import routes.chat
import routes.admin
import routes.logistics
import routes.impact
import routes.ai_assistant
import routes.negotiation
import routes.translation
import routes.export_docs
import routes.cluster_pooling
import routes.checkout
import routes.messages
import routes.stats
import routes.features


app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SESSION_SECRET', 'dev-secret-key-change-in-production')
app.config['JWT_SECRET_KEY'] = os.getenv('SESSION_SECRET', 'dev-secret-key-change-in-production')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///bharatcraft.db')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
app.config['UPLOAD_FOLDER'] = 'static/uploads'
app.config['JWT_IDENTITY_CLAIM'] = 'sub'
app.config['JWT_TOKEN_LOCATION'] = ['headers']
app.config['JWT_HEADER_NAME'] = 'Authorization'
app.config['JWT_HEADER_TYPE'] = 'Bearer'

CORS(app, resources={r"/*": {"origins": "*"}})
jwt = JWTManager(app)

# JWT Error Handlers
@jwt.expired_token_loader
def expired_token_callback(jwt_header, jwt_payload):
    return jsonify({'error': 'Token has expired', 'message': 'Please log in again'}), 401

@jwt.invalid_token_loader
def invalid_token_callback(error):
    print(f"JWT Invalid Token Error: {error}")
    return jsonify({
        'error': 'Invalid token',
        'message': 'Please log in again to get a new token',
        'details': str(error)
    }), 422

@jwt.unauthorized_loader
def unauthorized_callback(error):
    return jsonify({
        'error': 'Missing authorization header',
        'message': 'Please include Authorization header with Bearer token'
    }), 401

@jwt.revoked_token_loader
def revoked_token_callback(jwt_header, jwt_payload):
    return jsonify({'error': 'Token has been revoked', 'message': 'Please log in again'}), 401

socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

engine = create_engine(app.config['SQLALCHEMY_DATABASE_URI'])
Base.metadata.create_all(engine)
Session = scoped_session(sessionmaker(bind=engine))

@app.before_request
def before_request():
    from flask import g
    g.db = Session()

@app.teardown_request
def teardown_request(exception=None):
    from flask import g
    db = g.pop('db', None)
    if db is not None:
        db.close()

app.register_blueprint(routes.auth.bp)
app.register_blueprint(routes.products.bp)
app.register_blueprint(routes.orders.bp)
app.register_blueprint(routes.chat.bp)
app.register_blueprint(routes.admin.bp)
app.register_blueprint(routes.logistics.bp)
app.register_blueprint(routes.impact.bp)
app.register_blueprint(routes.ai_assistant.bp)
app.register_blueprint(routes.negotiation.bp)
app.register_blueprint(routes.translation.bp)
app.register_blueprint(routes.export_docs.bp)
app.register_blueprint(routes.cluster_pooling.bp)
app.register_blueprint(routes.checkout.bp)
app.register_blueprint(routes.messages.bp)
app.register_blueprint(routes.stats.bp)
app.register_blueprint(routes.features.bp)

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/success-stories')
def success_stories():
    return render_template('success-stories.html')

@app.route('/all-features')
def all_features():
    return render_template('all-features.html')

@app.route('/artisan')
@app.route('/artisan/dashboard')
@app.route('/artisan/dashboard.html')
def artisan_portal():
    return render_template('artisan/dashboard.html')

@app.route('/artisan/dashboard-simple')
@app.route('/artisan/dashboard-simple.html')
def artisan_portal_simple():
    return render_template('artisan/dashboard-simple.html')

@app.route('/buyer')
@app.route('/buyer/dashboard')
def buyer_portal():
    return render_template('buyer/dashboard-modern.html')

@app.route('/admin')
def admin_portal():
    return render_template('admin/dashboard.html')

@app.route('/sw.js')
def service_worker():
    from flask import send_from_directory
    return send_from_directory('static', 'sw.js')

from chat_events import register_socketio_events
register_socketio_events(socketio)

if __name__ == '__main__':
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # Get port from environment variable (Render sets this)
    port = int(os.getenv('PORT', 5000))
    
    # Use 0.0.0.0 for production, 127.0.0.1 for local development
    host = os.getenv('HOST', '127.0.0.1')
    
    # Disable debug in production
    debug = os.getenv('FLASK_ENV', 'development') == 'development'
    
    socketio.run(app, host=host, port=port, debug=debug, allow_unsafe_werkzeug=True)
