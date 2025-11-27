"""
Export Documentation API Routes
Turns 3-week export prep into 3-hour process!
"""

from flask import Blueprint, request, jsonify, send_file, g
from flask_jwt_extended import jwt_required, get_jwt_identity
from models import User, Order, Product, ArtisanProfile, BuyerProfile
from utils.export_docs import (
    generate_commercial_invoice,
    generate_packing_list,
    generate_certificate_of_origin,
    assign_hs_code,
    get_country_requirements,
    check_compliance
)
from datetime import datetime
import io
import zipfile

bp = Blueprint('export_docs', __name__, url_prefix='/api/export-docs')


@bp.route('/generate/<int:order_id>', methods=['POST'])
@jwt_required()
def generate_all_documents(order_id):
    """
    Generate ALL export documents for an order
    Returns a ZIP file with all PDFs
    
    POST /api/export-docs/generate/123
    {
        "documents": ["invoice", "packing_list", "certificate_of_origin"],
        "invoice_no": "INV-2024-001" (optional)
    }
    """
    try:
        current_user_id = int(get_jwt_identity())
        
        # Get order
        order = g.db.query(Order).get(order_id)
        if not order:
            return jsonify({'error': 'Order not found'}), 404
        
        # Check authorization
        if order.artisan_id != current_user_id:
            return jsonify({'error': 'Unauthorized'}), 403
        
        # Get related data
        artisan = g.db.query(User).get(order.artisan_id)
        artisan_profile = g.db.query(ArtisanProfile).filter_by(user_id=order.artisan_id).first()
        buyer = g.db.query(User).get(order.buyer_id)
        buyer_profile = g.db.query(BuyerProfile).filter_by(user_id=order.buyer_id).first()
        product = g.db.query(Product).get(order.product_id)
        
        if not all([artisan, buyer, product]):
            return jsonify({'error': 'Missing required data'}), 400
        
        # Prepare data
        data = request.json or {}
        invoice_no = data.get('invoice_no', f"INV-{order.id}-{datetime.now().year}")
        
        order_data = {
            'order_id': order.id,
            'invoice_no': invoice_no,
            'date': datetime.now().strftime('%Y-%m-%d'),
            'quantity': order.quantity,
            'shipping_cost': order.shipping_cost or 0,
            'tax': 0,  # Calculate based on requirements
        }
        
        artisan_data = {
            'name': artisan.full_name,
            'address': f"{artisan_profile.village if artisan_profile else ''}, {artisan_profile.district if artisan_profile else ''}, {artisan_profile.state if artisan_profile else 'India'}",
            'gstin': artisan_profile.gstin if artisan_profile else 'N/A',
            'phone': artisan.phone or 'N/A',
            'email': artisan.email
        }
        
        buyer_data = {
            'name': buyer.full_name,
            'company': buyer_profile.company_name if buyer_profile else '',
            'address': buyer_profile.shipping_address if buyer_profile else '',
            'country': buyer_profile.country if buyer_profile else 'Unknown',
            'email': buyer.email
        }
        
        # Assign HS code if not present
        hs_code = assign_hs_code(product.craft_type)
        
        product_data = [{
            'title': product.title,
            'quantity': order.quantity,
            'unit_price': product.price,
            'hs_code': hs_code,
            'craft_type': product.craft_type,
            'weight': 0.5,  # Default weight
            'dimensions': '30x30x15 cm'  # Default dimensions
        }]
        
        # Generate documents
        documents_to_generate = data.get('documents', ['invoice', 'packing_list', 'certificate_of_origin'])
        
        generated_docs = {}
        
        if 'invoice' in documents_to_generate:
            invoice_pdf = generate_commercial_invoice(order_data, artisan_data, buyer_data, product_data)
            generated_docs['commercial_invoice.pdf'] = invoice_pdf.getvalue()
        
        if 'packing_list' in documents_to_generate:
            packing_pdf = generate_packing_list(order_data, artisan_data, buyer_data, product_data)
            generated_docs['packing_list.pdf'] = packing_pdf.getvalue()
        
        if 'certificate_of_origin' in documents_to_generate:
            cert_pdf = generate_certificate_of_origin(order_data, artisan_data, buyer_data, product_data)
            generated_docs['certificate_of_origin.pdf'] = cert_pdf.getvalue()
        
        # Create ZIP file
        zip_buffer = io.BytesIO()
        with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
            for filename, pdf_data in generated_docs.items():
                zip_file.writestr(filename, pdf_data)
        
        zip_buffer.seek(0)
        
        return send_file(
            zip_buffer,
            mimetype='application/zip',
            as_attachment=True,
            download_name=f'export_docs_order_{order_id}.zip'
        )
        
    except Exception as e:
        print(f"Error generating documents: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/invoice/<int:order_id>', methods=['GET'])
@jwt_required()
def generate_invoice(order_id):
    """
    Generate only commercial invoice
    """
    try:
        current_user_id = int(get_jwt_identity())
        
        order = g.db.query(Order).get(order_id)
        if not order or order.artisan_id != current_user_id:
            return jsonify({'error': 'Order not found or unauthorized'}), 404
        
        # Get data (same as above)
        artisan = g.db.query(User).get(order.artisan_id)
        artisan_profile = g.db.query(ArtisanProfile).filter_by(user_id=order.artisan_id).first()
        buyer = g.db.query(User).get(order.buyer_id)
        buyer_profile = g.db.query(BuyerProfile).filter_by(user_id=order.buyer_id).first()
        product = g.db.query(Product).get(order.product_id)
        
        order_data = {
            'order_id': order.id,
            'invoice_no': f"INV-{order.id}-{datetime.now().year}",
            'date': datetime.now().strftime('%Y-%m-%d'),
            'shipping_cost': order.shipping_cost or 0,
            'tax': 0
        }
        
        artisan_data = {
            'name': artisan.full_name,
            'address': f"{artisan_profile.village if artisan_profile else ''}, India",
            'gstin': artisan_profile.gstin if artisan_profile else 'N/A',
            'phone': artisan.phone or 'N/A'
        }
        
        buyer_data = {
            'name': buyer.full_name,
            'company': buyer_profile.company_name if buyer_profile else '',
            'address': buyer_profile.shipping_address if buyer_profile else '',
            'country': buyer_profile.country if buyer_profile else '',
            'email': buyer.email
        }
        
        product_data = [{
            'title': product.title,
            'quantity': order.quantity,
            'unit_price': product.price,
            'hs_code': assign_hs_code(product.craft_type)
        }]
        
        pdf_buffer = generate_commercial_invoice(order_data, artisan_data, buyer_data, product_data)
        
        return send_file(
            pdf_buffer,
            mimetype='application/pdf',
            as_attachment=True,
            download_name=f'commercial_invoice_{order_id}.pdf'
        )
        
    except Exception as e:
        print(f"Error generating invoice: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/check-compliance', methods=['POST'])
@jwt_required()
def check_export_compliance():
    """
    Check if products comply with destination country regulations
    
    POST /api/export-docs/check-compliance
    {
        "order_id": 123,
        "destination_country": "US"
    }
    """
    try:
        data = request.json
        order_id = data.get('order_id')
        destination_country = data.get('destination_country', 'US')
        
        if not order_id:
            return jsonify({'error': 'order_id is required'}), 400
        
        order = g.db.query(Order).get(order_id)
        if not order:
            return jsonify({'error': 'Order not found'}), 404
        
        product = g.db.query(Product).get(order.product_id)
        
        product_data = [{
            'title': product.title,
            'quantity': order.quantity,
            'craft_type': product.craft_type,
            'hs_code': assign_hs_code(product.craft_type)
        }]
        
        compliance_result = check_compliance(product_data, destination_country)
        
        return jsonify({
            'success': True,
            'compliance': compliance_result,
            'destination_country': destination_country
        }), 200
        
    except Exception as e:
        print(f"Error checking compliance: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/country-requirements/<country_code>', methods=['GET'])
def get_requirements(country_code):
    """
    Get export requirements for a specific country
    No auth required - informational endpoint
    
    GET /api/export-docs/country-requirements/US
    """
    try:
        requirements = get_country_requirements(country_code.upper())
        
        return jsonify({
            'success': True,
            'country_code': country_code.upper(),
            'requirements': requirements
        }), 200
        
    except Exception as e:
        print(f"Error getting requirements: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/hs-code/<craft_type>', methods=['GET'])
def get_hs_code(craft_type):
    """
    Get HS code for a craft type
    No auth required - informational endpoint
    
    GET /api/export-docs/hs-code/pottery
    """
    try:
        hs_code = assign_hs_code(craft_type)
        
        return jsonify({
            'success': True,
            'craft_type': craft_type,
            'hs_code': hs_code
        }), 200
        
    except Exception as e:
        print(f"Error getting HS code: {str(e)}")
        return jsonify({'error': str(e)}), 500


@bp.route('/preview-invoice/<int:order_id>', methods=['GET'])
@jwt_required()
def preview_invoice_data(order_id):
    """
    Preview invoice data before generating PDF
    Returns JSON with all data that will be in the invoice
    """
    try:
        current_user_id = int(get_jwt_identity())
        
        order = g.db.query(Order).get(order_id)
        if not order or order.artisan_id != current_user_id:
            return jsonify({'error': 'Order not found or unauthorized'}), 404
        
        artisan = g.db.query(User).get(order.artisan_id)
        artisan_profile = g.db.query(ArtisanProfile).filter_by(user_id=order.artisan_id).first()
        buyer = g.db.query(User).get(order.buyer_id)
        buyer_profile = g.db.query(BuyerProfile).filter_by(user_id=order.buyer_id).first()
        product = g.db.query(Product).get(order.product_id)
        
        preview_data = {
            'invoice_no': f"INV-{order.id}-{datetime.now().year}",
            'date': datetime.now().strftime('%Y-%m-%d'),
            'exporter': {
                'name': artisan.full_name,
                'address': f"{artisan_profile.village if artisan_profile else ''}, India",
                'gstin': artisan_profile.gstin if artisan_profile else 'N/A'
            },
            'importer': {
                'name': buyer.full_name,
                'company': buyer_profile.company_name if buyer_profile else '',
                'address': buyer_profile.shipping_address if buyer_profile else '',
                'country': buyer_profile.country if buyer_profile else ''
            },
            'products': [{
                'title': product.title,
                'quantity': order.quantity,
                'unit_price': product.price,
                'total': order.total_amount,
                'hs_code': assign_hs_code(product.craft_type)
            }],
            'subtotal': order.total_amount,
            'shipping': order.shipping_cost or 0,
            'tax': 0,
            'grand_total': (order.total_amount or 0) + (order.shipping_cost or 0)
        }
        
        return jsonify({
            'success': True,
            'preview': preview_data
        }), 200
        
    except Exception as e:
        print(f"Error previewing invoice: {str(e)}")
        return jsonify({'error': str(e)}), 500

