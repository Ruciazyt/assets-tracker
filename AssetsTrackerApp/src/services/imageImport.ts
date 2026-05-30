// AI 图片识别服务 — 通过 AI 分析截图自动填入资产信息
// 支持 Claude (vision) 和 OpenAI (vision)

import AsyncStorage from '@react-native-async-storage/async-storage';
import { AIPricingConfig, getAIConfig } from './market/ai-pricing';

export interface AssetFromImage {
  type: 'cash' | 'fixed' | 'investment';
  subtype?: string;
  name: string;
  amount: number;
  note?: string;
  // 投资字段
  cost?: number;
  purchasePrice?: number;
  quantity?: number;
  fundCode?: string;
  stockCode?: string;
  share?: number;
}

const BUILD_ASSET_PROMPT = `你是一个资产识别助手。请分析这张截图，提取其中的资产信息。

请返回严格 JSON 格式（不要包含任何其他文字）：
{
  "type": "cash" | "fixed" | "investment",
  "subtype": "bank|alipay|wechat|cash|property|vehicle|gold|fund|cn-stock|hk-stock|yuebao",
  "name": "资产名称",
  "amount": 数字(当前市值/金额),
  "note": "备注信息(可选)",
  "cost": 数字(总成本,投资类必填),
  "purchasePrice": 数字(买入单价,可选),
  "quantity": 数字(数量/克数,可选),
  "fundCode": "基金代码(基金类必填)",
  "stockCode": "股票代码(股票类必填)",
  "share": 数字(持有份额/股数,可选)
}

注意：
- 如果截图中信息不完整，尽力推断，缺失字段填 null
- amount 必须是数字
- 优先识别为 investment 类型（如果看到基金/股票/黄金相关字样）`;

export async function analyzeImage(imageBase64: string, mimeType: string = 'image/jpeg'): Promise<AssetFromImage | null> {
  const config = await getAIConfig();
  if (!config || !config.apiKey) {
    throw new Error('请先在设置中配置 AI 服务');
  }

  try {
    let rawText: string;

    if (config.provider === 'claude') {
      rawText = await callClaudeVision(config, imageBase64, mimeType);
    } else {
      rawText = await callOpenAIVision(config, imageBase64, mimeType);
    }

    return parseAssetResponse(rawText);
  } catch (e: any) {
    throw new Error(e.message || '图片识别失败');
  }
}

async function callClaudeVision(config: AIPricingConfig, imageBase64: string, mimeType: string): Promise<string> {
  const url = (config.baseUrl || 'https://api.anthropic.com') + '/v1/messages';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': config.apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: config.model || 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { type: 'image', source: { type: 'base64', media_type: mimeType, data: imageBase64 } },
          { type: 'text', text: BUILD_ASSET_PROMPT },
        ],
      }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Claude API 错误: ${err}`);
  }

  const json = await response.json();
  return json.content?.find((b: any) => b.type === 'text')?.text || '';
}

async function callOpenAIVision(config: AIPricingConfig, imageBase64: string, mimeType: string): Promise<string> {
  const url = (config.baseUrl || 'https://api.openai.com') + '/v1/chat/completions';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model || 'gpt-4o',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: [
          { type: 'image_url', image_url: { url: `data:${mimeType};base64,${imageBase64}` } },
          { type: 'text', text: BUILD_ASSET_PROMPT },
        ],
      }],
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`OpenAI API 错误: ${err}`);
  }

  const json = await response.json();
  return json.choices?.[0]?.message?.content || '';
}

function parseAssetResponse(text: string): AssetFromImage | null {
  try {
    let jsonStr = text.trim();
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) jsonStr = codeBlockMatch[1].trim();
    const start = jsonStr.indexOf('{');
    const end = jsonStr.lastIndexOf('}');
    if (start >= 0 && end > start) jsonStr = jsonStr.substring(start, end + 1);

    const parsed = JSON.parse(jsonStr);
    return {
      type: parsed.type || 'cash',
      subtype: parsed.subtype,
      name: parsed.name || '未识别资产',
      amount: Number(parsed.amount) || 0,
      note: parsed.note,
      cost: parsed.cost ? Number(parsed.cost) : undefined,
      purchasePrice: parsed.purchasePrice ? Number(parsed.purchasePrice) : undefined,
      quantity: parsed.quantity ? Number(parsed.quantity) : undefined,
      fundCode: parsed.fundCode,
      stockCode: parsed.stockCode,
      share: parsed.share ? Number(parsed.share) : undefined,
    };
  } catch (e) {
    console.error('[imageImport] parse error:', e);
    return null;
  }
}
