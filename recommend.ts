/**
 * BOSS直聘求职者工具 - 推荐职位
 */

import { cli, Strategy } from '@jackwener/opencli/registry';
import { requirePage, navigateTo, bossFetch, verbose } from './utils.js';

cli({
  site: 'boss-geek',
  name: 'recommend',
  description: '获取推荐职位',
  domain: 'www.zhipin.com',
  strategy: Strategy.COOKIE,
  navigateBefore: false,
  browser: true,
  args: [
    { name: 'page', type: 'int', default: 1, help: '页码' },
    { name: 'limit', type: 'int', default: 15, help: '返回数量' },
  ],
  columns: ['name', 'salary', 'company', 'area', 'experience', 'degree', 'boss', 'security_id'],
  func: async (page, kwargs) => {
    requirePage(page);
    verbose('获取推荐职位...');

    await navigateTo(page, 'https://www.zhipin.com/web/geek/job', 2);

    const url = `https://www.zhipin.com/wapi/zpgeek/recommend/job/list.json?page=${kwargs.page}&pageSize=${kwargs.limit}`;
    const data = await bossFetch(page, url);

    const jobList = data.zpData?.jobList || [];

    return jobList.slice(0, kwargs.limit).map((j: any) => ({
      name: j.jobName || '',
      salary: j.salaryDesc || '',
      company: j.brandName || '',
      area: [j.cityName, j.areaDistrict, j.businessDistrict].filter(Boolean).join('·'),
      experience: j.jobExperience || '',
      degree: j.jobDegree || '',
      boss: (j.bossName || '') + (j.bossTitle ? ' · ' + j.bossTitle : ''),
      security_id: j.securityId || '',
    }));
  },
});
