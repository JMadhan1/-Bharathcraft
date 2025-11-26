"""
Validation script to check if the application is ready to run
"""
import os

print("Validating Bharatcraft Application...\n")

# Set default environment variables
os.environ.setdefault('DATABASE_URL', 'sqlite:///bharatcraft.db')
os.environ.setdefault('SESSION_SECRET', 'test-secret-key')

try:
    print("[*] Checking models...")
    from models import (
        Base, User, UserRole, ArtisanProfile, BuyerProfile, 
        Cluster, Product, Order, OrderItem, OrderMilestone, 
        Message, ExportDocument, OrderStatus, QualityGrade
    )
    
    print("[*] Checking routes...")
    import routes.auth
    import routes.products
    import routes.orders
    import routes.chat
    import routes.admin
    import routes.logistics
    
    print("[*] Checking chat events...")
    from chat_events import register_socketio_events
    
    print("[*] Checking utils...")
    from utils.ai_service import assess_quality, translate_text
    
    print("[*] Checking Flask dependencies...")
    from flask import Flask, render_template, jsonify
    from flask_cors import CORS
    from flask_socketio import SocketIO
    from flask_jwt_extended import JWTManager
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker, scoped_session
    
    print("\n[SUCCESS] All imports validated successfully!")
    print("\nNow checking if app can be initialized...")
    
    import app as main_app
    print("[SUCCESS] App module imported successfully!")
    
    print("\n" + "="*50)
    print("SUCCESS: Application is ready to run!")
    print("="*50)
    print("\nTo start the application, run:")
    print("  python app.py")
    print("\nOr with gunicorn (production):")
    print("  gunicorn --worker-class eventlet -w 1 app:app")
    print("\nAccess the application at:")
    print("  http://127.0.0.1:5000")
    
except ImportError as e:
    print(f"\n[ERROR] Import Error: {e}")
    print("\nPlease install required dependencies:")
    print("  pip install -r requirements.txt")
    exit(1)
except Exception as e:
    print(f"\n[ERROR] Error: {e}")
    import traceback
    traceback.print_exc()
    exit(1)

