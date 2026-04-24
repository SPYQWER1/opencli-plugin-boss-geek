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

    const resumes = await page.evaluate(`(function() {
      const result = [];

      // Get online resume
      let onlineName = '在线简历';
      const userInfo = document.querySelector('#userinfo');
      if (userInfo) {
        const nameEl = userInfo.querySelector('p');
        if (nameEl && nameEl.textContent.trim()) {
          onlineName = nameEl.textContent.trim();
        }
      }
      result.push({
        type: '在线简历',
        name: onlineName,
        updatedAt: '',
        downloadUrl: ''
      });

      // Try multiple methods to find attachment resumes
      const seen = {};

      // Look for download links - search more carefully
      const allLinks = document.querySelectorAll('a[href]');
      for (let i = 0; i < allLinks.length; i++) {
        const link = allLinks[i];
        const href = link.getAttribute('href') || '';
        const title = link.getAttribute('title') || '';
        const text = link.textContent || '';

        // Check if this looks like a resume
        const isPdf = title.indexOf('.pdf') >= 0 || text.indexOf('.pdf') >= 0;
        const isDoc = title.indexOf('.doc') >= 0 || text.indexOf('.doc') >= 0;

        if (isPdf || isDoc) {
          let name = title || text.trim();

          // Look for filename in nearby text
          if (!name && link.parentElement) {
            const parent = link.parentElement;
            const parentText = parent.textContent || '';
            const pdfMatch = parentText.match(/([^\\s]+\\.pdf)/i);
            const docMatch = parentText.match(/([^\\s]+\\.doc[x]?)/i);
            if (pdfMatch) name = pdfMatch[1];
            else if (docMatch) name = docMatch[1];
          }

          if (name) {
            name = name.trim();
            if (name.length > 100) name = name.substring(0, 100);

            if (!seen[name]) {
              seen[name] = true;

              // Try to find a real download URL
              let url = href;
              if (url === 'javascript:;' || url === 'javascript:void(0)' || !url) {
                // Look for nearby download link
                const parent = link.parentElement;
                if (parent) {
                  const downloadLinks = parent.querySelectorAll('a[href]');
                  for (let j = 0; j < downloadLinks.length; j++) {
                    const possibleDownload = downloadLinks[j].getAttribute('href') || '';
                    if (possibleDownload.indexOf('download') >= 0 || possibleDownload.indexOf('.pdf') >= 0 || possibleDownload.indexOf('.doc') >= 0) {
                      url = possibleDownload;
                      break;
                    }
                  }
                }
              }

              if (url && url.indexOf('http') !== 0 && url.indexOf('/') === 0) {
                url = 'https://www.zhipin.com' + url;
              }

              result.push({
                type: '附件简历',
                name: name,
                updatedAt: '',
                downloadUrl: url
              });
            }
          }
        }
      }

      return result;
    })()`);

    verbose(`Found ${resumes.length} resumes`);

    return resumes;
  },
});
