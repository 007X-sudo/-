# -*- coding: utf-8 -*-
"""图片优化流水线：等比缩小 + 转 WebP + 生成图标。

用法（需要 Pillow）：
    pip install pillow
    python tools/optimize-images.py

说明：
- 校园实景、地图、电脑资料图统一转为 WebP（质量见 PHOTOS 表），文件名由 .jpg 变为 .webp。
- 微信二维码卡片保留 PNG（扫码对清晰度敏感，不做有损转换）。
- 鸣谢二维码保留 JPG，仅等比缩小。
- 会输出 image-meta.json（每张图的原始宽高），供 app.js 的 IMAGE_META 使用。
请在改动本文件后重新运行，并同步更新 app.js 里的 IMAGE_META。

注意：本脚本需要"原始大图"（.jpg/.png）作为输入。仓库里现在只保留处理后的成品，
原始文件已从工作区删除（仍可在 git 历史中找到）。要重新处理某张图，先从 git 历史取回原图：
    git show <旧提交>:assets/images/xxx.jpg > assets/images/xxx.jpg
"""

from PIL import Image
import os
import json

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(BASE, "assets", "images")

# 文件名: (最大宽, 最大高, WebP 质量)
PHOTOS = {
    "gate-hongxiang.jpg":             (1400, None, 82),   # 首页开场大图，全宽铺满
    "gate-yumu.jpg":                  (1000, None, 82),
    "library.jpg":                    (1000, None, 82),
    "nanhualou.jpg":                  (1000, None, 82),
    "teaching-building.jpg":          (800,  None, 82),
    "playground.jpg":                 (800,  None, 82),
    "campus-map-hongxiang.jpg":       (1100, None, 86),   # 地图文字多，质量调高
    "campus-map-yumu.jpg":            (1400, None, 86),
    "usc-emblem.jpg":                 (600,  None, 88),
    "computer-advantages.jpg":        (1400, 1400, 80),   # 长截图，按最长边限制
    "computer-after-sales.jpg":       (1400, 1400, 80),
    "computer-lenovo-authority.jpg":  (1400, 1400, 80),
    "computer-machrev-authority.jpg": (1400, 1400, 80),
    "computer-profile.jpg":           (1400, 1400, 80),
    "computer-service-card.jpg":      (1400, 1400, 80),
}

meta = {}
before = after = 0

for name, (mw, mh, quality) in PHOTOS.items():
    src = os.path.join(IMG, name)
    if not os.path.exists(src):
        print("MISSING:", name)
        continue
    image = Image.open(src).convert("RGB")
    image.thumbnail((mw, mh or 100000), Image.LANCZOS)
    out = os.path.splitext(name)[0] + ".webp"
    dst = os.path.join(IMG, out)
    image.save(dst, "WEBP", quality=quality, method=6)
    b, a = os.path.getsize(src), os.path.getsize(dst)
    before += b
    after += a
    meta["assets/images/" + out] = list(image.size)
    print("%-34s -> %-34s %5dx%-5d %5dKB -> %4dKB" % (name, out, image.size[0], image.size[1], b // 1024, a // 1024))

# 微信二维码卡片：保留 PNG，只等比缩小
qr_path = os.path.join(IMG, "wechat-contact.png")
qr = Image.open(qr_path)
b = os.path.getsize(qr_path)
qr.thumbnail((660, 660), Image.LANCZOS)
qr.save(qr_path, "PNG", optimize=True)
a = os.path.getsize(qr_path)
before += b
after += a
meta["assets/images/wechat-contact.png"] = list(qr.size)
print("%-34s -> %-34s %5dx%-5d %5dKB -> %4dKB (PNG)" % ("wechat-contact.png", "wechat-contact.png", qr.size[0], qr.size[1], b // 1024, a // 1024))

# 鸣谢二维码：保留 JPG，等比缩小
thanks_path = os.path.join(IMG, "thanks-inspiration.jpg")
thanks = Image.open(thanks_path).convert("RGB")
b = os.path.getsize(thanks_path)
thanks.thumbnail((480, 480), Image.LANCZOS)
thanks.save(thanks_path, "JPEG", quality=90, optimize=True, progressive=True)
a = os.path.getsize(thanks_path)
before += b
after += a
meta["assets/images/thanks-inspiration.jpg"] = list(thanks.size)
print("%-34s -> %-34s %5dx%-5d %5dKB -> %4dKB (JPG)" % ("thanks-inspiration.jpg", "thanks-inspiration.jpg", thanks.size[0], thanks.size[1], b // 1024, a // 1024))

# 由校徽裁剪出站点图标（取上方圆形徽标）
# 注意：需要原始校徽 usc-emblem.jpg 才能重新生成；若已删除，可从 git 历史取回。
emblem_src = os.path.join(IMG, "usc-emblem.jpg")
if os.path.exists(emblem_src):
    emblem = Image.open(emblem_src).convert("RGB")
    side = 540
    box = (764 - side // 2, 302 - side // 2, 764 + side // 2, 302 + side // 2)
    icon = emblem.crop(box)
    favicon_path = os.path.join(IMG, "favicon.png")
    icon.resize((96, 96), Image.LANCZOS).save(favicon_path, "PNG", optimize=True)
    icon.resize((180, 180), Image.LANCZOS).save(os.path.join(IMG, "apple-touch-icon.png"), "PNG", optimize=True)
    print("favicon.png %dKB | apple-touch-icon.png %dKB" % (
        os.path.getsize(favicon_path) // 1024,
        os.path.getsize(os.path.join(IMG, "apple-touch-icon.png")) // 1024,
    ))
else:
    print("跳过图标生成：找不到原始校徽 usc-emblem.jpg（favicon.png 已存在，可继续使用）")

print("\n合计：%.2fMB -> %.2fMB（节省 %.0f%%）" % (before / 1048576, after / 1048576, (1 - after / before) * 100))

with open(os.path.join(BASE, "image-meta.json"), "w", encoding="utf-8") as fh:
    json.dump(meta, fh, ensure_ascii=False, indent=1)
print("image-meta.json 已生成，共 %d 条" % len(meta))
