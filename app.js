const state = { data: {}, route: 'home', majorType: '全部', majorCollege: '全部', majorQuery: '', checklist: {}, searchIndex: [], searchFilter: '全部' };
const pages = [
  { id: 'home', name: '首页', sub: '新生入学与校园生活速览', icon: '⌂' },
  { id: 'about', name: '学校概况', sub: '校史·校区·官方信息', icon: '校' },
  { id: 'majors', name: '专业库', sub: '学院·方向·培养', icon: '学' },
  { id: 'campus', name: '校园生活', sub: '食堂·图书馆·校园服务', icon: '园' },
  { id: 'dorm', name: '宿舍攻略', sub: '床品·用电·入住整理', icon: '宿' },
  { id: 'checklist', name: '入学清单', sub: '分组勾选·本地保存', icon: '清' },
  { id: 'policies', name: '政策与资助', sub: '缴费·资助·学籍', icon: '策' },
  { id: 'medical', name: '学生医保', sub: '缴费·待遇·报销', icon: '医' },
  { id: 'map', name: '校园地图', sub: '校区·路线·导航', icon: '图' },
  { id: 'errands', name: '校园代办', sub: '证明·卡证·服务', icon: '办' },
  { id: 'training', name: '军训指南', sub: '装备·训练·请假', icon: '训' },
  { id: 'transfer', name: '转专业', sub: '政策·流程·准备', icon: '转' },
  { id: 'resources', name: '学习资源', sub: '平台·图书馆·工具', icon: '资' },
  { id: 'downloads', name: '资料下载', sub: '清单·通知·表格原件', icon: '下' },
  { id: 'compete', name: '竞赛地图', sub: '学科竞赛·创新创业', icon: '赛' },
  { id: 'skills', name: '技能成长', sub: '编程·办公·表达', icon: '技' },
  { id: 'classCampaign', name: '竞选班干部', sub: '岗位·演讲·协作', icon: '班' },
  { id: 'fees', name: '缴费指南', sub: '学费·住宿·资助', icon: '费' },
  { id: 'antiScam', name: '防骗指南', sub: '反诈·账号·安全', icon: '防' },
  { id: 'course', name: '选课攻略', sub: '课表·选课·学分', icon: '课' },
  { id: 'cert', name: '考证指南', sub: '英语·计算机·职业', icon: '证' },
  { id: 'channels', name: '信息渠道', sub: '官网·学院·平台', icon: '讯' },
  { id: 'postgrad', name: '考研保研', sub: '规划·信息·复习', icon: '研' },
  { id: 'job', name: '实习求职', sub: '简历·实习·校招', icon: '职' },
  { id: 'feed', name: '最新动态', sub: '官方通知·更新记录', icon: '新' },
  { id: 'faq', name: '常见问题', sub: '高频问题·官方提醒', icon: '问' },
  { id: 'archive', name: '历史存档', sub: '往年资料·变更记录', icon: '档' }
];
const $ = (selector, root = document) => root.querySelector(selector);
const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const pageMeta = id => pages.find(page => page.id === id) || pages[0];
const searchGroups = {
  入学: ['about', 'map', 'checklist', 'policies', 'medical', 'fees', 'antiScam', 'downloads'],
  校园: ['campus', 'dorm', 'errands', 'training', 'classCampaign', 'channels', 'faq'],
  学习: ['majors', 'resources', 'compete', 'skills', 'course', 'cert'],
  升学就业: ['transfer', 'postgrad', 'job'],
  其他: ['feed', 'archive']
};
function searchCategory(route) { return Object.entries(searchGroups).find(([, routes]) => routes.includes(route))?.[0] || '其他'; }
function sourceKind(status) {
  if (/商家/.test(status)) return 'merchant';
  if (/官方|公开目录/.test(status)) return 'official';
  return 'experience';
}
function sourceMeta(source, reviewed, status = '资料整理') {
  const date = reviewed || state.data.site?.reviewed || state.data.site?.updated || '待补充';
  return `<div class="content-meta" aria-label="资料来源信息"><span class="content-status source-status-${sourceKind(status)}" title="资料类型：${esc(status)}">${esc(status)}</span><span>最近复核：${esc(date)}</span>${source ? sourceLink(source) : ''}</div>`;
}

async function loadData() {
  const names = ['site', 'majors', 'campus', 'dorm', 'checklist', 'policies', 'faq', 'extended', 'medical', 'competitions'];
  const entries = await Promise.all(names.map(async name => [name, await fetch(`data/${name}.json`).then(response => {
    if (!response.ok) throw new Error(`${name} ${response.status}`);
    return response.json();
  })]));
  state.data = Object.fromEntries(entries);
  state.searchIndex = buildSearchIndex();
}

function buildSearchIndex() {
  const site = state.data.site;
  const source = site.source;
  const entries = [{ route: 'about', title: '学校概况', text: `${site.school.name} ${site.school.location} ${site.school.overview} ${site.school.slogan}`, source }];
  state.data.majors.forEach(major => entries.push({ route: 'majors', title: major.name, text: `${major.name} ${major.college} ${major.type} ${major.summary} ${major.guidance || ''} ${(major.tags || []).join(' ')} ${(major.courses || []).join(' ')}`, source }));
  state.data.campus.items.forEach(item => entries.push({ route: 'campus', title: item.title, text: `${item.title} ${item.text}`, source: state.data.campus.source }));
  const nearby = state.data.campus.nearby || {};
  [['shopping', '周围商圈'], ['attractions', '知名景点'], ['stores', '推荐店铺']].forEach(([key, category]) => (nearby[key] || []).forEach(item => entries.push({ route: 'campus', title: item.title, text: `${category} ${item.title} ${item.text} ${item.distance || ''} ${item.location || ''}`, source: state.data.campus.source })));
  const clubs = state.data.campus.clubsAndActivities || {};
  (clubs.categories || []).concat(clubs.representatives || [], clubs.events || []).forEach(item => entries.push({ route: 'campus', title: item.title, text: `社团与活动 ${item.title} ${item.text}`, source: state.data.campus.source }));
  state.data.dorm.items.forEach(item => entries.push({ route: 'dorm', title: item.title, text: `${item.title} ${item.text} ${item.tag}`, source: state.data.dorm.source }));
  state.data.policies.forEach(item => entries.push({ route: 'policies', title: item.title, text: `${item.title} ${item.text} ${item.tag}`, source }));
  state.data.faq.forEach(item => entries.push({ route: 'faq', title: item.q, text: `${item.q} ${item.a} ${(item.keywords || []).join(' ')}`, source }));
  state.data.checklist.forEach(group => entries.push({ route: 'checklist', title: group.group, text: `${group.group} ${group.items.join(' ')}`, source }));
  state.data.medical.items.forEach(item => entries.push({ route: 'medical', title: item.title, text: `${item.title} ${item.text}`, source: state.data.medical.source }));
  (state.data.extended?.sections || []).forEach(section => {
    section.items.forEach(item => entries.push({ route: section.id, title: item.title, text: `${section.title} ${item.title} ${item.text} ${item.tag || ''}`, source: item.source || section.source || source }));
    if (section.id === 'errands' && section.computerPurchase) {
      const computer = section.computerPurchase;
      const advantageText = (computer.advantages || []).map(item => `${item.title} ${item.text}`).join(' ');
      entries.push({ route: 'errands', title: computer.title, text: `${section.title} ${computer.title} ${computer.intro} ${advantageText} ${computer.contact}`, source: section.source || source });
    }
    if (section.id === 'course') {
      const roundsText = (section.courseRounds || []).map(item => `${item.round} ${item.title} ${item.text} ${item.tag}`).join(' ');
      const creditsText = (section.creditTypes || []).map(item => `${item.title} ${item.examples} ${item.note}`).join(' ');
      const electiveText = ['red', 'black'].flatMap(key => (section.electives?.[key] || []).map(item => `${item.title} ${item.text} ${item.tag}`)).join(' ');
      const tipsText = (section.tips || []).map(item => `${item.title} ${item.text}`).join(' ');
      const pitfallsText = (section.pitfalls || []).map(item => `${item.title} ${item.text}`).join(' ');
      const faqText = (section.courseFaq || []).map(item => `${item.q} ${item.a}`).join(' ');
      entries.push({ route: 'course', title: '选课轮次与公选课攻略', text: `${section.title} ${roundsText} ${creditsText} ${electiveText} ${tipsText} ${pitfallsText} ${faqText}`, source: section.source || source });
    }
    if (section.id === 'resources') {
      const platformText = (section.platforms || []).map(item => `${item.title} ${item.text}`).join(' ');
      const courseText = (section.freshmanResources || []).map(item => `${item.title} ${item.tag} ${item.text}`).join(' ');
      const certificateText = (section.certificateExams || []).map(item => `${item.title} ${item.tag} ${item.text}`).join(' ');
      entries.push({ route: 'resources', title: '学习资源平台与证书考试', text: `${section.title} ${platformText} ${courseText} ${certificateText}`, source: section.source || source });
    }
    if (section.id === 'training') {
      const equipmentText = (section.equipmentGroups || []).flatMap(group => group.items.map(item => `${group.title} ${item.name} ${item.highlight} ${item.note}`)).join(' ');
      const disciplineText = (section.disciplineGroups || []).flatMap(group => `${group.title} ${(group.bullets || []).join(' ')}`).join(' ');
      const survivalText = (section.survivalTips || []).join(' ');
      const faqText = (section.trainingFaq || []).flatMap(item => `${item.q} ${item.a}`).join(' ');
      entries.push({ route: 'training', title: '军训装备与生存法则', text: `${section.title} ${equipmentText} ${disciplineText} ${survivalText} ${faqText}`, source: section.source || source });
    }
    if (section.id === 'postgrad') {
      const roadmapText = (section.roadmap || []).flatMap(item => `${item.phase} ${item.title} ${item.text}`).join(' ');
      const pathText = (section.pathCards || []).flatMap(item => `${item.title} ${item.label} ${(item.bullets || []).join(' ')}`).join(' ');
      const faqText = (section.postgradFaq || []).flatMap(item => `${item.q} ${item.a}`).join(' ');
      entries.push({ route: 'postgrad', title: '考研保研路线与问答', text: `${section.title} ${roadmapText} ${pathText} ${faqText}`, source: section.source || source });
    }
    if (section.id === 'job') {
      const checklistText = (section.resumeChecklist || []).join(' ');
      const stepsText = (section.jobSteps || []).flatMap(item => `${item.title} ${item.text}`).join(' ');
      const faqText = (section.jobFaq || []).flatMap(item => `${item.q} ${item.a}`).join(' ');
      entries.push({ route: 'job', title: '实习求职准备与问答', text: `${section.title} ${checklistText} ${stepsText} ${faqText}`, source: section.source || source });
    }
  });
  (state.data.competitions?.categories || []).forEach(category => category.items.forEach(item => entries.push({ route: 'compete', title: item.title, text: `${category.title} ${item.title} ${item.intro} ${item.college} ${item.major} ${item.levelLabel}`, source: state.data.competitions.source })));
  return entries;
}

