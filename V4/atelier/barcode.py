"""Read the rendered draft barcode; never alter the image."""
import sys
import json
from pathlib import Path
from PIL import Image, ImageOps
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "V1/scripts/vendor"))
import zxingcpp
image = Image.open(sys.argv[1]).convert("RGB").crop((132, 848, 154, 1058))
expected = sys.argv[2]
cases = {}
for mode, sample in [("color", image), ("gray", ImageOps.grayscale(image))]:
    for scale in (1, 4):
        candidate = sample if scale == 1 else sample.resize((88, 840), Image.Resampling.NEAREST)
        cases[f"{mode}-{scale}"] = [r.text for r in zxingcpp.read_barcodes(candidate)]
ok = all(expected in values for values in cases.values())
print(json.dumps({"passed": ok, "expected": expected, "cases": cases, "physicalPrintVerified": False}))
sys.exit(0 if ok else 1)
