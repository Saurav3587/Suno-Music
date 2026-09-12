import os
from PIL import Image, ImageDraw

def generate_icons():
    logo_path = 'public/logo.png'
    if not os.path.exists(logo_path):
        print(f"Error: {logo_path} not found")
        return

    img = Image.open(logo_path).convert("RGBA")
    print(f"Loaded logo {logo_path}, size: {img.size}")

    res_dir = 'android/app/src/main/res'
    
    densities = {
        'mipmap-mdpi': (48, 108),
        'mipmap-hdpi': (72, 162),
        'mipmap-xhdpi': (96, 216),
        'mipmap-xxhdpi': (144, 324),
        'mipmap-xxxhdpi': (192, 432)
    }

    for folder, (legacy_size, fg_size) in densities.items():
        out_folder = os.path.join(res_dir, folder)
        os.makedirs(out_folder, exist_ok=True)

        # 1. Full legacy square icon with subtle rounded corners
        legacy_img = img.resize((legacy_size, legacy_size), Image.Resampling.LANCZOS)
        legacy_path = os.path.join(out_folder, 'ic_launcher.png')
        legacy_img.save(legacy_path, 'PNG')

        # 2. Legacy round icon (circle mask)
        circle_img = legacy_img.copy()
        mask = Image.new('L', (legacy_size, legacy_size), 0)
        draw = ImageDraw.Draw(mask)
        draw.ellipse((0, 0, legacy_size - 1, legacy_size - 1), fill=255)
        circle_img.putalpha(mask)
        round_path = os.path.join(out_folder, 'ic_launcher_round.png')
        circle_img.save(round_path, 'PNG')

        # 3. Adaptive foreground (108x108 base, centered with 25% safe zone padding)
        fg_canvas = Image.new('RGBA', (fg_size, fg_size), (0, 0, 0, 0))
        # Logo inside foreground should occupy ~66% of the foreground canvas (safe zone)
        inner_size = int(fg_size * 0.68)
        inner_logo = img.resize((inner_size, inner_size), Image.Resampling.LANCZOS)
        offset = (fg_size - inner_size) // 2
        fg_canvas.paste(inner_logo, (offset, offset), inner_logo)
        fg_path = os.path.join(out_folder, 'ic_launcher_foreground.png')
        fg_canvas.save(fg_path, 'PNG')

        print(f"Generated icons in {folder}: {legacy_size}x{legacy_size}, fg: {fg_size}x{fg_size}")

    # Also update ic_launcher_background.xml to match logo's background color #06050a
    bg_xml_path = os.path.join(res_dir, 'values', 'ic_launcher_background.xml')
    with open(bg_xml_path, 'w', encoding='utf-8') as f:
        f.write('''<?xml version="1.0" encoding="utf-8"?>
<resources>
    <color name="ic_launcher_background">#06050a</color>
</resources>
''')
    print("Updated ic_launcher_background.xml to #06050a")

if __name__ == '__main__':
    generate_icons()
