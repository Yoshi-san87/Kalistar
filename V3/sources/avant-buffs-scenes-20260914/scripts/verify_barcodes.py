import json
import sys
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT.parent / 'V1/scripts/vendor'))
import zxingcpp

cards = json.loads((ROOT / 'donnees/cartes.json').read_text(encoding='utf-8'))
results = []
for card in cards:
    checks = {}
    for folder in ['barcodes', 'barcodes_noir_blanc']:
        image = Image.open(ROOT / 'assets' / folder / (card['id']+'.png')).convert('RGB')
        decoded = zxingcpp.read_barcodes(image)
        values = [result.text for result in decoded]
        assert values == [card['id']], (card['id'], folder, values)
        checks[folder] = values[0]
    if '--require-prints' in sys.argv:
        image = Image.open(ROOT / 'cartes' / (card['slug']+'.png')).convert('RGB')
        region = image.crop((132, 848, 154, 1058))
        values = [result.text for result in zxingcpp.read_barcodes(region)]
        assert values == [card['id']], (card['id'], 'assembled_card', values)
        checks['assembled_card'] = values[0]
    results.append({'id': card['id'], 'decoded': checks})
(ROOT / 'verification/barcodes-41.json').write_text(json.dumps(results, indent=2), encoding='utf-8')
print(f'{len(results)} colour barcodes and {len(results)} monochrome barcodes decoded correctly.')
if '--require-prints' in sys.argv:
    print(f'{len(results)} assembled card barcodes decoded correctly after Photoshop export.')
