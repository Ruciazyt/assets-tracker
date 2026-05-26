// OCR截图解析 - 预留接口

export interface ParsedReceipt {
  type: 'bank' | 'stock' | 'fund' | 'other';
  amount?: number;
  currency?: string;
  date?: string;
  raw: string;
}

// 预留：后续可接入阿里云OCR、腾讯OCR等
export async function parseScreenshot(imagePath: string): Promise<ParsedReceipt | null> {
  // TODO: 实现截图解析
  console.log('OCR parsing not implemented yet:', imagePath);
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
