# -*- coding: utf-8 -*-
"""深色模式生成器（自动维护 styles.css 里的深色覆盖块）。

为什么要用脚本生成而不是手写：
  这个样式表里有 200 多处硬编码颜色，手写深色覆盖必然漏掉一些，
  漏掉的地方在深色下会变成"刺眼的浅色块"。脚本按「角色」统一映射，覆盖完整。

脚本做三件事（都可重复执行）：
  1. 把 --navy / --teal / --coral 在「文字」「描边」场景下换成 --*-text / --*-line
     （浅色模式下这几个变量与原值完全相同，所以浅色渲染逐像素不变）
  2. 扫描全部硬编码颜色，按角色映射成深色值
  3. 用生成结果替换 styles.css 末尾的深色块（块首有标记注释，便于定位）

用法：
    python tools/gen-dark-mode.py          # 重新生成并写回 styles.css
    npm run build                          # 再压缩一次

改动深色观感时，调本文件里的映射表，然后重新运行即可。
"""

import colorsys
import io
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PATH = os.path.join(ROOT, "styles.css")

START_MARK = "/* ===== 深色模式（由 tools/gen-dark-mode.py 生成，勿手改）===== */"
END_MARK = "/* ===== 深色模式结束 ===== */"

# 深色块挂在 <html data-theme="dark"> 上，而不是 @media (prefers-color-scheme: dark)。
# 原因：要支持「进入默认浅色 + 用户手动切换」，用媒体查询就得把整套规则写两份
# （一份给自动、一份给显式 data-theme），属性选择器只要一份。
# 初始值的判断与写入在 index.html 头部的一小段同步脚本里完成（默认浅色）。
#
# 组件规则的前缀必须用 :where() 包住 —— :where() 的特异性为 0，于是
# `:where(:root[data-theme=dark]) .card` 的特异性与原来的 `.card` 完全相同，
# 级联结果跟旧的 @media 版本逐条等价。若直接用 `:root[data-theme=dark] .card`，
# 特异性会从 (0,1,0) 升到 (0,2,1)，深色规则会抢走本该由其他规则生效的样式
# （实测会改动 15 处元素的计算样式）。
# 变量块则相反，必须保留 :root[data-theme="dark"] 的高特异性才能压过基础 :root。
DARK_PREFIX = ':where(:root[data-theme="dark"])'

DARK_ROOT = """:root[data-theme="dark"] {
  color-scheme: dark;
  /* 深色变量。进入时默认浅色，用户点顶栏的切换按钮后以他的选择为准。 */
  --paper: #14181a;
  --card: #1e2427;
  --competition-card: #1e2427;
  --ink: #e7ecec;
  --muted: #9dabae;
  --faint: #8c9a9d;
  --line: #2c3538;
  --coral-soft: #2a211c;
  --navy-deep: #0f1416;
  --shadow: 0 12px 34px rgba(0, 0, 0, .5);
  /* 填充色：深色底上略微提亮，让选中态药丸、头像底仍有存在感 */
  --navy: #21586a;
  --teal: #1f7a78;   /* 保持原值：白字压在它上面才够清晰（提亮后对比度会降到 3.9） */
  --coral: #e36c4c;
  /* 文字色 */
  --navy-text: #dbe7ec;
  --teal-text: #5fc9bd;
  --coral-text: #f2907a;
  /* 描边色 */
  --navy-line: #3d5866;
  --teal-line: rgba(95, 201, 189, .45);
  --coral-line: rgba(242, 144, 122, .42);
}
"""

# ---------------------------------------------------------------- 工具

HEX = re.compile(r'#[0-9a-fA-F]{3,8}\b')
CJK_COMMENT = re.compile(r"/\*.*?\*/", re.S)


def to_hsl(c):
    c = c.lower()
    if len(c) == 4:
        c = "#" + "".join(ch * 2 for ch in c[1:])
    r, g, b = (int(c[i:i + 2], 16) / 255 for i in (1, 3, 5))
    h, l, s = colorsys.rgb_to_hls(r, g, b)
    return h * 360, s, l


def is_teal(h, s):
    return s > 0.10 and 130 <= h <= 210


def is_warm(h, s):
    return s > 0.10 and (h < 45 or h >= 330)


def surface(l):
    """浅色底 → 深色底，保留明度顺序（浅色里更亮的，深色里也更亮）"""
    if l >= 0.985:
        return "#1e2427"
    if l >= 0.96:
        return "#1a2023"
    if l >= 0.93:
        return "#171c1f"
    return "#212628"


