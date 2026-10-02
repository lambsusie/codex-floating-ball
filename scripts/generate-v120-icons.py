"""Render the approved concentric-ring design at native tray sizes."""
import importlib.util
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
spec = importlib.util.spec_from_file_location("concept", ROOT / "design/tray-icon-concept/render_regular_concept.py")
concept = importlib.util.module_from_spec(spec)
spec.loader.exec_module(concept)
assets = ROOT / "assets"
sizes = [(n, n) for n in (16, 20, 24, 32, 40, 48, 64, 128, 256)]
for state in concept.PALETTES:
    icon = concept.make_icon(state, 256)
    icon.save(assets / f"tray-{state}.ico", sizes=sizes)
    concept.make_icon(state, 64).save(assets / f"tray-{state}.png")
    if state == "normal":
        icon.save(assets / "icon.ico", sizes=sizes)
        concept.make_icon(state, 64).save(assets / "tray-icon.png")
        concept.make_icon(state, 1024).save(assets / "icon.icns")
mask = concept.annulus_mask(1536, 102 * 6, 64 * 6)
ImageDraw.Draw(mask).ellipse((768 - 42 * 6, 768 - 42 * 6, 768 + 42 * 6, 768 + 42 * 6), fill=255)
template = Image.new("RGBA", (1536, 1536), (0, 0, 0, 0))
template.putalpha(mask)
for name, size in (("trayTemplate.png", 18), ("trayTemplate@2x.png", 36)):
    template.resize((size, size), Image.Resampling.LANCZOS).save(assets / name)
print("Generated four tray states, Windows ICO, macOS ICNS and template images.")
