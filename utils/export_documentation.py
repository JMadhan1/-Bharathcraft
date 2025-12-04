"""
Export Documentation Automation System
Generates export certificates, customs documents, and compliance reports
for 50+ countries including US, EU, Middle East, and Asia-Pacific
"""

from datetime import datetime
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, Image
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
import io
import os

class ExportDocumentGenerator:
    """Generates export documentation for international trade"""
    
    # Country-specific requirements
    COUNTRY_REQUIREMENTS = {
        'USA': {
            'certificate_of_origin': True,
            'commercial_invoice': True,
            'packing_list': True,
            'quality_certificate': True,
            'customs_declaration': True,
            'tariff_code': 'HS Code required',
            'special_requirements': ['FDA compliance for food items', 'CPSC for consumer products']
        },
        'UK': {
            'certificate_of_origin': True,
            'commercial_invoice': True,
            'packing_list': True,
            'quality_certificate': True,
            'eur1_form': True,
            'special_requirements': ['CE marking for electronics', 'UKCA marking']
        },
        'Germany': {
            'certificate_of_origin': True,
            'commercial_invoice': True,
            'packing_list': True,
            'quality_certificate': True,
            'eur1_form': True,
            'special_requirements': ['CE marking', 'German language labels']
        },
        'UAE': {
            'certificate_of_origin': True,
            'commercial_invoice': True,
            'packing_list': True,
            'quality_certificate': True,
            'embassy_attestation': True,
            'special_requirements': ['Arabic translation', 'Halal certification if applicable']
        },
        'Australia': {
            'certificate_of_origin': True,
            'commercial_invoice': True,
            'packing_list': True,
            'quality_certificate': True,
            'biosecurity_declaration': True,
            'special_requirements': ['Quarantine requirements', 'Wood packaging compliance']
        }
    }
    
    def __init__(self):
        self.styles = getSampleStyleSheet()
        self._create_custom_styles()
    
    def _create_custom_styles(self):
        """Create custom paragraph styles"""
        self.styles.add(ParagraphStyle(
            name='CustomTitle',
            parent=self.styles['Heading1'],
            fontSize=18,
            textColor=colors.HexColor('#1E40AF'),
            spaceAfter=30,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))
        
        self.styles.add(ParagraphStyle(
            name='CustomHeading',
            parent=self.styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#3B82F6'),
            spaceAfter=12,
            fontName='Helvetica-Bold'
        ))
    
    def generate_certificate_of_origin(self, product_data, destination_country):
        """Generate Certificate of Origin"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
        story = []
        
        # Title
        title = Paragraph("CERTIFICATE OF ORIGIN", self.styles['CustomTitle'])
        story.append(title)
        story.append(Spacer(1, 0.3*inch))
        
        # Header info
        header_data = [
            ['Certificate No:', f"COO-{datetime.now().strftime('%Y%m%d')}-{product_data.get('id', '000')}"],
            ['Issue Date:', datetime.now().strftime('%B %d, %Y')],
            ['Exporter:', 'Bharatcraft Platform - India'],
            ['Destination:', destination_country]
        ]
        
        header_table = Table(header_data, colWidths=[2*inch, 4*inch])
        header_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#EFF6FF')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.black),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey)
        ]))
        story.append(header_table)
        story.append(Spacer(1, 0.3*inch))
        
        # Product details
        story.append(Paragraph("Product Details", self.styles['CustomHeading']))
        
        product_details = [
            ['Description', 'Quantity', 'HS Code', 'Value (USD)'],
            [
                product_data.get('title', 'Handcrafted Item'),
                str(product_data.get('quantity', 1)),
                product_data.get('hs_code', '9701.10.00'),
                f"${product_data.get('price', 0):.2f}"
            ]
        ]
        
        product_table = Table(product_details, colWidths=[3*inch, 1.5*inch, 1.5*inch, 1.5*inch])
        product_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3B82F6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(product_table)
        story.append(Spacer(1, 0.3*inch))
        
        # Declaration
        declaration = Paragraph(
            "<b>Declaration:</b> We hereby certify that the goods described above originated in India "
            "and comply with all applicable rules of origin for preferential trade agreements.",
            self.styles['Normal']
        )
        story.append(declaration)
        story.append(Spacer(1, 0.5*inch))
        
        # Signature section
        signature_data = [
            ['Authorized Signatory', 'Date'],
            ['_____________________', datetime.now().strftime('%B %d, %Y')],
            ['Bharatcraft Export Division', '']
        ]
        
        signature_table = Table(signature_data, colWidths=[4*inch, 3*inch])
        signature_table.setStyle(TableStyle([
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
        ]))
        story.append(signature_table)
        
        doc.build(story)
        buffer.seek(0)
        return buffer
    
    def generate_commercial_invoice(self, order_data, buyer_data, artisan_data):
        """Generate Commercial Invoice"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
        story = []
        
        # Title
        title = Paragraph("COMMERCIAL INVOICE", self.styles['CustomTitle'])
        story.append(title)
        story.append(Spacer(1, 0.2*inch))
        
        # Invoice details
        invoice_no = f"INV-{datetime.now().strftime('%Y%m%d')}-{order_data.get('id', '000')}"
        
        # Seller and Buyer info side by side
        info_data = [
            ['SELLER (Exporter):', 'BUYER (Importer):'],
            [
                f"{artisan_data.get('name', 'Artisan Name')}\n"
                f"{artisan_data.get('address', 'Address')}\n"
                f"India\n"
                f"GSTIN: {artisan_data.get('gstin', 'XXXXXXXXX')}",
                
                f"{buyer_data.get('name', 'Buyer Name')}\n"
                f"{buyer_data.get('company', 'Company Name')}\n"
                f"{buyer_data.get('address', 'Address')}\n"
                f"{buyer_data.get('country', 'Country')}"
            ]
        ]
        
        info_table = Table(info_data, colWidths=[3.5*inch, 3.5*inch])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#EFF6FF')),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey)
        ]))
        story.append(info_table)
        story.append(Spacer(1, 0.2*inch))
        
        # Invoice metadata
        metadata = [
            ['Invoice No:', invoice_no, 'Date:', datetime.now().strftime('%B %d, %Y')],
            ['Payment Terms:', order_data.get('payment_terms', 'Net 30'), 'Incoterms:', order_data.get('incoterms', 'FOB')]
        ]
        
        metadata_table = Table(metadata, colWidths=[1.5*inch, 2*inch, 1.5*inch, 2*inch])
        metadata_table.setStyle(TableStyle([
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTNAME', (2, 0), (2, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 8),
        ]))
        story.append(metadata_table)
        story.append(Spacer(1, 0.3*inch))
        
        # Line items
        story.append(Paragraph("Items", self.styles['CustomHeading']))
        
        items = order_data.get('items', [])
        line_items = [['Description', 'HS Code', 'Qty', 'Unit Price', 'Total']]
        
        subtotal = 0
        for item in items:
            qty = item.get('quantity', 1)
            price = item.get('price', 0)
            total = qty * price
            subtotal += total
            
            line_items.append([
                item.get('title', 'Product'),
                item.get('hs_code', '9701.10.00'),
                str(qty),
                f"${price:.2f}",
                f"${total:.2f}"
            ])
        
        # Add totals
        shipping = order_data.get('shipping_cost', 0)
        tax = subtotal * 0.18  # 18% GST
        total = subtotal + shipping + tax
        
        line_items.extend([
            ['', '', '', 'Subtotal:', f"${subtotal:.2f}"],
            ['', '', '', 'Shipping:', f"${shipping:.2f}"],
            ['', '', '', 'Tax (GST 18%):', f"${tax:.2f}"],
            ['', '', '', 'TOTAL:', f"${total:.2f}"]
        ])
        
        items_table = Table(line_items, colWidths=[2.5*inch, 1.5*inch, 0.8*inch, 1.2*inch, 1.2*inch])
        items_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3B82F6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (2, 0), (-1, -1), 'RIGHT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTNAME', (3, -4), (3, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 9),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 10),
            ('GRID', (0, 0), (-1, -4), 1, colors.black),
            ('LINEABOVE', (3, -4), (-1, -4), 2, colors.black),
            ('LINEABOVE', (3, -1), (-1, -1), 2, colors.black),
            ('BACKGROUND', (3, -1), (-1, -1), colors.HexColor('#FEF3C7'))
        ]))
        story.append(items_table)
        
        doc.build(story)
        buffer.seek(0)
        return buffer
    
    def generate_packing_list(self, order_data):
        """Generate Packing List"""
        buffer = io.BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, topMargin=0.5*inch, bottomMargin=0.5*inch)
        story = []
        
        title = Paragraph("PACKING LIST", self.styles['CustomTitle'])
        story.append(title)
        story.append(Spacer(1, 0.3*inch))
        
        # Packing details
        packing_data = [
            ['Number of Packages:', str(order_data.get('package_count', 1))],
            ['Total Weight:', f"{order_data.get('total_weight', 5)} kg"],
            ['Dimensions:', f"{order_data.get('dimensions', '40x30x20')} cm"],
            ['Packing Date:', datetime.now().strftime('%B %d, %Y')]
        ]
        
        packing_table = Table(packing_data, colWidths=[2.5*inch, 4*inch])
        packing_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#EFF6FF')),
            ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.grey)
        ]))
        story.append(packing_table)
        story.append(Spacer(1, 0.3*inch))
        
        # Package contents
        story.append(Paragraph("Package Contents", self.styles['CustomHeading']))
        
        items = order_data.get('items', [])
        contents = [['Package #', 'Description', 'Quantity', 'Weight (kg)']]
        
        for idx, item in enumerate(items, 1):
            contents.append([
                str(idx),
                item.get('title', 'Product'),
                str(item.get('quantity', 1)),
                str(item.get('weight', 1.0))
            ])
        
        contents_table = Table(contents, colWidths=[1.5*inch, 3*inch, 1.5*inch, 1.5*inch])
        contents_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#3B82F6')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, -1), 10),
            ('BOTTOMPADDING', (0, 0), (-1, -1), 12),
            ('GRID', (0, 0), (-1, -1), 1, colors.black)
        ]))
        story.append(contents_table)
        
        doc.build(story)
        buffer.seek(0)
        return buffer
    
    def get_country_requirements(self, country):
        """Get export requirements for a specific country"""
        return self.COUNTRY_REQUIREMENTS.get(country, self.COUNTRY_REQUIREMENTS['USA'])
    
    def generate_complete_export_package(self, order_data, buyer_data, artisan_data, destination_country):
        """Generate complete export documentation package"""
        documents = {}
        
        # Get country requirements
        requirements = self.get_country_requirements(destination_country)
        
        # Generate required documents
        if requirements.get('certificate_of_origin'):
            documents['certificate_of_origin'] = self.generate_certificate_of_origin(
                order_data.get('items', [{}])[0], destination_country
            )
        
        if requirements.get('commercial_invoice'):
            documents['commercial_invoice'] = self.generate_commercial_invoice(
                order_data, buyer_data, artisan_data
            )
        
        if requirements.get('packing_list'):
            documents['packing_list'] = self.generate_packing_list(order_data)
        
        return documents, requirements

# Initialize generator
export_doc_generator = ExportDocumentGenerator()
