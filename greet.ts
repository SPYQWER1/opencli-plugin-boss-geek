/**
 * BOSS直聘求职者工具 - 向 HR 打招呼
 */

import { cli, Strategy } from '@jackwener/opencli/registry';
import { requirePage, navigateTo, bossFetch, verbose } from './utils.js';

cli({
  site: 'boss-job',
  name: 'greet',
  description: '向 HR 发送打招呼（立即沟通）',
  domain: 'www.zhipin.com',
  strategy: Strategy.COOKIE,
  navigateBefore: false,
  browser: true,
  args: [
    { name: 'security-id', positional: true, required: true, help: '职位 Security ID' },
  ],
  columns: ['status', 'message'],
  func: async (page, kwargs) => {
    requirePage(page);

    const securityId = kwargs['security-id'];
    verbose('发送打招呼...');

    // 先导航建立 cookie 上下文
    await navigateTo(page, 'https://www.zhipin.com/web/geek/job');

    // 调用打招呼 API
    const targetUrl = `https://www.zhipin.com/wapi/zpgeek/friend/add.json?securityId=${encodeURIComponent(securityId)}`;

    const data = await bossFetch(page, targetUrl, { allowNonZero: true });

    const greetSuccess = data.code === 0;

    return [{
      status: greetSuccess ? '✅ 成功' : '❌ 失败',
      message: data.message || JSON.stringify(data.zpData) || '',
    }];
  },
});
