from PIL import Image

files = [
    "assets/icon.png",
    "assets/splash-icon.png",
    "assets/jjmap_logo.png"
]

for path in files:
    img = Image.open(path)
    has_alpha = img.mode in ("RGBA", "LA") or "transparency" in img.info

    print(f"\nFile: {path}")
    print(f"Dimensions: {img.size}")
    print(f"Image mode: {img.mode}")
    print(f"Has transparency: {has_alpha}")
