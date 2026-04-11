/**
 * BOSS直聘求职者工具 - 发送聊天消息
 *
 * BOSS chat uses MQTT (not HTTP) for messaging, so we must go through the UI
 * rather than making direct API calls.
 */

import { cli, Strategy } from '@jackwener/opencli/registry';
import { requirePage, bossFetch, verbose } from './utils.js';

const CHAT_URL = 'https://www.zhipin.com/web/geek/chat';

async function fetchFriendList(page: any, pageNum = 1): Promise<any[]> {
  const url = `https://www.zhipin.com/wapi/zprelation/friend/getGeekFriendList.json?page=${pageNum}&pageSize=20`;
  const data = await bossFetch(page, url, { allowNonZero: true });
  return data.zpData?.result || [];
}

async function findFriendByUid(page: any, encryptUid: string): Promise<any | null> {
  const friends = await fetchFriendList(page);
  return friends.find((f: any) => f.encryptUid === encryptUid) || null;
}

async function clickFriendInList(page: any, friendName: string): Promise<boolean> {
  const result = await page.evaluate(`
    async () => {
      const friendName = ${JSON.stringify(friendName)};
      const items = document.querySelectorAll('li');

      for (const el of items) {
        const text = (el.textContent || '').replace(/\\s+/g, '');
        const cleanName = friendName.replace(/\\s+/g, '');
        if (text.includes(cleanName)) {
          // 找到内部可点击元素
          const innerClickable = el.querySelector('[ka]') ||
                                 el.querySelector('[class*="user"]') ||
                                 el.querySelector('[class*="item"]') ||
                                 el.querySelector('[class*="name"]');

          if (innerClickable) {
            const rect = innerClickable.getBoundingClientRect();
            const clickEvent = new MouseEvent('click', {
              view: window,
              bubbles: true,
              cancelable: true,
              clientX: rect.left + rect.width / 2,
              clientY: rect.top + rect.height / 2,
              button: 0
            });
            innerClickable.dispatchEvent(clickEvent);
            return { clicked: true };
          }

          // 点击 li 本身
          el.click();
          return { clicked: true };
        }
      }
      return { clicked: false };
    }
  `) as any;

  return result?.clicked || false;
}

async function typeAndSendMessage(page: any, text: string): Promise<boolean> {
  // 输入消息
  const typed = await page.evaluate(`
    async () => {
      const text = ${JSON.stringify(text)};
      const selectors = [
        '.chat-editor [contenteditable="true"]',
        '.chat-input [contenteditable="true"]',
        '[contenteditable="true"]',
        'textarea',
      ];

      for (const sel of selectors) {
        const el = document.querySelector(sel);
        if (el && el.offsetParent !== null) {
          el.focus();
          el.textContent = '';
          document.execCommand('insertText', false, text);
          el.dispatchEvent(new Event('input', { bubbles: true }));
          return { found: true };
        }
      }
      return { found: false };
    }
  `) as any;

  if (!typed?.found) return false;

  await page.wait({ time: 0.5 });

  // 点击发送按钮
  const sent = await page.evaluate(`
    async () => {
      const buttons = document.querySelectorAll('button, [role="button"]');
      for (const btn of buttons) {
        const btnText = (btn.textContent || '').trim();
        if (btnText === '发送' || btnText.includes('发送')) {
          btn.click();
          return { clicked: true };
        }
      }

      // 按 Enter 发送
      const input = document.querySelector('[contenteditable="true"]');
      if (input) {
        input.dispatchEvent(new KeyboardEvent('keydown', {
          key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true
        }));
      }
      return { clicked: true };
    }
  `) as any;

  return sent?.clicked || false;
}

cli({
  site: 'boss-job',
  name: 'send',
  description: '发送聊天消息给招聘方',
  domain: 'www.zhipin.com',
  strategy: Strategy.COOKIE,
  navigateBefore: false,
  browser: true,
  args: [
    { name: 'uid', positional: true, required: true, help: '加密 UID (来自 chatlist 的 encrypt_uid)' },
    { name: 'text', positional: true, required: true, help: '消息内容' },
  ],
  columns: ['status', 'detail'],
  func: async (page, kwargs) => {
    requirePage(page);

    await page.goto(CHAT_URL);
    await page.wait({ time: 2 });

    const friend = await findFriendByUid(page, kwargs.uid);
    if (!friend) {
      return [{ status: '❌ 失败', detail: '未找到该聊天对象' }];
    }

    const friendName = friend.name || '招聘方';
    verbose(`找到好友: ${friendName}`);

    const clicked = await clickFriendInList(page, friendName);
    if (!clicked) {
      return [{ status: '❌ 失败', detail: '无法选中聊天对象' }];
    }

    await page.wait({ time: 2 });

    const sent = await typeAndSendMessage(page, kwargs.text);
    if (!sent) {
      return [{ status: '❌ 失败', detail: '消息发送失败' }];
    }

    await page.wait({ time: 1 });

    return [{
      status: '✅ 发送成功',
      detail: `已向 ${friendName} 发送: ${kwargs.text}`,
    }];
  },
});
