/**
 * BOSS直聘插件工具函数
 */
import type { IPage } from '@jackwener/opencli/registry';

// ── Constants ───────────────────────────────────────────────────────────────

const BOSS_DOMAIN = 'www.zhipin.com';
const COOKIE_EXPIRED_CODES = new Set([7, 37]);
const COOKIE_EXPIRED_MSG = 'Cookie 已过期！请在当前 Chrome 浏览器中重新登录 BOSS 直聘。';
const DEFAULT_TIMEOUT = 15_000;

// ── Types ───────────────────────────────────────────────────────────────────

export interface BossApiResponse {
  code: number;
  message?: string;
  zpData?: any;
  [key: string]: any;
}

export interface FetchOptions {
  method?: 'GET' | 'POST';
  body?: string;
  timeout?: number;
  allowNonZero?: boolean;
}

// ── Core helpers ────────────────────────────────────────────────────────────

/**
 * Assert that page is available (non-null).
 */
export function requirePage(page: IPage | null): asserts page is IPage {
  if (!page) throw new Error('Browser page required');
}

/**
 * Navigate to a custom BOSS page.
 */
export async function navigateTo(page: IPage, url: string, waitSeconds = 1): Promise<void> {
  await page.goto(url);
  await page.wait({ time: waitSeconds });
}

/**
 * Check if an API response indicates cookie expiry and throw a clear error.
 */
export function checkAuth(data: BossApiResponse): void {
  if (COOKIE_EXPIRED_CODES.has(data.code)) {
    throw new Error(COOKIE_EXPIRED_MSG);
  }
}

/**
 * Throw if the API response is not code 0.
 */
export function assertOk(data: BossApiResponse, errorPrefix?: string): void {
  if (data.code === 0) return;
  checkAuth(data);
  const prefix = errorPrefix ? `${errorPrefix}: ` : '';
  throw new Error(`${prefix}${data.message || 'Unknown error'} (code=${data.code})`);
}

/**
 * Make a credentialed XHR request via page.evaluate().
 */
export async function bossFetch(
  page: IPage,
  url: string,
  opts: FetchOptions = {},
): Promise<BossApiResponse> {
  const method = opts.method ?? 'GET';
  const timeout = opts.timeout ?? DEFAULT_TIMEOUT;
  const body = opts.body ?? null;

  const script = `
    async () => {
      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open(${JSON.stringify(method)}, ${JSON.stringify(url)}, true);
        xhr.withCredentials = true;
        xhr.timeout = ${timeout};
        xhr.setRequestHeader('Accept', 'application/json');
        ${method === 'POST' ? `xhr.setRequestHeader('Content-Type', 'application/x-www-form-urlencoded');` : ''}
        xhr.onload = () => {
          try { resolve(JSON.parse(xhr.responseText)); }
          catch(e) { reject(new Error('JSON parse failed: ' + xhr.responseText.substring(0, 200))); }
        };
        xhr.onerror = () => reject(new Error('Network Error'));
        xhr.ontimeout = () => reject(new Error('Timeout'));
        xhr.send(${body ? JSON.stringify(body) : 'null'});
      });
    }
  `;

  const data = await page.evaluate(script) as BossApiResponse;

  if (!opts.allowNonZero && data.code !== 0) {
    assertOk(data);
  }

  return data;
}

/**
 * Verbose log helper
 */
export function verbose(msg: string): void {
  if (process.env.OPENCLI_VERBOSE || process.env.DEBUG?.includes('opencli')) {
    console.error(`[opencli:boss-geek] ${msg}`);
  }
}
