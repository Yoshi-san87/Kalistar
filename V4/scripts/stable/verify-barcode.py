"""Decode the final rendered barcode; do not alter image pixels or source assets."""
import argparse
import json
import sys
from pathlib import Path

from PIL import Image, ImageOps

ROOT = Path(__file__).resolve().parents[3]
sys.path.insert(0, str(ROOT / "V1/scripts/vendor"))
import zxingcpp

parser = argparse.ArgumentParser()
parser.add_argument("--card", type=Path, default=ROOT / "V4/template-stable/taulio.json")
args = parser.parse_args()
folder = args.card.resolve().parent
card = json.loads(args.card.read_text(encoding="utf-8-sig"))
image = Image.open(ROOT / "V4/cartes" / (card["output"] + ".png")).convert("RGB")
crop = image.crop((132, 848, 154, 1058))
cases = {}
for mode, sample in [("color", crop), ("grayscale", ImageOps.grayscale(crop))]:
    for size, candidate in [("native", sample), ("4x", sample.resize((88, 840), Image.Resampling.NEAREST))]:
        cases[f"{mode}-{size}"] = [item.text for item in zxingcpp.read_barcodes(candidate)]
report = {
    "expected": card["id"],
    "decoded": cases,
    "allPassed": all(card["id"] in values for values in cases.values()),
    "physicalPrintVerified": False,
}
(folder / "barcode-verification.json").write_text(json.dumps(report, indent=2), encoding="utf-8")
print(json.dumps(report, indent=2))
if not report["allPassed"]:
    raise SystemExit("Barcode decoding failed")
