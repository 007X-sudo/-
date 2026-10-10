# 相安南华

南华大学校园指导手册的纯静态 MVP。页面使用原生 HTML、CSS 和 JavaScript，数据存放在 `data/` 目录，可直接部署到 GitHub Pages。

## 本地运行

需要通过静态服务器打开，以便浏览器读取 JSON 数据：

```powershell
node -e "const http=require('http'),fs=require('fs'),path=require('path');const root=process.cwd();http.createServer((req,res)=>{let p=path.join(root,req.url==='/'?'index.html':req.url);if(!fs.existsSync(p)||fs.statSync(p).isDirectory()){res.statusCode=404;return res.end('not found')}res.end(fs.readFileSync(p))}).listen(4173,()=>console.log('http://localhost:4173'))"
```

打开 `http://localhost:4173/` 即可预览。GitHub Pages 可直接将仓库根目录设置为发布目录。

## 构建与发布

页面用的是 `styles.css` 和 `app.js`；线上实际加载的是压缩后的 `styles.min.css` 和 `app.min.js`。

```bash
npm install          # 只装一个 esbuild
npm run build        # 压缩 CSS/JS，并改写 HTML 里的引用与 ?v=内容哈希
```

**⚠️ 每次改完 `styles.css` 或 `app.js`，提交前都要跑一次 `npm run build`**，
否则线上用的还是上一次压缩出来的旧文件，改了等于没改。

构建脚本做的事：压缩代码 → 计算内容哈希（如 `styles.min.css?v=cda3d196cb`）→ 改写 `index.html` / `404.html` 的引用。
内容变了哈希才变，所以浏览器可以长期缓存这些文件，改版后又能立刻拿到新版本。

顺带说明：
- 图片已经全部转成 WebP 并等比缩小（4.8MB → 1.7MB）。原始大图仍可在 git 历史中找到，要重新处理就用 `python tools/optimize-images.py`（见下方脚本说明）。
- 首屏只加载 9 个小 JSON；`extended.json`（约 52KB）和 `competitions.json`（约 78KB）在首屏渲染完后由浏览器空闲时间后台预取，进入对应板块时也会按需加载。所以刚打开的一两秒内搜索可能少一些结果，之后就覆盖全站。

## 深色模式

顶栏最右侧有一个切换按钮：浅色时显示太阳、深色时显示月亮，点一下切换并记住选择。

- **没手动切过**：跟随系统偏好（`prefers-color-scheme`）。
- **手动切过之后**：以手动选择为准，不再跟随系统。

深色规则挂在 `:root[data-theme="dark"]` 上（而不是 `@media` 里面），所以整套规则只存一份，
同时支持自动与手动两种来源。`index.html` 头部有一小段同步脚本，在样式表生效前就把
`data-theme` 写到 `<html>` 上（有本地选择用本地选择，否则读系统偏好），因此不会闪一下错误主题；
`app.js` 负责点击切换、写入本地存储与状态同步。

深色覆盖块是**脚本生成的**，不要手改：

```bash
python tools/gen-dark-mode.py    # 改完配色/新增组件后重新生成
npm run build
```

原因：样式表里有 200 多处硬编码颜色，手写覆盖必漏，漏掉的地方在深色下会变成刺眼的浅色块。
脚本按「角色」（底色 / 文字色 / 描边色 / 强调色）统一映射，覆盖完整。

**脚本里有两处细节不能改错**，否则深色样式会污染浅色模式：

1. 逗号选择器列表要**逐个**加前缀。只给第一个加会写成
   `:where(:root[data-theme=dark]) .a, .b` —— `.b` 就变成无条件生效（实测影响 162 处元素）。
2. 前缀用 `:where()` 把特异性归零，才能与原来的 `@media` 包裹逐条等价；
   写成 `:root[data-theme=dark] .a` 会提高特异性、抢走本该由其他规则生效的样式（实测影响 15 处元素）。
   （变量块相反：必须保留 `:root[data-theme="dark"]` 的高特异性才能压过基础 `:root`。）

另一个关键点：`--navy`、`--teal`、`--coral` 原本既当填充色又当文字色，
而这两种用途在深色下需要往**相反**方向调。所以拆分成了两组变量：

| 用途 | 变量 | 浅色取值 | 深色取值 |
| --- | --- | --- | --- |
| 填充（按钮底、头像、选中态） | `--navy` `--teal` `--coral` | 原值 | 基本不变 |
| 文字 | `--navy-text` `--teal-text` `--coral-text` | 与原值相同 | 提亮 |
| 描边 | `--navy-line` `--teal-line` `--coral-line` | 与原值相同 | 提亮 |

