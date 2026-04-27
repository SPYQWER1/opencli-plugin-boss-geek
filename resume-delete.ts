/**
 * BOSS直聘求职者工具 - 删除附件简历（API方式）
 *
 * POST /wapi/zpgeek/resume/attachment/delete.json
 * 需要 zp_token 请求头（值为 cookie 中的 bst）
 */

import { cli, Strategy } from '@jackwener/opencli/registry';
import { requirePage, navigateTo, bossFetch, verbose } from './utils.js';

cli({
  site: 'boss-job',
  name: 'resume-delete',
  description: '删除附件简历',
  domain: 'www.zhipin.com',
  strategy: Strategy.COOKIE,
  navigateBefore: false,
  browser: true,
  args: [
    { name: 'resume-id', positional: true, required: true, help: '附件简历 ID（从 resume-list 获取）' },
  ],
  columns: ['type', 'name', 'size', 'uploadTime', 'resumeId'],
  func: async (page, kwargs) => {
    requirePage(page);

    const resumeId = kwargs['resume-id'] as string;

    await navigateTo(page, 'https://www.zhipin.com/web/geek/chat', 2);

    verbose(`删除附件简历: ${resumeId}`);

    const deleteResult = await page.evaluate(`
      (async () => {
        const cookies = document.cookie;
        const match = cookies.match(/(?:^|; )bst=([^;]+)/);
        const bstValue = match ? decodeURIComponent(match[1]) : '';
        const resp = await fetch('https://www.zhipin.com/wapi/zpgeek/resume/attachment/delete.json', {
          method: 'POST', credentials: 'include',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest',
            'zp_token': bstValue,
          },
          body: 'resumeId=' + encodeURIComponent(${JSON.stringify(resumeId)}),
        });
        return await resp.json();
      })()
    `);

    if (deleteResult.code !== 0) {
      throw new Error(`删除失败: ${deleteResult.message || JSON.stringify(deleteResult)}`);
    }

    verbose('删除成功');

    // Return updated resume list
    const results: any[] = [];

    const attachData = await bossFetch(page, 'https://www.zhipin.com/wapi/zpgeek/resume/attachment/checkbox.json');
    const resumeList = attachData.zpData?.resumeList || [];

    for (const r of resumeList) {
      results.push({
        type: '附件简历',
        name: r.showName || '',
        size: r.resumeSizeDesc || '',
        uploadTime: r.uploadTime || '',
        resumeId: r.resumeId || '',
      });
    }

    verbose(`Remaining ${results.length} resumes`);
    return results;
  },
});
