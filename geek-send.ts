/**
 * BOSS直聘求职者发送消息 — 通过 UI 自动化实现
 */
import { cli, Strategy } from '@jackwener/opencli/registry';
import { requirePage, navigateTo, bossFetch, verbose } from './utils.js';

cli({
  site: 'boss',
  name: 'geek-send',
  description: 'BOSS直聘求职者发送聊天消息',
  domain: 'www.zhipin.com',
  strategy: Strategy.COOKIE,
  navigateBefore: false,
  browser: true,
  args: [
    { name: 'uid', positional: true, required: true, help: '加密 UID (来自 geek-chatlist 的 encrypt_uid)' },
    { name: 'security-id', required: true, help: '安全 ID (来自 geek-chatlist 的 security_id)' },
    { name: 'text', required: true, positional: true, help: '消息内容' },
  ],
  columns: ['status', 'detail'],
  func: async (page, kwargs) => {
    requirePage(page);
    verbose(`Sending message to ${kwargs.uid}...`);

    const uid = kwargs.uid;
    const securityId = kwargs['security-id'];
    const text = kwargs.text;

    // 1. 导航到聊天页面
    await navigateTo(page, 'https://www.zhipin.com/web/geek/chat', 3);

    // 2. 获取聊天列表数据，找到对应的老板名字用于显示
    const listUrl = `https://www.zhipin.com/wapi/zprelation/friend/getGeekFriendList.json?page=1&pageSize=50`;
    const listData = await bossFetch(page, listUrl, { allowNonZero: true });
    const friends = listData.zpData?.result || [];

    const friend = friends.find((f: any) => f.encryptUid === uid);
    const friendName = friend?.name || '招聘方';

    // 3. 尝试点击聊天列表中的目标用户
    const clickResult = await page.evaluate(`
      async () => {
        const targetName = ${JSON.stringify(friendName)};

        // BOSS 直聘聊天列表的选择器
        const selectors = [
          '.friend-item',
          '.geek-item',
          '[class*="chat-item"]',
          '[class*="friend-list"] li',
          '[class*="conversation"] li',
        ];

        for (const sel of selectors) {
          const items = document.querySelectorAll(sel);
          for (const item of items) {
            if (item.offsetParent === null) continue;

            // 检查名字是否匹配
            const nameEl = item.querySelector('[class*="name"]') ||
                          item.querySelector('span') ||
                          item;
            const name = nameEl?.textContent?.trim() || '';

            if (name === targetName || name.includes(targetName)) {
              item.click();
              return { clicked: true, method: 'name-match', name };
            }
          }
        }

        // 尝试点击任意可见的聊天项
        const allItems = document.querySelectorAll('[class*="item"]');
        for (const item of allItems) {
          if (item.offsetParent !== null) {
            const rect = item.getBoundingClientRect();
            if (rect.width > 100 && rect.height > 20) {
              item.click();
              return { clicked: true, method: 'first-visible', name: 'unknown' };
            }
          }
        }

        return { clicked: false };
      }
    `) as any;

    if (!clickResult.clicked) {
      return [{
        status: '❌ 失败',
        detail: '在聊天列表中未找到该用户',
      }];
    }

    verbose(`Clicked: ${clickResult.method}`);
    await page.wait({ time: 2 });

    // 4. 在输入框输入消息
    const inputResult = await page.evaluate(`
      async () => {
        const text = ${JSON.stringify(text)};
        const selectors = [
          '.chat-editor [contenteditable="true"]',
          '.chat-input [contenteditable="true"]',
          '.message-editor [contenteditable="true"]',
          '.conversation-editor [contenteditable="true"]',
          '[contenteditable="true"]',
          'textarea',
        ];

        for (const sel of selectors) {
          const el = document.querySelector(sel);
          if (el && el.offsetParent !== null) {
            el.focus();
            if (el.tagName === 'TEXTAREA' || el.tagName === 'INPUT') {
              el.value = text;
              el.dispatchEvent(new Event('input', { bubbles: true }));
            } else {
              el.textContent = '';
              el.focus();
              document.execCommand('insertText', false, text);
              el.dispatchEvent(new Event('input', { bubbles: true }));
            }
            return { found: true, selector: sel };
          }
        }
        return { found: false };
      }
    `) as any;

    if (!inputResult.found) {
      return [{
        status: '❌ 失败',
        detail: '未找到消息输入框',
      }];
    }

    verbose(`Input found: ${inputResult.selector}`);
    await page.wait({ time: 0.5 });

    // 5. 点击发送按钮
    const sendResult = await page.evaluate(`
      async () => {
        const selectors = [
          '.conversation-editor .submit',
          '.submit-content .submit',
          '.conversation-operate .submit',
          '.send-btn',
          'button[type="submit"]',
        ];

        for (const sel of selectors) {
          const btn = document.querySelector(sel);
          if (btn && btn.offsetParent !== null) {
            btn.click();
            return { clicked: true, selector: sel };
          }
        }
        return { clicked: false };
      }
    `) as any;

    if (!sendResult.clicked) {
      await page.pressKey('Enter');
    }

    verbose(`Sent via: ${sendResult.selector || 'Enter key'}`);
    await page.wait({ time: 1 });

    return [{
      status: '✅ 发送成功',
      detail: `已向 ${friendName} 发送: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`,
    }];
  },
});
