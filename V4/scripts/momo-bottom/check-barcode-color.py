"""Check the actual Photoshop render, not only a generated barcode asset."""
import argparse
import json
import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / 'V1/scripts/vendor'))
import zxingcpp

parser = argparse.ArgumentParser()
parser.add_argument('image', type=Path)
parser.add_argument('--report', type=Path, required=True)
args = parser.parse_args()

image = Image.open(args.image).convert('RGB')
crop = image.crop((132, 848, 154, 1058))
cases = {}
for mode, sample in [('color', crop), ('grayscale', ImageOps.grayscale(crop))]:
    for size, candidate in [('native', sample), ('4x', sample.resize((88, 840), Image.Resampling.NEAREST))]:
        results = zxingcpp.read_barcodes(candidate)
        cases[f'{mode}-{size}'] = [item.text for item in results]
report = {
    'expected': '30000001',
    'decoded': cases,
    'allPassed': all('30000001' in values for values in cases.values()),
    'printedScanVerified': False,
    'scope': 'Digital render; physical printing and scanner conditions still require a real test.',
}
args.report.parent.mkdir(parents=True, exist_ok=True)
args.report.write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report, indent=2))
if not report['allPassed']:
    raise SystemExit('Barcode readability check failed.')