def tinted_surface(h, s, l):
    if is_teal(h, s):
        return "#16292a" if l >= 0.95 else "#1b2f2e"
    if is_warm(h, s):
        return "#2a211c" if l >= 0.95 else "#2d2620"
    return surface(l)


def text_color(h, s, l):
    if s > 0.25 and l < 0.66:
        # 琥珀/棕要先判断，否则「经验」「商家」这类靠颜色区分语义的标签会撞成同一个色
        if 18 <= h < 55:
            return "#e0b972" if l >= 0.30 else "#d9a25a"
        if is_teal(h, s):
            return "#5fc9bd"
        if is_warm(h, s):
            return "#f2907a"
        if 210 <= h < 280:
            return "#8fbcd4"
        return "#f2907a"
    if l <= 0.30:
        return "#e7ecec"
    if l <= 0.48:
        return "#c2ccce"
    if l <= 0.62:
        return "#9dabae"
    if l <= 0.75:
        return "#7f8d90"
    return None


def border_color(h, s, l):
    if l >= 0.72:
        return "#333d40"
    if s > 0.25:
        if 18 <= h < 55:
            return "rgba(217,177,105,.45)"
        if is_teal(h, s):
            return "rgba(95,201,189,.45)"
        if is_warm(h, s):
            return "rgba(242,144,122,.42)"
    return None


SURFACE_RGBA = {".topbar", ".contact-card", ".thanks-card", ".to-top", ".course-elective-card span"}
BG_PROPS = {"background", "background-color"}
TEXT_PROPS = {"color", "fill", "stroke", "caret-color"}
BORDER_PROPS = {"border", "border-color", "border-top", "border-right", "border-bottom", "border-left",
                "border-top-color", "border-right-color", "border-bottom-color", "border-left-color",
                "outline", "outline-color", "column-rule-color"}
SHADOW_PROPS = {"box-shadow", "text-shadow"}
LIGHT_VARS = (
    "  /* 与 --navy/--teal/--coral 同值，但专门用于「文字」与「描边」场景。\n"
    "     拆开的原因：同一个变量既当填充色又当文字色时，深色模式需要往相反方向调，\n"
    "     一次覆盖无法同时满足两边。浅色模式下这几个变量与原值完全相同。 */\n"
    "  --navy-text: #103c4a;\n"
    "  --teal-text: #1f7a78;\n"
    "  --coral-text: #e36c4c;\n"
    "  --navy-line: #103c4a;\n"
    "  --teal-line: #1f7a78;\n"
    "  --coral-line: #e36c4c;\n"
)


def prefixed(selector_list):
    """给选择器列表里的每一项都加上深色前缀（:where(...)，特异性和原来一样）。

    必须按逗号拆开逐个加：`A, B { }` 只在最前面拼一次前缀会写成
    `:where(:root[data-theme=dark]) A, B { }`，B 就变成**无条件生效**了 ——
    浅色模式下会套用深色样式。用 @media 包住时看不出这个问题，
    改成属性选择器后就会暴露（实测有 162 处元素受影响）。
    """
    parts = [p.strip() for p in selector_list.split(",")]
    return ", ".join(f"{DARK_PREFIX} {p}" for p in parts if p)


def strip_existing_dark(css):
    """删掉所有已生成的深色块（重复运行或历史遗留都必须清干净）

    块内不再是一个大括号包住的整体（属性选择器在前、组件规则在后是并列的），
    所以不能靠数括号找结尾，改用结束标记定位。
    """
    while True:
        i = css.find(START_MARK)
        if i == -1:
            return css
        j = css.find(END_MARK, i)
        if j == -1:
            # 兼容早期没有结束标记的版本：那次生成是追加在文件末尾的
            return css[:i].rstrip("\n") + "\n"
        css = css[:i].rstrip("\n") + "\n" + css[j + len(END_MARK):].lstrip("\n")


def split_variables(css, stats):
    def sub(pattern, repl, text):
        def _f(m):
            stats[repl.replace("\\1", m.group(1))] += 1
            return m.expand(repl)
        return re.sub(pattern, _f, text)
    css = sub(r'(?<![-\w])color:\s*var\(--(navy|teal|coral)\)', r'color: var(--\1-text)', css)
    css = sub(r'(?<![-\w])border-color:\s*var\(--(navy|teal|coral)\)', r'border-color: var(--\1-line)', css)
    css = sub(r'(border-left:[^;{}]*?)var\(--(navy|teal|coral)\)', r'\1var(--\2-line)', css)
    return css


