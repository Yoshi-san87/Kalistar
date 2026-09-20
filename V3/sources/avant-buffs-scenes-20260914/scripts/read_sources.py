import json
import sys
from pathlib import Path
import zipfile
import xml.etree.ElementTree as ET
import openpyxl

sys.stdout.reconfigure(encoding='utf-8')

ROOT = Path(__file__).resolve().parents[1]
MAIN = ROOT.parent / 'main'
OUT = ROOT / 'sources'
NS = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
report = {'workbooks': [], 'stories': []}
for source in MAIN.rglob('*.xlsx'):
    book = openpyxl.load_workbook(source, data_only=True)
    entry = {'path': str(source), 'sheets': {}}
    for sheet in book:
        rows = []
        for row in sheet:
            cells = []
            for cell in row:
                if cell.value is not None:
                    cells.append({'cell': cell.coordinate, 'value': cell.value, 'fill': str(cell.fill.fgColor), 'font': str(cell.font.color)})
            if cells:
                rows.append(cells)
        entry['sheets'][sheet.title] = rows
    report['workbooks'].append(entry)
for source in MAIN.rglob('*.docx'):
    with zipfile.ZipFile(source) as archive:
        tree = ET.fromstring(archive.read('word/document.xml'))
    paragraphs = [''.join(t.text or '' for t in p.findall('.//w:t', NS)) for p in tree.findall('.//w:p', NS)]
    text = '\n'.join(p for p in paragraphs if p.strip())
    entry = {'file': source.name, 'path': str(source), 'text': text}
    report['stories'].append(entry)
(OUT / 'sources-extraites.json').write_text(json.dumps(report, ensure_ascii=False, default=str, indent=2), encoding='utf-8')
(OUT / 'histoire.txt').write_text('\n\n'.join('SOURCE: '+s['file']+'\n'+s['text'] for s in report['stories']), encoding='utf-8')
for book in report['workbooks']:
    print(book['path'])
    for name, rows in book['sheets'].items():
        print(name, len(rows), 'rows')
for story in report['stories']:
    print(story['file'], len(story['text']), 'characters')
