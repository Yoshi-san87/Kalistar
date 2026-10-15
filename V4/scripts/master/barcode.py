"""Code128 with integer-aligned modules and a continuous spectrum substrate."""
import argparse
import xml.etree.ElementTree as ET
from pathlib import Path
from reportlab.graphics.barcode.code128 import Code128

p = argparse.ArgumentParser()
p.add_argument('--value', required=True)
p.add_argument('--output', required=True)
p.add_argument('--width', type=int, default=28)
p.add_argument('--height', type=int, default=255)
a = p.parse_args()
if not a.value.isdigit() or len(a.value) != 8:
    raise ValueError('Eight-digit card reference required; never use an activation secret.')
ns = 'http://www.w3.org/2000/svg'
ET.register_namespace('', ns)
code = Code128(a.value)
code.validate()
code.encode()
runs = [(c.isupper(), ord(c.lower()) - ord('a') + 1) for c in code.decompose()]
modules = sum(width for _, width in runs)
unit = a.height // (modules + 24)
if unit < 2:
    raise ValueError('Barcode cell too short for two-pixel modules and quiet zones.')
start = (a.height - modules * unit) // 2
svg = ET.Element(f'{{{ns}}}svg', width=str(a.width), height=str(a.height), viewBox=f'0 0 {a.width} {a.height}')
defs = ET.SubElement(svg, f'{{{ns}}}defs')
g = ET.SubElement(defs, f'{{{ns}}}linearGradient', id='spectrum', x1='0%', y1='0%', x2='0%', y2='100%')
for offset, color in [('0%', '#A0E6ED'), ('28%', '#ADB9EA'), ('55%', '#D9A4DA'), ('78%', '#F0B6C6'), ('100%', '#EAD578')]:
    ET.SubElement(g, f'{{{ns}}}stop', offset=offset, attrib={'stop-color': color})
ET.SubElement(svg, f'{{{ns}}}rect', width=str(a.width), height=str(a.height), fill='url(#spectrum)')
y = start
for dark, width in runs:
    height = width * unit
    if dark:
        ET.SubElement(svg, f'{{{ns}}}rect', x='0', y=str(y), width=str(a.width), height=str(height), fill='#020609')
    y += height
Path(a.output).parent.mkdir(parents=True, exist_ok=True)
Path(a.output).write_text(ET.tostring(svg, encoding='unicode'), encoding='utf-8')
print(f'Code128 {a.value}: {modules} modules, {unit} px/module, quiet zones {start}/{a.height-y} px')
