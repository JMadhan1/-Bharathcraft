from flask import Blueprint, render_template, request, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Product, ArtisanProfile, BuyerProfile, Transaction, Order, OrderItem, OrderStatus, Message, User
from utils.currency import convert_price, convert_to_inr, get_exchange_rate, get_inverse_rate
from utils.shipping import calculate_shipping_cost
import json

bp = Blueprint('checkout', __name__, url_prefix='/checkout')

@bp.route('/<int:product_id>', methods=['GET'])
def checkout_page(product_id):
    # Get product
    product = g.db.query(Product).filter_by(id=product_id).first()
    if not product:
        return render_template('error.html', message="Product not found"), 404
        
    # Parse images
    images = []
    if product.images:
        try:
            images = json.loads(product.images)
            if isinstance(images, str): # Handle case where it might be double encoded or just a string
                 images = [images]
            elif not isinstance(images, list):
                 images = [str(images)]
        except:
            images = [product.images] # Fallback if not JSON
            
    # Get artisan info
    artisan = product.artisan
    
    # Render template without buyer data (will be fetched by JS)
    return render_template('buyer/checkout.html', 
                          product=product, 
                          images=images,
                          buyer=None, 
                          artisan=artisan)

@bp.route('/api/init', methods=['GET'])
@jwt_required()
def get_checkout_init_data():
    user_id = int(get_jwt_identity())
    buyer = g.db.query(BuyerProfile).filter_by(user_id=user_id).first()
    
    if not buyer:
        return jsonify({'success': False, 'error': 'Buyer profile not found'}), 404
        
    return jsonify({
        'success': True,
        'buyer': {
            'country': buyer.country,
            'currency': buyer.currency,
            'address': buyer.company_address
        }
    })

@bp.route('/api/calculate-shipping', methods=['POST'])
@jwt_required()
def api_calculate_shipping():
    data = request.json
    
    dest_country = data.get('dest_country')
    weight = data.get('weight')
    category = data.get('category')
    product_value_usd = data.get('product_value_usd')
    
    try:
        result = calculate_shipping_cost(
            origin_country='IN',
            dest_country=dest_country,
            weight=weight,
            category=category,
            product_value_usd=product_value_usd
        )
        return jsonify({'success': True, 'shipping': result})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@bp.route('/api/process-transaction', methods=['POST'])
