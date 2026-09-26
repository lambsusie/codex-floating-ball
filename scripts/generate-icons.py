from pathlib import Path

from PIL import Image, ImageDraw


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
SCALE = 4
CANVAS = 256 * SCALE


def p(value):
    return int(round(value * SCALE))


def make_color_icon():
    image = Image.new("RGBA", (CANVAS, CANVAS), (0, 0, 0, 0))
    mask = Image.new("L", image.size, 0)
    mask_draw = ImageDraw.Draw(mask)
    mask_draw.ellipse((p(14), p(14), p(242), p(242)), fill=255)

    gradient = Image.new("RGBA", image.size)
    pixels = gradient.load()
    top = (34, 211, 238)
    bottom = (30, 58, 138)
    for y in range(CANVAS):
        ratio = y / max(1, CANVAS - 1)
        color = tuple(round(top[i] * (1 - ratio) + bottom[i] * ratio) for i in range(3)) + (255,)
        for x in range(CANVAS):
            pixels[x, y] = color
    image.paste(gradient, (0, 0), mask)

    draw = ImageDraw.Draw(image)
    draw.ellipse((p(14), p(14), p(242), p(242)), outline=(15, 23, 42, 210), width=p(3))
    draw.ellipse((p(20), p(20), p(236), p(236)), outline=(255, 255, 255, 245), width=p(7))
    draw.arc((p(62), p(62), p(194), p(194)), 42, 318, fill=(255, 255, 255, 255), width=p(24))
    draw.line((p(163), p(128), p(202), p(128)), fill=(255, 255, 255, 255), width=p(24))
    return image.resize((256, 256), Image.Resampling.LANCZOS)


def make_template(size):
    high = size * 4
    image = Image.new("RGBA", (high, high), (0, 0, 0, 0))
    draw = ImageDraw.Draw(image)
    pad = high * 0.06
    draw.ellipse((pad, pad, high - pad, high - pad), fill=(0, 0, 0, 255))
    width = max(2, round(high * 0.105))
    bbox = (high * 0.25, high * 0.25, high * 0.75, high * 0.75)
    draw.arc(bbox, 42, 318, fill=(0, 0, 0, 0), width=width)
    draw.line((high * 0.64, high * 0.5, high * 0.81, high * 0.5), fill=(0, 0, 0, 0), width=width)
    return image.resize((size, size), Image.Resampling.LANCZOS)


def main():
    ASSETS.mkdir(parents=True, exist_ok=True)
    icon = make_color_icon()
    icon.resize((64, 64), Image.Resampling.LANCZOS).save(ASSETS / "tray-icon.png")
    icon.save(
        ASSETS / "icon.ico",
        format="ICO",
        sizes=[(16, 16), (20, 20), (24, 24), (32, 32), (40, 40), (48, 48), (64, 64), (128, 128), (256, 256)],
    )
    make_template(16).save(ASSETS / "trayTemplate.png")
    make_template(32).save(ASSETS / "trayTemplate@2x.png")


if __name__ == "__main__":
    main()