def ensure_light_vars(css):
    if "--navy-text:" in css:
        return css
    anchor = '  --font: "PingFang SC", "Microsoft YaHei", system-ui, sans-serif;\n'
    assert css.count(anchor) == 1, "找不到 :root 里的 --font 行"
    return css.replace(anchor, anchor + LIGHT_VARS)


def parse_rules(text, out):
    i, n = 0, len(text)
    while i < n:
        j = text.find("{", i)
        if j == -1:
            break
        selector = " ".join(text[i:j].split())
        # 规则前面的注释会被并进选择器，导致按选择器精确匹配的白名单失效，必须先剥掉
        selector = CJK_COMMENT.sub(" ", selector).strip()
        k, depth = j + 1, 1
        while k < n and depth:
            if text[k] == "{":
                depth += 1
            elif text[k] == "}":
                depth -= 1
            k += 1
        body = text[j + 1:k - 1]
        if selector.startswith("@media") or selector.startswith("@supports"):
            parse_rules(body, out)
        elif not selector.startswith("@"):
            out.append((selector, body))
        i = k
    return out


def build_block(css):
    import collections
    rules = parse_rules(css, [])
    overrides = collections.defaultdict(dict)
    for selector, body in rules:
        if selector.startswith(":root") or selector in ("from", "to"):
            continue
        for decl in body.split(";"):
            if ":" not in decl:
                continue
            prop, val = decl.split(":", 1)
            prop, val = prop.strip(), val.strip()
            if not val:
                continue
            if prop in BG_PROPS:
                for c in HEX.findall(val):
                    h, s, l = to_hsl(c)
                    if l >= 0.80:                 # 只映射「很浅的底色」；进度条那类填充色保持原样
                        overrides[selector][prop] = tinted_surface(h, s, l)
                        break
                else:
                    if selector in SURFACE_RGBA:
                        m = re.search(r'rgba\(\s*255\s*,\s*(?:254|255)\s*,\s*(?:250|255)\s*,\s*([\d.]+)\s*\)', val)
                        if m:
                            overrides[selector][prop] = "rgba(29,35,38,%s)" % m.group(1)
            elif prop in TEXT_PROPS:
                for c in HEX.findall(val):
                    h, s, l = to_hsl(c)
                    new = text_color(h, s, l)
                    if new:
                        overrides[selector][prop] = new
                        break
            elif prop in BORDER_PROPS:
                for c in HEX.findall(val):
                    h, s, l = to_hsl(c)
                    new = border_color(h, s, l)
                    if new:
                        # shorthand 只替换颜色本身，否则会丢掉 1px solid
                        overrides[selector][prop] = val.replace(c, new) if prop != "border-color" else new
                        break
            elif prop in SHADOW_PROPS:
                def _s(m):
                    return "rgba(0,0,0,%s)" % round(min(float(m.group(1)) * 2.2, 0.65), 3)
                new = re.sub(r'rgba\(\s*(?:15|8|16|37)\s*,\s*\d+\s*,\s*\d+\s*,\s*([\d.]+)\s*\)', _s, val)
                if new != val:
                    overrides[selector][prop] = new
            elif prop.startswith("--") and HEX.search(val):
                c = HEX.findall(val)[0]
                h, s, l = to_hsl(c)
                if l >= 0.80:
                    overrides[selector][prop] = tinted_surface(h, s, l)
    lines = [f"{prefixed(sel)} {{ " + " ".join(f"{p}: {v};" for p, v in sorted(d.items())) + " }"
             for sel, d in sorted(overrides.items())]
    return "\n".join(lines), len(overrides), sum(len(v) for v in overrides.values())


def main():
    css = io.open(PATH, encoding="utf-8").read()
    css = strip_existing_dark(css)
    stats = {}
    import collections
    stats = collections.Counter()
    css = split_variables(css, stats)
    css = ensure_light_vars(css)
    body, n_rules, n_decls = build_block(css)
    block = (START_MARK + "\n" + DARK_ROOT + "\n"
             + "/* ↓↓↓ 以下为硬编码颜色的深色映射 ↓↓↓ */\n" + body + "\n"
             + END_MARK + "\n")
    css = css.rstrip("\n") + "\n\n" + block
    io.open(PATH, "w", encoding="utf-8", newline="\n").write(css)
    print("变量拆分：", dict(stats) or "（本次无需拆分）")
    print(f"深色映射：{n_rules} 条规则 / {n_decls} 个声明")
    print("已写回", PATH)


if __name__ == "__main__":
    main()
