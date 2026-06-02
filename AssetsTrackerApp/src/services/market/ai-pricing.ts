// AI 行情服务 — 通过 Claude/OpenAI 获取最新市场价格
// 用户配置自己的 API Key，AI 批量查询所有标的价格
// 无配置时自动 fallback 到东方财富直接 API

import AsyncStorage from '@react-native-async-storage/async-storage';

const AI_CONFIG_KEY = '@assets_tracker/ai_config';

// ── 类型 ──

export interface AIPricingConfig {
  provider: 'claude' | 'openai';
  apiKey: string;
  model?: string;
  baseUrl?: string;   // 自定义接口地址
}

export interface PriceRequest {
  symbol: string;       // 股票代码 / 基金代码 / 'AU99.99'
  type: 'gold' | 'cn-stock' | 'hk-stock' | 'fund';
  name?: string;        // 可选，帮助 AI 识别
}

export interface AIPriceResult {
  symbol: string;
  price: number;
  change?: number;
  changePercent?: number;
  currency?: string;
}

// ── 配置读写 ──

export async function getAIConfig(): Promise<AIPricingConfig | null> {
  try {
    const raw = await AsyncStorage.getItem(AI_CONFIG_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed.apiKey) return parsed as AIPricingConfig;
    }
  } catch {}
  return null;
}

export async function saveAIConfig(config: AIPricingConfig): Promise<void> {
  await AsyncStorage.setItem(AI_CONFIG_KEY, JSON.stringify(config));
}

// ── Prompt 构造 ──

function buildPrompt(items: PriceRequest[]): string {
  const lines = items.map(item => {
    const typeLabel: Record<string, string> = {
      'gold': '黄金现货(AU99.99)',
      'cn-stock': `A股(${item.symbol})`,
      'hk-stock': `港股(${item.symbol})`,
      'fund': `基金(${item.symbol})`,
    };
    return `- ${typeLabel[item.type] || item.symbol}${item.name ? ` (${item.name})` : ''}`;
  });

  return `你是一个金融数据助手。请查询以下标的的最新实时价格，返回严格 JSON 格式。

标的列表：
${lines.join('\n')}

请返回如下 JSON 格式（不要包含任何其他文字）：
[
  ${items.length > 0 ? items.map(item =>
    `{"symbol": "${item.symbol}", "price": 数字(最新价), "change": 数字(涨跌额), "changePercent": 数字(涨跌幅%), "currency": "${item.type === 'hk-stock' ? 'HKD' : 'CNY'}"}`
  ).join(',\n  ') : ''}
]

注意：
- price 必须是数字，不要带单位或逗号
- 港股价格用 HKD
- 黄金价格单位是 人民币/克
- 如果某个标的无法获取，price 设为 0
- 涨跌额(change) = 最新价 - 昨收价
- 涨跌幅(changePercent) = (涨跌额 / 昨收价) * 100`;
}

// ── AI 调用 ──

async function callClaude(prompt: string, apiKey: string, model?: string, baseUrl?: string): Promise<string> {
  const url = (baseUrl || 'https://api.anthropic.com') + '/v1/messages';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: model || 'claude-3-5-sonnet-20241022',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Claude API error ${response.status}: ${errText}`);
  }

  const json = await response.json();
  // 提取文本内容
  const textBlock = json.content?.find((b: any) => b.type === 'text');
  return textBlock?.text || '';
}

async function callOpenAI(prompt: string, apiKey: string, model?: string, baseUrl?: string): Promise<string> {
  const url = (baseUrl || 'https://api.openai.com') + '/v1/chat/completions';
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: model || 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`OpenAI API error ${response.status}: ${errText}`);
  }

  const json = await response.json();
  return json.choices?.[0]?.message?.content || '';
}

// ── 解析 AI 响应 ──

function parseAIResponse(text: string): AIPriceResult[] {
  try {
    // 尝试从响应中提取 JSON 数组
    // AI 可能在 JSON 前后添加 markdown 代码块
    let jsonStr = text.trim();

    // 移除可能的 markdown 代码块标记
    const codeBlockMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (codeBlockMatch) {
      jsonStr = codeBlockMatch[1].trim();
    }

    // 找到 JSON 数组
    const bracketStart = jsonStr.indexOf('[');
    const bracketEnd = jsonStr.lastIndexOf(']');
    if (bracketStart >= 0 && bracketEnd > bracketStart) {
      jsonStr = jsonStr.substring(bracketStart, bracketEnd + 1);
    }

    const parsed = JSON.parse(jsonStr);
    if (!Array.isArray(parsed)) return [];

    return parsed.map((item: any) => ({
      symbol: String(item.symbol || ''),
      price: Number(item.price) || 0,
      change: Number(item.change) || undefined,
      changePercent: Number(item.changePercent) || undefined,
      currency: item.currency || 'CNY',
    }));
  } catch (e) {
    console.error('[ai-pricing] Failed to parse AI response:', e);
    return [];
  }
}

// ── 主入口 ──

/**
 * 通过 AI 批量获取最新价格
 * @returns 价格数组。如果 AI 不可用或失败，返回空数组（调用方应 fallback）
 */
export async function fetchPricesFromAI(items: PriceRequest[]): Promise<AIPriceResult[]> {
  if (!items.length) return [];

  const config = await getAIConfig();
  if (!config || !config.apiKey) return [];

  try {
    const prompt = buildPrompt(items);
    const rawText = config.provider === 'claude'
      ? await callClaude(prompt, config.apiKey, config.model, config.baseUrl)
      : await callOpenAI(prompt, config.apiKey, config.model, config.baseUrl);

    const results = parseAIResponse(rawText);
    // 过滤掉价格为 0 的（可能是 AI 无法获取的标的）
    return results.filter(r => r.price > 0);
  } catch (e) {
    console.error('[ai-pricing] fetchPricesFromAI failed:', e);
    return [];
  }
}

/**
 * 测试 AI 连接是否可用
 */
export async function testAIConnection(config: AIPricingConfig): Promise<{ success: boolean; error?: string }> {
  try {
    const prompt = '请查询黄金现货 AU99.99 的最新价格，返回 JSON 数组: [{"symbol": "AU99.99", "price": 数字, "change": 数字, "changePercent": 数字}]';
    const rawText = config.provider === 'claude'
      ? await callClaude(prompt, config.apiKey, config.model, config.baseUrl)
      : await callOpenAI(prompt, config.apiKey, config.model, config.baseUrl);

    const results = parseAIResponse(rawText);
    if (results.length > 0 && results[0].price > 0) {
      return { success: true };
    }
    return { success: false, error: 'AI 返回了无效数据' };
  } catch (e: any) {
    return { success: false, error: e.message || '连接失败' };
  }
}
