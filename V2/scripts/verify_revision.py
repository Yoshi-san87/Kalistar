from pathlib import Path
import json,sys
import numpy as np
from PIL import Image,ImageDraw,ImageFont
import pypdfium2 as pdfium
from pypdf import PdfReader
R=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(R/'scripts/vendor'))
import zxingcpp
cards=json.loads((R/'donnees/cartes.json').read_text(encoding='utf8'))
old=json.loads((R.parent/'V1/donnees/cartes.json').read_text(encoding='utf8'))
keys=['name','title','race','faction','job','positions','weapon','atk','defense','magic','barriers','text','id','element','advantage','disadvantage']
report=[]
for c,b in zip(cards,old):
    assert all(c[k]==b[k] for k in keys),c['name']
    im=Image.open(R/'cartes'/f"{c['slug']}.png").convert('RGB')
    identifiers={}
    for name,channel in [('rgb',im),('luma',im.convert('L')),('red_channel',im.getchannel('R'))]:
        ids=[x.text for x in zxingcpp.read_barcodes(channel)]
        assert c['id'] in ids,(c['name'],name,ids)
        identifiers[name]=ids
    fixed=None
    if not b['reference']:
        a=np.asarray(im).astype(int)
        z=np.asarray(Image.open(R.parent/'V1/cartes'/f"{c['slug']}.png").convert('RGB')).astype(int)
        mask=np.zeros((1497,897),bool)
        mask[250:1000,70:90]=True
        mask[250:1000,807:824]=True
        mask[83:103,230:680]=True
        fixed=int(np.abs(a-z)[mask].max())
        assert fixed==0,(c['name'],'fixed frame ROI',fixed)
    report.append(dict(card=c['name'],gameplay_unchanged=True,barcode_checks=identifiers,fixed_frame_roi_max_difference=fixed))
pdfpath=R/'impression/KALISTAR_V2_12_CARTES_BARCODE_NOIR.pdf'
reader=PdfReader(pdfpath);assert len(reader.pages)==12
doc=pdfium.PdfDocument(str(pdfpath))
for i,c in enumerate(cards):
    page=doc[i];bitmap=page.render(scale=300/72)
    ids=[x.text for x in zxingcpp.read_barcodes(bitmap.to_pil())]
    assert c['id'] in ids,(c['name'],'BW PDF')
    stream=reader.pages[i].get_contents().get_data().decode('latin1')
    assert '0 0 0 1 k' in stream
    report[i]['black_vector_pdf_decoded']=ids
    bitmap.close();page.close()
doc.close()
(R/'verification/controle_revision_v2.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',24)
out=Image.new('RGB',(1620,1020),(14,22,30));draw=ImageDraw.Draw(out)
for row,version in enumerate(['V1','V2']):
    draw.text((16,row*510+8),version,font=font,fill='white')
    for col,i in enumerate([0,1,3,4,6,11]):
        c=cards[i]
        im=Image.open(R.parent/version/'cartes'/f"{c['slug']}.png").convert('RGB')
        im.thumbnail((250,418));out.paste(im,(12+col*268,row*510+44))
        draw.text((20+col*268,row*510+467),c['name'],font=font,fill='#C7D9E2')
out.save(R/'COMPARAISON_V1_V2.jpg',quality=94)
print('Gameplay and IDs unchanged; 36 colour/luma/red-channel decodes; 12 K-only PDF codes; fixed frame ROIs unchanged on the 10 comparable native templates.')

