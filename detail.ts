/**
 * BOSS直聘求职者工具 - 查看职位详情
 */

import { cli, Strategy } from '@jackwener/opencli/registry';
import { requirePage, navigateTo, bossFetch, verbose } from './utils.js';

cli({
  site: 'boss-job',
  name: 'detail',
  description: '查看职位详情 (JD)',
  domain: 'www.zhipin.com',
  strategy: Strategy.COOKIE,
  navigateBefore: false,
  browser: true,
  args: [
    { name: 'security-id', positional: true, required: true, help: '职位 Security ID (从搜索结果的 security_id 字段获取)' },
  ],
  columns: [
    'name', 'salary', 'experience', 'degree', 'city', 'district',
    'description', 'skills', 'welfare',
    'boss_name', 'boss_title', 'active_time',
    'company', 'industry', 'scale', 'stage',
    'address', 'job_id', 'url',
  ],
  func: async (page, kwargs) => {
    requirePage(page);

    const securityId = kwargs['security-id'];
    verbose('获取职位详情...');

    // 先导航建立 cookie 上下文
    await navigateTo(page, 'https://www.zhipin.com/web/geek/job');

    const targetUrl = `https://www.zhipin.com/wapi/zpgeek/job/detail.json?securityId=${encodeURIComponent(securityId)}`;
    const data = await bossFetch(page, targetUrl);

    const zpData = data.zpData || {};
    const jobInfo = zpData.jobInfo || {};
    const bossInfo = zpData.bossInfo || {};
    const brandComInfo = zpData.brandComInfo || {};

    if (!jobInfo.jobName) {
      throw new Error('该职位信息不存在或已下架');
    }

    return [{
      name: jobInfo.jobName || '',
      salary: jobInfo.salaryDesc || '',
      experience: jobInfo.experienceName || '',
      degree: jobInfo.degreeName || '',
      city: jobInfo.locationName || '',
      district: [jobInfo.areaDistrict, jobInfo.businessDistrict].filter(Boolean).join('·'),
      description: jobInfo.postDescription || '',
      skills: (jobInfo.showSkills || []).join(', '),
      welfare: (brandComInfo.labels || []).join(', '),
      boss_name: bossInfo.name || '',
      boss_title: bossInfo.title || '',
      active_time: bossInfo.activeTimeDesc || '',
      company: brandComInfo.brandName || bossInfo.brandName || '',
      industry: brandComInfo.industryName || '',
      scale: brandComInfo.scaleName || '',
      stage: brandComInfo.stageName || '',
      address: jobInfo.address || '',
      job_id: jobInfo.encryptId || '',
      url: jobInfo.encryptId
        ? 'https://www.zhipin.com/job_detail/' + jobInfo.encryptId + '.html'
        : '',
    }];
  },
});