function renderNav() {
  $('#primaryNav').innerHTML = pages.map(page => `<button class="nav-item ${page.id === state.route ? 'active' : ''}" data-route="${page.id}"><span class="nav-icon" aria-hidden="true">${page.icon}</span><span>${page.name}</span></button>`).join('');
  document.querySelectorAll('[data-route]').forEach(element => element.addEventListener('click', () => navigate(element.dataset.route)));
}

function sectionGlyph(title) {
  const glyphs = [['专业', '学'], ['校园地图', '图'], ['地图', '图'], ['宿舍', '宿'], ['清单', '清'], ['政策', '策'], ['医保', '医'], ['代办', '办'], ['军训', '训'], ['转专业', '转'], ['资源', '资'], ['资料', '下'], ['竞赛', '赛'], ['技能', '技'], ['班干部', '班'], ['缴费', '费'], ['防骗', '防'], ['选课', '课'], ['考证', '证'], ['渠道', '讯'], ['考研', '研'], ['求职', '职'], ['动态', '新'], ['存档', '档'], ['食堂', '味'], ['图书馆', '阅'], ['建筑', '楼'], ['校区', '校'], ['入口', '↗'], ['准备', '清']];
  return glyphs.find(([label]) => title.includes(label))?.[1] || title.slice(0, 1);
}
const quickIconPaths = {
  about: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 7h2M14 7h2M8 11h2M14 11h2M8 15h2M14 15h2M10 21v-4h4v4"/>',
  majors: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v16H6.5A2.5 2.5 0 0 0 4 21.5z"/><path d="M4 5.5v16M8 7h8M8 11h7"/>',
  campus: '<path d="M4 10h16M6 10v8M10 10v8M14 10v8M18 10v8M3 18h18M12 3l9 7H3z"/>',
  dorm: '<path d="M4 18v-7a3 3 0 0 1 3-3h10a3 3 0 0 1 3 3v7M4 14h16M7 11h3M4 21v-3M20 21v-3"/>',
  checklist: '<rect x="4" y="3" width="16" height="18" rx="2"/><path d="m8 9 1.5 1.5L12 8M14 9h3M8 15l1.5 1.5L12 14M14 15h3"/>',
  policies: '<path d="M6 3h9l3 3v15H6z"/><path d="M15 3v4h4M9 12h6M9 16h6"/>',
  medical: '<path d="M12 20S4 15.5 4 9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 8 2.5C20 15.5 12 20 12 20z"/><path d="M12 9v6M9 12h6"/>',
  map: '<path d="m3 6 6-3 6 3 6-3v15l-6 3-6-3-6 3zM9 3v15M15 6v15"/>',
  errands: '<rect x="5" y="5" width="14" height="16" rx="2"/><path d="M9 5V3h6v2M8 10h8M8 14h6M8 18h4"/>',
  training: '<path d="M5 21V4M5 5c4-3 7 3 14 0v8c-7 3-10-3-14 0"/>',
  transfer: '<path d="M4 8h15M15 4l4 4-4 4M20 16H5M9 12l-4 4 4 4"/>',
  resources: '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22zM20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5A2.5 2.5 0 0 1 20 22z"/>',
  downloads: '<path d="M12 3v12M7 11l5 5 5-5M5 21h14"/>',
  compete: '<path d="M8 4h8v4a4 4 0 0 1-8 0zM12 12v5M8 21h8M9 17h6M5 5H3v2a4 4 0 0 0 4 4M19 5h2v2a4 4 0 0 1-4 4"/>',
  skills: '<path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8zM19 16l.8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z"/>',
  classCampaign: '<circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20a6 6 0 0 1 12 0M14 20a5 5 0 0 1 7 0"/>',
  fees: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 10h18M7 15h4"/>',
  antiScam: '<path d="M12 3 20 6v5c0 5-3.3 8.7-8 10-4.7-1.3-8-5-8-10V6z"/><path d="M12 8v4M12 16h.01"/>',
  course: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M16 2v4M8 2v4M3 9h18M8 13h.01M12 13h.01M16 13h.01M8 17h.01M12 17h.01"/>',
  cert: '<circle cx="12" cy="10" r="7"/><path d="m9 10 2 2 4-4M9 16l-1 5 4-2 4 2-1-5"/>',
  channels: '<circle cx="12" cy="12" r="2"/><path d="M5.6 5.6a9 9 0 0 0 0 12.8M18.4 5.6a9 9 0 0 1 0 12.8M2.8 2.8a13 13 0 0 0 0 18.4M21.2 2.8a13 13 0 0 1 0 18.4"/>',
  postgrad: '<path d="m3 9 9-5 9 5-9 5zM7 11v5c3 2 7 2 10 0v-5M21 9v7"/>',
  job: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2"/>',
  feed: '<path d="M4 19a2 2 0 0 1-2-2M4 13a8 8 0 0 1 8 8M4 7a14 14 0 0 1 14 14M4 3h.01"/>',
  faq: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 1 1 4.2 1.8c-1 .8-1.7 1.2-1.7 2.7M12 17h.01"/>',
  archive: '<path d="M4 7h16v13H4zM3 4h18v3H3zM9 12h6"/>'
};
function quickIcon(route) { return `<span class="entry-icon entry-icon-${route}" aria-hidden="true"><svg viewBox="0 0 24 24" focusable="false">${quickIconPaths[route] || '<circle cx="12" cy="12" r="8"/>'}</svg></span>`; }
function sectionHead(title, detail, link = '') { return `<div class="section-head"><span class="section-icon" aria-hidden="true">${sectionGlyph(title)}</span><div class="section-copy"><h2>${title}</h2><p>${detail}</p></div>${link ? `<button class="section-link" data-route="${link}">查看全部 →</button>` : ''}</div>`; }
function actionLink(url, label, kind = '') {
  const isDownload = kind === 'download' || String(url).startsWith('downloads/');
  const icon = isDownload ? '↓' : '↗';
  const text = label || (isDownload ? '下载文件' : '打开链接');
  return `<a class="action-button ${isDownload ? 'download-button' : 'link-button'}" href="${esc(url)}" target="_blank" rel="noreferrer"><span class="action-icon" aria-hidden="true">${icon}</span><span>${esc(text)}</span></a>`;
}
function sourceLink(source) { return source ? actionLink(source.url, source.label) : ''; }
function notice(text, warning = false) { return `<div class="notice ${warning ? 'warn' : ''}"><span>${warning ? '!' : 'i'}</span><span>${esc(text)}</span></div>`; }
const tuitionByMajor = {
  '矿物资源工程': 3600, '矿物加工工程': 3600, '资源勘查工程': 3600,
  '英语': 4500, '日语': 4500, '汉语言文学': 4500, '核物理': 4500, '生物技术': 4500, '信息与计算科学': 4500,
  '会计学': 5000, '工商管理': 5000, '电子商务': 5000, '法学': 5000, '国际经济与贸易': 5000, '经济学': 5000, '应急管理': 5000,
  '核工程与核技术': 5900, '辐射防护与核安全': 5900, '核化工与核燃料工程': 5900, '土木工程': 5900, '建筑环境与能源应用工程': 5900, '给排水科学与工程': 5900, '建筑电气与智能化': 5900, '智能建造与智慧交通': 5900, '化学工程与工艺': 5900, '制药工程': 5900, '高分子材料与工程': 5900, '无机非金属材料与工程': 5900, '城市地下空间工程': 5900, '环境工程': 5900, '安全工程': 5900, '软件工程': 5900, '数据科学与大数据技术': 5900, '物联网工程': 5900, '人工智能': 5900, '网络空间安全': 5900, '信息安全': 5900, '机械设计制造及其自动化': 5900, '材料成型及控制工程': 5900, '材料成型与控制工程': 5900, '车辆工程': 5900, '智能制造工程': 5900, '能源与动力工程': 5900, '电气工程及其自动化': 5900, '自动化': 5900, '机器人工程': 5900, '电子信息工程': 5900, '通信工程': 5900, '生物医学工程': 5900, '建筑学': 5900, '城乡规划': 5900, '风景园林': 5900,
  '临床医学': 7500, '麻醉学': 7500, '医学影像学': 7500, '儿科学': 7500, '口腔医学': 7500, '医学检验技术': 7500, '药学': 7500, '卫生检验与检疫': 7500, '预防医学': 7500, '护理学': 7500, '康复治疗学': 7500,
  '视觉传达设计': 8000, '环境设计': 8000, '数字媒体艺术': 8000
};
function majorTuition(name) { return tuitionByMajor[name] ? `${tuitionByMajor[name]} 元/年` : '待按 2026 级缴费平台核对'; }

function scrollExpandMarkup() {
  return `<section class="scroll-expand" data-scroll-expand aria-label="南华大学红湘校区正门视觉开场"><div class="scroll-expand-track"><div class="scroll-expand-stage"><div class="scroll-expand-frame"><img class="scroll-expand-media" src="assets/images/gate-hongxiang.jpg" alt="南华大学红湘校区正门"><div class="scroll-expand-scrim"></div></div><div class="scroll-expand-title">南国以南，花开于华</div><div class="scroll-expand-hint">向下滚动，走近南华</div></div></div></section>`;
}

