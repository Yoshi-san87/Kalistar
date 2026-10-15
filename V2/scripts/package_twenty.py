from pathlib import Path
import io
import json
import sys
import zipfile
from PIL import Image
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject, DictionaryObject, ArrayObject, DecodedStreamObject, NumberObject, TextStringObject

root = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(root / 'scripts/vendor'))
import zxingcpp

cards = json.loads((root / 'donnees/cartes.json').read_text(encoding='utf8'))
assert len(cards) == 20 and len({c['id'] for c in cards}) == 20
checks = []
for card in cards:
    record = {'id': card['id'], 'slug': card['slug']}
    for folder, extension in [('cartes', 'png'), ('impression', 'tif')]:
        with Image.open(root / folder / (card['slug'] + '.' + extension)) as im:
            assert im.size == (897, 1497)
            assert tuple(round(v) for v in im.info['dpi']) == (300, 300)
            if extension == 'tif':
                assert im.mode == 'CMYK'
                assert im.info.get('icc_profile')
            decoded = [result.text for result in zxingcpp.read_barcodes(im.convert('RGB'))]
            assert card['id'] in decoded, (card['slug'], extension, decoded)
            record[extension] = {'mode': im.mode, 'decoded': decoded}
    assert (root / 'templates' / (card['slug'] + '.psd')).stat().st_size > 1000000
    checks.append(record)

size = (897 * 72 / 300, 1497 * 72 / 300)
raw = io.BytesIO()
pdf = canvas.Canvas(raw, pagesize=size, pageCompression=1)
pdf.setTitle('Kalistar V2 - 20 cartes - identifiants couleur')
pdf.setAuthor('Kalistar')
icc = None
for card in cards:
    with Image.open(root / 'impression' / (card['slug'] + '.tif')) as im:
        icc = im.info['icc_profile']
        pdf.drawImage(ImageReader(im), 0, 0, width=size[0], height=size[1])
    pdf.bookmarkPage(card['slug'])
    pdf.addOutlineEntry(card['name'] + ' - ' + card['title'], card['slug'])
    pdf.showPage()
pdf.save()
raw.seek(0)
writer = PdfWriter()
writer.clone_document_from_reader(PdfReader(raw))
profile = DecodedStreamObject()
profile.set_data(icc)
profile[NameObject('/N')] = NumberObject(4)
intent = DictionaryObject({
    NameObject('/Type'): NameObject('/OutputIntent'),
    NameObject('/S'): NameObject('/GTS_PDFX'),
    NameObject('/OutputConditionIdentifier'): TextStringObject('U.S. Web Coated (SWOP) v2'),
    NameObject('/Info'): TextStringObject('Source CMYK profile retained; printer trim and bleed not specified'),
    NameObject('/DestOutputProfile'): writer._add_object(profile),
})
writer.root_object[NameObject('/OutputIntents')] = ArrayObject([writer._add_object(intent)])
destination = root / 'impression/KALISTAR_V2_20_CARTES.pdf'
with destination.open('wb') as stream:
    writer.write(stream)
reader = PdfReader(destination)
assert len(reader.pages) == 20
for page in reader.pages:
    assert abs(float(page.mediabox.width) - size[0]) < .001
    assert abs(float(page.mediabox.height) - size[1]) < .001
    assert '/TrimBox' not in page and '/BleedBox' not in page
    assert all(x.get_object()['/ColorSpace'] == '/DeviceCMYK' for x in page['/Resources']['/XObject'].values())
with zipfile.ZipFile(root / 'KALISTAR_V2_CARTES_PNG.zip', 'w', zipfile.ZIP_DEFLATED) as archive:
    for card in cards:
        archive.write(root / 'cartes' / (card['slug'] + '.png'), card['slug'] + '.png')
(root / 'verification/controle_20_exports.json').write_text(json.dumps(checks, indent=2), encoding='utf8')
print('20 PNG + 20 CMYK TIFF + 20 PSD verified. All 40 coloured barcodes decoded. PDF and ZIP ready.')
