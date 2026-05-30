// OCR截图解析 - 基于图片文字识别提取资产信息
// 集成 MiniMax Vision API 进行真实截图 OCR

import { query } from '../market/common';

export interface ParsedReceipt {
  type: 'bank' | 'stock' | 'fund' | 'gold' | 'other';
  amount?: number;
  currency?: string;
  date?: string;
  name?: string;
  raw: string;
}

const MINIMAX_API_KEY = 'sk-cp-yMOekbdB5-trtxlICGNbvlMk9O4EpT25WKoz6w_NoTMFqZ2JFcK9Tpen76XzXUl1FZWVD16rJG9BxZ2VeelKJnvmLJ1wKXfBfVL7uC-_mKB-CX3C_i_soL4';
const VISION_API_URL = 'https://api.minimax.chat/v1/vision/descriptions';

/** 调用 MiniMax Vision API 解析截图
 *  RN/Expo 中 file:// URI 可以直接被 fetch 读取，再用 FileReader 转 base64
 */
async function callMinimaxVision(imageUri: string): Promise<{ name?: string; amount?: number; type?: string; description?: string } | null> {
  try {
    const resp = await fetch(imageUri);
    if (!resp.ok) {
      console.error('[OCR] fetch image failed:', resp.status, imageUri);
      return null;
    }
    const blob = await resp.blob();

    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = async () => {
        try {
          const b64 = (reader.result as string).split(',')[1];
          if (!b64) { resolve(null); return; }
          const result = await queryMinimaxVisionAPI(b64);
          resolve(result);
        } catch (e) {
          console.error('[OCR] FileReader processing error:', e);
          resolve(null);
        }
      };
      reader.onerror = () => {
        console.error('[OCR] FileReader error');
        resolve(null);
      };
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error('[OCR] MiniMax Vision error:', e);
  }
  return null;
}

/** 查询 MiniMax Vision API */
async function queryMinimaxVisionAPI(base64Data: string): Promise<{ name?: string; amount?: number; type?: string; description?: string } | null> {
  const prompt = `You are a financial screenshot parser. Analyze this image and extract:
1. Asset/product name (e.g. "纸黄金账户", "招商银行理财产品", "沪深300指数基金")
2. Amount/balance in CNY (if visible, e.g. 12345.67)
3. Asset type: "gold" for gold products, "fund" for funds, "bank" for bank products, "stock" for stocks, "cash" for cash/money market

Respond ONLY in this JSON format (no extra text):
{"name": "extracted name or empty string", "amount": 12345.67 or null, "type": "gold|fund|bank|stock|cash|other"}

Focus on: account names, product names, monetary amounts, balance figures.`;

  try {
    const response = await fetch(VISION_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${MINIMAX_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'image-01',
        image: base64Data,
        prompt,
      }),
    });

    if (!response.ok) {
      console.error('[OCR] Vision API HTTP error:', response.status, await response.text());
      return null;
    }

    const json = await response.json();
    // 支持多种响应格式
    const text = json?.choices?.[0]?.text ?? json?.text ?? json?.content ?? '';

    // Parse JSON from response text
    const jsonMatch = String(text).match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          name: parsed.name || undefined,
          amount: parsed.amount ? parseFloat(parsed.amount) : undefined,
          type: parsed.type || undefined,
          description: String(text).slice(0, 200),
        };
      } catch (e) {
        console.error('[OCR] JSON parse error:', e);
      }
    }
    return null;
  } catch (e) {
    console.error('[OCR] queryMinimaxVisionAPI error:', e);
  }
  return null;
}

/**
 * 解析截图中的资产信息
 * 使用 MiniMax Vision API 进行图片理解
 * @param imageUri 截图URI（RN中的本地文件路径，file:// 或 assets-library://）
 */
export async function parseScreenshot(imageUri: string): Promise<ParsedReceipt | null> {
  console.log('[OCR] parseScreenshot called, image:', imageUri);

  const result = await callMinimaxVision(imageUri);
  if (!result) return null;

  return {
    type: (result.type as ParsedReceipt['type']) || 'other',
    name: result.name,
    amount: result.amount,
    currency: 'CNY',
    date: new Date().toISOString().split('T')[0],
    raw: result.description || JSON.stringify(result),
  };
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