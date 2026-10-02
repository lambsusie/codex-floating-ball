from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


OUTPUT = Path(__file__).resolve().parent
FONT_REGULAR = Path(r"C:\Windows\Fonts\msyh.ttc")
FONT_BOLD = Path(r"C:\Windows\Fonts\msyhbd.ttc")
SCALE = 6

PALETTES = {
    "normal": ((37, 99, 235), (70, 219, 255), (23, 111, 226)),
    "warning": ((245, 158, 11), (255, 222, 99), (245, 138, 11)),
    "error": ((225, 29, 72), (255, 132, 151), (225, 29, 72)),
    "offline": ((100, 116, 139), (203, 213, 225), (100, 116, 139)),
}


def font(size, bold=False):
    path = FONT_BOLD if bold and FONT_BOLD.exists() else FONT_REGULAR
    return ImageFont.truetype(str(path), size) if path.exists() else ImageFont.load_default()


def circle_gradient(size, top, bottom):
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    strip = Image.new("RGBA", (1, size))
    pixels = strip.load()
    for y in range(size):
        ratio = y / max(1, size - 1)
        pixels[0, y] = tuple(round(top[i] * (1 - ratio) + bottom[i] * ratio) for i in range(3)) + (255,)
    gradient = strip.resize((size, size))
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse((0, 0, size - 1, size - 1), fill=255)
    image.paste(gradient, (0, 0), mask)
    return image


def annulus_mask(size, outer_radius, inner_radius, gap_start=302, gap_end=344):
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    center = size // 2
    draw.ellipse(
        (center - outer_radius, center - outer_radius, center + outer_radius, center + outer_radius),
        fill=255,
    )
    draw.ellipse(
        (center - inner_radius, center - inner_radius, center + inner_radius, center + inner_radius),
        fill=0,
    )
    draw.pieslice((0, 0, size, size), start=gap_start, end=gap_end, fill=0)
    return mask


def make_icon(state="normal", output_size=512):
    size = 256 * SCALE
    ring_color, ball_top, ball_bottom = PALETTES[state]
    image = Image.new("RGBA", (size, size), (0, 0, 0, 0))

    outline_mask = annulus_mask(size, 102 * SCALE, 64 * SCALE)
    outline = Image.new("RGBA", (size, size), (9, 20, 43, 245))
    image.paste(outline, (0, 0), outline_mask)

    ring_mask = annulus_mask(size, 96 * SCALE, 70 * SCALE)
    ring = Image.new("RGBA", (size, size), ring_color + (255,))
    image.paste(ring, (0, 0), ring_mask)

    draw = ImageDraw.Draw(image)
    center = size // 2
    draw.ellipse(
        (center - 42 * SCALE, center - 42 * SCALE, center + 42 * SCALE, center + 42 * SCALE),
        fill=(9, 20, 43, 245),
    )
    ball = circle_gradient(72 * SCALE, ball_top, ball_bottom)
    image.alpha_composite(ball, (center - 36 * SCALE, center - 36 * SCALE))

    return image.resize((output_size, output_size), Image.Resampling.LANCZOS)


def paste_center(canvas, image, x, y):
    canvas.alpha_composite(image, (round(x - image.width / 2), round(y - image.height / 2)))


def text(draw, xy, value, size, color, bold=False, anchor="la"):
    draw.text(xy, value, font=font(size, bold), fill=color, anchor=anchor)


def render_sheet():
    sheet = Image.new("RGBA", (1400, 900), (239, 244, 250, 255))
    draw = ImageDraw.Draw(sheet)
    ink = (19, 32, 56, 255)
    muted = (96, 111, 136, 255)

    text(draw, (60, 48), "规整缺口环 + 中心球", 42, ink, True)
    text(draw, (60, 104), "严格同心 · 固定环宽 · 右上角平切缺口", 20, muted)

    draw.rounded_rectangle((60, 150, 580, 665), radius=24, fill="white", outline=(214, 224, 237), width=2)
    text(draw, (92, 187), "第二版主图标", 24, ink, True)
    text(draw, (92, 225), "去掉凸出的圆头和多余白圈", 16, muted)
    paste_center(sheet, make_icon("normal", 360), 320, 435)

    draw.rounded_rectangle((620, 150, 1340, 395), radius=24, fill="white", outline=(214, 224, 237), width=2)
    text(draw, (652, 187), "状态只改变颜色", 24, ink, True)
    states = [("normal", "正常"), ("warning", "额度告急"), ("error", "读取失败"), ("offline", "暂无数据")]
    for index, (state, label) in enumerate(states):
        x = 720 + index * 170
        paste_center(sheet, make_icon(state, 108), x, 280)
        text(draw, (x, 356), label, 16, muted, anchor="ma")

    draw.rounded_rectangle((620, 425, 1340, 665), radius=24, fill="white", outline=(214, 224, 237), width=2)
    text(draw, (652, 461), "任务栏实际尺寸", 24, ink, True)
    for row, (background, label, label_color) in enumerate([
        ((246, 248, 251), "浅色", (55, 65, 81)),
        ((24, 29, 39), "深色", (226, 232, 240)),
    ]):
        y = 525 + row * 72
        draw.rounded_rectangle((652, y - 25, 1308, y + 25), radius=10, fill=background)
        text(draw, (670, y), label, 14, label_color, anchor="lm")
        for index, icon_size in enumerate((16, 20, 24, 32)):
            x = 825 + index * 118
            paste_center(sheet, make_icon("normal", icon_size), x, y)
            text(draw, (x, y + 34), f"{icon_size}px", 13, muted, anchor="ma")

    draw.rounded_rectangle((60, 705, 1340, 842), radius=24, fill=(228, 238, 255), outline=(190, 211, 246), width=2)
    text(draw, (92, 742), "与第一版的区别", 22, (26, 76, 156), True)
    text(draw, (92, 785), "完整圆形骨架   ·   缺口不向外凸起   ·   中心球绝对居中   ·   轮廓更安静、更像系统图标", 18, (46, 72, 112))

    sheet.convert("RGB").save(OUTPUT / "regular-gap-ring-concept-sheet.png", quality=96)
    for state in PALETTES:
        make_icon(state, 512).save(OUTPUT / f"regular-gap-ring-{state}.png")


if __name__ == "__main__":
    render_sheet()
