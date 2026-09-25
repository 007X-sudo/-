# 相安南华

南华大学校园指导手册的纯静态 MVP。页面使用原生 HTML、CSS 和 JavaScript，数据存放在 `data/` 目录，可直接部署到 GitHub Pages。

## 本地运行

需要通过静态服务器打开，以便浏览器读取 JSON 数据：

```powershell
node -e "const http=require('http'),fs=require('fs'),path=require('path');const root=process.cwd();http.createServer((req,res)=>{let p=path.join(root,req.url==='/'?'index.html':req.url);if(!fs.existsSync(p)||fs.statSync(p).isDirectory()){res.statusCode=404;return res.end('not found')}res.end(fs.readFileSync(p))}).listen(4173,()=>console.log('http://localhost:4173'))"
```

打开 `http://localhost:4173/` 即可预览。GitHub Pages 可直接将仓库根目录设置为发布目录。

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
- 视觉资源：`assets/images/`，包含用户提供的南华大学校徽、红湘/雨母校区正门、两校区地图、南华楼、图书馆、逸夫楼（教学楼）和操场图片。
- 联系我：页面结尾展示作者碎碎念、用户提供的微信二维码和作者简历网站入口。
- 首页开场：原生 CSS/JavaScript 实现 ScrollExpand 风格滚动展开动效，使用红湘校区正门图片，标题为“南国以南，花开于华”。

页面中的待补充信息必须在核实后再改为正式信息，并保留来源链接与更新时间。

本轮附件整理规则：缴费须知和医保手册中的明确金额/待遇可直接作为 2026 资料展示；新生群答疑中的经验内容会标注为经验，不替代学校正式通知；宿舍表中异常占位值不作为正式尺寸发布。
