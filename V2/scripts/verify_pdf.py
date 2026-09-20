from pathlib import Path
import sys,json
from PIL import Image
import numpy as np
import pypdfium2 as pdfium
from pypdf import PdfReader
R=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(R/'scripts/vendor'))
import zxingcpp
cards=json.loads((R/'donnees/cartes.json').read_text(encoding='utf8'))
doc=pdfium.PdfDocument(str(R/'impression/KALISTAR_V2_12_CARTES.pdf'))
results=[]
for i,c in enumerate(cards):
    page=doc[i];bitmap=page.render(scale=300/72);im=bitmap.to_pil()
    ids=[r.text for r in zxingcpp.read_barcodes(im)]
    assert c['id'] in ids,(i,ids)
    results.append(dict(page=i+1,card=c['name'],barcode=ids,size_points=page.get_size(),rendered_at_dpi=300))
    bitmap.close();page.close()
doc.close()
reader=PdfReader(R/'impression/KALISTAR_V2_12_CARTES.pdf')
assert reader.trailer['/Root']['/OutputIntents']
for page in reader.pages:
    objects=page['/Resources']['/XObject'].get_object()
    assert all(obj.get_object().get('/ColorSpace')=='/DeviceCMYK' for obj in objects.values())
(R/'verification/controle_pdf.json').write_text(json.dumps(results,ensure_ascii=False,indent=2),encoding='utf8')
print('PDF V2: 12 CMYK pages and coloured IDs checked.')
