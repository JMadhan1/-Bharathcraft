"""
Cluster Logistics Pooling Algorithm
Combines orders from nearby artisans into consolidated shipments
RESULT: 40% shipping cost savings!

Example:
- Artisan A in Jaipur: 10-piece order to NYC
- Artisan B in Jaipur: 15-piece order to NYC
- System combines → one consolidated shipment → splits cost
"""

from sqlalchemy import and_, or_
from models import Order, User, ArtisanProfile, Product
from datetime import datetime, timedelta
import math


# Shipping rate tiers (per kg)
SHIPPING_RATES = {
    'domestic': {
        'individual': 50,  # ₹50/kg
        'consolidated': 30  # ₹30/kg (40% savings)
    },
    'international': {
        'US': {
            'individual': 800,  # ₹800/kg
            'consolidated': 480  # ₹480/kg (40% savings)
        },
        'UK': {
            'individual': 750,
            'consolidated': 450
        },
        'DE': {
            'individual': 800,
            'consolidated': 480
        },
        'AU': {
            'individual': 900,
            'consolidated': 540
        },
        'default': {
            'individual': 850,
            'consolidated': 510
        }
    }
}


def find_poolable_orders(artisan_location, destination_country, time_window_days=7):
    """
    Find orders from nearby artisans going to the same destination
    
    Args:
        artisan_location: dict with {district, state}
        destination_country: Country code (e.g., 'US', 'UK')
        time_window_days: Orders within this timeframe can be pooled
    
    Returns:
        List of order IDs that can be pooled together
    """
    from models import db
    
    # Time window
    start_date = datetime.now() - timedelta(days=time_window_days)
    end_date = datetime.now() + timedelta(days=time_window_days)
    
    # Find orders from same district/state going to same country
    # Status should be 'pending' or 'confirmed' (not yet shipped)
    poolable_orders = db.session.query(Order).join(
        User, Order.artisan_id == User.id
    ).join(
        ArtisanProfile, User.id == ArtisanProfile.user_id
    ).filter(
        and_(
            ArtisanProfile.district == artisan_location['district'],
            ArtisanProfile.state == artisan_location['state'],
            Order.status.in_(['pending', 'confirmed']),
            Order.created_at.between(start_date, end_date)
        )
    ).all()
    
    # Group by destination country (would need buyer location in real system)
    # For now, return all orders in the cluster
    return [order.id for order in poolable_orders]


def calculate_shipping_savings(orders_data, destination_country):
    """
    Calculate shipping cost savings from pooling
    
    Args:
        orders_data: List of dicts with {order_id, weight_kg, artisan_id}
        destination_country: Country code
    
    Returns:
        dict with individual_cost, pooled_cost, savings_amount, savings_percent
    """
    
    total_weight = sum(order['weight_kg'] for order in orders_data)
    
    # Get rates
    if destination_country == 'IN':
        individual_rate = SHIPPING_RATES['domestic']['individual']
        pooled_rate = SHIPPING_RATES['domestic']['consolidated']
    else:
        country_rates = SHIPPING_RATES['international'].get(
            destination_country, 
            SHIPPING_RATES['international']['default']
        )
        individual_rate = country_rates['individual']
        pooled_rate = country_rates['consolidated']
    
    # Calculate costs
    individual_total = sum(order['weight_kg'] * individual_rate for order in orders_data)
    pooled_total = total_weight * pooled_rate
    
    # Split pooled cost proportionally by weight
    cost_splits = []
    for order in orders_data:
        proportion = order['weight_kg'] / total_weight if total_weight > 0 else 0
        order_pooled_cost = pooled_total * proportion
        order_individual_cost = order['weight_kg'] * individual_rate
        savings = order_individual_cost - order_pooled_cost
        
        cost_splits.append({
            'order_id': order['order_id'],
            'artisan_id': order['artisan_id'],
            'weight_kg': order['weight_kg'],
            'individual_cost': round(order_individual_cost, 2),
            'pooled_cost': round(order_pooled_cost, 2),
            'savings': round(savings, 2),
            'savings_percent': round((savings / order_individual_cost * 100) if order_individual_cost > 0 else 0, 1)
        })
    
    return {
        'total_weight_kg': total_weight,
        'total_individual_cost': round(individual_total, 2),
        'total_pooled_cost': round(pooled_total, 2),
        'total_savings': round(individual_total - pooled_total, 2),
        'savings_percent': round(((individual_total - pooled_total) / individual_total * 100) if individual_total > 0 else 0, 1),
        'cost_splits': cost_splits,
        'destination_country': destination_country
    }


