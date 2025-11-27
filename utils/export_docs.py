"""
Export Documentation Generator
Auto-generates professional export documents in 3 hours instead of 3 weeks!

Features:
- Commercial Invoice
- Packing List
- Certificate of Origin
- Country-specific customs forms
- HS Code assignment
- Compliance checking
"""

from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_RIGHT, TA_LEFT
from datetime import datetime
import io


HS_CODES = {
    'pottery': '6912.00',
    'textiles': '6302.60',
    'jewelry': '7113.19',
    'wood': '4420.10',
    'metalwork': '8306.29',
    'painting': '9701.10',
    'embroidery': '6302.60',
    'leather': '4205.00'
}

COUNTRY_REQUIREMENTS = {
    'US': {
        'name': 'United States',
        'customs_form': 'CBP Form 3461',
        'special_notes': 'FDA clearance may be required for certain products. Lead testing required for children\'s products.',
        'duties': 'Varies by HS code, generally 0-6% for handicrafts under GSP',
        'documents': ['Commercial Invoice', 'Packing List', 'Certificate of Origin']
    },
    'UK': {
        'name': 'United Kingdom',
        'customs_form': 'C88 Customs Declaration',
        'special_notes': 'VAT applicable. EORI number required.',
        'duties': '0-12% depending on material',
        'documents': ['Commercial Invoice', 'Packing List', 'EUR.1 or Certificate of Origin']
    },
    'DE': {
        'name': 'Germany',
        'customs_form': 'EU Customs Declaration',
        'special_notes': 'REACH compliance for chemicals. Packaging regulations strict.',
        'duties': 'EU common external tariff applies',
        'documents': ['Commercial Invoice', 'Packing List', 'Certificate of Origin', 'REACH declaration if applicable']
    },
    'AU': {
        'name': 'Australia',
        'customs_form': 'Import Declaration',
        'special_notes': 'Strict biosecurity. No wood/plant materials without treatment.',
        'duties': '5% GST + customs duty',
        'documents': ['Commercial Invoice', 'Packing List', 'Certificate of Origin']
    },
    'CA': {
        'name': 'Canada',
        'customs_form': 'B3 Canada Customs Coding Form',
        'special_notes': 'English/French labeling required',
        'duties': 'Varies, many handicrafts duty-free under trade agreements',
        'documents': ['Commercial Invoice', 'Packing List', 'Certificate of Origin']
    }
}


