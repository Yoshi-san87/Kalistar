"""Generate the new Code128 asset; its spectral tint stays in the PSD."""
import json
import xml.etree.ElementTree as ET
from pathlib import Path
from reportlab.graphics.barcode import createBarcodeDrawing
from reportlab.graphics import renderSVG

ROOT = Path(__file__).resolve().parents[3]
WORK = ROOT / 'V4/template-stable/rikka'
card = json.loads((WORK / 'card.json').read_text(encoding='utf-8'))
NS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', NS)
drawing = createBarcodeDrawing('Code128', value=card['id'], barWidth=2, barHeight=22,
                              humanReadable=False, quiet=True, lquiet=20, rquiet=20)
assert drawing.width <= 210
svg = ET.Element(f'{{{NS}}}svg', width='22', height='210', viewBox='0 0 22 210')
ET.SubElement(svg, f'{{{NS}}}rect', width='22', height='210', fill='white')
group = ET.SubElement(svg, f'{{{NS}}}g', transform=f'translate(22 {(210-drawing.width)/2}) rotate(90)')
for child in ET.fromstring(renderSVG.drawToString(drawing)):
    group.append(child)
(WORK / 'barcode.svg').write_text(ET.tostring(svg, encoding='unicode'), encoding='utf-8')
print('Code128:', card['id'])
