import json
import sys
import xml.etree.ElementTree as ET
from pathlib import Path
from reportlab.graphics.barcode import createBarcodeDrawing
from reportlab.graphics import renderSVG

sys.stdout.reconfigure(encoding='utf-8')
ROOT = Path(__file__).resolve().parents[1]
cards = json.loads((ROOT / 'donnees/cartes.json').read_text(encoding='utf-8'))
NS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', NS)
for card in cards:
    assert len(card['id']) == 8 and card['id'].isdigit()
    drawing = createBarcodeDrawing('Code128', value=card['id'], barWidth=2, barHeight=22,
                                  humanReadable=False, quiet=True, lquiet=20, rquiet=20)
    assert drawing.width <= 210
    source = ET.fromstring(renderSVG.drawToString(drawing))
    svg = ET.Element(f'{{{NS}}}svg', width='22', height='210', viewBox='0 0 22 210')
    ET.SubElement(svg, f'{{{NS}}}rect', width='22', height='210', fill='white')
    group = ET.SubElement(svg, f'{{{NS}}}g', transform=f'translate(22 {(210-drawing.width)/2}) rotate(90)')
    for child in source:
        group.append(child)
    (ROOT / 'assets/barcodes' / f"{card['id']}.svg").write_text(ET.tostring(svg, encoding='unicode'), encoding='utf-8')
print(f'{len(cards)} unique Code128 vectors, with quiet zones, ready.')