function renderHome() {
  const site = state.data.site;
  const factCards = site.facts.map(fact => `<div class="stat-card"><div class="num">${esc(fact.icon)}</div><div class="label">${esc(fact.label)}<br><strong>${esc(fact.value)}</strong></div></div>`).join('');
  const entries = pages.filter(page => page.id !== 'home').map(page => [page.id, page.icon, page.name, page.sub]);
  const newcomerPath = [['报到前', '确认校区与时间', '先看录取材料、迎新系统、地图和报到安排。', 'map'], ['准备期', '整理证件与行李', '用入学清单核对证件、床品、生活用品和资料。', 'checklist'], ['入学后', '完成平台与课程准备', '开通校内平台，了解选课、军训、校园服务和社团。', 'resources'], ['大一阶段', '持续积累与规划', '从竞赛、证书、技能成长到考研保研和实习逐步规划。', 'compete']].map(([phase, title, text, route], index) => `<article class="newcomer-step"><span class="newcomer-step-number">0${index + 1}</span><div><small>${phase}</small><h3>${title}</h3><p>${text}</p><button class="text-button" data-route="${route}">进入相关板块 →</button></div></article>`).join('');
  $('#page-home').innerHTML = `${scrollExpandMarkup()}<div class="hero"><div class="hero-content"><span class="eyebrow">南华大学 · 新生入学季</span><h1>相安南华</h1><p>把第一次到南华的期待，整理成一份可查、可用、会更新的校园生活手册。</p><div class="hero-actions"><button class="button" data-route="checklist">开始准备报到 →</button><button class="button secondary" data-route="about">认识南华大学</button></div></div></div>
    ${notice(site.notice, true)}
    <section class="section"><div class="grid grid-4">${factCards}</div></section>
    <section class="section newcomer-section">${sectionHead('新生任务路线', '按时间顺序完成关键准备，减少临近报到时的信息焦虑')}<div class="newcomer-path">${newcomerPath}</div></section>
    <section class="section">${sectionHead('快速入口', '从你现在最需要的地方开始')}<div class="grid grid-3">${entries.map(([route, icon, title, desc]) => `<button class="entry-card" data-route="${route}">${quickIcon(route)}<strong>${title}</strong><small>${desc}</small></button>`).join('')}</div></section>
    <section class="section">${sectionHead('南华校园印象', '两校区入口、校园建筑与运动空间')}<div class="photo-grid"><figure class="photo-card"><img src="assets/images/gate-hongxiang.jpg" alt="南华大学红湘校区正门" fetchpriority="high"><figcaption class="photo-caption"><strong>红湘校区正门</strong><small>主校区入口照片</small></figcaption></figure><figure class="photo-card"><img loading="lazy" src="assets/images/gate-yumu.jpg" alt="南华大学雨母校区正门"><figcaption class="photo-caption"><strong>雨母校区正门</strong><small>新校区入口照片</small></figcaption></figure><figure class="photo-card"><img loading="lazy" src="assets/images/nanhualou.jpg" alt="南华大学南华楼夜景"><figcaption class="photo-caption"><strong>南华楼</strong><small>校园夜景</small></figcaption></figure><figure class="photo-card"><img loading="lazy" src="assets/images/library.jpg" alt="南华大学图书馆"><figcaption class="photo-caption"><strong>图书馆</strong><small>校园建筑日景</small></figcaption></figure><figure class="photo-card"><img loading="lazy" src="assets/images/teaching-building.jpg" alt="南华大学逸夫楼教学楼"><figcaption class="photo-caption"><strong>逸夫楼（教学楼）</strong><small>教学楼建筑</small></figcaption></figure><figure class="photo-card"><img loading="lazy" src="assets/images/playground.jpg" alt="南华大学操场"><figcaption class="photo-caption"><strong>操场</strong><small>校园运动空间</small></figcaption></figure></div></section>
    <section class="section">${sectionHead('新生先看这三件事', '减少临近报到时的信息焦虑')}<div class="grid grid-3"><div class="info-card card"><h3>先确认校区与时间</h3><p>报到校区、时间和流程请以录取材料、迎新系统及学院通知为准。</p></div><div class="info-card card"><h3>再准备证件和材料</h3><p>录取通知书、身份证、证件照和按要求的档案材料优先准备。</p></div><div class="info-card card"><h3>最后购买生活用品</h3><p>床品尺寸、宿舍规定和快递地址先确认，避免重复购买或寄错地址。</p></div></div></section>`;
  bindRouteButtons($('#page-home'));
}

function bindScrollExpand() {
  if (window.__xiangnanScrollExpandBound) return;
  window.__xiangnanScrollExpandBound = true;
  let frame = 0;
  let current = 0;
  let target = 0;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const smoothstep = (edge0, edge1, value) => { const t = clamp((value - edge0) / (edge1 - edge0 || 1), 0, 1); return t * t * (3 - 2 * t); };
  const apply = progress => {
    const root = document.querySelector('[data-scroll-expand]');
    if (!root) return;
    const frameEl = root.querySelector('.scroll-expand-frame');
    const media = root.querySelector('.scroll-expand-media');
    const scrim = root.querySelector('.scroll-expand-scrim');
    const title = root.querySelector('.scroll-expand-title');
    const hint = root.querySelector('.scroll-expand-hint');
    const eased = smoothstep(0, 1, progress);
    const width = 42 + (100 - 42) * eased;
    const height = 58 + (100 - 58) * eased;
    const insetX = Math.max(0, (100 - width) / 2);
    const insetY = Math.max(0, (100 - height) / 2);
    frameEl.style.clipPath = `inset(${insetY}% ${insetX}% ${insetY}% ${insetX}% round ${24 - 24 * eased}px)`;
    media.style.transform = `scale(${1.35 - .35 * eased})`;
    scrim.style.opacity = `${.45 * eased}`;
    const titleOut = smoothstep(.4, .88, progress);
    title.style.opacity = `${1 - titleOut}`;
    title.style.transform = `translate3d(0, ${-28 * titleOut}px, 0) scale(${1 + .06 * titleOut})`;
    const hintGone = smoothstep(0, .12, progress);
    hint.style.opacity = `${1 - hintGone}`;
    hint.style.transform = `translate3d(0, ${8 * hintGone}px, 0)`;
  };
  if (reduceMotion) {
    window.__xiangnanScrollExpandRefresh = () => apply(0);
    apply(0);
    return;
  }
  const tick = () => {
    current += (target - current) * (reduceMotion ? 1 : .12);
    if (Math.abs(target - current) < .0005) current = target;
    apply(current);
    frame = Math.abs(target - current) < .0005 ? 0 : requestAnimationFrame(tick);
  };
  const read = () => {
    const root = document.querySelector('[data-scroll-expand]');
    if (!root) return 0;
    return clamp(-root.getBoundingClientRect().top / (window.innerHeight * 1.2), 0, 1);
  };
  const onScroll = () => { target = read(); if (!frame) frame = requestAnimationFrame(tick); };
  const onResize = () => { target = read(); current = target; apply(current); };
  window.__xiangnanScrollExpandRefresh = onResize;
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onResize);
  onResize();
}

function renderAbout() {
  const site = state.data.site;
  $('#page-about').innerHTML = `<section class="section">${sectionHead('学校概况', '认识南华大学，从官方信息开始')}${sourceMeta(site.source, site.reviewed, '官方信息')}<div class="grid grid-2"><div class="card info-card"><div class="emblem-panel"><img src="assets/images/usc-emblem.jpg" alt="南华大学校徽"><div><h3>${esc(site.school.name)}</h3><p class="meta">${esc(site.school.english)}</p></div></div><p style="margin-top:16px">${esc(site.school.overview)}</p><p class="meta" style="margin-top:14px">校训：${esc(site.school.slogan)}<br>所在地：${esc(site.school.location)}</p></div><div class="card info-card"><h3>两个校区</h3><div class="photo-grid" style="grid-template-columns:repeat(2,1fr)"><figure class="photo-card"><img loading="lazy" src="assets/images/gate-hongxiang.jpg" alt="红湘校区正门"><figcaption class="photo-caption"><strong>红湘校区</strong><small>老校区正门</small></figcaption></figure><figure class="photo-card"><img loading="lazy" src="assets/images/gate-yumu.jpg" alt="雨母校区正门"><figcaption class="photo-caption"><strong>雨母校区</strong><small>新校区正门</small></figcaption></figure></div></div></div></section><section class="section">${sectionHead('校园建筑', '图片名称来自用户提供的视觉资源')}<div class="photo-grid"><figure class="photo-card"><img loading="lazy" src="assets/images/library.jpg" alt="南华大学图书馆"><figcaption class="photo-caption"><strong>图书馆</strong><small>校园建筑日景</small></figcaption></figure><figure class="photo-card"><img loading="lazy" src="assets/images/nanhualou.jpg" alt="南华大学南华楼"><figcaption class="photo-caption"><strong>南华楼</strong><small>校园建筑夜景</small></figcaption></figure><figure class="photo-card"><img loading="lazy" src="assets/images/teaching-building.jpg" alt="南华大学逸夫楼教学楼"><figcaption class="photo-caption"><strong>逸夫楼（教学楼）</strong><small>教学楼建筑</small></figcaption></figure><figure class="photo-card"><img loading="lazy" src="assets/images/playground.jpg" alt="南华大学操场"><figcaption class="photo-caption"><strong>操场</strong><small>校园运动空间</small></figcaption></figure></div></section><section class="section">${sectionHead('官方入口', '需要确认具体事项时，优先查看这些渠道')}<div class="grid grid-3"><a class="card info-card card-link" href="https://www.usc.edu.cn/" target="_blank" rel="noreferrer"><span class="card-link-icon" aria-hidden="true">↗</span><h3>南华大学官网</h3><p>学校新闻、通知公告与部门网站入口</p></a><a class="card info-card card-link" href="https://www.usc.edu.cn/xxgk/xxjj.htm" target="_blank" rel="noreferrer"><span class="card-link-icon" aria-hidden="true">↗</span><h3>学校简介</h3><p>办学历史、学校定位与基本情况</p></a><div class="card info-card"><h3>迎新与学院通知</h3><p>报到时间、校区、宿舍和班级信息以当年通知为准。</p></div></div></section>`;
}

