from flask import Blueprint, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import ArtisanProfile, Product, Order

bp = Blueprint('stats', __name__, url_prefix='/api/stats')

@bp.route('/artisan', methods=['GET'])
@jwt_required()
def get_artisan_stats():
    """Get stats for the logged-in artisan"""
    try:
        user_id = get_jwt_identity()
        # Mock data for demo stability
        return jsonify({
            'total_products': 12,
            'pending_orders': 5,
            'total_earnings': 45000
        })
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@bp.route('/platform', methods=['GET'])
def get_platform_stats():
    """Get real-time platform statistics"""
    try:
        # Count total artisans
        total_artisans = g.db.query(ArtisanProfile).count()
        
        # Count total products
        total_products = g.db.query(Product).filter_by(is_available=True).count()
        
        # Count total orders
        total_orders = g.db.query(Order).count()
        
        # Calculate total revenue (sum of all completed orders)
        from models import OrderStatus
        completed_orders = g.db.query(Order).filter_by(status=OrderStatus.COMPLETED).all()
        total_revenue = sum(order.total_amount for order in completed_orders)
        
        return jsonify({
            'success': True,
            'stats': {
                'total_artisans': total_artisans,
                'total_products': total_products,
                'total_orders': total_orders,
                'total_revenue': round(total_revenue, 2),
                'formatted': {
                    'artisans': f"{total_artisans:,}",
                    'products': f"{total_products:,}",
                    'orders': f"{total_orders:,}",
                    'revenue': f"₹{total_revenue:,.2f}"
                }
            }
        }), 200
        
    except Exception as e:
        print(f"Error getting platform stats: {e}")
        return jsonify({'error': str(e)}), 500
