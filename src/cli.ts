// CLI 工具入口

import { loadData, getPortfolioSummary, getAllInvestments } from './services/storage.js';
import { getCNStockQuote } from './services/market/cn-stock.js';
import { getJPYRate } from './services/market/fx.js';
import { formatCurrency, formatPercent } from './utils/format.js';

async function main() {
  console.log('\n=== Assets Tracker ===\n');
  
  // 显示持仓汇总
  const summary = getPortfolioSummary();
  console.log('📊 资产汇总:');
  console.log(`   流动资金: ${formatCurrency(summary.totalAssets)}`);
  console.log(`   理财产品: ${formatCurrency(summary.totalInvestments)}`);
  console.log(`   总计:     ${formatCurrency(summary.totalValue)}`);
  console.log(`   今日盈亏: ${formatCurrency(summary.dailyPnl)}`);
  console.log(`   累计盈亏: ${formatCurrency(summary.totalPnl)}`);
  
  // 显示日元汇率
  console.log('\n💱 日元汇率:');
  const jpyRate = await getJPYRate();
  if (jpyRate) {
    console.log(`   1 JPY = ${jpyRate.rate} CNY`);
  } else {
    console.log('   暂无法获取');
  }
  
  // 显示理财持仓
  const investments = getAllInvestments();
  if (investments.length > 0) {
    console.log('\n📈 理财持仓:');
    for (const inv of investments) {
      console.log(`   ${inv.name}: ${formatCurrency(inv.amount)} (${formatPercent(inv.dailyReturn)})`);
    }
  } else {
    console.log('\n📈 暂无理财持仓');
  }
  
  console.log('\n');
}

main().catch(console.error);