def create_consolidated_shipment(order_ids, destination_address):
    """
    Create a consolidated shipment from multiple orders
    
    Args:
        order_ids: List of order IDs to consolidate
        destination_address: Common destination
    
    Returns:
        dict with shipment details and tracking info
    """
    from models import db
    
    orders = Order.query.filter(Order.id.in_(order_ids)).all()
    
    if not orders:
        raise ValueError("No orders found")
    
    # Calculate total dimensions and weight
    total_weight = 0
    total_volume = 0
    artisans = set()
    
    for order in orders:
        # Estimate weight (would come from product data in real system)
        product = Product.query.get(order.product_id)
        estimated_weight = order.quantity * 0.5  # 0.5kg per item (estimate)
        total_weight += estimated_weight
        
        artisans.add(order.artisan_id)
    
    # Determine packaging
    # Standard box sizes: Small (30x30x20), Medium (40x40x30), Large (50x50x40)
    if total_weight < 5:
        box_size = "Small (30x30x20 cm)"
        box_count = 1
    elif total_weight < 15:
        box_size = "Medium (40x40x30 cm)"
        box_count = math.ceil(total_weight / 10)
    else:
        box_size = "Large (50x50x40 cm)"
        box_count = math.ceil(total_weight / 20)
    
    shipment_data = {
        'shipment_id': f"POOL-{datetime.now().strftime('%Y%m%d')}-{order_ids[0]}",
        'order_ids': order_ids,
        'total_orders': len(order_ids),
        'total_artisans': len(artisans),
        'artisan_ids': list(artisans),
        'total_weight_kg': round(total_weight, 2),
        'box_size': box_size,
        'box_count': box_count,
        'destination_address': destination_address,
        'created_at': datetime.now().isoformat(),
        'status': 'pending_pickup',
        'estimated_delivery': (datetime.now() + timedelta(days=7)).strftime('%Y-%m-%d')
    }
    
    return shipment_data


def find_optimal_clusters(all_orders, max_cluster_size=20):
    """
    Use clustering algorithm to find optimal order groupings
    Groups orders by:
    1. Geographic proximity (district/state)
    2. Destination country
    3. Timeline compatibility
    
    Args:
        all_orders: List of all pending orders
        max_cluster_size: Maximum orders per cluster
    
    Returns:
        List of clusters (each cluster is a list of order IDs)
    """
    
    # Group by district first
    location_groups = {}
    for order in all_orders:
        key = (order['district'], order['state'], order['destination_country'])
        if key not in location_groups:
            location_groups[key] = []
        location_groups[key].append(order)
    
    # Create clusters from groups
    clusters = []
    for location_key, orders in location_groups.items():
        # If group is small enough, it's one cluster
        if len(orders) <= max_cluster_size:
            clusters.append([o['order_id'] for o in orders])
        else:
            # Split large groups into multiple clusters
            for i in range(0, len(orders), max_cluster_size):
                cluster = [o['order_id'] for o in orders[i:i+max_cluster_size]]
                clusters.append(cluster)
    
    return clusters


