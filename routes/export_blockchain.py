"""
Export Documentation and Blockchain API Routes
"""

from flask import Blueprint, request, jsonify, send_file
from flask_login import login_required, current_user
from utils.export_documentation import export_doc_generator
from utils.blockchain import blockchain_service, transaction_tracker
from models import Order, Product, User
import io

export_bp = Blueprint('export', __name__, url_prefix='/api/export')

@export_bp.route('/generate-documents/<int:order_id>', methods=['POST'])
@login_required
def generate_export_documents(order_id):
    """Generate complete export documentation package"""
    try:
        order = Order.query.get_or_404(order_id)
        
        # Verify user has access to this order
        if current_user.id not in [order.buyer_id, order.seller_id]:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Get buyer and seller data
        buyer = User.query.get(order.buyer_id)
        seller = User.query.get(order.seller_id)
        
        # Get destination country from request or buyer profile
        destination_country = request.json.get('destination_country', buyer.country or 'USA')
        
        # Prepare order data
        order_data = {
            'id': order.id,
            'items': [{
                'title': item.product.title,
                'quantity': item.quantity,
                'price': float(item.price),
                'hs_code': item.product.hs_code or '9701.10.00',
                'weight': item.product.weight or 1.0
            } for item in order.items],
            'total_amount': float(order.total_amount),
            'shipping_cost': float(order.shipping_cost or 0),
            'payment_terms': 'Net 30',
            'incoterms': 'FOB',
            'package_count': len(order.items),
            'total_weight': sum(item.product.weight or 1.0 for item in order.items),
            'dimensions': '40x30x20'
        }
        
        buyer_data = {
            'name': buyer.full_name,
            'company': buyer.company_name or 'Individual Buyer',
            'address': buyer.company_address or buyer.address or 'Address on file',
            'country': buyer.country or 'USA'
        }
        
        artisan_data = {
            'name': seller.full_name,
            'address': seller.address or 'India',
            'gstin': seller.gstin or 'XXXXXXXXX'
        }
        
        # Generate documents
        documents, requirements = export_doc_generator.generate_complete_export_package(
            order_data, buyer_data, artisan_data, destination_country
        )
        
        # Record on blockchain
        blockchain_record = transaction_tracker.record_order_placement({
            'id': order.id,
            'buyer_id': order.buyer_id,
            'seller_id': order.seller_id,
            'total_amount': float(order.total_amount)
        })
        
        return jsonify({
            'success': True,
            'documents_generated': list(documents.keys()),
            'requirements': requirements,
            'blockchain_record': blockchain_record,
            'message': f'Export documents generated for {destination_country}'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@export_bp.route('/download-document/<int:order_id>/<doc_type>', methods=['GET'])
@login_required
def download_export_document(order_id, doc_type):
    """Download specific export document"""
    try:
        order = Order.query.get_or_404(order_id)
        
        # Verify access
        if current_user.id not in [order.buyer_id, order.seller_id]:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Get data
        buyer = User.query.get(order.buyer_id)
        seller = User.query.get(order.seller_id)
        destination_country = buyer.country or 'USA'
        
        order_data = {
            'id': order.id,
            'items': [{
                'title': item.product.title,
                'quantity': item.quantity,
                'price': float(item.price),
                'hs_code': item.product.hs_code or '9701.10.00'
            } for item in order.items],
            'total_amount': float(order.total_amount),
            'shipping_cost': float(order.shipping_cost or 0)
        }
        
        buyer_data = {
            'name': buyer.full_name,
            'company': buyer.company_name or 'Individual',
            'address': buyer.company_address or 'Address on file',
            'country': buyer.country or 'USA'
        }
        
        artisan_data = {
            'name': seller.full_name,
            'address': seller.address or 'India',
            'gstin': seller.gstin or 'XXXXXXXXX'
        }
        
        # Generate specific document
        if doc_type == 'certificate_of_origin':
            pdf_buffer = export_doc_generator.generate_certificate_of_origin(
                order_data['items'][0], destination_country
            )
            filename = f'Certificate_of_Origin_{order_id}.pdf'
        elif doc_type == 'commercial_invoice':
            pdf_buffer = export_doc_generator.generate_commercial_invoice(
                order_data, buyer_data, artisan_data
            )
            filename = f'Commercial_Invoice_{order_id}.pdf'
        elif doc_type == 'packing_list':
            pdf_buffer = export_doc_generator.generate_packing_list(order_data)
            filename = f'Packing_List_{order_id}.pdf'
        else:
            return jsonify({'error': 'Invalid document type'}), 400
        
        return send_file(
            pdf_buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=filename
        )
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@export_bp.route('/country-requirements/<country>', methods=['GET'])
def get_country_requirements(country):
    """Get export requirements for a specific country"""
    requirements = export_doc_generator.get_country_requirements(country)
    return jsonify({
        'country': country,
        'requirements': requirements
    })


# Blockchain routes
blockchain_bp = Blueprint('blockchain', __name__, url_prefix='/api/blockchain')

@blockchain_bp.route('/create-escrow', methods=['POST'])
@login_required
def create_escrow():
    """Create blockchain escrow for order"""
    try:
        data = request.json
        order_id = data.get('order_id')
        
        order = Order.query.get_or_404(order_id)
        
        # Verify buyer is creating escrow
        if current_user.id != order.buyer_id:
            return jsonify({'error': 'Only buyer can create escrow'}), 403
        
        escrow_data = {
            'order_id': str(order.id),
            'buyer_address': data.get('buyer_address', f'0x{current_user.id:040x}'),
            'seller_address': data.get('seller_address', f'0x{order.seller_id:040x}'),
            'amount': float(order.total_amount),
            'delivery_deadline': data.get('delivery_deadline', '')
        }
        
        result = blockchain_service.create_escrow(escrow_data)
        
        if result['success']:
            # Update order with escrow details
            order.escrow_id = result['escrow']['escrow_id']
            order.blockchain_tx = result['escrow']['blockchain_tx']
            order.save()
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@blockchain_bp.route('/release-payment/<escrow_id>', methods=['POST'])
@login_required
def release_payment(escrow_id):
    """Release payment from escrow"""
    try:
        delivery_confirmation = request.json
        
        # Verify delivery confirmation has required fields
        required_fields = ['tracking_number', 'delivery_date', 'signature']
        if not all(field in delivery_confirmation for field in required_fields):
            return jsonify({'error': 'Missing delivery confirmation fields'}), 400
        
        result = blockchain_service.release_payment(escrow_id, delivery_confirmation)
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500


@blockchain_bp.route('/escrow-status/<escrow_id>', methods=['GET'])
@login_required
def get_escrow_status(escrow_id):
    """Get escrow status"""
    status = blockchain_service.get_escrow_status(escrow_id)
    return jsonify(status)


@blockchain_bp.route('/record-quality-certificate', methods=['POST'])
@login_required
def record_quality_certificate():
    """Record quality certificate on blockchain"""
    try:
        certificate_data = request.json
        
        record = transaction_tracker.record_quality_certificate(certificate_data)
        
        return jsonify({
            'success': True,
            'blockchain_record': record,
            'message': 'Quality certificate recorded on blockchain'
        })
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500
