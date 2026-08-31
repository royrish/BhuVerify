from pathlib import Path

project_root = Path(__file__).resolve().parent.parent
path = project_root / "sample-data" / "test-upload.pdf"
path.parent.mkdir(parents=True, exist_ok=True)
content = b"%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 200 200] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj\n4 0 obj\n<< /Length 44 >>\nstream\nBT /F1 18 Tf 50 100 Td (BhuVerify test) Tj ET\nendstream\nendobj\n5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\nxref\n0 6\n0000000000 65535 f \n0000000010 00000 n \n0000000062 00000 n \n0000000123 00000 n \n0000000245 00000 n \n0000000437 00000 n \ntrailer\n<< /Root 1 0 R /Size 6 >>\nstartxref\n500\n%%EOF\n"
path.write_bytes(content)
print(f"Created {path} ({len(content)} bytes)")
