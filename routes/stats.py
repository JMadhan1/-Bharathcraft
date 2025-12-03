from flask import Blueprint, jsonify, g
from models import ArtisanProfile, Product, Order

bp = Blueprint('stats', __name__, url_prefix='/api/stats')

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
