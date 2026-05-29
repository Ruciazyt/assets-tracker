# Assets Tracker 开发计划

## 项目目标
打造一款支持流动资金、固定资产、理财的个人资产追踪应用，支持实时市场数据更新。

---

## 功能开发计划

### Phase 1: 基础功能 ✅ (已完成)
- [x] 项目结构搭建 (Vite + Capacitor)
- [x] 基础资产类型 (流动资金/固定资产/理财)
- [x] 本地数据持久化 (LocalStorage)
- [x] 移动端 H5 应用框架
- [x] Android APK 构建

### Phase 2: 市场数据集成 ✅ (已完成)
- [x] 黄金价格实时查询 (东方财富 API)
- [x] A股行情查询
- [x] 港股行情查询
- [x] 日元汇率计算
- [x] 收益数据每日计算
- [x] 首页市场数据展示（黄金价格 + 日元汇率）

### Phase 3: 数据导入功能 ✅ (已完成)
- [x] 手动输入添加
- [x] 数据导出/备份
- [x] 截图解析导入页面 (import.tsx + expo-image-picker)
- [x] OCR识别引擎接入（MiniMax Vision API）✅ 本次完成

### Phase 4: 高级功能 🚀 (已完成)
- [x] 收益图表展示
- [x] 自动化数据更新 (定时任务)
- [x] 历史收益趋势记录 (historyService)
- [x] 多币种汇率换算（首页总资产折算）
- [x] 价格提醒/推送通知

### Phase 5: 体验优化 ✨ (已完成)
- [x] 暗色/亮色主题切换
- [x] 数据安全 (密码保护 - PIN)
- [x] 多语言支持 (CN/EN)
- [x] App 图标定制

---

## 当前优先级
1. 所有主要功能已完成 ✅
2. 可选优化：夜间模式细节打磨、收益图表交互增强

## 开发进度

| 日期 | 完成内容 |
|------|----------|
| 2026-05-26 | Phase 1 + Phase 2 基础功能 |
| 2026-05-27 (凌晨) | 手动输入添加备注字段完成；Gradle构建问题待解决 |
| 2026-05-28 (傍晚) | 收益计算功能完成（实时价格+每日/累计盈亏）； investments.tsx 集成刷新 |
| 2026-05-28 (晚) | 截图导入页面 import.tsx 完成；Tab导航新增"📷 导入"；parseTextSearch 文字搜索识别 |
| 2026-05-28 (深夜) | Phase 5 暗色/亮色主题切换完成（ThemeContext + Settings 主题开关） |
| 2026-05-29 | 自动刷新间隔设置完成（useAutoRefresh hook + settings UI）；可配置：关闭/15秒/30秒/60秒/5分钟 |
| 2026-05-29 (深夜) | 首页市场数据加载（黄金+日元汇率）；历史趋势记录 historyService（每日快照，保留365天） |
| 2026-05-30 (凌晨) | MiniMax Vision OCR 集成完成（mmx vision describe）；截图解析自动填入名称+金额 |
| 2026-05-29 (深夜) | add-investment 补充各子类完整字段（黄金克数/买入价、股票份额/买入价、基金净值等）|
| 2026-05-29 (深夜2) | 多币种汇率换算（getUSDCNYRate + getExchangeRates + useExchangeRates hook）；首页总资产按默认货币折算显示 |
| 2026-05-29 (凌晨) | PIN 密码保护（AuthContext + lock.tsx 全屏锁屏 + Settings 开关） |
| 2026-05-29 (凌晨2) | 价格提醒系统（alertService + usePriceAlerts hook + AlertBanner 顶部横幅 + Settings 管理UI） |
| 2026-05-29 (早晨) | i18n 多语言支持（CN/EN）：translations.ts + LanguageContext + t()翻译，8个页面全面接入 |
| 2026-05-29 | App 图标定制（AI生成金融主题图标：icon.png + adaptive-icon.png + 启动屏 + 各尺寸Android mipmap） |
| 2026-05-29 | useAutoRefresh bugfix：每次tick重新读取refreshInterval，设置变更立即生效无需重启 |
| 2026-05-30 (凌晨) | Phase 3 OCR 截图识别集成（MiniMax Vision API）；截图解析自动填入名称+金额 |
| 2026-05-30 (早晨) | i18n Alert 对话框修复：assets/investments/add-asset/add-investment/lock 等页面硬编码文字替换为 t() 翻译 |
| 2026-05-30 (上午) | fix: getJPYRate 实时日元汇率（查询 USD/JPY 实时行情并动态计算 JPY/CNY，替代固定 150 估算）|
| 2026-05-30 (中午) | feat: show current price + daily change % per investment item; i18n for add-asset labels |
