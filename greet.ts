/**
 * BOSS直聘求职者工具 - 向 HR 打招呼
 */

import { cli, Strategy } from '@jackwener/opencli/registry';
import { requirePage, navigateTo, bossFetch, verbose } from './utils.js';

cli({
  site: 'boss-geek',
  name: 'greet',
  description: '向 HR 发送打招呼（立即沟通）',
  domain: 'www.zhipin.com',
  strategy: Strategy.COOKIE,
  navigateBefore: false,
  browser: true,
  args: [
    { name: 'security-id', positional: true, required: true, help: '职位 Security ID' },
    { name: 'text', default: '', help: '自定义招呼语（可选）' },
  ],
  columns: ['status', 'message'],
  func: async (page, kwargs) => {
    requirePage(page);

    const securityId = kwargs['security-id'];
    const customText = kwargs.text;
    verbose('发送打招呼...');

    // 先导航建立 cookie 上下文
    await navigateTo(page, 'https://www.zhipin.com/web/geek/job');

    // 调用打招呼 API
    const targetUrl = `https://www.zhipin.com/wapi/zpgeek/friend/add.json?securityId=${encodeURIComponent(securityId)}`;

    const data = await bossFetch(page, targetUrl, { allowNonZero: true });

    const greetSuccess = data.code === 0;

    // 如果有自定义招呼语，需要通过 UI 发送
    if (customText && greetSuccess) {
      verbose('发送自定义招呼语...');

      // 获取职位信息以获取 encryptJobId
      const detailUrl = `https://www.zhipin.com/wapi/zpgeek/job/detail.json?securityId=${encodeURIComponent(securityId)}`;
      let encryptJobId = '';

      try {
        const detailData = await bossFetch(page, detailUrl, { allowNonZero: true });
        encryptJobId = detailData.zpData?.jobInfo?.encryptId || '';
      } catch (e) {
        // 忽略错误，继续尝试
      }

      if (encryptJobId) {
        // 导航到职位详情页
        await navigateTo(page, `https://www.zhipin.com/job_detail/${encryptJobId}.html`, 3);

        // 点击"继续沟通"按钮进入聊天
        await page.evaluate(`
          async () => {
            const buttons = document.querySelectorAll('button, a, [ka]');
            for (const btn of buttons) {
              const text = (btn.textContent || '').trim();
              if (text === '继续沟通' || text === '立即沟通') {
                btn.click();
                return;
              }
            }
          }
        `);

        await page.wait({ time: 2 });

        // 输入并发送消息
        const sendResult = await page.evaluate(`
          async () => {
            const text = ${JSON.stringify(customText)};

            // 查找输入框
            const inputSelectors = [
              '[contenteditable="true"]',
              'textarea',
              '[class*="editor"]',
              '[class*="input"]'
            ];

            let input = null;
            for (const sel of inputSelectors) {
              const el = document.querySelector(sel);
              if (el && el.offsetParent !== null) {
                input = el;
                break;
              }
            }

            if (!input) return { success: false, error: '未找到输入框' };

            input.focus();
            input.textContent = '';
            document.execCommand('insertText', false, text);
            input.dispatchEvent(new Event('input', { bubbles: true }));

            // 等待一下再发送
            await new Promise(r => setTimeout(r, 500));

            // 查找发送按钮
            const sendBtn = document.querySelector('[class*="send"]') ||
                           document.querySelector('[class*="submit"]') ||
                           document.querySelector('button[type="submit"]');

            if (sendBtn) {
              sendBtn.click();
              return { success: true };
            }

            return { success: false, error: '未找到发送按钮' };
          }
        `) as any;

        if (sendResult?.success) {
          return [{
            status: '✅ 成功',
            message: `已打招呼并发送: ${customText.substring(0, 30)}${customText.length > 30 ? '...' : ''}`,
          }];
        } else {
          return [{
            status: '⚠️ 部分成功',
            message: `打招呼成功，但发送自定义消息失败: ${sendResult?.error || '未知错误'}`,
          }];
        }
      }
    }

    return [{
      status: greetSuccess ? '✅ 成功' : '❌ 失败',
      message: data.message || JSON.stringify(data.zpData) || '',
    }];
  },
});
