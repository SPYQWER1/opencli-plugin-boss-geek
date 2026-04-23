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

      // Extract attachment resumes - look for download links first
      const seenNames = new Set();
      const downloadLinks = Array.from(document.querySelectorAll('a[type=download]'));

      for (const downloadLink of downloadLinks) {
        let title = '';
        let updatedAt = '';
        const href = downloadLink.getAttribute('href') || '';

        // Look for a title link nearby
        const parent = downloadLink.parentElement;
        if (parent) {
          const titleLink = parent.querySelector('a[title]');
          if (titleLink) {
            title = titleLink.getAttribute('title') || '';
          }

          // Extract update time
          const fullText = parent.textContent || '';
          const dateMatch = fullText.match(/(\\d{4}\\.\\d{2}\\.\\d{2}\\s*\\d{2}:\\d{2})/);
          if (dateMatch) {
            updatedAt = dateMatch[1];
          }

          // If no title link, try to find the filename in text
          if (!title) {
            const allText = parent.textContent || '';
            const pdfMatch = allText.match(/([^\\s]+\\.pdf)/i);
            const docMatch = allText.match(/([^\\s]+\\.doc[x]?)/i);
            if (pdfMatch) title = pdfMatch[1];
            else if (docMatch) title = docMatch[1];
          }
        }

        // If still no title, try to look for nearby elements
        if (!title && downloadLink) {
          let current = downloadLink.previousElementSibling;
          for (let i = 0; i < 5 && current; i++) {
            const text = current.textContent || '';
            if (text.includes('.pdf') || text.includes('.doc')) {
              const pdfMatch = text.match(/([^\\s]+\\.pdf)/i);
              const docMatch = text.match(/([^\\s]+\\.doc[x]?)/i);
              if (pdfMatch) { title = pdfMatch[1]; break; }
              else if (docMatch) { title = docMatch[1]; break; }
            }
            current = current.previousElementSibling;
          }
        }

        if (title && !seenNames.has(title)) {
          seenNames.add(title);
          result.push({
            type: '附件简历',
            name: title,
            updatedAt: updatedAt,
            downloadUrl: href.startsWith('http') ? href : 'https://www.zhipin.com' + href
          });
        }
      }

      // Fallback: if we found nothing, try a more aggressive approach
      if (result.length === 1) {
        const allLinks = Array.from(document.querySelectorAll('a[href]'));
        for (const link of allLinks) {
          const href = link.getAttribute('href') || '';
          const title = link.getAttribute('title') || '';

          if (href.includes('download') || title.includes('.pdf') || title.includes('.doc')) {
            const name = title || link.textContent.trim();
            if (name && (name.includes('.pdf') || name.includes('.doc')) && !seenNames.has(name)) {
              seenNames.add(name);
              result.push({
                type: '附件简历',
                name: name,
                updatedAt: '',
                downloadUrl: href.startsWith('http') ? href : 'https://www.zhipin.com' + href
              });
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