function renderMajors() {
  const majors = state.data.majors;
  const types = ['全部', ...new Set(majors.map(major => major.type))];
  const colleges = ['全部', ...new Set(majors.map(major => major.college))];
  const filtered = majors.filter(major => (state.majorType === '全部' || major.type === state.majorType) && (state.majorCollege === '全部' || major.college === state.majorCollege) && `${major.name}${major.college}${major.type}${major.summary} ${(major.tags || []).join(' ')} ${(major.directions || []).join(' ')} ${major.guidance || ''}`.includes(state.majorQuery));
  const grouped = colleges.filter(college => college !== '全部' && filtered.some(major => major.college === college)).map(college => {
    const group = filtered.filter(major => major.college === college);
    return `<section class="major-group"><div class="major-group-head"><div><span class="major-group-kicker">学院培养方案</span><h3>${esc(college)}</h3></div><span class="major-group-count">${group.length} 个专业</span></div><div class="grid grid-3">${group.map(major => `<button class="card major-card" data-major="${esc(major.name)}"><div class="major-card-title"><h3>${esc(major.name)}</h3><span class="major-open" aria-hidden="true">→</span></div><div class="tags"><span class="tag">${esc(major.type)}</span><span class="tag tuition-tag">${esc(majorTuition(major.name))}</span></div><p>${esc(major.summary)}</p><small class="major-plan-label">查看培养方案</small></button>`).join('')}</div></section>`;
  }).join('');
  $('#page-majors').innerHTML = `<section class="section">${sectionHead('专业库', `${filtered.length} 个专业条目 · 按学院查看培养方案`)}${sourceMeta(state.data.site.source, state.data.site.reviewed, '公开目录整理')}${notice('专业名称和培养建议按南华大学公开信息整理；2026 学费档次来自《南华大学 2026 级新生缴费须知》。招生计划、选考要求、学制、培养方案和最终收费以当年官方文件及缴费平台为准。', true)}<div class="filter-bar"><input id="majorQuery" value="${esc(state.majorQuery)}" placeholder="搜索专业名称、学院、方向或关键词…"><select id="majorCollege" aria-label="按学院筛选">${colleges.map(college => `<option value="${esc(college)}" ${college === state.majorCollege ? 'selected' : ''}>${esc(college)}</option>`).join('')}</select>${types.map(type => `<button class="chip ${type === state.majorType ? 'active' : ''}" data-major-type="${esc(type)}">${esc(type)}</button>`).join('')}</div>${grouped || '<div class="card info-card"><h3>没有匹配的专业</h3><p>试试学院名称、学科门类或更短的关键词。</p></div>'}</section>`;
  $('#majorQuery').addEventListener('input', event => { state.majorQuery = event.target.value.trim(); renderMajors(); });
  $('#majorCollege').addEventListener('change', event => { state.majorCollege = event.target.value; renderMajors(); });
  document.querySelectorAll('[data-major-type]').forEach(button => button.addEventListener('click', () => { state.majorType = button.dataset.majorType; renderMajors(); }));
  document.querySelectorAll('[data-major]').forEach(button => button.addEventListener('click', () => openMajor(button.dataset.major)));
}

function openMajor(name) {
  const major = state.data.majors.find(item => item.name === name); if (!major) return;
  $('#modalCard').innerHTML = `<div class="modal-head"><button class="modal-close" data-close-modal>×</button><h2>${esc(major.name)}</h2><p>${esc(major.college)} · ${esc(major.type)} · 学院培养方案</p></div><div class="modal-body"><div class="plan-summary"><div><small>2026 学费参考</small><strong>${esc(majorTuition(major.name))}</strong></div><div><small>培养方向</small><strong>${esc(major.directions?.[0] || '综合培养')}</strong></div></div><h3>培养目标与专业概览</h3><p>${esc(major.summary)}</p><h3>核心课程示例</h3><p>${(major.courses || []).map(esc).join(' · ') || '待补充'}</p><h3>实践与发展方向</h3><p>${(major.directions || []).map(esc).join(' · ') || '待补充'}</p><h3>选专业与学习建议</h3><p>${esc(major.guidance || '建议结合个人兴趣、学科基础和当年培养方案进一步了解。')}</p><div class="plan-actions">${actionLink('downloads/2026-fee-guide.pdf', '查看 2026 缴费须知', 'download')}${sourceLink(state.data.site.source)}</div>${notice('学费仅为 2026 级缴费须知中的专业档次参考；含实验班、创新班、卓越工程师班等具体培养项目，以及学制、招生计划和最终收费，以当年官方文件和缴费平台为准。', true)}</div>`;
  openModal();
}

function renderSimpleCollection(id, title, detail, items, source) {
  $('#page-' + id).innerHTML = `<section class="section">${sectionHead(title, detail)}${sourceMeta(source)}<div class="grid grid-2">${items.map(item => `<article class="card info-card"><h3>${esc(item.icon || item.title || item.q || item.group)} ${esc(item.title || item.q || item.group)}</h3><p>${esc(item.text || item.a || (item.items || []).join('、'))}</p>${item.tag ? `<div class="meta" style="margin-top:12px">${esc(item.tag)}</div>` : ''}</article>`).join('')}</div></section>`;
}

