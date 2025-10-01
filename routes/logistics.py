from flask import Blueprint, request, jsonify, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import Order, ExportDocument
from datetime import datetime
import json

bp = Blueprint('logistics', __name__, url_prefix='/api/logistics')

SHIPPING_RATES = {
    'DHL': {'base': 50, 'per_kg': 15},
    'FedEx': {'base': 45, 'per_kg': 14},
    'IndiaPost': {'base': 25, 'per_kg': 8}
}

@bp.route('/calculate', methods=['POST'])
@jwt_required()
def calculate_shipping():
    data = request.json
    
    if not all(k in data for k in ['weight', 'destination_country']):
        return jsonify({'error': 'Weight and destination required'}), 400
    
    weight = float(data['weight'])
    destination = data['destination_country']
    
    estimates = []
    for carrier, rates in SHIPPING_RATES.items():
        cost = rates['base'] + (weight * rates['per_kg'])
        estimates.append({
            'carrier': carrier,
            'cost': round(cost, 2),
            'currency': 'USD',
            'delivery_days': 7 if carrier == 'DHL' else (10 if carrier == 'FedEx' else 21)
        })
    
    return jsonify({
        'destination': destination,
        'weight_kg': weight,
        'estimates': estimates
    }), 200

@bp.route('/export-docs/<int:order_id>', methods=['POST'])
@jwt_required()
def generate_export_docs(order_id):
    identity = get_jwt_identity()
    
    order = g.db.query(Order).filter_by(id=order_id).first()
    if not order:
        return jsonify({'error': 'Order not found'}), 404
    
    if identity['role'] == 'buyer' and order.buyer.user_id != identity['id']:
        return jsonify({'error': 'Unauthorized access to this order'}), 403
    
    if identity['role'] == 'artisan':
        artisan_order = any(item.product.artisan.user_id == identity['id'] for item in order.order_items)
        if not artisan_order:
            return jsonify({'error': 'Unauthorized access to this order'}), 403
    
    data = request.json
    doc_type = data.get('document_type', 'commercial_invoice')
    
    doc_content = {
        'order_id': order.id,
        'date': datetime.utcnow().isoformat(),
        'buyer': {
            'name': order.buyer.user.full_name,
            'company': order.buyer.company_name,
            'address': order.shipping_address
        },
        'items': [{
            'product': item.product.title,
            'quantity': item.quantity,
            'unit_price': item.unit_price,
            'total': item.total_price
        } for item in order.order_items],
        'total_amount': order.total_amount,
        'currency': order.currency,
        'document_type': doc_type
    }
    
    if doc_type == 'commercial_invoice':
        doc_content['invoice_number'] = f"INV-{order.id}-{datetime.utcnow().strftime('%Y%m%d')}"
        doc_content['terms'] = 'FOB Mumbai'
        doc_content['payment_terms'] = 'Advance Payment'
    elif doc_type == 'packing_list':
        doc_content['packing_number'] = f"PKG-{order.id}-{datetime.utcnow().strftime('%Y%m%d')}"
        doc_content['gross_weight'] = sum(item.quantity * 0.5 for item in order.order_items)
        doc_content['net_weight'] = sum(item.quantity * 0.4 for item in order.order_items)
    elif doc_type == 'certificate_of_origin':
        doc_content['certificate_number'] = f"COO-{order.id}-{datetime.utcnow().strftime('%Y%m%d')}"
        doc_content['country_of_origin'] = 'India'
        doc_content['hs_codes'] = ['6214.10', '6302.22']
    
    export_doc = ExportDocument(
        order_id=order.id,
        document_type=doc_type,
        document_data=json.dumps(doc_content)
    )
    
    g.db.add(export_doc)
    g.db.commit()
    
    return jsonify({
        'message': 'Export document generated',
        'document': doc_content
    }), 201

@bp.route('/export-docs/<int:order_id>', methods=['GET'])
@jwt_required()
def get_export_docs(order_id):
    identity = get_jwt_identity()
    
    order = g.db.query(Order).filter_by(id=order_id).first()
    if not order:
        return jsonify({'error': 'Order not found'}), 404
    
    if identity['role'] == 'buyer' and order.buyer.user_id != identity['id']:
        return jsonify({'error': 'Unauthorized access to this order'}), 403
    
    if identity['role'] == 'artisan':
        artisan_order = any(item.product.artisan.user_id == identity['id'] for item in order.order_items)
        if not artisan_order:
            return jsonify({'error': 'Unauthorized access to this order'}), 403
    
    docs = g.db.query(ExportDocument).filter_by(order_id=order_id).all()
    
    return jsonify([{
        'id': d.id,
        'document_type': d.document_type,
        'generated_at': d.generated_at.isoformat(),
        'document_data': json.loads(d.document_data)
    } for d in docs]), 200