浅色模式下的取值与原值完全一致，除新增的切换按钮所在顶栏外，**浅色渲染逐元素不变**
（与上一版逐元素比对「计算样式 + 几何」：0 差异）。

## 自检

```bash
npm run build
python -m http.server 4180        # 另开一个终端
node tools/e2e-check.mjs          # 真实浏览器跑一遍：报错、404、图片属性、搜索、懒加载、标题
```

## 目录说明

| 路径 | 说明 |
| --- | --- |
| `index.html` / `404.html` | 页面骨架（引用压缩后的 CSS/JS） |
| `styles.css` / `app.js` | **源文件，改这两个** |
| `styles.min.css` / `app.min.js` | 构建产物，由 `npm run build` 生成 |
| `data/*.json` | 全部内容数据 |
| `assets/images/` | 图片（WebP 为主，二维码保留 PNG/JPG 以保证清晰度） |
| `downloads/` | 供下载的公开 PDF / DOCX / XLSX |
| `tools/gen-dark-mode.py` | 生成深色覆盖块（改配色后要重跑） |
| `tools/` 其余 | 构建与自检脚本，部署时用不到，可以保留也可以删 |
| `robots.txt` / `sitemap.xml` | 搜索引擎抓取用 |

## 内容维护

- 学校简介：`data/site.json`
- 专业库：`data/majors.json`，当前整理 89 个南华大学本科专业条目，页面按学院分组展示；每个专业可打开培养方案详情，包含培养目标、核心课程、实践/发展方向、选择建议和 2026 学费档次。学费档次依据 `downloads/2026-fee-guide.pdf`，年度招生计划、选考要求、学制、培养方案和最终收费仍需按当年官方文件核对。
- 校园生活：`data/campus.json`
- 宿舍攻略：`data/dorm.json`
- 入学清单：`data/checklist.json`
- 政策与资助：`data/policies.json`
- 常见问题：`data/faq.json`
- 扩展板块：`data/extended.json`，包含校园地图、校园代办、军训、转专业、学习资源、竞赛、技能成长、班干部竞选、缴费、防骗、选课、考证、信息渠道、考研保研、实习求职、最新动态、历史存档；已补充证明办理、食堂/校园网/图书馆、转专业经验、竞赛取舍、证书建议、升学流程和招聘薪资参考。
- 竞赛地图：`data/competitions.json`，依据《南华大学大学生学科竞赛体系（2023）》整理 126 项竞赛，按 12 个方向和 A/B/C 评定等级分类，页面支持搜索、筛选和报名/官方通知入口。
- 学生医保：`data/medical.json`，整理 2026 年缴费标准、门诊/住院待遇和报销流程。
- 公开资料下载：`downloads/`，仅包含已筛选的公开 PDF、DOCX 和 XLSX 文件副本；含联系人、账户信息或二维码等内部字段的资助通知原件不随公开站点部署。
- 竞赛体系附件：`downloads/2023-competition-system.xlsx`，用于竞赛地图的分类、牵头学院和面向专业信息来源。
- 视觉资源：`assets/images/`，包含用户提供的南华大学校徽、红湘/雨母校区正门、两校区地图、南华楼、图书馆、逸夫楼（教学楼）和操场图片。全部转为 WebP 并等比缩小，二维码卡片保留 PNG、鸣谢二维码保留 JPG（扫码对清晰度敏感，不做有损转换）；站点图标由校徽裁剪生成 `favicon.png` / `apple-touch-icon.png`。
- 图片处理脚本：`tools/optimize-images.py`，改图后重新运行，并把输出的尺寸同步到 `app.js` 里的 `IMAGE_META`（用于给 `<img>` 写 width/height，避免加载时页面跳动）。脚本需要原始大图作为输入，原图已从工作区删除但保留在 git 历史中。
- 联系我：页面结尾展示作者碎碎念、用户提供的微信二维码和作者简历网站入口。
- 首页开场：原生 CSS/JavaScript 实现 ScrollExpand 风格滚动展开动效，使用红湘校区正门图片，标题为“南国以南，花开于华”。

页面中的待补充信息必须在核实后再改为正式信息，并保留来源链接与更新时间。

本轮附件整理规则：缴费须知和医保手册中的明确金额/待遇可直接作为 2026 资料展示；新生群答疑中的经验内容会标注为经验，不替代学校正式通知；宿舍表中异常占位值不作为正式尺寸发布。
