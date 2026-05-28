// OCR截图解析 - 基于图片文字识别提取资产信息
// 目前为预留接口，接入真实OCR服务后可扩展

import { query } from '../market/common';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface ParsedReceipt {
  name?: string;
  type: 'bank' | 'stock' | 'fund' | 'gold' | 'other';
  amount?: number;
  currency?: string;
  date?: string;
  raw: string;
}

/**
 * 调用 mmx vision describe 解析截图中的资产信息
 * @param imagePath 截图URI（RN中的本地文件路径，格式为 file://...）
 */
export async function parseScreenshot(imagePath: string): Promise<ParsedReceipt | null> {
  console.log('[OCR] parseScreenshot called, image:', imagePath);

  try {
    // RN ImagePicker 返回 file://... 路径，转为普通路径给 mmx CLI
    let imageFilePath = imagePath;
    if (imageFilePath.startsWith('file://')) {
      imageFilePath = imageFilePath.replace('file://', '');
    }

    // 确保文件存在
    if (!fs.existsSync(imageFilePath)) {
      console.warn('[OCR] Image file not found:', imageFilePath);
      return null;
    }

    // 复制到 /tmp 避免路径空格/特殊字符问题
    const ext = path.extname(imageFilePath) || '.jpg';
    const tmpPath = path.join(os.tmpdir(), `ocr_${Date.now()}${ext}`);
    fs.copyFileSync(imageFilePath, tmpPath);

    const prompt =
      '请分析这张截图，提取其中的资产信息：产品名称、金额、类型（黄金/基金/股票/现金等）、货币种类。如果有多个产品，请分别列出。用JSON格式返回，字段：name, amount, currency, type, note。';

    const rawOutput = execSync(
      `mmx vision describe --image "${tmpPath}" --prompt "${prompt}" --output json --quiet`,
      { timeout: 60_000 }
    ).toString().trim();

    // 清理：去掉 markdown code fence 如果有
    const jsonStr = rawOutput
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```$/i, '')
      .trim();

    if (!jsonStr) {
      console.warn('[OCR] mmx returned empty output');
      return null;
    }

    const parsed = JSON.parse(jsonStr);

    // mmx 可能返回单个对象或数组，取第一个
    const item = Array.isArray(parsed) ? parsed[0] : parsed;

    if (!item || !item.name) {
      console.warn('[OCR] mmx result has no name field:', jsonStr.slice(0, 200));
      return null;
    }

    // 金额标准化
    let amount: number | undefined;
    if (item.amount != null) {
      const rawAmt = typeof item.amount === 'string'
        ? parseFloat(item.amount.replace(/[^\d.]/g, ''))
        : item.amount;
      amount = isNaN(rawAmt) ? undefined : rawAmt;
    }

    // 类型映射
    const typeMap: Record<string, ParsedReceipt['type']> = {
      黄金: 'gold', 纸黄金: 'gold', Au: 'gold',
      基金: 'fund', 指数基金: 'fund',
      股票: 'stock', A股: 'stock', 港股: 'stock', 美股: 'stock',
      现金: 'other', 存款: 'bank', 银行: 'bank',
    };
    const detectedType = item.type
      ? (typeMap[item.type] ?? (item.type.includes('黄金') ? 'gold' : item.type.includes('基金') ? 'fund' : item.type.includes('股票') ? 'stock' : 'other'))
      : 'other';

    return {
      name: item.name,
      type: detectedType,
      amount,
      currency: item.currency || 'CNY',
      date: new Date().toISOString().split('T')[0],
      raw: jsonStr.slice(0, 300),
    };
  } catch (e: any) {
    console.error('[OCR] parseScreenshot error:', e.message ?? e);
    return null;
  }
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