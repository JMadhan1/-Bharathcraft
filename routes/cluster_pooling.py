"""
Cluster Logistics Pooling API Routes
40% shipping cost savings by combining orders!
"""

from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User, Order, ArtisanProfile, Product
from utils.cluster_pooling import (
    find_poolable_orders,
    calculate_shipping_savings,
    create_consolidated_shipment,
    find_optimal_clusters,
    get_micro_warehouse_location,
    estimate_pickup_schedule,
    get_cluster_analytics
)

bp = Blueprint('cluster_pooling', __name__, url_prefix='/api/cluster-pooling')


@bp.route('/find-opportunities', methods=['POST'])
@jwt_required()
def find_pooling_opportunities():
    """
    Find pooling opportunities for an artisan's order
    
    POST /api/cluster-pooling/find-opportunities
    {
        "order_id": 123
    }
    """
    try:
        current_user_id = int(get_jwt_identity())
        data = request.json
        
        order_id = data.get('order_id')
        if not order_id:
            return jsonify({'error': 'order_id is required'}), 400
        
        # Get order and artisan location
        order = Order.query.get(order_id)
        if not order or order.artisan_id != current_user_id:
            return jsonify({'error': 'Order not found or unauthorized'}), 404
        
        artisan_profile = ArtisanProfile.query.filter_by(user_id=current_user_id).first()
        if not artisan_profile:
            return jsonify({'error': 'Artisan profile not found'}), 404
        
        artisan_location = {
            'district': artisan_profile.district,
            'state': artisan_profile.state
        }
        
        # Find poolable orders
        poolable_order_ids = find_poolable_orders(
            artisan_location=artisan_location,
            destination_country='US',  # Would get from buyer in real system
            time_window_days=7
        )
        
        if not poolable_order_ids or len(poolable_order_ids) <= 1:
            return jsonify({
                'success': True,
                'pooling_available': False,
                'message': 'No other orders found for pooling at this time. Your order will ship individually.',
                'individual_shipping_cost': order.shipping_cost or 0
            }), 200
        
        # Prepare orders data for calculation
        orders_data = []
        for oid in poolable_order_ids:
            o = Order.query.get(oid)
            if o:
                # Estimate weight (in real system, this comes from product)
                estimated_weight = o.quantity * 0.5  # 0.5kg per item
                orders_data.append({
                    'order_id': o.id,
                    'artisan_id': o.artisan_id,
                    'weight_kg': estimated_weight
                })
        
        # Calculate savings
        savings_data = calculate_shipping_savings(orders_data, 'US')
        
        # Get warehouse location
        warehouse = get_micro_warehouse_location(artisan_profile.district, artisan_profile.state)
        
        # Get pickup schedule
        schedule = estimate_pickup_schedule(orders_data, warehouse)
        
        # Find user's order in cost splits
        user_cost_split = next(
            (split for split in savings_data['cost_splits'] if split['order_id'] == order_id),
            None
        )
        
        return jsonify({
            'success': True,
            'pooling_available': True,
            'your_order': {
                'order_id': order_id,
                'individual_cost': user_cost_split['individual_cost'] if user_cost_split else 0,
                'pooled_cost': user_cost_split['pooled_cost'] if user_cost_split else 0,
                'savings': user_cost_split['savings'] if user_cost_split else 0,
                'savings_percent': user_cost_split['savings_percent'] if user_cost_split else 0
            },
            'cluster_info': {
                'total_orders': len(poolable_order_ids),
                'total_artisans': len(set(o['artisan_id'] for o in orders_data)),
                'total_savings': savings_data['total_savings'],
                'warehouse_location': warehouse
            },
            'schedule': schedule,
            'message': f"Great news! Your order can be pooled with {len(poolable_order_ids)-1} other orders. You'll save ₹{user_cost_split['savings'] if user_cost_split else 0:.2f} ({user_cost_split['savings_percent'] if user_cost_split else 0}%)!"
        }), 200
        
    except Exception as e:
        print(f"Error finding pooling opportunities: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/opt-in/<int:order_id>', methods=['POST'])
@jwt_required()
def opt_in_to_pooling(order_id):
    """
    Opt-in to cluster pooling for an order
    
    POST /api/cluster-pooling/opt-in/123
    """
    try:
        current_user_id = int(get_jwt_identity())
        
        order = Order.query.get(order_id)
        if not order or order.artisan_id != current_user_id:
            return jsonify({'error': 'Order not found or unauthorized'}), 404
        
        # Update order to indicate pooling preference
        # In real system, would have a separate table for pooling metadata
        order.shipping_method = 'pooled'
        g.db.commit()
        
        return jsonify({
            'success': True,
            'message': 'Successfully opted-in to cluster pooling! We\'ll notify you when the consolidated shipment is ready.',
            'order_id': order_id
        }), 200
        
    except Exception as e:
        print(f"Error opting in to pooling: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/calculate-savings', methods=['POST'])
@jwt_required()
def calculate_savings():
    """
    Calculate potential savings for a set of orders
    
    POST /api/cluster-pooling/calculate-savings
    {
        "orders": [
            {"order_id": 1, "weight_kg": 2.5, "artisan_id": 10},
            {"order_id": 2, "weight_kg": 3.0, "artisan_id": 11}
        ],
        "destination_country": "US"
    }
    """
    try:
        data = request.json
        
        orders_data = data.get('orders', [])
        destination_country = data.get('destination_country', 'US')
        
        if not orders_data:
            return jsonify({'error': 'orders array is required'}), 400
        
        savings_data = calculate_shipping_savings(orders_data, destination_country)
        
        return jsonify({
            'success': True,
            'savings': savings_data
        }), 200
        
    except Exception as e:
        print(f"Error calculating savings: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/create-shipment', methods=['POST'])
@jwt_required()
def create_shipment():
    """
    Create a consolidated shipment from multiple orders
    (Admin/system function)
    
    POST /api/cluster-pooling/create-shipment
    {
        "order_ids": [1, 2, 3, 4],
        "destination_address": "123 Main St, New York, NY 10001, USA"
    }
    """
    try:
        data = request.json
        
        order_ids = data.get('order_ids', [])
        destination_address = data.get('destination_address')
        
        if not order_ids or not destination_address:
            return jsonify({'error': 'order_ids and destination_address are required'}), 400
        
        shipment = create_consolidated_shipment(order_ids, destination_address)
        
        # Update orders with shipment info
        for oid in order_ids:
            order = g.db.query(Order).get(oid)
            if order:
                order.tracking_number = shipment['shipment_id']
                order.status = 'shipped'
        
        g.db.commit()
        
        return jsonify({
            'success': True,
            'shipment': shipment
        }), 201
        
    except Exception as e:
        print(f"Error creating shipment: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/warehouse/<state>', methods=['GET'])
def get_warehouse_location(state):
    """
    Get nearest warehouse location for a state
    No auth required - informational endpoint
    
    GET /api/cluster-pooling/warehouse/Rajasthan
    """
    try:
        warehouse = get_micro_warehouse_location(None, state)
        
        return jsonify({
            'success': True,
            'state': state,
            'warehouse': warehouse
        }), 200
        
    except Exception as e:
        print(f"Error getting warehouse: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/analytics', methods=['GET'])
@jwt_required()
def get_analytics():
    """
    Get cluster analytics for artisan's region
    Shows potential savings
    
    GET /api/cluster-pooling/analytics
    """
    try:
        current_user_id = int(get_jwt_identity())
        
        artisan_profile = ArtisanProfile.query.filter_by(user_id=current_user_id).first()
        if not artisan_profile:
            return jsonify({'error': 'Artisan profile not found'}), 404
        
        analytics = get_cluster_analytics(artisan_profile.district, artisan_profile.state)
        
        return jsonify({
            'success': True,
            'analytics': analytics
        }), 200
        
    except Exception as e:
        print(f"Error getting analytics: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/clusters/active', methods=['GET'])
@jwt_required()
def get_active_clusters():
    """
    Get active pooled shipments for current user
    
    GET /api/cluster-pooling/clusters/active
    """
    try:
        current_user_id = int(get_jwt_identity())
        
        # Find orders that are part of pooled shipments
        pooled_orders = g.db.query(Order).filter_by(
            artisan_id=current_user_id,
            shipping_method='pooled'
        ).all()
        
        clusters = {}
        for order in pooled_orders:
            tracking = order.tracking_number
            if tracking and tracking.startswith('POOL-'):
                if tracking not in clusters:
                    clusters[tracking] = {
                        'shipment_id': tracking,
                        'orders': [],
                        'status': order.status,
                        'created_at': order.created_at.isoformat()
                    }
                
                clusters[tracking]['orders'].append({
                    'order_id': order.id,
                    'product_id': order.product_id,
                    'quantity': order.quantity,
                    'total_amount': order.total_amount
                })
        
        return jsonify({
            'success': True,
            'active_clusters': list(clusters.values()),
            'total_clusters': len(clusters)
        }), 200
        
    except Exception as e:
        print(f"Error getting active clusters: {str(e)}")
        return jsonify({'error': str(e)}), 500

