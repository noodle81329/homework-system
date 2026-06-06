// Apps Script 的網址
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

function getToken() {
  return localStorage.getItem('token') || '';
}

// 統一的請求函式
async function request(path: string, options: {
  method?: string;
  params?: Record<string, string>;
  body?: any;
  isUpload?: boolean;
} = {}) {
  const { method = 'GET', params = {}, body, isUpload } = options;
  const token = getToken();

  // Apps Script 用 URL 參數傳遞 path 和 token
  const urlParams = new URLSearchParams({
    path,
    token,
    method,
    ...params
  });

  const url = `${BASE_URL}?${urlParams.toString()}`;

  let fetchOptions: RequestInit = { method: 'POST' };

  if (isUpload && body instanceof FormData) {
    // 檔案上傳：轉成 base64
    const file = body.get('file') as File;
    const base64 = await fileToBase64(file);
    fetchOptions.body = JSON.stringify({
      token,
      file: base64,
      filename: file.name,
      mimeType: file.type || 'application/octet-stream'
    });
    fetchOptions.headers = { 'Content-Type': 'text/plain' };
  } else if (body && typeof body === 'object' && !(body instanceof FormData)) {
    fetchOptions.body = JSON.stringify({ ...body, token });
    fetchOptions.headers = { 'Content-Type': 'text/plain' };
  } else if (body instanceof FormData) {
    // 一般 FormData（班級設定）
    const obj: Record<string, string> = { token };
    body.forEach((v, k) => { obj[k] = v as string; });
    fetchOptions.body = JSON.stringify(obj);
    fetchOptions.headers = { 'Content-Type': 'text/plain' };
  }

  const res = await fetch(url, fetchOptions);
  const data = await res.json();

  if (data.error) {
    const err: any = new Error(data.error);
    err.response = { data: { detail: data.error }, status: 400 };
    throw err;
  }

  return { data };
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.split(',')[1]); // 去掉 data:...;base64, 前綴
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// 模擬 axios 介面
const api = {
  get: (path: string, options?: { params?: Record<string, string> }) =>
    request(path, { method: 'GET', params: options?.params }),

  post: (path: string, body?: any, config?: any) => {
    const isUpload = body instanceof FormData && body.has('file');
    return request(path, { method: 'POST', body, isUpload });
  },

  delete: (path: string) =>
    request(path, { method: 'DELETE' }),
};

export default api;