function renderCampus() {
  const items = state.data.campus.items.map(item => `<article class="card info-card"><h3>${esc(item.icon || '•')} ${esc(item.title)}</h3><p>${esc(item.text)}</p>${item.tag || item.status ? `<div class="meta" style="margin-top:12px">${esc(item.tag || item.status)}</div>` : ''}</article>`).join('');
  const nearby = state.data.campus.nearby || {};
  const nearbyCards = (items, metaKey) => (items || []).map(item => `<article class="campus-life-card"><div class="campus-life-title"><span class="campus-life-mark" aria-hidden="true">${esc(item.icon || '•')}</span><h3>${esc(item.title)}</h3></div><p>${esc(item.text)}</p>${item[metaKey] ? `<div class="campus-life-meta">${esc(item[metaKey])}</div>` : ''}</article>`).join('');
  const nearbySection = (title, detail, key, metaKey) => `<section class="section campus-life-section">${sectionHead(title, detail)}${sourceMeta(state.data.campus.source, state.data.site.reviewed, '经验整理')}<div class="campus-life-grid">${nearbyCards(nearby[key], metaKey)}</div></section>`;
  const tips = (nearby.tips || []).map(item => `<article class="campus-tip-card"><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p></article>`).join('');
  const clubs = state.data.campus.clubsAndActivities || {};
  const clubCards = (clubs.categories || []).map(item => `<article class="campus-life-card"><div class="campus-life-title"><span class="campus-life-mark" aria-hidden="true">${esc(item.icon || '•')}</span><h3>${esc(item.title)}</h3></div><p>${esc(item.text)}</p></article>`).join('');
  const representativeCards = (clubs.representatives || []).map(item => `<article class="campus-activity-card"><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p></article>`).join('');
  const eventCards = (clubs.events || []).map(item => `<article class="campus-activity-card"><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p></article>`).join('');
  const clubsSection = `<section class="section campus-life-section">${sectionHead('社团与活动', '热闹、多元，找到兴趣圈子也锻炼综合能力')}<div class="campus-activity-lead"><p>${esc(clubs.overview || '')}</p></div><h3 class="campus-activity-heading">社团体系</h3><div class="campus-life-grid">${clubCards}</div><h3 class="campus-activity-heading">代表性社团</h3><div class="campus-activity-grid">${representativeCards}</div><h3 class="campus-activity-heading">校园活动</h3><div class="campus-activity-grid">${eventCards}</div><div class="campus-activity-join"><strong>怎么参加</strong><p>${esc(clubs.join || '')}</p></div><p class="campus-life-note">${esc(clubs.note || '')}</p></section>`;
  $('#page-campus').innerHTML = `<section class="section">${sectionHead('校园生活', '先了解服务，再到校探索')}${sourceMeta(state.data.campus.source, state.data.site.reviewed, '经验整理')}<div class="grid grid-2">${items}</div></section>${clubsSection}${nearbySection('周围商圈', '从红湘校区出发，逛街、吃饭和休闲都方便', 'shopping', 'distance')}${nearbySection('知名景点', '衡阳城市漫游与周末人文路线', 'attractions', 'distance')}${nearbySection('推荐店铺', '南华周边的学生美食地图', 'stores', 'location')}<section class="section campus-life-section">${sectionHead('游玩建议', '按时间和场景安排校园周边探索')}${sourceMeta(state.data.campus.source, state.data.site.reviewed, '经验整理')}<div class="campus-tip-grid">${tips}</div><p class="campus-life-note">${esc(nearby.note || '')}</p></section><section class="section">${sectionHead('校园建筑印象', '图片名称来自用户提供的视觉资源')}<div class="photo-grid"><figure class="photo-card"><img loading="lazy" src="assets/images/library.jpg" alt="南华大学图书馆"><figcaption class="photo-caption"><strong>图书馆</strong><small>校园建筑日景</small></figcaption></figure><figure class="photo-card"><img loading="lazy" src="assets/images/nanhualou.jpg" alt="南华大学南华楼"><figcaption class="photo-caption"><strong>南华楼</strong><small>校园建筑夜景</small></figcaption></figure><figure class="photo-card"><img loading="lazy" src="assets/images/teaching-building.jpg" alt="南华大学逸夫楼教学楼"><figcaption class="photo-caption"><strong>逸夫楼（教学楼）</strong><small>教学楼建筑</small></figcaption></figure><figure class="photo-card"><img loading="lazy" src="assets/images/playground.jpg" alt="南华大学操场"><figcaption class="photo-caption"><strong>操场</strong><small>校园运动空间</small></figcaption></figure><figure class="photo-card"><img loading="lazy" src="assets/images/gate-hongxiang.jpg" alt="南华大学红湘校区正门"><figcaption class="photo-caption"><strong>红湘校区正门</strong><small>校区入口视觉资料</small></figcaption></figure></div></section>`;
}
function dormPoints(item) {
  if (Array.isArray(item.bullets) && item.bullets.length) return item.bullets;
  const parts = String(item.text || '').split(/[；。！？]/).map(part => part.trim()).filter(Boolean);
  return parts.length ? parts : [String(item.text || '')];
}
function renderDorm() {
  const timelineItem = state.data.dorm.items.find(item => item.title === '入住整理 6 步走');
  const timeline = timelineItem?.steps?.length ? `<section class="dorm-timeline-section"><div class="dorm-timeline-heading"><span class="dorm-heading-mark"></span><h2>入住整理 6 步走</h2><p>报到当天不抓瞎</p></div><div class="dorm-timeline">${timelineItem.steps.map((step, index) => `<article class="dorm-step"><span class="dorm-step-number">${index + 1}</span><div class="dorm-step-card"><h3>${esc(step.title)}</h3><p>${esc(step.text)}</p></div></article>`).join('')}</div></section>` : '';
  const items = state.data.dorm.items.filter(item => item !== timelineItem).map((item, index) => `<article class="card info-card dorm-card"><span class="dorm-sticker" aria-hidden="true">${esc(item.sticker || (index % 2 ? '宿舍' : '攻略'))}</span><h3>${esc(item.icon || '•')} ${esc(item.title)}</h3><ul class="dorm-points">${dormPoints(item).map(point => `<li>${esc(point)}</li>`).join('')}</ul>${item.tag ? `<div class="meta" style="margin-top:12px">${esc(item.tag)}</div>` : ''}</article>`).join('');
  $('#page-dorm').innerHTML = `<section class="section">${sectionHead('宿舍攻略', '先确认床型，再按入住节奏整理生活')}${notice('床铺尺寸和房间分布来自用户提供的表格；采购清单、好物推荐与避雷内容属于新生经验或通用安全建议，不构成学校指定采购或正式违禁目录。红湘校区与雨母校区的楼栋、床型和管理要求以当年分配结果及宿舍通知为准。', true)}${timeline}<div class="grid grid-2">${items}</div><div style="margin-top:16px">${sourceLink(state.data.dorm.source)}</div></section>`;
}
function renderPolicies() {
  const items = state.data.policies || [];
  const scholarships = items.filter(item => item.kind === 'scholarship');
  const aidWays = items.filter(item => item.kind === 'aid');
  const regular = items.filter(item => !item.kind);
  const scholarshipPanel = scholarships.length ? `<section class="aid-panel"><div class="aid-panel-head"><h3>奖助学金</h3><span>图片整理参考</span></div><div class="aid-awards">${scholarships.map(item => `<article class="aid-award"><h4>${esc(item.title)} <strong>${esc(item.amount || '')}</strong></h4><p>${esc(item.text)}</p><small>${esc(item.tag || '')}</small></article>`).join('')}</div></section>` : '';
  const aidPanel = aidWays.length ? `<section class="aid-list-card"><h3>其他资助方式</h3><ul>${aidWays.map(item => `<li><strong>${esc(item.title)}：</strong><span>${esc(item.text)}</span></li>`).join('')}</ul></section>` : '';
  const regularCards = regular.map(item => `<article class="card info-card"><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p>${item.tag ? `<div class="meta" style="margin-top:12px">${esc(item.tag)}</div>` : ''}</article>`).join('');
  $('#page-policies').innerHTML = `<section class="section">${sectionHead('政策与资助', '学校构建了奖、勤、贷、助、补、减、免、缓多措并举的资助体系')}${notice('下方奖学金金额、获奖比例和资助方式根据用户提供的图片整理，仅作参考；评审条件、名额、金额和办理时间以南华大学当年正式文件为准。', true)}${scholarshipPanel}${aidPanel}<div class="grid grid-2 policy-regular-grid">${regularCards}</div><div style="margin-top:16px">${sourceLink(state.data.site.source)}</div></section>`;
}
function renderMedical() { renderSimpleCollection('medical', '学生医保', '2026 级参保与报销信息整理', state.data.medical.items, state.data.medical.source); }

function renderChecklist() {
  const saved = JSON.parse(localStorage.getItem('xiangnan_checklist') || '{}'); state.checklist = saved;
  const allItems = state.data.checklist.flatMap(group => group.items.map(item => `${group.group}:${item}`));
  const completed = allItems.filter(key => state.checklist[key]).length;
  const groups = state.data.checklist.map(group => `<div class="card check-group"><h3>${esc(group.group)}</h3>${group.items.map(item => { const key = `${group.group}:${item}`; return `<label class="check-item ${state.checklist[key] ? 'done' : ''}"><input type="checkbox" data-check="${esc(key)}" ${state.checklist[key] ? 'checked' : ''}><span>${esc(item)}</span></label>`; }).join('')}</div>`).join('');
  $('#page-checklist').innerHTML = `<section class="section">${sectionHead('入学清单', '勾选状态只保存在当前浏览器')}${sourceMeta(state.data.site.source, state.data.site.reviewed, '经验清单')}<div class="check-summary"><div><strong data-check-count>${completed}/${allItems.length}</strong><span>已完成事项</span></div><div class="check-progress"><span style="width:${allItems.length ? Math.round(completed / allItems.length * 100) : 0}%"></span></div><button class="text-button" type="button" data-reset-checklist>清空勾选</button></div><div class="grid grid-2">${groups}</div><div style="margin-top:15px">${notice('证件、报到时间、校区和缴费事项请始终以录取材料与学校通知为准。', true)}</div></section>`;
  document.querySelectorAll('[data-check]').forEach(input => input.addEventListener('change', event => { state.checklist[event.target.dataset.check] = event.target.checked; localStorage.setItem('xiangnan_checklist', JSON.stringify(state.checklist)); event.target.closest('.check-item').classList.toggle('done', event.target.checked); const checked = allItems.filter(key => state.checklist[key]).length; const count = $('[data-check-count]'); if (count) count.textContent = `${checked}/${allItems.length}`; const progress = $('.check-progress span'); if (progress) progress.style.width = `${allItems.length ? Math.round(checked / allItems.length * 100) : 0}%`; }));
  $('[data-reset-checklist]')?.addEventListener('click', () => { state.checklist = {}; localStorage.removeItem('xiangnan_checklist'); renderChecklist(); });
}

function renderFaq() {
  $('#page-faq').innerHTML = `<section class="section">${sectionHead('常见问题', '先看答案，再去确认官方来源')}<div class="card" style="padding:0 18px">${state.data.faq.map((item, index) => `<div class="faq-item"><button class="faq-question" data-faq="${index}">${esc(item.q)}<span>＋</span></button><div class="faq-answer">${esc(item.a)}<div style="margin-top:9px">${sourceLink(state.data.site.source)}</div></div></div>`).join('')}</div></section>`;
  document.querySelectorAll('[data-faq]').forEach(button => button.addEventListener('click', () => { const item = button.closest('.faq-item'); item.classList.toggle('open'); button.querySelector('span').textContent = item.classList.contains('open') ? '－' : '＋'; }));
}

function renderTraining(section) {
  const equipment = (section.equipmentGroups || []).map(group => `<article class="training-equip-card"><header><h3>${esc(group.title)}</h3><span>${esc(group.priority)}</span></header><div class="training-equip-list">${group.items.map(item => `<div class="training-equip-item"><strong>${esc(item.name)} <em>${esc(item.highlight)}</em></strong><p>${esc(item.note)}</p></div>`).join('')}</div></article>`).join('');
  const discipline = (section.disciplineGroups || []).map(group => `<article class="training-discipline-card"><h3>${esc(group.icon || '📌')} ${esc(group.title)}</h3><ul>${group.bullets.map(point => `<li>${esc(point)}</li>`).join('')}</ul></article>`).join('');
  const survival = (section.survivalTips || []).map(tip => `<article class="training-tip"><span aria-hidden="true">💡</span><p>${esc(tip)}</p></article>`).join('');
  const faq = (section.trainingFaq || []).map((item, index) => `<article class="training-faq-item"><button type="button" data-training-faq="${index}" aria-expanded="false"><span class="training-faq-icon">?</span><strong>${esc(item.q)}</strong><span class="training-faq-arrow">⌄</span></button><div class="training-faq-answer"><p>${esc(item.a)}</p></div></article>`).join('');
  const basic = (section.items || []).filter(item => ['军训安排', '身体不适'].includes(item.title)).map(item => `<article class="training-basic"><strong>${esc(item.title)}</strong><p>${esc(item.text)}</p><small>${esc(item.tag || '')}</small></article>`).join('');
  $('#page-training').innerHTML = `<section class="section training-page">${sectionHead('装备清单', '按优先级准备')}${notice('以下装备来自新生经验整理，优先级仅作准备参考；军训服装发放、携带物品和现场管理以南华大学当年通知为准。', true)}<div class="training-equip-grid">${equipment}</div></section><section class="section training-page">${sectionHead('纪律与请假', '先了解要求，再安排训练')}<div class="training-discipline-grid">${discipline}</div></section><section class="section training-page">${sectionHead('军训生存法则', '把体力和状态管理好')}<div class="training-survival-grid">${survival}</div></section><section class="section training-page">${sectionHead('常见问题', '先看经验回答，再核对正式通知')}<div class="training-faq-grid">${faq}</div></section><section class="section training-page">${sectionHead('军训安排与身体提醒', '年度安排和健康要求需重点确认')}<div class="training-basic-grid">${basic}</div>${notice('军训时间、请假材料、免训/减训、出入校和考核办法均以南华大学当年军训通知、教官及学院通知为准。', true)}<div style="margin-top:16px">${sourceLink(section.source || state.data.site.source)}</div></section>`;
  document.querySelectorAll('[data-training-faq]').forEach(button => button.addEventListener('click', () => { const item = button.closest('.training-faq-item'); const open = item.classList.toggle('open'); button.setAttribute('aria-expanded', String(open)); }));
}

