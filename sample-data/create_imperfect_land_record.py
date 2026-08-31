from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

output_path = Path(__file__).resolve().parent / "synthetic_land_record_imperfect.pdf"
image = Image.new("RGB", (1700, 1900), (247, 245, 237))
draw = ImageDraw.Draw(image)
font_path = "C:/Windows/Fonts/arial.ttf"
bold_font_path = "C:/Windows/Fonts/arialbd.ttf"
regular = ImageFont.truetype(font_path, 38)
bold = ImageFont.truetype(bold_font_path, 42)
header = ImageFont.truetype(bold_font_path, 54)
small = ImageFont.truetype(font_path, 26)

draw.rectangle((70, 70, 1630, 1830), outline=(75, 75, 68), width=5)
draw.text((520, 150), "GOVERNMENT OF TAMIL NADU", fill=(35, 35, 32), font=bold)
draw.text((570, 225), "REVENUE DEPARTMENT", fill=(35, 35, 32), font=regular)
draw.text((405, 330), "LAND RECORD / RECORD OF RIGHTS", fill=(35, 35, 32), font=header)
draw.text((560, 420), "IMPERFECT SYNTHETIC TEST", fill=(35, 35, 32), font=small)
draw.line((150, 500, 1550, 500), fill=(75, 75, 68), width=4)

rows = [
    ("District", "Chengalpattu"),
    ("Tehsil", "Tiruporur"),
    ("Village", "Kelambakkam"),
    ("Owner Name", "Ramesh Kumar"),
    ("Survey Number", "142/3A"),
    ("Land Area", "2.45"),
    ("Area Unit", "Acres"),
    ("Land Classification", "Agricultural"),
    ("Ownership Details", "Individual Ownership"),
    ("Mutation Information", "MUT/2024/0182"),
    ("Registration Information", "REG/2019/4421"),
]
for index, (label, value) in enumerate(rows):
    y = 570 + index * 105
    draw.text((180, y), f"{label}:", fill=(40, 40, 36), font=bold)
    draw.text((760, y), value, fill=(40, 40, 36), font=regular)

draw.line((150, 1740, 1550, 1740), fill=(75, 75, 68), width=4)
draw.text((180, 1770), "Khata Number intentionally omitted for validation testing.", fill=(75, 75, 68), font=small)
image.save(output_path, "PDF", resolution=200.0)
print(f"Created {output_path} ({output_path.stat().st_size} bytes)")