def generate_commercial_invoice(order_data, artisan_data, buyer_data, product_data):
    """
    Generate a professional commercial invoice PDF
    
    Args:
        order_data: dict with order_id, date, quantity, price, shipping
        artisan_data: dict with name, address, GSTIN, bank details
        buyer_data: dict with name, company, address, country
        product_data: list of dicts with title, hs_code, quantity, unit_price
    
    Returns:
        PDF bytes buffer
    """
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    story = []
    styles = getSampleStyleSheet()
    
    # Custom styles
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#FF6B35'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    header_style = ParagraphStyle(
        'Header',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#1F2937')
    )
    
    # Title
    title = Paragraph("<b>COMMERCIAL INVOICE</b>", title_style)
    story.append(title)
    story.append(Spacer(1, 0.3*inch))
    
    # Invoice Header Info
    invoice_info = [
        ['Invoice No:', order_data.get('invoice_no', f"INV-{order_data['order_id']}")],
        ['Date:', order_data.get('date', datetime.now().strftime('%Y-%m-%d'))],
        ['Terms:', 'FOB India / Prepaid']
    ]
    
    invoice_table = Table(invoice_info, colWidths=[2*inch, 3*inch])
    invoice_table.setStyle(TableStyle([
        ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(invoice_table)
    story.append(Spacer(1, 0.3*inch))
    
    # Exporter (Artisan) and Importer (Buyer) Details
    party_data = [
        [Paragraph('<b>EXPORTER (Seller)</b>', header_style), Paragraph('<b>IMPORTER (Buyer)</b>', header_style)],
        [
            Paragraph(f"<b>{artisan_data['name']}</b><br/>{artisan_data.get('address', 'India')}<br/>GSTIN: {artisan_data.get('gstin', 'N/A')}<br/>Phone: {artisan_data.get('phone', 'N/A')}", header_style),
            Paragraph(f"<b>{buyer_data['name']}</b><br/>{buyer_data.get('company', '')}<br/>{buyer_data.get('address', '')}<br/>{buyer_data.get('country', '')}<br/>Email: {buyer_data.get('email', '')}", header_style)
        ]
    ]
    
    party_table = Table(party_data, colWidths=[3.5*inch, 3.5*inch])
    party_table.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#F3F4F6')),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('PADDING', (0, 0), (-1, -1), 10),
    ]))
    story.append(party_table)
    story.append(Spacer(1, 0.3*inch))
    
    # Product Details Table
    product_table_data = [
        ['#', 'Description', 'HS Code', 'Qty', 'Unit Price', 'Total']
    ]
    
    subtotal = 0
    for idx, product in enumerate(product_data, 1):
        qty = product['quantity']
        unit_price = product['unit_price']
        total = qty * unit_price
        subtotal += total
        
        product_table_data.append([
            str(idx),
            product['title'],
            product.get('hs_code', 'N/A'),
            str(qty),
            f"₹{unit_price:,.2f}",
            f"₹{total:,.2f}"
        ])
    
    # Add totals
    shipping = order_data.get('shipping_cost', 0)
    tax = order_data.get('tax', 0)
    grand_total = subtotal + shipping + tax
    
    product_table_data.extend([
        ['', '', '', '', 'Subtotal:', f"₹{subtotal:,.2f}"],
        ['', '', '', '', 'Shipping:', f"₹{shipping:,.2f}"],
        ['', '', '', '', 'Tax/GST:', f"₹{tax:,.2f}"],
        ['', '', '', '', 'TOTAL:', f"₹{grand_total:,.2f}"]
    ])
    
    product_table = Table(product_table_data, colWidths=[0.4*inch, 2.5*inch, 1*inch, 0.6*inch, 1*inch, 1*inch])
    product_table.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -5), 0.5, colors.grey),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#FF6B35')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 10),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (1, 1), (1, -1), 'LEFT'),
        ('ALIGN', (4, -4), (5, -1), 'RIGHT'),
        ('FONTNAME', (4, -1), (5, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (4, -1), (5, -1), 12),
        ('BACKGROUND', (4, -1), (5, -1), colors.HexColor('#FEF3C7')),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(product_table)
    story.append(Spacer(1, 0.3*inch))
    
    # Declaration
    declaration = Paragraph(
        "<b>DECLARATION:</b><br/>"
        "I/We hereby certify that the information on this invoice is true and correct and that "
        "the contents of this shipment are as stated above.<br/><br/>"
        f"<b>Authorized Signature:</b> {artisan_data['name']}<br/>"
        f"<b>Date:</b> {datetime.now().strftime('%Y-%m-%d')}",
        header_style
    )
    story.append(declaration)
    
    # Build PDF
    doc.build(story)
    buffer.seek(0)
    return buffer


def generate_packing_list(order_data, artisan_data, buyer_data, product_data):
    """
    Generate packing list PDF
    """
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    story = []
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#059669'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    header_style = ParagraphStyle(
        'Header',
        parent=styles['Normal'],
        fontSize=10
    )
    
    # Title
    title = Paragraph("<b>PACKING LIST</b>", title_style)
    story.append(title)
    story.append(Spacer(1, 0.3*inch))
    
    # Header Info
    header_info = [
        ['Packing List No:', f"PL-{order_data['order_id']}"],
        ['Date:', datetime.now().strftime('%Y-%m-%d')],
        ['Invoice No:', order_data.get('invoice_no', f"INV-{order_data['order_id']}")],
        ['Shipper:', artisan_data['name']],
        ['Consignee:', buyer_data['name']]
    ]
    
    header_table = Table(header_info, colWidths=[2*inch, 4*inch])
    header_table.setStyle(TableStyle([
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
    ]))
    story.append(header_table)
    story.append(Spacer(1, 0.3*inch))
    
    # Packing Details
    packing_data = [
        ['#', 'Description', 'Quantity', 'Unit Weight', 'Total Weight', 'Dimensions']
    ]
    
    total_weight = 0
    total_cartons = len(product_data)
    
    for idx, product in enumerate(product_data, 1):
        qty = product['quantity']
        unit_weight = product.get('weight', 0.5)  # kg
        total_product_weight = qty * unit_weight
        total_weight += total_product_weight
        
        packing_data.append([
            str(idx),
            product['title'],
            str(qty),
            f"{unit_weight} kg",
            f"{total_product_weight:.2f} kg",
            product.get('dimensions', '30x30x15 cm')
        ])
    
    # Totals
    packing_data.append([
        '', 'TOTAL', str(sum(p['quantity'] for p in product_data)),
        '', f"{total_weight:.2f} kg", f"{total_cartons} carton(s)"
    ])
    
    packing_table = Table(packing_data, colWidths=[0.4*inch, 2*inch, 0.8*inch, 1*inch, 1*inch, 1.5*inch])
    packing_table.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -2), 0.5, colors.grey),
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#059669')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.white),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTNAME', (0, -1), (-1, -1), 'Helvetica-Bold'),
        ('BACKGROUND', (0, -1), (-1, -1), colors.HexColor('#D1FAE5')),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('ALIGN', (1, 1), (1, -1), 'LEFT'),
        ('PADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(packing_table)
    story.append(Spacer(1, 0.3*inch))
    
    # Notes
    notes = Paragraph(
        "<b>PACKAGING NOTES:</b><br/>"
        "- All items are securely packed in corrugated boxes with bubble wrap<br/>"
        "- Fragile stickers applied to all cartons<br/>"
        "- Waterproof packaging used<br/>"
        "- Each item individually wrapped",
        header_style
    )
    story.append(notes)
    
    doc.build(story)
    buffer.seek(0)
    return buffer


def generate_certificate_of_origin(order_data, artisan_data, buyer_data, product_data):
    """
    Generate Certificate of Origin PDF
    """
    
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4)
    story = []
    styles = getSampleStyleSheet()
    
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#1E3A8A'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    story.append(Paragraph("<b>CERTIFICATE OF ORIGIN</b>", title_style))
    story.append(Spacer(1, 0.3*inch))
    
    # Certificate Content
    content = f"""
    <b>Certificate No:</b> CO-{order_data['order_id']}<br/>
    <b>Date of Issue:</b> {datetime.now().strftime('%Y-%m-%d')}<br/><br/>
    
    This is to certify that the goods described below:<br/><br/>
    
    <b>Exporter:</b> {artisan_data['name']}, {artisan_data.get('address', 'India')}<br/>
    <b>Consignee:</b> {buyer_data['name']}, {buyer_data.get('address', '')}<br/>
    <b>Country of Destination:</b> {buyer_data.get('country', '')}<br/><br/>
    
    <b>Description of Goods:</b><br/>
    """
    
    for product in product_data:
        content += f"- {product['title']} (Qty: {product['quantity']}) - HS Code: {product.get('hs_code', 'N/A')}<br/>"
    
    content += f"""
    <br/><b>Country of Origin:</b> INDIA<br/><br/>
    
    Are produced/manufactured in India and comply with the rules of origin under the applicable trade agreement.<br/><br/>
    
    <b>Issuing Authority:</b> Federation of Indian Export Organisations (FIEO)<br/>
    <b>Authorized Signature:</b> ______________________<br/>
    <b>Date:</b> {datetime.now().strftime('%Y-%m-%d')}<br/>
    <b>Official Stamp:</b> [FIEO Stamp]
    """
    
    story.append(Paragraph(content, styles['Normal']))
    
    doc.build(story)
    buffer.seek(0)
    return buffer


