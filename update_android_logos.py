from PIL import Image, ImageDraw
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent
RES = ROOT / "android" / "app" / "src" / "main" / "res"

icon = Image.open(ROOT / "assets" / "icon.png").convert("RGBA")
splash = Image.open(ROOT / "assets" / "splash-icon.png").convert("RGBA")

GREEN = (21, 128, 61, 255)

def contain(image, size):
    image = image.copy()
    image.thumbnail((size, size), Image.Resampling.LANCZOS)
    return image

def make_foreground(canvas_size):
    canvas = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    logo = contain(icon, int(canvas_size * 0.65))
    x = (canvas_size - logo.width) // 2
    y = (canvas_size - logo.height) // 2
    canvas.alpha_composite(logo, (x, y))
    return canvas

def make_full_icon(size):
    canvas = Image.new("RGBA", (size, size), GREEN)
    logo = contain(icon, int(size * 0.78))
    x = (size - logo.width) // 2
    y = (size - logo.height) // 2
    canvas.alpha_composite(logo, (x, y))
    return canvas

# Android launcher icon densities
icon_sizes = {
    "mipmap-mdpi": 48,
    "mipmap-hdpi": 72,
    "mipmap-xhdpi": 96,
    "mipmap-xxhdpi": 144,
    "mipmap-xxxhdpi": 192,
}

for folder, size in icon_sizes.items():
    directory = RES / folder
    directory.mkdir(parents=True, exist_ok=True)

    make_foreground(size * 2).save(
        directory / "ic_launcher_foreground.webp", "WEBP", quality=100
    )

    full_icon = make_full_icon(size)
    full_icon.save(directory / "ic_launcher.webp", "WEBP", quality=100)
    full_icon.save(directory / "ic_launcher_round.webp", "WEBP", quality=100)

# Android splash screen logo densities
splash_sizes = {
    "drawable-mdpi": 288,
    "drawable-hdpi": 432,
    "drawable-xhdpi": 576,
    "drawable-xxhdpi": 864,
    "drawable-xxxhdpi": 1152,
}

for folder, size in splash_sizes.items():
    directory = RES / folder
    directory.mkdir(parents=True, exist_ok=True)

    logo = contain(splash, int(size * 0.80))
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    x = (size - logo.width) // 2
    y = (size - logo.height) // 2
    canvas.alpha_composite(logo, (x, y))
    canvas.save(directory / "splashscreen_logo.png")

# Update native Android background colors
colors_file = RES / "values" / "colors.xml"
colors_text = colors_file.read_text(encoding="utf-8")

colors_text = re.sub(
    r'<color name="splashscreen_background">.*?</color>',
    '<color name="splashscreen_background">#15803d</color>',
    colors_text
)

colors_text = re.sub(
    r'<color name="iconBackground">.*?</color>',
    '<color name="iconBackground">#15803d</color>',
    colors_text
)

colors_file.write_text(colors_text, encoding="utf-8")

print("SUCCESS: Android launcher icons updated.")
print("SUCCESS: Android splash logos updated.")
print("SUCCESS: Android background colors updated.")
