// 东方财富 API 封装 — 统一查询与解析
// 实际 API 返回 nameMap 映射字段名（如 "325898" -> "收盘价"），rawTable 用这些 key 存值

const API_KEY = 'mkt_O0QdJ9OZ6q7hd8arHSNNMj6hZOCJ0PQ_QacRAKJdasA';
const BASE_URL = 'https://mkapi2.dfcfs.com/finskillshub/api/claw/query';

export interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

/** 底层 API 查询 */
export async function query<T>(toolQuery: string): Promise<ApiResult<T>> {
  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'apikey': API_KEY,
      },
      body: JSON.stringify({ toolQuery }),
    });

    const json = await response.json();

    if (json.code === 0 && json.data) {
      return { success: true, data: json.data as T };
    } else {
      return { success: false, error: json.message || 'Unknown error' };
    }
  } catch (err) {
    return { success: false, error: String(err) };
  }
}

// ── 通用解析工具 ──

/** 从 API 返回的 table 列表中，按 nameMap 查找指定字段的第一个值 */
export function extractField(dataTable: any, fieldLabel: string): string | null {
  const nameMap = dataTable?.nameMap || {};
  const rawTable = dataTable?.rawTable || {};

  for (const [key, label] of Object.entries(nameMap)) {
    if (label === fieldLabel && rawTable[key]) {
      const vals = rawTable[key];
      return Array.isArray(vals) ? vals[0] : String(vals);
    }
  }
  return null;
}

/** 获取 dataTable 中某个字段的值数组（带日期） */
export function extractFieldWithDates(dataTable: any, fieldLabel: string): { values: string[]; dates: string[] } {
  const nameMap = dataTable?.nameMap || {};
  const rawTable = dataTable?.rawTable || {};

  let values: string[] = [];
  let dates: string[] = [];

  for (const [key, label] of Object.entries(nameMap)) {
    if (label === fieldLabel && rawTable[key]) {
      values = rawTable[key];
    }
  }
  // headName 通常包含日期
  if (rawTable.headName) {
    dates = rawTable.headName;
  }

  return { values, dates };
}

/** 获取所有 table 列表 */
export function getDataTables(apiResponse: any): any[] {
  return apiResponse?.data?.searchDataResultDTO?.dataTableDTOList || [];
}
