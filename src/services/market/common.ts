// 东方财富API封装

const API_KEY = 'mkt_O0QdJ9OZ6q7hd8arHSNNMj6hZOCJ0PQ_QacRAKJdasA';
const BASE_URL = 'https://mkapi2.dfcfs.com/finskillshub/api/claw/query';

export interface ApiResult<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export async function query<T>(toolQuery: string): Promise<ApiResult<T>> {
  try {
    const response = await fetch(BASE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
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
