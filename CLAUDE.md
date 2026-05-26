# Assets Tracker - 开发任务

你是一个 React Native 开发专家，使用 Expo 构建移动应用。

## 任务概述

构建一个完整的 Assets Tracker（资产追踪器）安卓应用，功能如下：

### 核心功能
1. **资产类型**
   - 流动资金（现金、银行、支付宝等）
   - 固定资产（房产、车辆等）
   - 理财产品（黄金、余额宝、基金、A股、港股）

2. **导入方式**
   - 手动输入
   - 截图解析（预留 OCR 接口）

3. **实时数据**
   - 黄金价格（东方财富 API）
   - A股/港股行情
   - 基金净值
   - 日元汇率

### 技术要求

- 使用 React Native + Expo
- Android APK 构建
- 数据存储使用 AsyncStorage
- 东方财富 API 获取市场数据（API Key: mkt_O0QdJ9OZ6q7hd8arHSNNMj6hZOCJ0PQ_QacRAKJdasA）
- 汇率使用 JPY/CNY

### 已有代码

项目中已有 TypeScript 类型定义和服务层代码，位于 src/ 目录。

### 开发步骤

1. **初始化 Expo 项目**
   ```bash
   cd /home/zyt/assets-tracker
   npx create-expo-app@latest AssetsTrackerApp --template blank-tabs
   ```

2. **核心页面**
   - HomeScreen: 总览所有资产和当日盈亏
   - AssetsScreen: 流动资金和固定资产管理
   - InvestmentsScreen: 理财持仓和实时行情
   - AddAssetScreen: 添加资产（手动输入）
   - SettingsScreen: 汇率设置等

3. **使用已有服务**
   - 东方财富 API 封装（src/services/market/）
   - 存储服务（src/services/storage.ts）
   - 类型定义（src/types/）

4. **数据获取**
   - 黄金: getGoldPrice()
   - A股: getCNStockQuote(stockCode)
   - 港股: getHKStockQuote(stockCode)
   - 基金: getFundInfo(fundCode)
   - 日元汇率: getJPYRate()

### UI 设计

- 使用深色主题（符合用户偏好）
- 卡片式布局展示资产
- 颜色编码：涨=绿，跌=红
- 简洁的底部导航

### 构建 APK

使用 EAS Build 或 expo run:android --variant release

## 重要提示

1. 完成后输出构建好的 APK 路径
2. 确保所有 TypeScript 编译通过
3. 数据持久化到 AsyncStorage
4. 行情数据每30秒自动刷新
5. 代码要有中文注释

开始开发！
