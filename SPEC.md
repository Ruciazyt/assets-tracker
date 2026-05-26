# Assets Tracker - 资产追踪器

## 概述

一个模块化的个人资产管理工具，支持多种资产类型、多种导入方式和实时收益计算。

---

## 功能模块

### 1. 核心资产类型

| 类型 | 子类 | 数据字段 |
|------|------|----------|
| 流动资金 (Cash) | 现金、银行账户、支付宝等 | 金额、货币、更新时间 |
| 固定资产 (Fixed) | 房产、车辆、设备等 | 名称、价值、购置日期、折旧方式 |
| 理财 (Investment) | 黄金、余额宝、基金、A股、港股 | 根据类型不同 |

### 2. 理财类产品详细规格

#### 2.1 黄金 (Gold)
- 字段：买入价、数量、品牌/类型、买入日期
- 实时价格来源：东方财富/现货金价

#### 2.2 余额宝 (YuEBao)
- 字段：份额、万份收益、7日年化
- 数据来源：模拟/估算（暂无公开API）

#### 2.3 基金 (Fund)
- 字段：基金代码、份额、买入成本
- 数据来源：东方财富基金API

#### 2.4 A股股票 (CN_Stock)
- 字段：股票代码、持股数量、买入成本
- 数据来源：东方财富行情API

#### 2.5 港股股票 (HK_Stock)
- 字段：股票代码、持股数量、买入成本、汇率
- 数据来源：东方财富港股行情+汇率转换

### 3. 导入方式

| 方式 | 说明 |
|------|------|
| 手动输入 | 直接在UI填写各项数据 |
| 截图解析 | 解析截图中的数字（预留OCR接口） |

### 4. 汇率跟踪

#### 4.1 第一版：日元 (JPY/CNY)
- 数据来源：东方财富汇率API
- 显示：实时汇率、历史走势

---

## 技术架构

```
assets-tracker/
├── src/
│   ├── types/           # 类型定义
│   │   ├── asset.ts     # 资产基础类型
│   │   ├── cash.ts      # 流动资金
│   │   ├── fixed.ts     # 固定资产
│   │   └── investment.ts # 理财
│   ├── services/        # 数据服务
│   │   ├── storage.ts   # 本地存储
│   │   ├── market/      # 市场数据
│   │   │   ├── gold.ts
│   │   │   ├── fund.ts
│   │   │   ├── cn-stock.ts
│   │   │   ├── hk-stock.ts
│   │   │   └── fx.ts    # 汇率
│   │   └── parser/      # 截图解析
│   │       └── ocr.ts
│   ├── utils/           # 工具函数
│   │   └── format.ts
│   └── index.ts         # 入口
├── data/                # 数据存储目录
├── package.json
└── tsconfig.json
```

---

## 数据模型

### Asset (基础资产)
```typescript
interface Asset {
  id: string;
  type: 'cash' | 'fixed' | 'investment';
  subtype: string;
  name: string;
  amount: number;       // 当前价值
  currency: string;     // 币种
  createdAt: Date;
  updatedAt: Date;
}
```

### Investment (理财资产)
```typescript
interface Investment extends Asset {
  cost: number;         // 买入成本
  costBasis: 'FIFO' | 'AVG'; // 成本计算方式
  dailyPnl: number;     // 当日盈亏
  totalPnl: number;     // 累计盈亏
  lastPrice: number;    // 最新价格
}
```

---

## API 数据源

| 品类 | API | 说明 |
|------|-----|------|
| 黄金 | 东方财富现货价格 | 每15秒更新 |
| 基金 | dfcfs finskills | 净值估算 |
| A股 | dfcfs finskills | 实时行情 |
| 港股 | dfcfs finskills | 实时行情 |
| 汇率 | dfcfs finskills | USD/CNY 汇率 |

---

## 开发计划

### Phase 1: 基础架构
- [x] 项目初始化
- [ ] 类型定义
- [ ] 存储服务
- [ ] 东方财富数据服务封装

### Phase 2: 核心功能
- [ ] 流动资金管理
- [ ] 理财数据接入（黄金、基金、A股、港股）
- [ ] 日元汇率跟踪

### Phase 3: 导入功能
- [ ] 手动输入界面
- [ ] 截图解析（预留）

---

## 验收标准

1. ✅ TypeScript 编译无错误
2. ✅ 数据持久化到本地 JSON 文件
3. ✅ 东方财富 API 正确获取行情数据
4. ✅ 日元汇率实时显示
5. ✅ 理财产品的当日盈亏计算
