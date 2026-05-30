// OCR截图解析 - 基于图片文字识别提取资产信息
// 目前为预留接口，接入真实OCR服务后可扩展

import { query } from '../market/common';

export interface ParsedReceipt {
  name?: string;
  type: 'bank' | 'stock' | 'fund' | 'gold' | 'other';
  amount?: number;
  currency?: string;
  date?: string;
  raw: string;
}

/**
 * 解析截图中的资产信息（预留接口）
 * 当前为占位实现，接入真实OCR服务后可替换
 * @param imagePath 截图URI
 */
export async function parseScreenshot(_imagePath: string): Promise<ParsedReceipt | null> {
  console.log('[OCR] parseScreenshot called, image:', _imagePath);
  // TODO: 接入真实OCR服务（如 Google ML Kit、Tesseract 等）
  console.warn('[OCR] OCR功能尚未实现，请手动输入资产信息');
  return null;
}

/**
 * 根据文字搜索识别资产类型和金额
 * 用于从用户输入的备注中提取信息
 */
export async function parseTextSearch(text: string): Promise<ParsedReceipt | null> {
  if (!text?.trim()) return null;

  // 调用东方财富搜索API，通过文字推断标的
  const result = await query(text);
  if (!result.success || !result.data) return null;

  try {
    const data = result.data as any;
    const tableList = data?.searchDataResultDTO?.dataTableDTOList || [];
    for (const table of tableList) {
      const rawTable = table.rawTable || {};
      const f2 = rawTable.f2?.[0]; // 价格/净值
      const f3 = rawTable.f3?.[0]; // 涨跌幅
      const name = table.entityName || '';

      if (f2) {
        const amount = parseFloat(f2);
        // 通过名称判断类型
        let type: ParsedReceipt['type'] = 'other';
        if (name.includes('黄金') || name.includes('AU')) type = 'gold';
        else if (name.includes('基金')) type = 'fund';
        else if (name.includes('港')) type = 'stock';
        else type = 'stock';

        return {
          type,
          amount,
          currency: 'CNY',
          date: new Date().toISOString().split('T')[0],
          raw: `${name} - ¥${amount} (${f3 || 0}%)`,
        };
      }
    }
  } catch (e) {
    console.error('[OCR] parseTextSearch error:', e);
  }
  return null;
}

// 从文本中提取金额
export function extractAmount(text: string): number | null {
  const patterns = [
    /[¥¥$]\s*([\d,]+\.?\d*)/,  // ¥123.45
    /([\d,]+\.?\d*)\s*(元|万|亿)/, // 12345元
    /(\d+\.?\d*)\s*%/           // 百分比
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      return parseFloat(match[1].replace(/,/g, ''));
    }
  }

  return null;
}
