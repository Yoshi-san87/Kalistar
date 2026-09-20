"""Read-only barcode checks on the staged asset and the Photoshop export."""
import json
import argparse
import sys
from pathlib import Path
from PIL import Image, ImageOps

root = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(root.parent / 'V1/scripts/vendor'))
import zxingcpp

parser = argparse.ArgumentParser()
parser.add_argument('--card', default='master/exports/MOMO-recompose.png')
parser.add_argument('--id', default='30000001')
parser.add_argument('--report', default='master/verification/barcode.json')
parser.add_argument('--box', type=int, nargs=4, default=[98, 944, 122, 1199])
args = parser.parse_args()

cases = {}
for name, path in [('asset', root / 'master/staging/barcode.png'),
                   ('card', root / args.card)]:
    with Image.open(path) as source:
        crop = source.crop(tuple(args.box)).convert('RGB')
        for mode, image in [('color', crop), ('gray', ImageOps.grayscale(crop))]:
            for scale, sample in [('native', image), ('4x', image.resize((image.width * 4, image.height * 4)))]:
                results = zxingcpp.read_barcodes(sample)
                values = [result.text for result in results]
                cases[f'{name}-{mode}-{scale}'] = values
                if args.id not in values:
                    raise RuntimeError(f'Barcode failed: {name}/{mode}/{scale}: {values}')
report = {'expected': args.id, 'decoded': cases,
          'testedBox': args.box,
          'printedScanVerified': False, 'purpose': 'Card reference, not an activation secret'}
(root / args.report).write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report))