function careerFaqMarkup(items, prefix) {
  return (items || []).map((item, index) => `<article class="career-faq-item"><button type="button" data-career-faq="${prefix}-${index}" aria-expanded="false"><span class="career-faq-icon">?</span><strong>${esc(item.q)}</strong><span class="career-faq-arrow">⌄</span></button><div class="career-faq-answer"><p>${esc(item.a)}</p></div></article>`).join('');
}
function renderPostgrad(section) {
  const roadmap = (section.roadmap || []).map((item, index) => `<article class="career-roadmap-item"><span class="career-roadmap-number">${index + 1}</span><small>${esc(item.phase)}</small><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p></article>`).join('');
  const paths = (section.pathCards || []).map(item => `<article class="career-path-card"><header><h3>${esc(item.title)}</h3><span>${esc(item.label)}</span></header><ul>${item.bullets.map(point => `<li>${esc(point)}</li>`).join('')}</ul></article>`).join('');
  const info = (section.items || []).map(item => `<article class="career-info-card"><h3>${esc(item.icon || '•')} ${esc(item.title)}</h3><p>${esc(item.text)}</p><small>${esc(item.tag || '')}</small></article>`).join('');
  $('#page-postgrad').innerHTML = `<section class="section career-page">${sectionHead('考研保研', '从大一开始积累课程、项目与信息')}${sourceMeta(section.source || state.data.site.source, section.reviewed, '经验整理')}${notice('保研比例、绩点权重、成果认定和夏令营安排均因学校、学院和年度政策而异；以下内容用于规划方向，最终以南华大学及目标院校正式文件为准。', true)}<div class="career-roadmap">${roadmap}</div></section><section class="section career-page">${sectionHead('两条升学路线', '先判断方向，再安排时间')}<div class="career-path-grid">${paths}</div></section><section class="section career-page">${sectionHead('常见问题', '经验回答不替代正式政策')}<div class="career-faq-grid">${careerFaqMarkup(section.postgradFaq, 'postgrad')}</div></section><section class="section career-page">${sectionHead('信息核验清单', '只从官方渠道确认关键节点')}<div class="career-info-grid">${info}</div><div style="margin-top:16px">${sourceLink(section.source || state.data.site.source)}</div></section>`;
  bindCareerFaq();
}
function renderJob(section) {
  const checklist = (section.resumeChecklist || []).map(item => `<li>${esc(item)}</li>`).join('');
  const steps = (section.jobSteps || []).map((item, index) => `<article class="career-job-step"><span>${index + 1}</span><div><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p></div></article>`).join('');
  const info = (section.items || []).map(item => `<article class="career-info-card"><h3>${esc(item.icon || '•')} ${esc(item.title)}</h3><p>${esc(item.text)}</p><small>${esc(item.tag || '')}</small></article>`).join('');
  $('#page-job').innerHTML = `<section class="section career-page">${sectionHead('实习求职', '把课程成果整理成可展示的证据')}${sourceMeta(section.source || state.data.site.source, section.reviewed, '经验整理')}${notice('招聘会、实习安排、薪资和岗位信息会随年度、行业、城市和专业变化；以下内容是通用准备建议，具体场次和岗位以学校就业部门及用人单位通知为准。', true)}<div class="career-resume-card"><header><h3>简历与作品清单</h3><span>投递前自检</span></header><ul>${checklist}</ul></div></section><section class="section career-page">${sectionHead('求职四步走', '从准备作品到确认合同')}<div class="career-job-steps">${steps}</div></section><section class="section career-page">${sectionHead('常见问题与安全提醒', '先核验，再投递和签约')}<div class="career-faq-grid">${careerFaqMarkup(section.jobFaq, 'job')}</div></section><section class="section career-page">${sectionHead('实习求职信息卡', '把经验转成可执行动作')}<div class="career-info-grid">${info}</div><div style="margin-top:16px">${sourceLink(section.source || state.data.site.source)}</div></section>`;
  bindCareerFaq();
}
function bindCareerFaq() {
  document.querySelectorAll('[data-career-faq]').forEach(button => button.addEventListener('click', () => { const item = button.closest('.career-faq-item'); const open = item.classList.toggle('open'); button.setAttribute('aria-expanded', String(open)); }));
}

function renderCompete() {
  const data = state.data.competitions || {};
  const categories = data.categories || [];
  const categoryButtons = categories.map(category => `<button type="button" class="competition-filter-chip" data-competition-category="${esc(category.id)}">${esc(category.title)}</button>`).join('');
  const categoryMarkup = categories.map(category => `<section class="competition-category" data-competition-section="${esc(category.id)}"><div class="competition-category-head"><span class="competition-category-icon">${esc(category.icon)}</span><div><h3>${esc(category.title)}</h3><p>${esc(category.subtitle)}</p></div><strong>${category.items.length} 项</strong></div><div class="competition-grid">${category.items.map(item => `<article class="competition-card" data-competition-card data-category="${esc(category.id)}" data-level="${esc(item.level)}" data-search="${esc(`${item.title} ${item.intro} ${item.college} ${item.major} ${item.levelLabel}`)}"><header><span class="competition-level level-${esc(item.level.toLowerCase())}">${esc(item.levelLabel)}</span><span class="competition-row">附件第 ${esc(item.sourceRow)} 项</span></header><h4>${esc(item.title)}</h4><p>${esc(item.intro)}</p><dl><div><dt>牵头学院</dt><dd>${esc(item.college)}</dd></div><div><dt>面向专业</dt><dd>${esc(item.major)}</dd></div></dl><div class="competition-card-foot">${actionLink(item.url, item.linkLabel)}<small>${esc(item.organizer)}</small></div></article>`).join('')}</div></section>`).join('');
   $('#page-compete').innerHTML = `<section class="section competition-page">${sectionHead(data.title || '竞赛地图', data.subtitle || '按方向查找适合自己的竞赛')}${sourceMeta(data.source || state.data.site.source, data.reviewed || state.data.site.reviewed, '竞赛体系整理')}${notice(data.notice || '竞赛报名时间和规则以当年正式通知为准。', true)}<div class="competition-source-row">${actionLink(data.source?.url || 'https://www.usc.edu.cn/', '下载 2023 竞赛体系', 'download')}<span>共 ${categories.reduce((total, category) => total + category.items.length, 0)} 项，按 A/B/C 评定等级整理</span></div><div class="competition-toolbar"><label class="competition-search"><span aria-hidden="true">⌕</span><input id="competitionQuery" type="search" placeholder="搜索竞赛名称、学院或专业" autocomplete="off"></label><select id="competitionLevel" aria-label="筛选竞赛等级"><option value="all">全部等级</option><option value="A">A 类重点</option><option value="B">B 类重点支持</option><option value="C">C 类专业实践</option></select></div><div class="competition-filter-list"><button type="button" class="competition-filter-chip active" data-competition-category="all">全部方向</button>${categoryButtons}</div><div id="competitionEmpty" class="competition-empty" hidden>没有符合条件的竞赛，请换一个关键词或筛选条件。</div>${categoryMarkup}<div class="competition-source-note">报名网址仅作为入口索引；未设统一报名站的竞赛将跳转至南华大学官网，请以学校、学院和竞赛主办方当年通知为准。</div></section>`;
  const cards = [...document.querySelectorAll('[data-competition-card]')];
  const sections = [...document.querySelectorAll('[data-competition-section]')];
  const query = $('#competitionQuery');
  const level = $('#competitionLevel');
  let category = 'all';
  const applyFilter = () => {
    const text = query.value.trim().toLowerCase();
    let visible = 0;
    cards.forEach(card => {
      const matchesCategory = category === 'all' || card.dataset.category === category;
      const matchesLevel = level.value === 'all' || card.dataset.level === level.value;
      const matchesText = !text || card.dataset.search.toLowerCase().includes(text);
      const show = matchesCategory && matchesLevel && matchesText;
      card.hidden = !show;
      if (show) visible += 1;
    });
    sections.forEach(section => { section.hidden = !section.querySelector('[data-competition-card]:not([hidden])'); });
    $('#competitionEmpty').hidden = visible > 0;
  };
  query.addEventListener('input', applyFilter);
  level.addEventListener('change', applyFilter);
  document.querySelectorAll('[data-competition-category]').forEach(button => button.addEventListener('click', () => {
    category = button.dataset.competitionCategory;
    document.querySelectorAll('[data-competition-category]').forEach(item => item.classList.toggle('active', item.dataset.competitionCategory === category));
    applyFilter();
  }));
}

function renderClassCampaign(section) {
  const roles = (section.roleCards || []).map(role => `<article class="class-role-card"><header><h3>${esc(role.title)}</h3><span>${esc(role.count || '1 名')}</span></header><div class="class-role-body"><div><strong>主要职能</strong><p>${esc(role.duties)}</p></div><div><strong>基本要求</strong><p>${esc(role.requirements)}</p></div></div></article>`).join('');
  const items = (section.items || []).map(item => `<article class="card info-card"><h3>${esc(item.icon || '•')} ${esc(item.title)}</h3><p>${esc(item.text)}</p>${item.tag ? `<div class="meta" style="margin-top:12px">${esc(item.tag)}</div>` : ''}</article>`).join('');
  $('#page-classCampaign').innerHTML = `<section class="section class-campaign-page">${sectionHead(section.title, section.subtitle)}${sourceMeta(section.source || state.data.site.source, section.reviewed, '经验整理')}${notice('以下岗位设置是班级组织参考，人数、职责边界和竞选流程以学院及班级当年通知为准。', true)}<div class="class-role-heading"><h3>班干部设置</h3><p>先了解职责，再选择适合自己的岗位</p></div><div class="class-role-grid">${roles}</div></section><section class="section class-campaign-page">${sectionHead('竞选与协作建议', '从服务同学开始建立协作能力')}<div class="grid grid-2">${items}</div></section>`;
}