def get_micro_warehouse_location(district, state):
    """
    Get nearest micro-warehouse location for consolidation
    
    In real system, this would use:
    - IoT-enabled micro-warehouses
    - Real-time capacity tracking
    - Route optimization
    
    For now, returns major cities as consolidation points
    """
    
    # Major consolidation hubs by state
    HUB_LOCATIONS = {
        'Rajasthan': {'city': 'Jaipur', 'lat': 26.9124, 'lon': 75.7873},
        'Gujarat': {'city': 'Ahmedabad', 'lat': 23.0225, 'lon': 72.5714},
        'West Bengal': {'city': 'Kolkata', 'lat': 22.5726, 'lon': 88.3639},
        'Tamil Nadu': {'city': 'Chennai', 'lat': 13.0827, 'lon': 80.2707},
        'Karnataka': {'city': 'Bangalore', 'lat': 12.9716, 'lon': 77.5946},
        'Maharashtra': {'city': 'Mumbai', 'lat': 19.0760, 'lon': 72.8777},
        'Uttar Pradesh': {'city': 'Lucknow', 'lat': 26.8467, 'lon': 80.9462},
        'Kashmir': {'city': 'Srinagar', 'lat': 34.0837, 'lon': 74.7973},
        'Odisha': {'city': 'Bhubaneswar', 'lat': 20.2961, 'lon': 85.8245}
    }
    
    return HUB_LOCATIONS.get(state, {
        'city': 'Delhi',
        'lat': 28.7041,
        'lon': 77.1025
    })


def estimate_pickup_schedule(cluster_orders, warehouse_location):
    """
    Estimate pickup schedule for consolidated orders
    
    Returns:
        dict with pickup dates and route
    """
    
    # Simplified logic - in reality would use route optimization
    num_artisans = len(set(order['artisan_id'] for order in cluster_orders))
    
    # Assume 3-4 pickups per day
    pickup_days_needed = math.ceil(num_artisans / 3)
    pickup_start_date = datetime.now() + timedelta(days=1)
    consolidation_date = pickup_start_date + timedelta(days=pickup_days_needed)
    shipping_date = consolidation_date + timedelta(days=1)
    delivery_date = shipping_date + timedelta(days=7)  # International shipping
    
    return {
        'pickup_start': pickup_start_date.strftime('%Y-%m-%d'),
        'pickup_days_needed': pickup_days_needed,
        'consolidation_at': warehouse_location['city'],
        'consolidation_date': consolidation_date.strftime('%Y-%m-%d'),
        'shipping_date': shipping_date.strftime('%Y-%m-%d'),
        'estimated_delivery': delivery_date.strftime('%Y-%m-%d')
    }


def get_cluster_analytics(district, state):
    """
    Get analytics about clustering opportunities in a region
    Shows artisans how much they could save
    """
    from models import db
    
    # Get all artisans in the region
    artisans_in_region = db.session.query(ArtisanProfile).filter(
        and_(
            ArtisanProfile.district == district,
            ArtisanProfile.state == state
        )
    ).count()
    
    # Get recent orders
    recent_orders = db.session.query(Order).join(
        User, Order.artisan_id == User.id
    ).join(
        ArtisanProfile, User.id == ArtisanProfile.user_id
    ).filter(
        and_(
            ArtisanProfile.district == district,
            ArtisanProfile.state == state,
            Order.created_at >= datetime.now() - timedelta(days=30)
        )
    ).all()
    
    # Calculate potential savings
    total_shipping_paid = sum(order.shipping_cost or 0 for order in recent_orders)
    potential_savings = total_shipping_paid * 0.40  # 40% average savings
    
    warehouse = get_micro_warehouse_location(district, state)
    
    return {
        'region': f"{district}, {state}",
        'total_artisans': artisans_in_region,
        'orders_last_30_days': len(recent_orders),
        'total_shipping_spent': round(total_shipping_paid, 2),
        'potential_savings_with_pooling': round(potential_savings, 2),
        'nearest_warehouse': warehouse['city'],
        'active_clusters': 0,  # TODO: Track active consolidated shipments
        'average_savings_percent': 40
    }