@jwt_required()
def process_transaction():
    user_id = int(get_jwt_identity())
    data = request.json
    
    product_id = data.get('product_id')
    currency = data.get('currency')
    shipping_option = data.get('shipping_option') # 'standard' or 'express'
    shipping_cost = float(data.get('shipping_cost', 0))
    quantity = int(data.get('quantity', 1))
    
    # Get product and buyer
    product = g.db.query(Product).get(product_id)
    buyer = g.db.query(BuyerProfile).filter_by(user_id=user_id).first()
    
    if not product or not buyer:
        return jsonify({'success': False, 'error': 'Invalid product or buyer'}), 400
        
    # Check stock
    if product.stock_quantity < quantity:
        return jsonify({'success': False, 'error': f'Insufficient stock. Only {product.stock_quantity} available.'}), 400

    # Calculate amounts
    # 1. Product Price in INR (Base)
    product_price_inr = product.price * quantity
    
    # 2. Convert to Buyer Currency
    exchange_rate = get_exchange_rate(currency) # INR -> Currency
    inverse_rate = get_inverse_rate(currency)   # Currency -> INR
    
    product_price_buyer = convert_price(product_price_inr, currency)
    
    # 3. Platform Fee (8%)
    platform_fee_inr = product_price_inr * 0.08
    platform_fee_buyer = product_price_buyer * 0.08
    
    # 4. Total Amount Buyer Pays
    total_buyer_amount = product_price_buyer + platform_fee_buyer + shipping_cost
    
    # 5. Artisan Receives (Product Price - Platform Fee)
    artisan_receives_inr = product_price_inr - platform_fee_inr
    
    try:
        # Create Order (PENDING - awaiting artisan approval)
        order = Order(
            buyer_id=buyer.id,
            status=OrderStatus.PENDING,
            total_amount=total_buyer_amount,
            currency=currency,
            shipping_address=buyer.company_address or "Address not provided",
            payment_status='pending' # Payment will happen after artisan approval
        )
        g.db.add(order)
        g.db.flush() # Get ID
        
        # Create Order Item
        order_item = OrderItem(
            order_id=order.id,
            product_id=product.id,
            quantity=quantity,
            unit_price=product_price_buyer / quantity,
            total_price=product_price_buyer
        )
        g.db.add(order_item)
        
        # Notify Artisan about new order request
        notification = Message(
            sender_id=buyer.user_id,
            receiver_id=product.artisan.user_id,
            product_id=product.id,
            order_id=order.id,
            content=f"New Order Request! {buyer.user.full_name} wants to purchase {quantity} x {product.title}. Please review and approve.",
            is_read=False
        )
        g.db.add(notification)
        
        g.db.commit()
        
        # Emit Socket.IO notification for real-time update
        try:
            from app import socketio
            socketio.emit('new_order', {
                'order_id': order.id,
                'buyer_name': buyer.user.full_name,
                'product_title': product.title,
                'quantity': quantity,
                'amount': f"{total_buyer_amount:.2f}",
                'currency': currency
            }, room=f'user_{product.artisan.user_id}')
        except Exception as e:
            print(f"Socket.IO notification error: {e}")
        
        return jsonify({
            'success': True, 
            'order_id': order.id,
            'message': 'Order request sent to artisan. You will be notified when the artisan approves your order.',
            'status': 'pending_approval'
        })
        
    except Exception as e:
        g.db.rollback()
        print(f"Transaction error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# Artisan approves order
@bp.route('/api/approve-order/<int:order_id>', methods=['POST'])
@jwt_required()
def approve_order(order_id):
    from flask_jwt_extended import get_jwt
    
    user_id = int(get_jwt_identity())
    claims = get_jwt()
    role = claims.get('role')
    
    if role != 'artisan':
        return jsonify({'error': 'Only artisans can approve orders'}), 403
    
    artisan = g.db.query(ArtisanProfile).filter_by(user_id=user_id).first()
    if not artisan:
        return jsonify({'error': 'Artisan profile not found'}), 404
    
    order = g.db.query(Order).get(order_id)
    if not order:
        return jsonify({'error': 'Order not found'}), 404
    
    # Verify this order is for this artisan's product
    order_item = order.order_items[0] if order.order_items else None
    if not order_item or order_item.product.artisan_id != artisan.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    try:
        # Update order status to CONFIRMED
        order.status = OrderStatus.CONFIRMED
        
        # Notify buyer that order is approved and they can pay
        buyer_user = order.buyer.user
        notification = Message(
            sender_id=artisan.user_id,
            receiver_id=buyer_user.id,
            product_id=order_item.product_id,
            order_id=order.id,
            content=f"Order Approved! Your order for {order_item.quantity} x {order_item.product.title} has been approved. Please proceed with payment.",
            is_read=False
        )
        g.db.add(notification)
        
        g.db.commit()
        
        return jsonify({
            'success': True,
            'message': 'Order approved successfully. Buyer has been notified to proceed with payment.'
        })
        
    except Exception as e:
        g.db.rollback()
        print(f"Approval error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

# Buyer pays for approved order
@bp.route('/api/pay-order/<int:order_id>', methods=['POST'])
@jwt_required()
def pay_order(order_id):
    user_id = int(get_jwt_identity())
    buyer = g.db.query(BuyerProfile).filter_by(user_id=user_id).first()
    
    if not buyer:
        return jsonify({'error': 'Buyer profile not found'}), 404
    
    order = g.db.query(Order).get(order_id)
    if not order:
        return jsonify({'error': 'Order not found'}), 404
    
    # Verify this is buyer's order
    if order.buyer_id != buyer.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    # Check if order is confirmed (approved by artisan)
    if order.status != OrderStatus.CONFIRMED:
        return jsonify({'error': 'Order must be approved by artisan before payment'}), 400
    
    # Check if already paid
    if order.payment_status == 'paid':
        return jsonify({'error': 'Order already paid'}), 400
    
    try:
        order_item = order.order_items[0] if order.order_items else None
        if not order_item:
            return jsonify({'error': 'Order has no items'}), 400
        
        product = order_item.product
        quantity = order_item.quantity
        
        # Calculate amounts for transaction
        product_price_inr = product.price * quantity
        platform_fee_inr = product_price_inr * 0.08
        artisan_receives_inr = product_price_inr - platform_fee_inr
        
        # Get exchange rate info
        inverse_rate = get_inverse_rate(order.currency)
        
        # Create Transaction Record
        transaction = Transaction(
            order_id=order.id,
            buyer_id=buyer.id,
            artisan_id=product.artisan_id,
            buyer_amount=order.total_amount,
            buyer_currency=order.currency,
            artisan_amount=artisan_receives_inr,
            artisan_currency='INR',
            platform_fee=platform_fee_inr,
            exchange_rate=inverse_rate,
            shipping_cost=0,  # Already included in total_amount
            shipping_option='standard',
            status='completed',
            payment_method='simulated',
            payment_id=f'pay_{order.id}'
        )
        g.db.add(transaction)
        
        # Update order payment status
        order.payment_status = 'paid'
        order.status = OrderStatus.IN_PRODUCTION
        
        # Update product stock
        product.stock_quantity -= quantity
        if product.stock_quantity <= 0:
            product.is_available = False
        
        # Update artisan stats
        product.artisan.total_sales += artisan_receives_inr
        product.artisan.total_orders += 1
        
        # Update buyer stats
        buyer.total_purchases += order.total_amount
        buyer.total_orders += 1
        
        # Notify artisan about payment
        notification = Message(
            sender_id=buyer.user_id,
            receiver_id=product.artisan.user_id,
            product_id=product.id,
            order_id=order.id,
            content=f"Payment Received! {buyer.user.full_name} has paid for {quantity} x {product.title}. You can now start production.",
            is_read=False
        )
        g.db.add(notification)
        
        g.db.commit()
        
        return jsonify({
            'success': True,
            'transaction_id': transaction.id,
            'message': 'Payment successful! Order is now in production.'
        })
        
    except Exception as e:
        g.db.rollback()
        print(f"Payment error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500
