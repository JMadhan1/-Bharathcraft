from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Order, OrderItem, OrderMilestone, Product, BuyerProfile, ArtisanProfile, OrderStatus
from datetime import datetime
import stripe
import os

bp = Blueprint('orders', __name__, url_prefix='/api/orders')

stripe.api_key = os.getenv('STRIPE_SECRET_KEY', '')

@bp.route('/', methods=['POST'])
@jwt_required()
def create_order():
    from flask_jwt_extended import get_jwt
    
    user_id = int(get_jwt_identity())
    claims = get_jwt()
    role = claims.get('role')
    
    if role != 'buyer':
        return jsonify({'error': 'Only buyers can create orders'}), 403
    
    buyer = g.db.query(BuyerProfile).filter_by(user_id=user_id).first()
    if not buyer:
        return jsonify({'error': 'Buyer profile not found'}), 404
    
    data = request.json
    
    if 'items' not in data or not data['items']:
        return jsonify({'error': 'Order items required'}), 400
    
    total_amount = 0
    order_items = []
    
    for item in data['items']:
        product = g.db.query(Product).filter_by(id=item['product_id']).first()
        if not product or not product.is_available:
            return jsonify({'error': f"Product {item['product_id']} not available"}), 400
        
        quantity = item.get('quantity', 1)
        item_total = product.price * quantity
        total_amount += item_total
        
        order_items.append({
            'product': product,
            'quantity': quantity,
            'unit_price': product.price,
            'total_price': item_total
        })
    
    order = Order(
        buyer_id=buyer.id,
        status=OrderStatus.PENDING,
        total_amount=total_amount,
        currency='USD',
        shipping_address=data.get('shipping_address', '')
    )
    
    g.db.add(order)
    g.db.flush()
    
    for item in order_items:
        order_item = OrderItem(
            order_id=order.id,
            product_id=item['product'].id,
            quantity=item['quantity'],
            unit_price=item['unit_price'],
            total_price=item['total_price']
        )
        g.db.add(order_item)
    
    milestones = [
        OrderMilestone(order_id=order.id, milestone_name='Order Confirmed', percentage=25),
        OrderMilestone(order_id=order.id, milestone_name='In Production', percentage=50),
        OrderMilestone(order_id=order.id, milestone_name='Shipped', percentage=75),
        OrderMilestone(order_id=order.id, milestone_name='Delivered', percentage=100)
    ]
    
    for milestone in milestones:
        g.db.add(milestone)
    
    g.db.commit()
    
    return jsonify({
        'message': 'Order created successfully',
        'order': {
            'id': order.id,
            'total_amount': order.total_amount,
            'currency': order.currency,
            'status': order.status.value
        }
    }), 201

@bp.route('/', methods=['GET'])
@jwt_required()
def get_orders():
    from flask_jwt_extended import get_jwt
    
    user_id = int(get_jwt_identity())
    claims = get_jwt()
    role = claims.get('role')
    
    if role == 'buyer':
        buyer = g.db.query(BuyerProfile).filter_by(user_id=user_id).first()
        if not buyer:
            return jsonify({'error': 'Buyer profile not found'}), 404
        orders = g.db.query(Order).filter_by(buyer_id=buyer.id).all()
    elif role == 'artisan':
        orders = g.db.query(Order).join(OrderItem).join(Product).join(ArtisanProfile).filter(
            ArtisanProfile.user_id == user_id
        ).distinct().all()
    else:
        orders = g.db.query(Order).all()
    
    return jsonify([{
        'id': o.id,
        'total_amount': o.total_amount,
        'currency': o.currency,
        'status': o.status.value,
        'payment_status': o.payment_status,
        'created_at': o.created_at.isoformat(),
        'items_count': len(o.order_items),
        'quantity': o.order_items[0].quantity if o.order_items else 1,
        'product_id': o.order_items[0].product_id if o.order_items else None,
        'product_title': o.order_items[0].product.title if o.order_items and o.order_items[0].product else None,
        'artisan_id': o.artisan_id if hasattr(o, 'artisan_id') else (o.order_items[0].product.artisan.user_id if o.order_items and o.order_items[0].product else None),
        'artisan_location': o.order_items[0].product.artisan.state if o.order_items and o.order_items[0].product and o.order_items[0].product.artisan else None,
        'shipping_cost': o.shipping_cost or 0,
        'tracking_number': o.tracking_number
    } for o in orders]), 200

