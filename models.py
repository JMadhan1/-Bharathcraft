from sqlalchemy import Column, Integer, String, Float, Text, DateTime, Boolean, ForeignKey, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import relationship
from datetime import datetime
import enum

Base = declarative_base()

class UserRole(enum.Enum):
    ARTISAN = "artisan"
    BUYER = "buyer"
    ADMIN = "admin"

class OrderStatus(enum.Enum):
    PENDING = "pending"
    NEGOTIATING = "negotiating"
    CONFIRMED = "confirmed"
    IN_PRODUCTION = "in_production"
    SHIPPED = "shipped"
    DELIVERED = "delivered"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class QualityGrade(enum.Enum):
    PREMIUM = "premium"
    STANDARD = "standard"
    BASIC = "basic"

class User(Base):
    __tablename__ = 'users'
    
    id = Column(Integer, primary_key=True)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(Enum(UserRole), nullable=False)
    full_name = Column(String(255), nullable=False)
    phone = Column(String(50))
    language_preference = Column(String(10), default='en')
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    artisan_profile = relationship("ArtisanProfile", back_populates="user", uselist=False)
    buyer_profile = relationship("BuyerProfile", back_populates="user", uselist=False)

class ArtisanProfile(Base):
    __tablename__ = 'artisan_profiles'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), unique=True, nullable=False)
    cluster_id = Column(Integer, ForeignKey('clusters.id'))
    craft_type = Column(String(100), nullable=False)
    skills = Column(Text)
    experience_years = Column(Integer)
    latitude = Column(Float)
    longitude = Column(Float)
    address = Column(Text)
    bank_details = Column(Text)
    quality_rating = Column(Float, default=0.0)
    total_sales = Column(Float, default=0.0)
    total_orders = Column(Integer, default=0)
    government_id = Column(String(100))
    
    user = relationship("User", back_populates="artisan_profile")
    cluster = relationship("Cluster", back_populates="artisans")
    products = relationship("Product", back_populates="artisan")

class BuyerProfile(Base):
    __tablename__ = 'buyer_profiles'
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey('users.id'), unique=True, nullable=False)
    company_name = Column(String(255))
    company_address = Column(Text)
    country = Column(String(100))
    currency = Column(String(10), default='USD')
    tax_id = Column(String(100))
    preferences = Column(Text)
    total_purchases = Column(Float, default=0.0)
    total_orders = Column(Integer, default=0)
    
    user = relationship("User", back_populates="buyer_profile")
    orders = relationship("Order", back_populates="buyer")

class Cluster(Base):
    __tablename__ = 'clusters'
    
    id = Column(Integer, primary_key=True)
    name = Column(String(255), nullable=False)
    region = Column(String(100))
    specialty = Column(String(100))
    latitude = Column(Float)
    longitude = Column(Float)
    description = Column(Text)
    total_artisans = Column(Integer, default=0)
    
    artisans = relationship("ArtisanProfile", back_populates="cluster")

class Product(Base):
    __tablename__ = 'products'
    
    id = Column(Integer, primary_key=True)
    artisan_id = Column(Integer, ForeignKey('artisan_profiles.id'), nullable=False)
    title = Column(String(255), nullable=False)
    description = Column(Text)
    craft_type = Column(String(100))
    price = Column(Float, nullable=False)
    currency = Column(String(10), default='INR')
    quality_grade = Column(Enum(QualityGrade))
    ai_quality_score = Column(Float)
    images = Column(Text)
    stock_quantity = Column(Integer, default=1)
    production_time_days = Column(Integer)
    is_available = Column(Boolean, default=True)
    gi_tag = Column(String(255))  # Geographical Indication tag
    esg_certified = Column(Boolean, default=True)  # ESG compliance
    carbon_footprint = Column(Float)  # Estimated carbon footprint in kg
    created_at = Column(DateTime, default=datetime.utcnow)
    
    artisan = relationship("ArtisanProfile", back_populates="products")
    order_items = relationship("OrderItem", back_populates="product")

class Order(Base):
    __tablename__ = 'orders'
    
    id = Column(Integer, primary_key=True)
    buyer_id = Column(Integer, ForeignKey('buyer_profiles.id'), nullable=False)
    status = Column(Enum(OrderStatus), default=OrderStatus.PENDING)
    total_amount = Column(Float, nullable=False)
    currency = Column(String(10), default='USD')
    shipping_address = Column(Text)
    payment_status = Column(String(50), default='pending')
    payment_intent_id = Column(String(255))
    tracking_number = Column(String(100))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    buyer = relationship("BuyerProfile", back_populates="orders")
    order_items = relationship("OrderItem", back_populates="order")
    milestones = relationship("OrderMilestone", back_populates="order")

class OrderItem(Base):
    __tablename__ = 'order_items'
    
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey('orders.id'), nullable=False)
    product_id = Column(Integer, ForeignKey('products.id'), nullable=False)
    quantity = Column(Integer, nullable=False)
    unit_price = Column(Float, nullable=False)
    total_price = Column(Float, nullable=False)
    
    order = relationship("Order", back_populates="order_items")
    product = relationship("Product", back_populates="order_items")

class OrderMilestone(Base):
    __tablename__ = 'order_milestones'
    
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey('orders.id'), nullable=False)
    milestone_name = Column(String(100), nullable=False)
    description = Column(Text)
    status = Column(String(50), default='pending')
    percentage = Column(Float)
    completed_at = Column(DateTime)
    
    order = relationship("Order", back_populates="milestones")

class Message(Base):
    __tablename__ = 'messages'
    
    id = Column(Integer, primary_key=True)
    sender_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    receiver_id = Column(Integer, ForeignKey('users.id'), nullable=False)
    product_id = Column(Integer, ForeignKey('products.id'))
    order_id = Column(Integer, ForeignKey('orders.id'))
    content = Column(Text, nullable=False)
    translated_content = Column(Text)
    original_language = Column(String(10))
    is_read = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

class ExportDocument(Base):
    __tablename__ = 'export_documents'
    
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey('orders.id'), nullable=False)
    document_type = Column(String(100), nullable=False)
    document_data = Column(Text)
    generated_at = Column(DateTime, default=datetime.utcnow)
    file_path = Column(String(500))

class Transaction(Base):
    __tablename__ = 'transactions'
    
    id = Column(Integer, primary_key=True)
    order_id = Column(Integer, ForeignKey('orders.id'), nullable=False)
    buyer_id = Column(Integer, ForeignKey('buyer_profiles.id'), nullable=False)
    artisan_id = Column(Integer, ForeignKey('artisan_profiles.id'), nullable=False)
    
    # Buyer side
    buyer_amount = Column(Float, nullable=False)
    buyer_currency = Column(String(10), nullable=False)
    
    # Artisan side
    artisan_amount = Column(Float, nullable=False)
    artisan_currency = Column(String(10), default='INR')
    
    # Fees and Rates
    platform_fee = Column(Float, nullable=False)
    exchange_rate = Column(Float, nullable=False)
    
    # Shipping
    shipping_cost = Column(Float, default=0.0)
    shipping_option = Column(String(50))
    
    status = Column(String(50), default='pending')
    payment_method = Column(String(50))
    payment_id = Column(String(255))
    
    created_at = Column(DateTime, default=datetime.utcnow)
    
    order = relationship("Order")
    buyer = relationship("BuyerProfile")
    artisan = relationship("ArtisanProfile")
