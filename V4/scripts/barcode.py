import json
import xml.etree.ElementTree as ET
from pathlib import Path
from reportlab.graphics.barcode import createBarcodeDrawing
from reportlab.graphics import renderSVG
ROOT=Path(__file__).resolve().parents[1]
card=json.loads((ROOT/'donnees/momo.json').read_text(encoding='utf-8'))
NS='http://www.w3.org/2000/svg'
ET.register_namespace('',NS)
drawing=createBarcodeDrawing('Code128',value=card['id'],barWidth=2,barHeight=22,humanReadable=False,quiet=True,lquiet=20,rquiet=20)
assert drawing.width<=210
svg=ET.Element(f'{{{NS}}}svg',width='22',height='210',viewBox='0 0 22 210')
defs=ET.SubElement(svg,f'{{{NS}}}defs')
gradient=ET.SubElement(defs,f'{{{NS}}}linearGradient',id='spectre',x1='0',y1='0',x2='0',y2='1')
for offset,color in [('0%','#A0E6ED'),('28%','#ADB9EA'),('55%','#D9A4DA'),('78%','#F0B6C6'),('100%','#EAD578')]:
    ET.SubElement(gradient,f'{{{NS}}}stop',offset=offset,attrib={'stop-color':color})
ET.SubElement(svg,f'{{{NS}}}rect',width='22',height='210',fill='url(#spectre)')
group=ET.SubElement(svg,f'{{{NS}}}g',transform=f'translate(22 {(210-drawing.width)/2}) rotate(90)')
for child in ET.fromstring(renderSVG.drawToString(drawing)):
    group.append(child)
(ROOT/'assets/barcode.svg').write_text(ET.tostring(svg,encoding='unicode'),encoding='utf-8')
print('Reference Code128:',card['id'])
