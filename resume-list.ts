/**
 * BOSS直聘求职者工具 - 简历列表（API方式）
 */

import { cli, Strategy } from '@jackwener/opencli/registry';
import { requirePage, navigateTo, bossFetch, verbose } from './utils.js';

cli({
  site: 'boss-job',
  name: 'resume-list',
  description: '查看简历列表（在线简历和附件简历）',
  domain: 'www.zhipin.com',
  strategy: Strategy.COOKIE,
  navigateBefore: false,
  browser: true,
  args: [],
  columns: ['type', 'name', 'size', 'uploadTime', 'resumeId'],
  func: async (page, kwargs) => {
    requirePage(page);
    verbose('获取简历列表...');

    await navigateTo(page, 'https://www.zhipin.com/web/geek/chat', 2);

    const results: any[] = [];

    // 获取附件简历列表
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

    verbose(`Found ${results.length} resumes`);
    return results;
  },
});
