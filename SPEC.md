# Assets Tracker - 资产追踪器

## 项目概述

个人资产追踪应用，支持多种资产类型和实时市场数据获取。

## 功能特性

### 资产类型
- **流动资金** - 现金、银行存款等
- **固定资产** - 房产、车辆等
- **理财产品** - 黄金、基金、A股、港股

### 市场数据（东方财富 API）
- 黄金现货价格实时查询
- A股股票行情查询
- 港股股票行情查询  
- 日元汇率计算

### 数据管理
- 本地持久化存储（LocalStorage）
- 支持手动输入添加资产
- 支持截图解析导入（预留 OCR 接口）

## 技术架构

### 前端
- **Web**: HTML5 + CSS3 + Vanilla JS（单文件应用）
- **构建工具**: Vite
- **移动框架**: Capacitor 6.1.0

### 后端/数据服务
- **市场数据**: 东方财富 API (mkapi2.dfcfs.com)
- **数据存储**: 客户端 LocalStorage + JSON 文件

### Android 构建
- Gradle 8.14.3
- Capacitor Android 6.1.0
- 目标 SDK: 34
- 最低支持: Android 7.0 (API 24)

## 构建命令

```bash
# 安装依赖
npm install

# 开发预览
npm run dev

# 构建 Web 资源
npm run build

# 添加 Android 平台
npx cap add android

# 同步到 Android
npx cap sync android

# 构建 APK
cd android && ./gradlew assembleDebug
```

## 构建产物

- APK: `android/app/build/outputs/apk/debug/app-debug.apk`
- Web 资源: `dist/`

## 已知限制

- 需要 Android SDK (build-tools 34.0.0, platform-tools 37.0.0, platforms;android-34)
- 构建需要 Java 17+ ( Capacitor 6.x 支持 Java 17)
