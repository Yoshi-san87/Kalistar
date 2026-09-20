from pathlib import Path
import sys, json, io, zipfile, statistics, html
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader
from pypdf import PdfReader, PdfWriter
from pypdf.generic import NameObject, DictionaryObject, ArrayObject, DecodedStreamObject, NumberObject, TextStringObject

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'scripts/vendor'))
import zxingcpp
cards=json.loads((ROOT/'donnees/cartes.json').read_text(encoding='utf8'))
elements=json.loads((ROOT/'donnees/elements.json').read_text(encoding='utf8'))
weapons=json.loads((ROOT/'donnees/armes.json').read_text(encoding='utf8'))
checks=[]
for c in cards:
    png=ROOT/'cartes'/f"{c['slug']}.png"
    tif=ROOT/'impression'/f"{c['slug']}.tif"
    with Image.open(png) as im:
        decoded=[x.text for x in zxingcpp.read_barcodes(im.convert('RGB'))]
        assert c['id'] in decoded,(c['name'],decoded)
        assert im.size==(897,1497)
        assert np.std(np.asarray(im.convert('RGB'))) > 20
        record=dict(name=c['name'],id=c['id'],png_size=im.size,png_decoded=decoded)
        if c['reference']:
            baseline=np.asarray(Image.open(ROOT/'verification'/f"{c['name']}_reference_rgb.png").convert('RGB'))
            actual=np.asarray(im.convert('RGB'))
            mask=np.ones((1497,897),bool);mask[848:1058,132:154]=False
            delta=np.abs(actual.astype(int)-baseline.astype(int))
            record['reference_outside_barcode_max_difference']=int(delta[mask].max())
            assert record['reference_outside_barcode_max_difference']==0
    with Image.open(tif) as im:
        assert im.size==(897,1497) and im.mode=='CMYK'
        assert tuple(round(x) for x in im.info['dpi'])==(300,300)
        assert im.info.get('icc_profile')
        decoded=[x.text for x in zxingcpp.read_barcodes(im.convert('RGB'))]
        assert c['id'] in decoded,(c['name'],'TIFF',decoded)
        record.update(cmyk_mode=im.mode,dpi=[float(x) for x in im.info['dpi']],tiff_decoded=decoded)
    checks.append(record)
