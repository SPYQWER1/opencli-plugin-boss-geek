/**
 * BOSS直聘求职者工具 - 简历列表
 */
import { cli, Strategy } from '@jackwener/opencli/registry';
import { requirePage, navigateTo, verbose } from './utils.js';
const RESUME_URL = 'https://www.zhipin.com/web/geek/resume';
cli({
    site: 'boss-job',
    name: 'resume-list',
    description: '查看简历列表（在线简历和附件简历）',
    domain: 'www.zhipin.com',
    strategy: Strategy.COOKIE,
    browser: true,
    args: [],
    columns: ['type', 'name', 'updatedAt', 'downloadUrl'],
    func: async (page, kwargs) => {
        requirePage(page);
        verbose(`Navigating to ${RESUME_URL}`);
        await navigateTo(page, RESUME_URL, 2);
        // Extract resume data
        const resumes = await page.evaluate(`(function() {
      const result = [];

      // Extract online resume
      let onlineName = '在线简历';
      const userNameEl = document.querySelector('#userinfo p');
      if (userNameEl && userNameEl.textContent.trim()) {
        onlineName = userNameEl.textContent.trim();
      }
      result.push({
        type: '在线简历',
        name: onlineName,
        updatedAt: '',
        downloadUrl: ''
      });

      // Extract attachment resumes - look for file list section
      // The page has an attachments section near the bottom with file items
      const allElements = Array.from(document.body.querySelectorAll('*'));

      for (const el of allElements) {
        const text = el.textContent || '';
        // Look for elements that have a download link and a title
        const hasDownload = el.querySelector('a[type=download]');
        const hasTitle = el.querySelector('a[title]');

        if (hasDownload && hasTitle) {
          const title = hasTitle.getAttribute('title') || '';
          const downloadUrl = hasDownload.getAttribute('href') || '';

          // Skip if already added
          if (title && !result.some(r => r.name === title)) {
            // Extract update time
            let updatedAt = '';
            const fullText = el.textContent || '';
            const dateMatch = fullText.match(/更新于[\\s]*([\\d]{4}\\.[\\d]{2}\\.[\\d]{2}[\\s]*[\\d]{2}:[\\d]{2})/);
            if (dateMatch) {
              updatedAt = dateMatch[1];
            }

            result.push({
              type: '附件简历',
              name: title,
              updatedAt: updatedAt,
              downloadUrl: downloadUrl
            });
          }
        }
      }

      // Fallback: if no attachments found with above method, try simpler approach
      if (result.length === 1) {
        const allLi = Array.from(document.querySelectorAll('li'));
        for (const li of allLi) {
          const text = li.textContent || '';
          if (text.includes('.pdf') || text.includes('.doc')) {
            const titleA = li.querySelector('a[title]');
            const downloadA = li.querySelector('a[type=download]');
            if (titleA) {
              const title = titleA.getAttribute('title') || '';
              if (title && !result.some(r => r.name === title)) {
                result.push({
                  type: '附件简历',
                  name: title,
                  updatedAt: '',
                  downloadUrl: downloadA ? downloadA.getAttribute('href') || '' : ''
                });
              }
            }
          }
        }
      }

      return result;
    })()`);
        verbose(`Found ${resumes.length} resumes`);
        // Normalize and return
        return Array.isArray(resumes) ? resumes : [];
    },
});
