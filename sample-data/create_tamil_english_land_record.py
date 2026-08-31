#!/usr/bin/env python
"""
Generate a synthetic Tamil + English land record PDF for testing multilingual OCR.

This creates a bilingual government land record document with realistic structure.
Uses fictional data only.
"""

from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors

# Make sure we can use Tamil characters
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont

# Try to register Noto Sans Tamil font if available
try:
    # Common paths for fonts on Windows
    font_paths = [
        "C:\\Windows\\Fonts\\NotoSansTamil-Regular.ttf",
        "C:\\Windows\\Fonts\\Arial.ttf",
    ]
    
    for font_path in font_paths:
        try:
            pdfmetrics.registerFont(TTFont("NotoTamil", font_path))
            break
        except Exception:
            continue
except Exception as e:
    print(f"Note: Could not register Tamil font: {e}")


def create_tamil_english_land_record():
    """Create a synthetic Tamil + English land record PDF."""
    
    filename = "sample-data/synthetic_land_record_tamil_english.pdf"
    
    # Create PDF
    doc = SimpleDocTemplate(filename, pagesize=letter)
    story = []
    
    # Define styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=16,
        textColor=colors.HexColor('#1a1a1a'),
        spaceAfter=0.2 * inch,
        alignment=1,  # Center
    )
    
    heading_style = ParagraphStyle(
        'CustomHeading',
        parent=styles['Heading2'],
        fontSize=12,
        textColor=colors.HexColor('#333333'),
        spaceAfter=0.1 * inch,
        spaceBefore=0.1 * inch,
    )
    
    normal_style = ParagraphStyle(
        'CustomNormal',
        parent=styles['Normal'],
        fontSize=10,
        textColor=colors.HexColor('#000000'),
    )
    
    # Header
    story.append(Paragraph("GOVERNMENT OF TAMIL NADU", title_style))
    story.append(Paragraph("வருவாய் துறை", heading_style))
    story.append(Paragraph("Revenue Department", normal_style))
    story.append(Spacer(1, 0.2 * inch))
    
    story.append(Paragraph("LAND RECORD / நில பதிவேடு", heading_style))
    story.append(Spacer(1, 0.15 * inch))
    
    # District and Tehsil information
    district_data = [
        ["District / மாவட்டம்", "Chengalpattu / செங்கல்பட்டு"],
        ["Tehsil / வட்டம்", "Tiruporur / திருப்போரூர்"],
        ["Village / கிராமம்", "Kelambakkam / கேளம்பாக்கம்"],
        ["Taluk / தாலுக்", "Tiruporur / திருப்போரூர்"],
    ]
    
    district_table = Table(district_data, colWidths=[2.5 * inch, 3.5 * inch])
    district_table.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e8f0f7')),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(district_table)
    story.append(Spacer(1, 0.2 * inch))
    
    # Owner information
    owner_data = [
        ["Owner Name / உரிமையாளர் பெயர்", "Ramesh Kumar / ரமேஷ் குமார்"],
        ["Father's Name / தந்தை பெயர்", "Suresh Kumar / சுரேஷ் குமார்"],
        ["Age / வயது", "45 years / 45 ஆண்டுகள்"],
    ]
    
    owner_table = Table(owner_data, colWidths=[2.5 * inch, 3.5 * inch])
    owner_table.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e8f0f7')),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(Paragraph("Owner Details / உரிமையாளர் விவரங்கள்", heading_style))
    story.append(owner_table)
    story.append(Spacer(1, 0.2 * inch))
    
    # Land details
    land_data = [
        ["Survey Number / சர்வே எண்", "142 / 3A"],
        ["Khata Number / காத்தா எண்", "782"],
        ["Land Area / நிலப்பரப்பு", "2.45 Acres / 2.45 ஏக்கர்"],
        ["Land Classification / நில வகைப்பாடு", "Agricultural / விவசாயம்"],
        ["Land Sub-class / நிலப் பிரிவு", "Wet Land / ஈரநிலம்"],
    ]
    
    land_table = Table(land_data, colWidths=[2.5 * inch, 3.5 * inch])
    land_table.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f0e8f7')),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(Paragraph("Land Details / நில விவரங்கள்", heading_style))
    story.append(land_table)
    story.append(Spacer(1, 0.2 * inch))
    
    # Ownership information
    ownership_data = [
        ["Ownership Type / உரிமை வகை", "Individual Ownership / தனிநபர் உரிமை"],
        ["Rights Type / உரிமை வகை பிரிவு", "Complete Right / முழு உரிமை"],
    ]
    
    ownership_table = Table(ownership_data, colWidths=[2.5 * inch, 3.5 * inch])
    ownership_table.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e8f7e8')),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(Paragraph("Ownership Information / உரிமை தகவல்", heading_style))
    story.append(ownership_table)
    story.append(Spacer(1, 0.2 * inch))
    
    # Mutation information
    mutation_data = [
        ["Last Mutation Number / கடைசி மாற்றம் எண்", "MUT/2022/001"],
        ["Mutation Date / மாற்றம் தேதி", "15-June-2022 / 15-ஜூன்-2022"],
        ["Mutation Type / மாற்றம் வகை", "Inheritance / சோதி"],
    ]
    
    mutation_table = Table(mutation_data, colWidths=[2.5 * inch, 3.5 * inch])
    mutation_table.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#f7f0e8')),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(Paragraph("Mutation Information / மாற்றம் தகவல்", heading_style))
    story.append(mutation_table)
    story.append(Spacer(1, 0.2 * inch))
    
    # Registration information
    reg_data = [
        ["Registration Date / பதிவு தேதி", "10-June-2022 / 10-ஜூன்-2022"],
        ["Registration Number / பதிவு எண்", "REG/2022/0156"],
    ]
    
    reg_table = Table(reg_data, colWidths=[2.5 * inch, 3.5 * inch])
    reg_table.setStyle(TableStyle([
        ('GRID', (0, 0), (-1, -1), 1, colors.grey),
        ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#e8f7e8')),
        ('FONTSIZE', (0, 0), (-1, -1), 9),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(Paragraph("Registration Information / பதிவு விவரங்கள்", heading_style))
    story.append(reg_table)
    story.append(Spacer(1, 0.2 * inch))
    
    # Footer
    story.append(Paragraph("This is a synthetic document for testing purposes. / இது சோதனை நோக்கங்களுக்கான செயற்கை ஆவணம்.", normal_style))
    story.append(Paragraph("All information is fictional. / அனைத்து தகவலும் கற்பனை.", normal_style))
    
    # Generate PDF
    doc.build(story)
    print(f"Tamil + English land record PDF created: {filename}")


if __name__ == "__main__":
    create_tamil_english_land_record()
