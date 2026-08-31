from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

output_path = Path(__file__).resolve().parent / "synthetic_land_record.pdf"
width, height = 1700, 2400
image = Image.new("RGB", (width, height), (247, 245, 237))
draw = ImageDraw.Draw(image)
font_path = "C:/Windows/Fonts/arial.ttf"
bold_font_path = "C:/Windows/Fonts/arialbd.ttf"


def font(size: int, bold: bool = False):
    return ImageFont.truetype(bold_font_path if bold else font_path, size)


def centered(text: str, y: int, text_font):
    box = draw.textbbox((0, 0), text, font=text_font)
    draw.text(((width - (box[2] - box[0])) // 2, y), text, fill=(35, 35, 32), font=text_font)


def line(y: int, x1: int = 130, x2: int = 1570, fill=(125, 125, 115), width_value: int = 3):
    draw.line((x1, y, x2, y), fill=fill, width=width_value)


draw.rectangle((70, 70, width - 70, height - 70), outline=(75, 75, 68), width=5)
draw.rectangle((95, 95, width - 95, height - 95), outline=(150, 145, 130), width=2)
centered("GOVERNMENT OF TAMIL NADU", 150, font(42, True))
centered("REVENUE DEPARTMENT", 215, font(34))
centered("LAND RECORD / RECORD OF RIGHTS", 300, font(54, True))
centered("SYNTHETIC DEVELOPMENT TEST DOCUMENT", 375, font(24))
line(445, 150, 1550, (75, 75, 68), 4)

section_font = font(32, True)
label_font = font(34, True)
value_font = font(34)
small_font = font(27)

draw.text((150, 500), "LOCATION DETAILS", fill=(35, 35, 32), font=section_font)
line(555, 150, 1550)
fields = [
    ("District", "Chengalpattu"),
    ("Tehsil", "Tiruporur"),
    ("Village", "Kelambakkam"),
]
start_y = 620
for index, (label, value) in enumerate(fields):
    y = start_y + index * 100
    draw.text((180, y), f"{label:<16}:", fill=(40, 40, 36), font=label_font)
    draw.text((650, y), value, fill=(40, 40, 36), font=value_font)

line(930, 150, 1550, (75, 75, 68), 4)
draw.text((150, 985), "HOLDING AND AREA DETAILS", fill=(35, 35, 32), font=section_font)
line(1040, 150, 1550)
fields = [
    ("Owner Name", "Ramesh Kumar"),
    ("Survey Number", "142/3A"),
    ("Khata Number", "782"),
    ("Land Area", "2.45"),
    ("Area Unit", "Acres"),
    ("Land Classification", "Agricultural"),
]
start_y = 1105
for index, (label, value) in enumerate(fields):
    y = start_y + index * 92
    draw.text((180, y), f"{label:<20}:", fill=(40, 40, 36), font=label_font)
    draw.text((760, y), value, fill=(40, 40, 36), font=value_font)

line(1700, 150, 1550, (75, 75, 68), 4)
draw.text((150, 1755), "RECORD NOTES", fill=(35, 35, 32), font=section_font)
line(1810, 150, 1550)
fields = [
    ("Ownership Details", "Individual Ownership"),
    ("Mutation Information", "MUT/2024/0182"),
    ("Registration Information", "REG/2019/4421"),
]
start_y = 1875
for index, (label, value) in enumerate(fields):
    y = start_y + index * 100
    draw.text((180, y), f"{label:<25}:", fill=(40, 40, 36), font=label_font)
    draw.text((850, y), value, fill=(40, 40, 36), font=value_font)

line(2220, 150, 1550, (75, 75, 68), 4)
draw.text((180, 2260), "This synthetic document contains no real personal or land ownership information.", fill=(75, 75, 68), font=small_font)
draw.text((180, 2305), "Prepared for BhuVerify AI OCR and extraction development testing only.", fill=(75, 75, 68), font=small_font)

image.save(output_path, "PDF", resolution=200.0)
print(f"Created {output_path} ({output_path.stat().st_size} bytes)")