@bp.route('/<int:order_id>', methods=['GET'])
@jwt_required()
def get_order(order_id):
    order = g.db.query(Order).filter_by(id=order_id).first()
    
    if not order:
        return jsonify({'error': 'Order not found'}), 404
    
    return jsonify({
        'id': order.id,
        'total_amount': order.total_amount,
        'currency': order.currency,
        'status': order.status.value,
        'payment_status': order.payment_status,
        'shipping_address': order.shipping_address,
        'tracking_number': order.tracking_number,
        'created_at': order.created_at.isoformat(),
        'items': [{
            'product_id': item.product.id,
            'product_title': item.product.title,
            'quantity': item.quantity,
            'unit_price': item.unit_price,
            'total_price': item.total_price
        } for item in order.order_items],
        'milestones': [{
            'name': m.milestone_name,
            'status': m.status,
            'percentage': m.percentage,
            'completed_at': m.completed_at.isoformat() if m.completed_at else None
        } for m in order.milestones]
    }), 200

@bp.route('/<int:order_id>/status', methods=['PUT'])
@jwt_required()
def update_order_status(order_id):
    user_id = int(get_jwt_identity())
    data = request.json
    
    if 'status' not in data:
        return jsonify({'error': 'Status required'}), 400
    
    order = g.db.query(Order).filter_by(id=order_id).first()
    if not order:
        return jsonify({'error': 'Order not found'}), 404
    
    try:
        new_status = OrderStatus[data['status'].upper()]
        order.status = new_status
        order.updated_at = datetime.utcnow()
        
        milestone_map = {
            OrderStatus.CONFIRMED: 'Order Confirmed',
            OrderStatus.IN_PRODUCTION: 'In Production',
            OrderStatus.SHIPPED: 'Shipped',
            OrderStatus.DELIVERED: 'Delivered'
        }
        
        if new_status in milestone_map:
            milestone = g.db.query(OrderMilestone).filter_by(
                order_id=order.id,
                milestone_name=milestone_map[new_status]
            ).first()
            if milestone:
                milestone.status = 'completed'
                milestone.completed_at = datetime.utcnow()
        
        g.db.commit()
        
        return jsonify({'message': 'Order status updated successfully'}), 200
    except KeyError:
        return jsonify({'error': 'Invalid status'}), 400

@bp.route('/<int:order_id>/payment', methods=['POST'])
@jwt_required()
def create_payment_intent(order_id):
    from flask_jwt_extended import get_jwt
    
    user_id = int(get_jwt_identity())
    claims = get_jwt()
    role = claims.get('role')
    
    if role != 'buyer':
        return jsonify({'error': 'Only buyers can make payments'}), 403
    
    order = g.db.query(Order).filter_by(id=order_id).first()
    if not order:
        return jsonify({'error': 'Order not found'}), 404
    
    if order.buyer.user_id != user_id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    if stripe.api_key:
        try:
            intent = stripe.PaymentIntent.create(
                amount=int(order.total_amount * 100),
                currency=order.currency.lower(),
                metadata={'order_id': order.id}
            )
            
            order.payment_intent_id = intent.id
            g.db.commit()
            
            return jsonify({
                'client_secret': intent.client_secret,
                'payment_intent_id': intent.id
            }), 200
        except Exception as e:
            return jsonify({'error': str(e)}), 500
    else:
        return jsonify({'error': 'Payment processing not configured'}), 503