function renderResourceCard(item) {
  return `<article class="resource-card"><div class="resource-card-copy"><div class="resource-card-title"><h3>${esc(item.title)}</h3>${item.tag ? `<span>${esc(item.tag)}</span>` : ''}</div><p>${esc(item.text)}</p></div>${item.url ? actionLink(item.url, item.linkLabel || '进入平台') : ''}</article>`;
}

function renderResources(section) {
  const platforms = (section.platforms || []).map(renderResourceCard).join('');
  const freshmanResources = (section.freshmanResources || []).map(renderResourceCard).join('');
  const certificateExams = (section.certificateExams || []).map(renderResourceCard).join('');
  const quickRoutes = (section.quickRoutes || []).map(item => `<button class="resource-quick-card" data-route="${esc(item.route)}">${quickIcon(item.route)}<span><strong>${esc(item.title)}</strong><small>${esc(item.text)}</small></span><b aria-hidden="true">→</b></button>`).join('');
  $('#page-resources').innerHTML = `<section class="section resource-page">${sectionHead(section.title, section.subtitle)}${sourceMeta(section.source || state.data.site.source, section.reviewed, '资源整理')}${notice('校内平台入口和考试报名网址可能随学校或主办方调整；没有统一网页入口的服务保留使用说明，请以当年通知为准。', true)}<div class="resource-block"><div class="resource-block-head"><h3>校内平台</h3><p>先收藏常用入口，再按通知完成登录和绑定</p></div><div class="resource-grid">${platforms}</div></div><div class="resource-block"><div class="resource-block-head"><h3>大一课程学习资源</h3><p>高数、英语、思政和计算机基础先从公开课程入门</p></div><div class="resource-grid">${freshmanResources}</div></div><div class="resource-block"><div class="resource-block-head"><h3>证书考试</h3><p>按专业和长期规划选择，不盲目堆证书</p></div><div class="resource-grid">${certificateExams}</div></div><div class="resource-block resource-quick-block"><div class="resource-block-head"><h3>成长板块快速入口</h3><p>从学习资源直接跳到竞赛、实习和升学规划</p></div><div class="resource-quick-grid">${quickRoutes}</div></div></section>`;
  bindRouteButtons($('#page-resources'));
}

function renderCourse(section) {
  const rounds = (section.courseRounds || []).map((item, index) => `<article class="course-round-card"><span class="course-round-number">${index + 1}</span><div><div class="course-round-top"><span>${esc(item.round)}</span><strong>${esc(item.title)}</strong></div><p>${esc(item.text)}</p><small>${esc(item.tag)}</small></div></article>`).join('');
  const creditTypes = (section.creditTypes || []).map(item => `<article class="course-credit-card"><h3>${esc(item.title)}</h3><p>${esc(item.examples)}</p><small>${esc(item.note)}</small></article>`).join('');
  const electiveCard = (item, kind) => `<article class="course-elective-card ${kind}"><div><h4>${esc(item.title)}</h4><span>${esc(item.tag)}</span></div><p>${esc(item.text)}</p></article>`;
  const red = (section.electives?.red || []).map(item => electiveCard(item, 'course-red')).join('');
  const black = (section.electives?.black || []).map(item => electiveCard(item, 'course-black')).join('');
  const tips = (section.tips || []).map((item, index) => `<article class="course-tip-card"><b>${String(index + 1).padStart(2, '0')}</b><div><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p></div></article>`).join('');
  const pitfalls = (section.pitfalls || []).map(item => `<article class="course-pitfall-card"><h3>${esc(item.title)}</h3><p>${esc(item.text)}</p></article>`).join('');
  const faq = (section.courseFaq || []).map(item => `<details class="course-faq-item"><summary>${esc(item.q)}<span aria-hidden="true">＋</span></summary><p>${esc(item.a)}</p></details>`).join('');
  const systemItem = (section.items || []).find(item => item.url);
  $('#page-course').innerHTML = `<section class="section course-page">${sectionHead(section.title, section.subtitle)}${sourceMeta(section.source || state.data.site.source, section.reviewed, '经验整理')} ${notice('选课轮次、课程性质、学分要求和退改课时间每学期可能调整；本页用于建立选课思路，最终以南华大学教务系统、教务处和学院通知为准。', true)}<div class="course-intro-actions">${systemItem ? actionLink(systemItem.url, systemItem.linkLabel || '打开教务系统') : ''}</div><div class="course-block"><div class="course-block-head"><h3>选课轮次</h3><p>按“预选—确认—补退改—最终复核”理解当学期流程</p></div><div class="course-round-grid">${rounds}</div></div><div class="course-block"><div class="course-block-head"><h3>课程类型与学分构成</h3><p>不同专业比例不同，具体学分以本专业培养方案为准</p></div><div class="course-credit-grid">${creditTypes}</div></div><div class="course-block"><div class="course-block-head"><h3>公选课怎么选</h3><p>看课程收益、考核和时间地点，不用迷信“水课”</p></div><div class="course-elective-columns"><section><h4 class="course-list-heading red-heading">红榜 · 优先了解</h4><div class="course-elective-grid">${red}</div></section><section><h4 class="course-list-heading black-heading">黑榜 · 谨慎选择</h4><div class="course-elective-grid">${black}</div></section></div></div><div class="course-block"><div class="course-block-head"><h3>选课技巧</h3><p>把课程表当作一周的时间预算来排</p></div><div class="course-tip-grid">${tips}</div></div><div class="course-block"><div class="course-block-head"><h3>常见避坑</h3><p>几个容易在选课后才发现的问题</p></div><div class="course-pitfall-grid">${pitfalls}</div></div><div class="course-block"><div class="course-block-head"><h3>选课问答</h3><p>先看通用答案，具体规则仍以当学期通知为准</p></div><div class="course-faq-grid">${faq}</div></div></section>`;
}

function renderExtended(id) {
  const section = (state.data.extended?.sections || []).find(item => item.id === id);
  if (!section) return;
  if (id === 'training' && section.equipmentGroups) { renderTraining(section); return; }
  if (id === 'postgrad' && section.roadmap) { renderPostgrad(section); return; }
  if (id === 'job' && section.resumeChecklist) { renderJob(section); return; }
  if (id === 'errands' && section.computerPurchase) { renderErrands(section); return; }
  const items = section.items || [];
  const mapBlock = id === 'map' ? `<section class="section">${sectionHead('两校区地图', '用户提供的视觉资源，路线和建筑以现场及官方更新为准')}<div class="map-grid"><figure class="photo-card map-card"><img src="assets/images/campus-map-hongxiang.jpg" alt="南华大学红湘校区平面图"><figcaption class="photo-caption"><strong>红湘校区平面图</strong><small>用于入校前熟悉区域；具体开放道路和报到点以当年通知为准</small></figcaption></figure><figure class="photo-card map-card"><img src="assets/images/campus-map-yumu.jpg" alt="南华大学雨母校区手绘地图"><figcaption class="photo-caption"><strong>雨母校区手绘地图</strong><small>用于入校前了解校区布局；现场指引可能随建设和管理调整</small></figcaption></figure></div></section>` : '';
  const itemMarkup = items.map(item => {
    const points = Array.isArray(item.bullets) ? `<ul class="extended-points">${item.bullets.map(point => `<li>${esc(point)}</li>`).join('')}</ul>` : '';
    const questions = Array.isArray(item.questions) ? `<div class="training-questions">${item.questions.map(question => `<div class="training-question"><strong>${esc(question.q)}</strong><p>${esc(question.a)}</p></div>`).join('')}</div>` : '';
    return `<article class="card info-card ${id === 'training' ? 'training-card' : ''}">${item.sticker ? `<span class="training-sticker">${esc(item.sticker)}</span>` : ''}<h3>${esc(item.icon || '•')} ${esc(item.title)}</h3><p>${esc(item.text)}</p>${points}${questions}${item.tag ? `<div class="meta" style="margin-top:12px">${esc(item.tag)}</div>` : ''}${item.url ? `<div style="margin-top:12px">${actionLink(item.url, item.linkLabel || (item.url.startsWith('downloads/') ? '下载资料' : '查看官方入口'))}</div>` : ''}</article>`;
  }).join('');
  const trainingNote = id === 'training' ? notice('军训安排、纪律、请假材料和补训规则以南华大学当年军训通知、教官及学院通知为准；下方经验内容仅用于提前准备。', true) : '';
  $('#page-' + id).innerHTML = `${mapBlock}<section class="section">${sectionHead(section.title, section.subtitle)}${sourceMeta(section.source || state.data.site.source, section.reviewed, section.status || '资料整理')}${trainingNote}<div class="grid grid-2 ${id === 'training' ? 'training-grid' : ''}">${itemMarkup}</div></section>`;
}

