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
    const text = kwargs.text;

    // 1. 导航到聊天页面
    console.error('[geek-send] Navigating to chat page...');
    await navigateTo(page, 'https://www.zhipin.com/web/geek/chat', 3);
    console.error('[geek-send] Chat page loaded');

    // 2. 获取聊天列表数据
    console.error('[geek-send] Fetching friend list...');
    const listUrl = `https://www.zhipin.com/wapi/zprelation/friend/getGeekFriendList.json?page=1&pageSize=50`;
    let friends: any[] = [];
    try {
      const listData = await bossFetch(page, listUrl, { allowNonZero: true });
      friends = listData.zpData?.result || [];
      console.error(`[geek-send] Found ${friends.length} friends, first: ${JSON.stringify(friends[0]?.encryptUid)}`);
    } catch (e: any) {
      console.error(`[geek-send] Failed to fetch friends: ${e.message}`);
    }

    const friend = friends.find((f: any) => f.encryptUid === uid);
    const friendName = friend?.name || '招聘方';
    const friendIndex = friends.findIndex((f: any) => f.encryptUid === uid);

    verbose(`Friend: ${friendName}, Index: ${friendIndex}`);

    // 3. 使用 snapshot 获取可交互元素
    const snapshot = await page.snapshot({ interactive: true });
    verbose(`Snapshot elements: ${snapshot?.elements?.length || 0}`);

    // 4. 尝试点击聊天列表中的用户
    let clicked = false;

    // 方法1: 通过名字匹配
    if (snapshot?.elements) {
      for (const el of snapshot.elements) {
        const elText = el.text || '';
        if (elText.includes(friendName) && el.ref) {
          try {
            await page.click(el.ref);
            clicked = true;
            verbose(`Clicked by name match: ${elText}`);
            break;
          } catch (e) {
            verbose(`Click failed: ${e}`);
          }
        }
      }
    }

    // 方法2: 通过索引点击（如果知道位置）
    if (!clicked && friendIndex >= 0 && snapshot?.elements) {
      // 聊天列表通常在左侧，找类似列表项的元素
      const listItems = snapshot.elements.filter((el: any) => {
        const t = el.text || '';
        // 聊天项通常包含名字和消息预览
        return t.length > 5 && t.length < 200 && el.ref;
      });

      if (listItems[friendIndex]) {
        try {
          await page.click(listItems[friendIndex].ref);
          clicked = true;
          verbose(`Clicked by index: ${friendIndex}`);
        } catch (e) {
          verbose(`Index click failed: ${e}`);
        }
      }
    }

    // 方法3: 通过 evaluate 直接点击
    if (!clicked) {
      const evalResult = await page.evaluate(`
        async () => {
          const targetName = ${JSON.stringify(friendName)};
          const targetUid = ${JSON.stringify(uid)};

          // 查找所有可能包含聊天项的元素
          const allElements = document.querySelectorAll('*');
          for (const el of allElements) {
            if (el.offsetParent === null) continue;
            const text = el.textContent || '';
            const html = el.outerHTML || '';

            // 匹配名字或 UID
            if (text.includes(targetName) || html.includes(targetUid.substring(0, 15))) {
              // 确保是可点击的列表项
              const rect = el.getBoundingClientRect();
              if (rect.width > 50 && rect.height > 20 && rect.width < 500) {
                el.click();
                return { clicked: true, text: text.substring(0, 50) };
              }
            }
          }
          return { clicked: false };
        }
      `) as any;

      if (evalResult.clicked) {
        clicked = true;
        verbose(`Clicked via evaluate: ${evalResult.text}`);
      }
    }

    if (!clicked) {
      return [{
        status: '❌ 失败',
        detail: `在聊天列表中未找到 ${friendName}，friends=${friends.length}, idx=${friendIndex}`,
      }];
    }

    await page.wait({ time: 2 });

    // 5. 在输入框输入消息
    const inputResult = await page.evaluate(`
      async () => {
        const text = ${JSON.stringify(text)};

        // 查找输入框
        const inputSelectors = [
          '[contenteditable="true"]',
          'textarea',
          '[class*="editor"]',
          '[class*="input"]'
        ];

        for (const sel of inputSelectors) {
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

    if (!inputResult.found) {
      return [{
        status: '❌ 失败',
        detail: '未找到消息输入框',
      }];
    }

    verbose('Input filled');
    await page.wait({ time: 0.5 });

    // 6. 发送消息
    await page.evaluate(`
      async () => {
        const sendBtn = document.querySelector('[class*="send"]') ||
                       document.querySelector('[class*="submit"]') ||
                       document.querySelector('button[type="submit"]');
        if (sendBtn) sendBtn.click();
      }
    `);

    verbose('Message sent');
    await page.wait({ time: 1 });

    return [{
      status: '✅ 发送成功',
      detail: `已向 ${friendName} 发送: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`,
    }];
  },
});
