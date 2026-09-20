import hashlib
import json
import sys
from pathlib import Path
from PIL import Image,ImageChops
ROOT=Path(__file__).resolve().parents[1]
V3=ROOT.parent/'V3'
sys.path.insert(0,str(ROOT.parent/'V1/scripts/vendor'))
import zxingcpp
checks={}
baseline=json.loads((ROOT/'verification/v3-sources.json').read_text(encoding='utf-8'))
checks['v3_unchanged']=all(hashlib.sha256((V3/x['file']).read_bytes()).hexdigest()==x['sha256'] for x in baseline)
assert checks['v3_unchanged']
original=json.loads((V3/'donnees/cartes.json').read_text(encoding='utf-8'))[0]
card=json.loads((ROOT/'donnees/momo.json').read_text(encoding='utf-8'))
checks['gameplay_unchanged']=all(original[k]==card[k] for k in ['id','name','atk','defense','magic','barriers','positions','weapon','race','faction','advantage','disadvantage'])
assert checks['gameplay_unchanged']
png=Image.open(ROOT/'cartes/01_ELECTRO_MOMO.png')
tif=Image.open(ROOT/'impression/01_ELECTRO_MOMO.tif')
checks['size']=png.size
checks['ppi']=[float(x) for x in tif.info['dpi']]
checks['print_mode']=tif.mode
assert png.size==tif.size==(897,1497) and checks['ppi']==[300,300] and tif.mode=='CMYK'
old=Image.open(V3/'cartes/01_ELECTRO_MOMO.png').convert('RGB')
region=(290,190,655,1060)
checks['illustration_pixels_unchanged']=ImageChops.difference(png.convert('RGB').crop(region),old.crop(region)).getbbox() is None
checks['illustration_verified_region']=region
assert checks['illustration_pixels_unchanged']
checks['barcode']={}
for label,im in [('source',Image.open(ROOT/'assets/barcode.png')),('card_rgb',png.crop((132,848,154,1058))),('card_gray',png.crop((132,848,154,1058)).convert('L')),('print_cmyk',tif.convert('RGB').crop((132,848,154,1058)))]:
    decoded=[x.text for x in zxingcpp.read_barcodes(im.convert('RGB'))]
    assert decoded==['30000001'],(label,decoded)
    checks['barcode'][label]=decoded
(ROOT/'verification/controles.json').write_text(json.dumps(checks,indent=2),encoding='utf-8')
print(json.dumps(checks,indent=2))
