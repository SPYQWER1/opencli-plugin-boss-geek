/**
 * BOSS直聘求职者工具 - 搜索职位
 */

import { cli, Strategy } from '@jackwener/opencli/registry';
import {
  requirePage,
  navigateTo,
  bossFetch,
  verbose,
  resolveCity,
  resolveMap,
  EXP_MAP,
  DEGREE_MAP,
  SALARY_MAP,
  INDUSTRY_MAP,
} from './utils.js';

cli({
  site: 'boss-geek',
  name: 'search',
  description: '搜索职位',
  domain: 'www.zhipin.com',
  strategy: Strategy.COOKIE,
  navigateBefore: false,
  browser: true,
  args: [
    { name: 'query', required: true, positional: true, help: '搜索关键词 (如: 前端, AI, 产品经理)' },
    { name: 'city', default: '北京', help: '城市名称或代码 (如: 杭州, 上海, 101010100)' },
    { name: 'experience', default: '', help: '经验: 应届/1年以内/1-3年/3-5年/5-10年/10年以上' },
    { name: 'degree', default: '', help: '学历: 大专/本科/硕士/博士' },
    { name: 'salary', default: '', help: '薪资: 3K以下/3-5K/5-10K/10-15K/15-20K/20-30K/30-50K/50K以上' },
    { name: 'industry', default: '', help: '行业代码或名称 (如: 100020, 互联网)' },
    { name: 'page', type: 'int', default: 1, help: '页码' },
    { name: 'limit', type: 'int', default: 15, help: '返回数量' },
  ],
  columns: ['name', 'salary', 'company', 'area', 'experience', 'degree', 'skills', 'boss', 'security_id', 'url'],
  func: async (page, kwargs) => {
    requirePage(page);

    const cityCode = resolveCity(kwargs.city);
    verbose(`导航到搜索页面...`);
    await navigateTo(page, `https://www.zhipin.com/web/geek/job?query=${encodeURIComponent(kwargs.query)}&city=${cityCode}`, 2);
    await new Promise(r => setTimeout(r, 1000));

    const expVal = resolveMap(kwargs.experience, EXP_MAP);
    const degreeVal = resolveMap(kwargs.degree, DEGREE_MAP);
    const salaryVal = resolveMap(kwargs.salary, SALARY_MAP);
    const industryVal = resolveMap(kwargs.industry, INDUSTRY_MAP);

    const limit = kwargs.limit || 15;
    let currentPage = kwargs.page || 1;
    const allJobs: any[] = [];
    const seenIds = new Set<string>();

    while (allJobs.length < limit) {
      if (allJobs.length > 0) {
        await new Promise(r => setTimeout(r, 1000 + Math.random() * 2000));
      }

      const qs = new URLSearchParams({
        scene: '1',
        query: kwargs.query,
        city: cityCode,
        page: String(currentPage),
        pageSize: '15',
      });

      if (expVal) qs.set('experience', expVal);
      if (degreeVal) qs.set('degree', degreeVal);
      if (salaryVal) qs.set('salary', salaryVal);
      if (industryVal) qs.set('industry', industryVal);

      const targetUrl = `https://www.zhipin.com/wapi/zpgeek/search/joblist.json?${qs.toString()}`;
      verbose(`获取第 ${currentPage} 页... (当前: ${allJobs.length} 条)`);

      const data = await bossFetch(page, targetUrl);
      const zpData = data.zpData || {};
      const batch = zpData.jobList || [];

      if (batch.length === 0) break;

      let addedInBatch = 0;
      for (const j of batch) {
        if (!j.encryptJobId || seenIds.has(j.encryptJobId)) continue;
        seenIds.add(j.encryptJobId);

        allJobs.push({
          name: j.jobName,
          salary: j.salaryDesc,
          company: j.brandName,
          area: [j.cityName, j.areaDistrict, j.businessDistrict].filter(Boolean).join('·'),
          experience: j.jobExperience,
          degree: j.jobDegree,
          skills: (j.skills || []).join(','),
          boss: j.bossName + ' · ' + j.bossTitle,
          security_id: j.securityId || '',
          url: 'https://www.zhipin.com/job_detail/' + j.encryptJobId + '.html',
        });

        addedInBatch++;
        if (allJobs.length >= limit) break;
      }

      if (addedInBatch === 0) {
        verbose(`API 返回重复页面，停止分页`);
        break;
      }

      if (!zpData.hasMore) break;
      currentPage++;
    }

    return allJobs;
  },
});
