/**
 * BOSS直聘求职者投递简历 — 通过 UI 自动化实现
 */
import { cli, Strategy } from '@jackwener/opencli/registry';
import { requirePage, navigateTo, verbose } from './utils.js';

cli({
  site: 'boss',
  name: 'geek-deliver',
  description: 'BOSS直聘求职者投递简历（发起沟通）',
  domain: 'www.zhipin.com',
  strategy: Strategy.COOKIE,
  navigateBefore: false,
  browser: true,
  args: [
    { name: 'security-id', positional: true, required: true, help: '职位安全 ID' },
    { name: 'text', default: '', help: '自定义招呼语' },
    { name: 'dry-run', type: 'bool', default: false, help: '只显示页面信息，不实际投递' },
  ],
  columns: ['status', 'detail'],
  func: async (page, kwargs) => {
    requirePage(page);
    verbose('Starting job delivery...');

    const securityId = kwargs['security-id'];
    const dryRun = kwargs['dry-run'];

    // 1. 导航到职位详情页（通过 search 页面建立 session）
    await navigateTo(page, 'https://www.zhipin.com/web/geek/job');
    await page.wait({ time: 2 });

    // 通过 API 获取职位信息以获取 encryptJobId
    const detailApi = `https://www.zhipin.com/wapi/zpgeek/job/detail.json?securityId=${encodeURIComponent(securityId)}`;

    let jobName = '职位';
    let bossName = '招聘方';
    let encryptJobId = '';

    try {
      const detailData = await page.evaluate(`
        async () => {
          const res = await fetch('${detailApi}', { credentials: 'include' });
          return await res.json();
        }
      `) as any;

      if (detailData.code === 0 && detailData.zpData?.jobInfo) {
        jobName = detailData.zpData.jobInfo.jobName || jobName;
        bossName = detailData.zpData.bossInfo?.name || bossName;
        encryptJobId = detailData.zpData.jobInfo.encryptId || '';
        verbose(`Job: ${jobName}, Boss: ${bossName}`);
      }
    } catch (e) {
      verbose('Failed to fetch job detail API, proceeding anyway');
    }

    // 2. 导航到职位详情页
    const jobDetailUrl = encryptJobId
      ? `https://www.zhipin.com/job_detail/${encryptJobId}.html`
      : `https://www.zhipin.com/job_detail/${securityId.split('~')[0] || securityId.substring(0, 20)}.html`;

    verbose(`Navigating to: ${jobDetailUrl}`);
    await navigateTo(page, jobDetailUrl, 4);

    // 3. 分析页面元素
    const pageInfo = await page.evaluate(`
      async () => {
        // 获取所有可见按钮
        const buttons = Array.from(document.querySelectorAll('button, a, [class*="btn"], [role="button"], [ka]'));
        const buttonInfo = buttons
          .filter(btn => btn.offsetParent !== null)
          .slice(0, 20)
          .map(btn => ({
            text: (btn.textContent || '').trim().substring(0, 40),
            className: (btn.className || '').substring(0, 60),
            ka: btn.getAttribute('ka') || '',
            tagName: btn.tagName
          }));

        // 页面状态
        const bodyText = document.body.innerText;
        const title = document.title;

        return {
          buttons: buttonInfo,
          hasContinueChat: bodyText.includes('继续沟通'),
          hasCommunicated: bodyText.includes('已沟通'),
          title
        };
      }
    `) as any;

    verbose(`Page: ${pageInfo.title}`);
    verbose(`Buttons found: ${pageInfo.buttons.length}`);

    // 检查是否已经沟通过
    if (pageInfo.hasContinueChat || pageInfo.hasCommunicated) {
      return [{ status: '⚠️ 已沟通', detail: `已与该职位的招聘方沟通过` }];
    }

    // dry-run 模式：显示按钮信息
    if (dryRun) {
      const results: any[] = [
        { status: '📋 页面', detail: `标题: ${pageInfo.title}` }
      ];
      for (const btn of pageInfo.buttons) {
        results.push({
          status: '🔘 按钮',
          detail: `[${btn.tagName}] "${btn.text}" ka="${btn.ka}"`
        });
      }
      return results;
    }

    // 4. 使用 snapshot 获取元素引用，然后用原生 click
    const snapshot = await page.snapshot({ interactive: true });
    verbose(`Snapshot elements: ${snapshot?.elements?.length || 0}`);

    // 查找"立即沟通"按钮的 ref
    let chatBtnRef: string | null = null;
    if (snapshot?.elements) {
      for (const el of snapshot.elements) {
        const text = el.text || '';
        if (text.includes('立即沟通') && !text.includes('感兴趣')) {
          chatBtnRef = el.ref;
          verbose(`Found button ref: ${chatBtnRef}, text: ${text}`);
          break;
        }
      }
    }

    if (chatBtnRef) {
      try {
        await page.click(chatBtnRef);
        verbose('Clicked via page.click()');
      } catch (e: any) {
        verbose(`Click failed: ${e.message}`);
      }
    } else {
      // 回退到 evaluate 点击
      verbose('Using evaluate click');
      await page.evaluate(`
        async () => {
          const buttons = document.querySelectorAll('button, a, [ka]');
          for (const btn of buttons) {
            const text = (btn.textContent || '').trim();
            if (text === '立即沟通') {
              btn.click();
              return;
            }
          }
        }
      `);
    }

    await page.wait({ time: 4 });

    // 5. 验证结果 - 更详细的检查
    const result = await page.evaluate(`
      async () => {
        // 检查聊天输入框
        const chatInput = document.querySelector('[contenteditable="true"]');
        const textarea = document.querySelector('textarea');

        // 检查聊天窗口
        const chatPanel = document.querySelector('[class*="chat"]') ||
                          document.querySelector('[class*="conversation"]');

        // 检查页面文本
        const bodyText = document.body.innerText;

        // 检查是否有弹窗
        const modal = document.querySelector('[class*="modal"]') ||
                      document.querySelector('[class*="dialog"]') ||
                      document.querySelector('[class*="popup"]');

        // 检查按钮状态变化
        const buttons = document.querySelectorAll('button, a, [class*="btn"]');
        let hasContinueBtn = false;
        for (const btn of buttons) {
          const text = (btn.textContent || '').trim();
          if (text.includes('继续沟通') || text.includes('发消息')) {
            hasContinueBtn = true;
            break;
          }
        }

        return {
          hasChatInput: chatInput && chatInput.offsetParent !== null,
          hasTextarea: textarea && textarea.offsetParent !== null,
          hasChatPanel: chatPanel && chatPanel.offsetParent !== null,
          hasContinueChat: bodyText.includes('继续沟通'),
          hasContinueBtn,
          hasModal: modal && modal.offsetParent !== null,
          url: window.location.href.substring(0, 100)
        };
      }
    `) as any;

    verbose(`Result: ${JSON.stringify(result)}`);

    // 6. 如果有自定义招呼语，输入并发送
    if (kwargs.text && (result.hasChatInput || result.hasTextarea)) {
      await page.evaluate(`
        async () => {
          const text = ${JSON.stringify(kwargs.text)};
          const input = document.querySelector('[contenteditable="true"]') || document.querySelector('textarea');
          if (input) {
            input.focus();
            if (input.contentEditable === 'true') {
              document.execCommand('insertText', false, text);
            } else {
              (input as HTMLTextAreaElement).value = text;
            }
            input.dispatchEvent(new Event('input', { bubbles: true }));
          }
        }
      `);
      await page.wait({ time: 0.5 });

      await page.evaluate(`
        async () => {
          const sendBtn = document.querySelector('[class*="send"], [class*="submit"]');
          if (sendBtn) sendBtn.click();
        }
      `);
      await page.wait({ time: 1 });
    }

    // 成功条件：聊天输入框出现 或 按钮变成"继续沟通"
    if (result.hasChatInput || result.hasTextarea || result.hasContinueChat || result.hasContinueBtn) {
      return [{ status: '✅ 投递成功', detail: `已向「${jobName}」发起沟通` }];
    }

    // 如果有弹窗，可能需要进一步操作
    if (result.hasModal) {
      return [{ status: '⚠️ 有弹窗', detail: '请检查浏览器窗口是否有弹窗需要处理' }];
    }

    verbose(`Result details: ${JSON.stringify(result)}`);
    return [{ status: '⚠️ 状态未知', detail: '已点击按钮，请在 BOSS 直聘确认投递状态' }];
  },
});