def assign_hs_code(craft_type):
    """
    Automatically assign HS code based on craft type
    """
    craft_type_lower = craft_type.lower() if craft_type else 'other'
    
    for key in HS_CODES:
        if key in craft_type_lower:
            return HS_CODES[key]
    
    return '9999.00'  # Default/Other


def get_country_requirements(country_code):
    """
    Get export requirements for specific country
    """
    return COUNTRY_REQUIREMENTS.get(country_code, {
        'name': country_code,
        'customs_form': 'Standard Customs Declaration',
        'special_notes': 'Check local customs requirements',
        'duties': 'Varies by country',
        'documents': ['Commercial Invoice', 'Packing List']
    })


def check_compliance(product_data, destination_country):
    """
    Check if products comply with destination country regulations
    Returns list of issues/warnings
    """
    issues = []
    warnings = []
    
    country_req = get_country_requirements(destination_country)
    
    # Check for US-specific requirements
    if destination_country == 'US':
        for product in product_data:
            # Check for lead in children's products
            if any(keyword in product['title'].lower() for keyword in ['toy', 'child', 'kid', 'baby']):
                warnings.append(f"{product['title']}: Lead testing required for children's products in US")
            
            # Check for textiles
            if 'textile' in product.get('craft_type', '').lower() or 'fabric' in product['title'].lower():
                warnings.append(f"{product['title']}: Textile labeling requirements must be met (fiber content, country of origin)")
    
    # Check for EU-specific requirements
    if destination_country in ['UK', 'DE', 'FR', 'IT']:
        for product in product_data:
            # REACH compliance for certain materials
            if any(keyword in product['title'].lower() for keyword in ['metal', 'leather', 'chemical', 'dye']):
                warnings.append(f"{product['title']}: REACH compliance may be required for chemicals")
    
    # Check for Australia biosecurity
    if destination_country == 'AU':
        for product in product_data:
            if any(keyword in product['title'].lower() for keyword in ['wood', 'plant', 'seed', 'natural']):
                warnings.append(f"{product['title']}: Biosecurity certificate required for organic materials")
    
    return {
        'issues': issues,
        'warnings': warnings,
        'country_requirements': country_req
    }

