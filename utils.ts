/**
 * BOSS直聘求职者工具 - 公共工具函数
 */

const BOSS_DOMAIN = 'www.zhipin.com';
const DEFAULT_TIMEOUT = 15_000;

/**
 * 断言 page 可用
 */
export function requirePage(page: any): void {
  if (!page) throw new Error('需要浏览器页面');
}

/**
 * 导航到 BOSS 页面并等待
 */
export async function navigateTo(page: any, url: string, waitSeconds = 1): Promise<void> {
  await page.goto(url);
  await page.wait({ time: waitSeconds });
}

/**
 * 检查 API 响应是否表示 Cookie 过期
 */
export function checkAuth(data: any): void {
  const expiredCodes = new Set([7, 37]);
  if (expiredCodes.has(data.code)) {
    throw new Error('Cookie 已过期！请在当前 Chrome 浏览器中重新登录 BOSS 直聘。');
  }
}

/**
 * 断言 API 响应成功
 */
export function assertOk(data: any, errorPrefix?: string): void {
  if (data.code === 0) return;
  checkAuth(data);
  const prefix = errorPrefix ? `${errorPrefix}: ` : '';
  throw new Error(`${prefix}${data.message || '未知错误'} (code=${data.code})`);
}

/**
 * 通过 page.evaluate 发送带 Cookie 的 XHR 请求
 */
export async function bossFetch(
  page: any,
  url: string,
  opts: { method?: string; timeout?: number; body?: string; allowNonZero?: boolean } = {}
): Promise<any> {
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
          catch(e) { reject(new Error('JSON 解析失败: ' + xhr.responseText.substring(0, 200))); }
        };
        xhr.onerror = () => reject(new Error('网络错误'));
        xhr.ontimeout = () => reject(new Error('请求超时'));
        xhr.send(${body ? JSON.stringify(body) : 'null'});
      });
    }
  `;

  const data = await page.evaluate(script);

  if (!opts.allowNonZero && data.code !== 0) {
    assertOk(data);
  }

  return data;
}

/**
 * 详细日志输出
 */
export function verbose(msg: string): void {
  if (process.env.OPENCLI_VERBOSE || process.env.DEBUG?.includes('opencli')) {
    console.error(`[boss-geek] ${msg}`);
  }
}

/**
 * 城市名称 → BOSS 城市代码映射
 */
export const CITY_CODES: Record<string, string> = {
  '全国': '100010000', '北京': '101010100', '上海': '101020100',
  '广州': '101280100', '深圳': '101280600', '杭州': '101210100',
  '成都': '101270100', '南京': '101190100', '武汉': '101200100',
  '西安': '101110100', '苏州': '101190400', '长沙': '101250100',
  '天津': '101030100', '重庆': '101040100', '郑州': '101180100',
  '东莞': '101281600', '青岛': '101120200', '合肥': '101220100',
  '佛山': '101280800', '宁波': '101210400', '厦门': '101230200',
  '大连': '101070200', '珠海': '101280700', '无锡': '101190200',
  '济南': '101120100', '福州': '101230100', '昆明': '101290100',
  '哈尔滨': '101050100', '沈阳': '101070100', '石家庄': '101090100',
  '贵阳': '101260100', '南宁': '101300100', '太原': '101100100',
  '海口': '101310100', '兰州': '101160100', '乌鲁木齐': '101130100',
  '长春': '101060100', '南昌': '101240100', '常州': '101191100',
  '温州': '101210700', '嘉兴': '101210300', '徐州': '101190800',
  '香港': '101320100',
};

/**
 * 经验映射
 */
export const EXP_MAP: Record<string, string> = {
  '不限': '0', '在校/应届': '108', '应届': '108', '1年以内': '101',
  '1-3年': '102', '3-5年': '103', '5-10年': '104', '10年以上': '105',
};

/**
 * 学历映射
 */
export const DEGREE_MAP: Record<string, string> = {
  '不限': '0', '初中及以下': '209', '中专/中技': '208', '高中': '206',
  '大专': '202', '本科': '203', '硕士': '204', '博士': '205',
};

/**
 * 薪资映射
 */
export const SALARY_MAP: Record<string, string> = {
  '不限': '0', '3K以下': '401', '3-5K': '402', '5-10K': '403',
  '10-15K': '404', '15-20K': '405', '20-30K': '406', '30-50K': '407', '50K以上': '408',
};

/**
 * 行业映射
 */
export const INDUSTRY_MAP: Record<string, string> = {
  '不限': '0', '互联网': '100020', '电子商务': '100021', '游戏': '100024',
  '人工智能': '100901', '大数据': '100902', '金融': '100101',
  '教育培训': '100200', '医疗健康': '100300',
};

/**
 * 解析城市输入
 */
export function resolveCity(input?: string): string {
  if (!input) return '101010100';
  if (/^\d+$/.test(input)) return input;
  if (CITY_CODES[input]) return CITY_CODES[input];
  for (const [name, code] of Object.entries(CITY_CODES)) {
    if (name.includes(input)) return code;
  }
  return '101010100';
}

/**
 * 通用映射解析
 */
export function resolveMap(input: string | undefined, map: Record<string, string>): string {
  if (!input) return '';
  if (map[input] !== undefined) return map[input];
  for (const [key, val] of Object.entries(map)) {
    if (key.includes(input)) return val;
  }
  return input;
}
