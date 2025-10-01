import os
from flask import Flask, render_template
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
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SESSION_SECRET', 'dev-secret-key-change-in-production')
app.config['JWT_SECRET_KEY'] = os.getenv('SESSION_SECRET', 'dev-secret-key-change-in-production')
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')
app.config['MAX_CONTENT_LENGTH'] = 16 * 1024 * 1024
app.config['UPLOAD_FOLDER'] = 'static/uploads'

CORS(app, resources={r"/*": {"origins": "*"}})
jwt = JWTManager(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='eventlet')

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

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/artisan')
def artisan_portal():
    return render_template('artisan/dashboard.html')

@app.route('/buyer')
def buyer_portal():
    return render_template('buyer/dashboard.html')

@app.route('/admin')
def admin_portal():
    return render_template('admin/dashboard.html')

from chat_events import register_socketio_events
register_socketio_events(socketio)

if __name__ == '__main__':
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    socketio.run(app, host='0.0.0.0', port=5000, debug=True)
