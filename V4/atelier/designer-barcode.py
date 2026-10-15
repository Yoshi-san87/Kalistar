"""Emit the same Code128 geometry used by the approved V4 cards."""
import re
import sys
import xml.etree.ElementTree as ET
from reportlab.graphics.barcode import createBarcodeDrawing
from reportlab.graphics import renderSVG

value = sys.argv[1]
if not re.fullmatch(r"\d{8}", value):
    raise ValueError("Eight digits required")
drawing = createBarcodeDrawing("Code128", value=value, barWidth=2, barHeight=22,
                              humanReadable=False, quiet=True, lquiet=20, rquiet=20)
ns = "http://www.w3.org/2000/svg"
ET.register_namespace("", ns)
svg = ET.Element(f"{{{ns}}}svg", width="22", height="210", viewBox="0 0 22 210")
ET.SubElement(svg, f"{{{ns}}}rect", width="22", height="210", fill="white")
group = ET.SubElement(svg, f"{{{ns}}}g", transform=f"translate(22 {(210-drawing.width)/2}) rotate(90)")
for child in ET.fromstring(renderSVG.drawToString(drawing)):
    group.append(child)
sys.stdout.write(ET.tostring(svg, encoding="unicode"))
