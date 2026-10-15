from pathlib import Path
import json
import sys
from PIL import Image

root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / 'scripts/vendor'))
import zxingcpp
cards = json.loads((root / 'donnees/cartes.json').read_text(encoding='utf8'))
result = []
for index, card in enumerate(cards, 1):
    with Image.open(root / 'verification/pdf20' / f'card-{index:02d}.png') as im:
        assert im.size == (897, 1497), (index, im.size)
        decoded = [b.text for b in zxingcpp.read_barcodes(im)]
        assert card['id'] in decoded, (index, decoded)
        result.append({'page': index, 'id': card['id'], 'decoded': decoded, 'size': im.size})
(root / 'verification/controle_20_pdf.json').write_text(json.dumps(result, indent=2), encoding='utf8')
print('20 PDF pages rendered at 300 dpi; every colour barcode decodes to the correct ID.')