function renderErrands(section) {
  const items = (section.items || []).map(item => `<article class="card info-card"><h3>${esc(item.icon || '•')} ${esc(item.title)}</h3><p>${esc(item.text)}</p>${item.tag ? `<div class="meta" style="margin-top:12px">${esc(item.tag)}</div>` : ''}</article>`).join('');
  const computer = section.computerPurchase;
  const advantages = (computer.advantages || []).map(item => `<article class="computer-advantage-card"><div class="computer-advantage-title"><span>${esc(item.icon || '•')}</span><h3>${esc(item.title)}</h3></div><p>${esc(item.text)}</p></article>`).join('');
  const images = (computer.images || []).map(item => `<figure class="computer-image-card"><button type="button" class="computer-image-button" data-image-zoom data-image-src="${esc(item.src)}" data-image-alt="${esc(item.alt)}" data-image-caption="${esc(item.caption)}" aria-label="放大查看${esc(item.caption)}"><img loading="lazy" src="${esc(item.src)}" alt="${esc(item.alt)}"><span class="image-zoom-mark" aria-hidden="true">＋</span></button><figcaption>${esc(item.caption)}<small>点击图片放大</small></figcaption></figure>`).join('');
  $('#page-errands').innerHTML = `<section class="section errands-page">${sectionHead(section.title, section.subtitle)}${sourceMeta(section.source || state.data.site.source, section.reviewed, '校园服务')} ${notice('电脑购买属于校园代办中的咨询服务，不是南华大学官方采购或指定推荐。型号、价格、授权、库存和售后条款请在下单前核验。', true)}<div class="grid grid-2">${items}</div></section><section class="section computer-purchase-page">${sectionHead(computer.title, computer.subtitle)}${sourceMeta(section.source || state.data.site.source, computer.reviewed || section.reviewed, '商家资料')}<div class="computer-intro"><p>${esc(computer.intro)}</p></div><div class="computer-advantage-grid">${advantages}</div><div class="computer-contact-card"><div><strong>需要电脑咨询？</strong><p>${esc(computer.contact)}</p></div><button type="button" class="computer-image-button computer-qr-button" data-image-zoom data-image-src="${esc(computer.wechatImage)}" data-image-alt="微信咨询二维码" data-image-caption="微信咨询二维码" aria-label="放大查看微信咨询二维码"><img src="${esc(computer.wechatImage)}" alt="微信咨询二维码"><span class="image-zoom-mark" aria-hidden="true">＋</span></button><a class="action-button" href="${esc(computer.wechatImage)}" target="_blank" rel="noreferrer">查看微信二维码</a></div><div class="computer-gallery">${images}</div><p class="computer-note">${esc(computer.note)}</p></section><section class="section">${sectionHead('校园代办资料来源', '图片用于展示商家提供的宣传、授权与售后材料')}${sourceMeta(section.source || state.data.site.source, section.reviewed, '资料来源')}</section>`;
  bindImageZoom($('#page-errands'));
}

const renderers = { home: renderHome, about: renderAbout, majors: renderMajors, campus: renderCampus, dorm: renderDorm, checklist: renderChecklist, policies: renderPolicies, medical: renderMedical, faq: renderFaq };
['map', 'errands', 'training', 'transfer', 'resources', 'downloads', 'skills', 'fees', 'antiScam', 'course', 'cert', 'channels', 'postgrad', 'job', 'feed', 'archive'].forEach(id => { renderers[id] = () => renderExtended(id); });
renderers.compete = renderCompete;
renderers.resources = () => renderResources((state.data.extended?.sections || []).find(item => item.id === 'resources'));
renderers.course = () => renderCourse((state.data.extended?.sections || []).find(item => item.id === 'course'));
renderers.classCampaign = () => renderClassCampaign((state.data.extended?.sections || []).find(item => item.id === 'classCampaign'));
function navigate(route, syncHash = true) { state.route = pageMeta(route).id; if (syncHash && window.location.hash !== `#${state.route}`) window.history.pushState(null, '', `#${state.route}`); document.querySelectorAll('.page').forEach(page => page.classList.toggle('active', page.id === `page-${state.route}`)); $('#contact').classList.toggle('is-hidden', state.route !== 'home'); $('#thanks').classList.toggle('is-hidden', state.route !== 'home'); renderNav(); renderers[state.route](); if (state.route === 'home') window.__xiangnanScrollExpandRefresh?.(); $('#pageTitle').textContent = pageMeta(state.route).name; $('#pageSubtitle').textContent = pageMeta(state.route).sub; $('#topbar').classList.remove('nav-open'); window.scrollTo({ top: 0, behavior: 'smooth' }); }
function bindRouteButtons(root = document) { root.querySelectorAll('[data-route]').forEach(element => element.addEventListener('click', () => navigate(element.dataset.route))); }
function openModal() { $('#modal').classList.add('open'); $('#overlay').classList.add('open'); document.body.style.overflow = 'hidden'; bindModalButtons(); }
function closeModal() { $('#modal').classList.remove('open'); $('#overlay').classList.remove('open'); document.body.style.overflow = ''; }
function bindModalButtons() { document.querySelectorAll('[data-close-modal]').forEach(button => button.addEventListener('click', closeModal)); }
function openImageModal(src, alt, caption) {
  $('#modalCard').innerHTML = `<div class="modal-head"><button class="modal-close" data-close-modal>×</button><h2 id="modalTitle">图片预览</h2><p>${esc(caption)}</p></div><div class="modal-body image-modal-body"><img src="${esc(src)}" alt="${esc(alt)}"><p>${esc(caption)}</p></div>`;
  openModal();
}
function bindImageZoom(root = document) {
  root.querySelectorAll('[data-image-zoom]').forEach(button => button.addEventListener('click', () => openImageModal(button.dataset.imageSrc, button.dataset.imageAlt, button.dataset.imageCaption)));
}

function search(query) { const terms = query.toLowerCase().split(/\s+/).filter(Boolean); if (!terms.length) return []; const synonyms = { 宿舍: '寝室 床位 住宿', 报到: '入学 迎新', 资助: '助学金 贷款 费用', 专业: '学院 课程 方向', 电脑: '笔记本 台式机 售后', 竞赛: '比赛 报名 学科' }; const expanded = `${query} ${terms.map(term => synonyms[term] || '').join(' ')}`.toLowerCase(); return state.searchIndex.filter(item => state.searchFilter === '全部' || searchCategory(item.route) === state.searchFilter).map(item => ({ item, score: expanded.split(/\s+/).filter(term => term && item.text.toLowerCase().includes(term)).length })).filter(result => result.score).sort((a, b) => b.score - a.score).slice(0, 6).map(result => result.item); }
function renderSearchResults(query) { const box = $('#searchResults'); if (!query) { box.classList.remove('open'); return; } const results = search(query); const filters = ['全部', '入学', '校园', '学习', '升学就业', '其他'].map(filter => `<button type="button" class="search-filter ${state.searchFilter === filter ? 'active' : ''}" data-search-filter="${filter}">${filter}</button>`).join(''); box.innerHTML = `<div class="search-filter-row" aria-label="搜索分类筛选">${filters}</div>${results.length ? results.map((item, index) => `<button class="search-result" data-search-index="${index}"><strong>${esc(item.title)}<span>${esc(searchCategory(item.route))}</span></strong><small>${esc(item.text.slice(0, 62))}…</small></button>`).join('') : '<div class="search-result"><small>暂未找到匹配内容，试试“宿舍”“报到”“资助”或切换分类。</small></div>'}`; box.classList.add('open'); box.querySelectorAll('[data-search-filter]').forEach(button => button.addEventListener('click', () => { state.searchFilter = button.dataset.searchFilter; renderSearchResults(query); })); box.querySelectorAll('[data-search-index]').forEach(button => button.addEventListener('click', () => { const item = results[Number(button.dataset.searchIndex)]; $('#globalSearch').value = ''; box.classList.remove('open'); navigate(item.route); if (item.route === 'majors') { const major = state.data.majors.find(entry => entry.name === item.title); if (major) openMajor(major.name); } })); }

function assistantMessage(text, user = false) { const body = $('#assistantBody'); const message = document.createElement('div'); message.className = `chat-message${user ? ' user' : ''}`; message.textContent = text; body.appendChild(message); body.scrollTop = body.scrollHeight; }
function answerQuestion(query) { const results = search(query); if (!results.length) return '我还没在本站知识库里找到对应内容。建议查看学校官网，或换个关键词，例如“宿舍”“报到”“专业”“资助”。'; return `${results[0].title}：${results[0].text.slice(0, 150)}${results[0].text.length > 150 ? '…' : ''} 重要事项请以南华大学最新通知为准。`; }

async function init() {
  try { await loadData(); renderNav(); renderHome(); renderAbout(); renderMajors(); renderCampus(); renderDorm(); renderChecklist(); renderPolicies(); renderMedical(); renderFaq(); bindScrollExpand(); const initialRoute = location.hash.slice(1); navigate(pages.some(page => page.id === initialRoute) ? initialRoute : 'home', false); } catch (error) { $('#content').innerHTML = `<div class="card info-card"><h2>页面暂时无法加载</h2><p>请通过本地静态服务器或 GitHub Pages 打开，直接双击 HTML 可能会阻止读取 JSON 数据。</p><p class="meta">${esc(error.message)}</p></div>`; }
  const syncHashRoute = () => { const route = location.hash.slice(1); if (pages.some(page => page.id === route) && route !== state.route) navigate(route, false); };
  window.addEventListener('hashchange', syncHashRoute);
  window.addEventListener('popstate', syncHashRoute);
  $('#globalSearch').addEventListener('input', event => renderSearchResults(event.target.value.trim()));
  $('#globalSearch').addEventListener('keydown', event => { if (event.key === 'Escape') { event.target.value = ''; $('#searchResults').classList.remove('open'); } });
  document.addEventListener('click', event => { if (!event.target.closest('.search-box')) $('#searchResults').classList.remove('open'); });
  $('#menuButton').addEventListener('click', () => $('#topbar').classList.toggle('nav-open'));
  $('#overlay').addEventListener('click', closeModal); $('#modal').addEventListener('click', event => { if (event.target.id === 'modal') closeModal(); }); document.addEventListener('keydown', event => { if (event.key === 'Escape') closeModal(); });
  $('#assistantButton').addEventListener('click', () => { $('#assistant').classList.toggle('open'); if ($('#assistantBody').children.length === 0) assistantMessage('你好，我是小凯。可以问我南华大学的宿舍、报到、专业和资助信息。'); });
  $('#assistantClose').addEventListener('click', () => $('#assistant').classList.remove('open'));
  $('#assistantForm').addEventListener('submit', event => { event.preventDefault(); const input = $('#assistantInput'); const query = input.value.trim(); if (!query) return; assistantMessage(query, true); assistantMessage(answerQuestion(query)); input.value = ''; });
  window.addEventListener('keydown', event => { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); $('#globalSearch').focus(); } });
}
document.addEventListener('DOMContentLoaded', init);
