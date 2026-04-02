/**
 * BOSS直聘求职者推荐岗位 — 获取系统推荐的岗位列表
 */
import { cli, Strategy } from '@jackwener/opencli/registry';
import { requirePage, navigateTo, bossFetch, verbose } from './utils.js';

cli({
  site: 'boss',
  name: 'geek-recommend',
  description: 'BOSS直聘求职者获取推荐岗位',
  domain: 'www.zhipin.com',
  strategy: Strategy.COOKIE,
  navigateBefore: false,
  browser: true,
  args: [
    { name: 'page', type: 'int', default: 1, help: '页码' },
    { name: 'limit', type: 'int', default: 20, help: '返回数量' },
  ],
  columns: ['name', 'salary', 'company', 'area', 'experience', 'degree', 'boss', 'security_id'],
  func: async (page, kwargs) => {
    requirePage(page);
    verbose('Fetching recommended jobs...');

    // 导航到求职者页面建立 session
    await navigateTo(page, 'https://www.zhipin.com/web/geek/job');
    // 等待页面关键元素加载完成
    await page.wait({ selector: '[class*="job"], [class*="list"]', timeout: 10000 });

    const pageNum = kwargs.page || 1;
    const pageSize = kwargs.limit || 20;

    const url = `https://www.zhipin.com/wapi/zpgeek/recommend/job/list.json?page=${pageNum}&pageSize=${pageSize}`;
    const data = await bossFetch(page, url);

    const jobList = data.zpData?.jobList || [];

    return jobList.slice(0, pageSize).map((j: any) => ({
      name: j.jobName || '',
      salary: j.salaryDesc || '',
      company: j.brandName || '',
      area: [j.cityName, j.areaDistrict].filter(Boolean).join('·'),
      experience: j.jobExperience || '',
      degree: j.jobDegree || '',
      boss: (j.bossName || '') + (j.bossTitle ? ' · ' + j.bossTitle : ''),
      security_id: j.securityId || '',
    }));
  },
});
