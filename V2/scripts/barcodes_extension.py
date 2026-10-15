import json
import xml.etree.ElementTree as ET
from pathlib import Path
from reportlab.graphics.barcode import createBarcodeDrawing
from reportlab.graphics import renderSVG

root = Path(__file__).resolve().parents[1]
cards = json.loads((root / 'donnees/cartes.json').read_text(encoding='utf8'))
for card in cards[12:]:
    drawing = createBarcodeDrawing('Code128', value=card['id'], barWidth=2, barHeight=22,
                                   humanReadable=False, quiet=True, lquiet=20, rquiet=20)
    tree = ET.fromstring(renderSVG.drawToString(drawing))
    body = ''.join(ET.tostring(child, encoding='unicode') for child in tree)
    width = float(drawing.width)
    assert width <= 210
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="22" height="210"><rect width="22" height="210" fill="white"/><g transform="translate(22 {(210-width)/2}) rotate(90)">{body}</g></svg>'
    (root / 'assets/barcodes' / f"{card['id']}.svg").write_text(svg, encoding='utf8')
print('8 new Code128 SVGs prepared')