(ROOT/'verification/controle_exports.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2),encoding='utf8')

# CMYK images remain device CMYK; the source ICC is attached as the output intent.
size=(897*72/300,1497*72/300)
def make_pdf(filename, monochrome=False):
    raw=io.BytesIO()
    pdf=canvas.Canvas(raw,pagesize=size,pageCompression=1)
    pdf.setTitle('Kalistar V2 - 12 cartes'+(' - barcode noir' if monochrome else ' - barcode couleur'))
    pdf.setAuthor('Kalistar')
    icc=None
    for c in cards:
        im=Image.open(ROOT/'impression'/f"{c['slug']}.tif")
        icc=im.info['icc_profile']
        jpg=io.BytesIO();im.save(jpg,'JPEG',quality=100,subsampling=0,icc_profile=icc,dpi=(300,300));jpg.seek(0)
        pdf.drawImage(ImageReader(jpg),0,0,width=size[0],height=size[1])
        if monochrome:
            unit=72/300
            pdf.setFillColorCMYK(0,0,0,0)
            pdf.rect(132*unit,(1497-1058)*unit,22*unit,210*unit,stroke=0,fill=1)
            code=Image.open(ROOT/'assets/barcodes_noir_blanc'/f"{c['id']}.png").convert('L')
            rows=[code.getpixel((11,y))<128 for y in range(210)]+[False]
            pdf.setFillColorCMYK(0,0,0,1)
            first=None
            for y,dark in enumerate(rows):
                if dark and first is None:first=y
                if not dark and first is not None:
                    # Avoid inclusive boundary pixels caused by PDF rasterizer rounding.
                    epsilon=0.001
                    pdf.rect(132*unit,(1497-848-y+epsilon)*unit,22*unit,(y-first-2*epsilon)*unit,stroke=0,fill=1)
                    first=None
        pdf.bookmarkPage(c['slug']);pdf.addOutlineEntry(c['name']+' - '+c['element'],c['slug'])
        pdf.showPage()
    pdf.save();raw.seek(0)
    writer=PdfWriter();writer.clone_document_from_reader(PdfReader(raw))
    profile=DecodedStreamObject();profile.set_data(icc);profile[NameObject('/N')]=NumberObject(4)
    intent=DictionaryObject({NameObject('/Type'):NameObject('/OutputIntent'),NameObject('/S'):NameObject('/GTS_PDFX'),NameObject('/OutputConditionIdentifier'):TextStringObject('U.S. Web Coated (SWOP) v2'),NameObject('/Info'):TextStringObject('Source CMYK profile; trim and bleed not specified'),NameObject('/DestOutputProfile'):writer._add_object(profile)})
    writer.root_object[NameObject('/OutputIntents')]=ArrayObject([writer._add_object(intent)])
    pdf_path=ROOT/'impression'/filename
    with pdf_path.open('wb') as f:writer.write(f)
    reader=PdfReader(pdf_path);assert len(reader.pages)==12
    assert all(abs(float(p.mediabox.width)-size[0])<.001 for p in reader.pages)
    assert all('/TrimBox' not in p and '/BleedBox' not in p for p in reader.pages)

make_pdf('KALISTAR_V2_12_CARTES.pdf')
make_pdf('KALISTAR_V2_12_CARTES_BARCODE_NOIR.pdf',True)

# Conditional numeric comparisons never turn an unresolved special effect into zero.
rows=[]
for c in cards:
    numeric_atk=[(6-i,v) for i,v in enumerate(c['atk']) if isinstance(v,int)]
    numeric_def=[v for v in c['defense'] if isinstance(v,int)]
    values=[v for _,v in numeric_atk]
    rate0=[];rateb=[]
    for other in cards:
        for die,v in numeric_atk:
            for d in other['defense']:
                if not isinstance(d,int):continue
                rate0.append(v>d)
                rateb.append(max(0,v-(30 if die in c['magic'] else 0))>d)
    expected_cost=30*sum(die in c['magic'] for die,_ in numeric_atk)/len(numeric_atk)/3
    rows.append(dict(name=c['name'],positions=c['positions'],atk_mean=round(statistics.mean(values),1),def_mean=round(statistics.mean(numeric_def),1),numeric_atk_faces=len(values),numeric_def_faces=len(numeric_def),magic_faces=c['magic'],expected_barrier_cost_vs_2_faces=round(expected_cost,1),win_numeric_no_mod=round(statistics.mean(rate0)*100,1),win_numeric_all_barriers=round(statistics.mean(rateb)*100,1)))
(ROOT/'verification/equilibrage_numerique.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2),encoding='utf8')
table='\n'.join('| {name} | {atk_mean} | {def_mean} | {expected_barrier_cost_vs_2_faces} | {win_numeric_no_mod}% | {win_numeric_all_barriers}% |'.format(**r) for r in rows)
balance="""# Essais numeriques V2

Ces resultats sont un diagnostic, pas une validation definitive du jeu. Les faces a effet sont exclues, jamais assimilees a zero. Les pourcentages sont conditionnels aux confrontations purement numeriques, contre les douze profils de la serie, sans arme, element ni synergie. La derniere colonne est un test extreme ou toutes les defenses rencontrent une barriere.

| Carte | ATK moyenne numerique | DEF moyenne numerique | Cout ATK moyen face a 2 barrieres/6 | Eliminations sans bonus | Eliminations avec barrieres partout |
|---|---:|---:|---:|---:|---:|
"""+table+"""

## Lecture

- Une barriere de -30 coute en moyenne 10 points a un profil entierement magique face a deux faces protegees sur six. C'est sensible, mais tres inferieur aux +50/-50 d'arme.
- La regle est asymetrique : la magie n'a aucun avantage intrinseque contre une defense physique. Il faut donc la payer par de meilleures valeurs, des effets utiles ou des interactions elementaires. Ce n'est pas automatiquement equilibre.
- Malinia dispose d'une ATK brute legerement superieure au profil physique Darnako, mais cette marge ne couvre pas a elle seule toutes les configurations de barrieres. C'est un point de vigilance des premiers essais, pas une raison de changer silencieusement les valeurs des sources.
- Les profils de soutien misent aussi sur leurs effets non numeriques. Leur puissance globale ne peut pas etre estimee sans definir exactement la relance, le mana, l'esquive, la mort et la resurrection.
- Rainbow est volontairement privilegie par les interactions elementaires ; la limite d'une carte par deck est necessaire mais ne prouve pas l'equilibre.

## Premiere campagne de tests

Conserver ces chiffres comme point de depart. Jouer des compositions mixtes puis homogenes, journaliser les jets et les effets, et comparer les profils de meme position. Si les DPS magiques perdent regulierement a budget comparable, tester d'abord une hausse de 5 a 10 points de leurs faces numeriques, ou une barriere de -20 au lieu de -30. Ne modifier qu'un parametre a la fois. Les valeurs imprimees originales restent conservees.
"""
(ROOT/'verification/EQUILIBRAGE.md').write_text(balance,encoding='utf8')

font=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',23)
small=ImageFont.truetype('C:/Windows/Fonts/arial.ttf',17)
sheet=Image.new('RGB',(1536,2112),(12,17,23));draw=ImageDraw.Draw(sheet)
draw.text((30,20),'KALISTAR / V2',font=font,fill='white')
for i,c in enumerate(cards):
    x=24+(i%4)*378;y=70+(i//4)*675
    im=Image.open(ROOT/'cartes'/f"{c['slug']}.png").convert('RGB');im.thumbnail((360,602))
    sheet.paste(im,(x,y))
    draw.text((x+10,y+606),c['element']+' / '+c['name'],font=small,fill='#D6DEE6')
    draw.text((x+10,y+630),'P'+ ' / P'.join(map(str,c['positions']))+'   '+c['faction'],font=small,fill='#8E9CA8')
sheet.save(ROOT/'APERÇU_12_CARTES.jpg',quality=93)
items=[]
for c in cards:
    url='cartes/'+c['slug']+'.png'
    items.append('<figure data-element="'+c['element']+'"><a href="'+url+'"><img loading="lazy" width="897" height="1497" src="'+url+'" alt="'+html.escape(c['name'])+'"></a><figcaption><strong>'+c['name']+'</strong><span>'+c['element']+' · P'+' / P'.join(map(str,c['positions']))+'</span></figcaption></figure>')
page='''<!doctype html><html lang="fr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Kalistar V2</title>
<style>*{box-sizing:border-box}body{margin:0;background:#0c1117;color:#e7edf2;font:15px Arial,sans-serif;letter-spacing:0}header{padding:22px 28px;border-bottom:1px solid #34434c;display:flex;align-items:center;gap:22px;flex-wrap:wrap}h1{font:24px Georgia,serif;margin:0}header a{color:#91cde0;text-decoration:none}select{margin-left:auto;background:#1c2730;color:white;border:1px solid #50616d;padding:8px}main{max-width:1800px;margin:auto;padding:24px;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:30px 20px}figure{margin:0;min-width:0}img{display:block;width:100%;height:auto;aspect-ratio:897/1497;object-fit:contain}figcaption{display:flex;justify-content:space-between;gap:8px;flex-wrap:wrap;padding:8px 10px;font-size:12px}figcaption span{color:#a8bbc8}a:focus-visible{outline:2px solid #77cce2}footer{padding:25px;color:#8f9daa;border-top:1px solid #34434c}@media(max-width:850px){main{grid-template-columns:repeat(2,minmax(0,1fr));gap:18px 8px;padding:10px}header{padding:18px;gap:14px}}@media(max-width:420px){main{grid-template-columns:1fr}select{margin-left:0}}[hidden]{display:none}</style>
<header><h1>KALISTAR <small>V2</small></h1><a href="impression/KALISTAR_V2_12_CARTES.pdf">PDF taille réelle</a><a href="impression/KALISTAR_V2_12_CARTES_BARCODE_NOIR.pdf">PDF code noir</a><a href="../V1/OUVRIR_LES_CARTES.html">V1</a><a href="KALISTAR_V2_CARTES_PNG.zip">Les 12 cartes PNG</a><select aria-label="Élément"><option value="">Tous les éléments</option>'''+''.join('<option>'+x['id']+'</option>' for x in elements.values())+'''</select></header><main>'''+''.join(items)+'''</main><footer>897 × 1497 px · 300 ppp · Prototype V2</footer><script>document.querySelector('select').addEventListener('change',e=>document.querySelectorAll('figure').forEach(f=>f.hidden=!!e.target.value&&f.dataset.element!==e.target.value))</script></html>'''
(ROOT/'OUVRIR_LES_CARTES.html').write_text(page,encoding='utf8')
with zipfile.ZipFile(ROOT/'KALISTAR_V2_CARTES_PNG.zip','w',zipfile.ZIP_DEFLATED) as z:
    for c in cards:z.write(ROOT/'cartes'/f"{c['slug']}.png",f"{c['slug']}.png")
print('Verified 12 PNG and 12 CMYK TIFF barcodes; built PDF, preview, gallery and PNG archive.')
