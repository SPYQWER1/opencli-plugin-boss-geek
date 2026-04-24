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

      // Method 1: Look for download links with type attribute
      const downloadLinks = document.querySelectorAll('a[type=download]');
      for (let i = 0; i < downloadLinks.length; i++) {
        const link = downloadLinks[i];
        addResumeFromLink(link, result, seen);
      }

      // Method 2: Look for any link that has download in href
      const allLinks = document.querySelectorAll('a[href]');
      for (let i = 0; i < allLinks.length; i++) {
        const link = allLinks[i];
        const href = link.getAttribute('href') || '';
        if (href.indexOf('download') >= 0) {
          addResumeFromLink(link, result, seen);
        }
      }

      // Method 3: Look for elements that contain .pdf or .doc in text
      const allElements = document.querySelectorAll('*');
      for (let i = 0; i < allElements.length; i++) {
        const el = allElements[i];
        const text = el.textContent || '';
        if (text.indexOf('.pdf') >= 0 || text.indexOf('.doc') >= 0) {
          const linkInEl = el.querySelector('a[href]');
          if (linkInEl) {
            addResumeFromLink(linkInEl, result, seen);
          }
        }
      }

      function addResumeFromLink(link, result, seen) {
        const href = link.getAttribute('href') || '';
        const title = link.getAttribute('title') || '';
        const text = link.textContent || '';

        let name = title || text.trim();

        if (!name && link.parentElement) {
          const parent = link.parentElement;
          const parentText = parent.textContent || '';
          const pdfMatch = parentText.match(/([^\\s]+\\.pdf)/i);
          const docMatch = parentText.match(/([^\\s]+\\.doc[x]?)/i);
          if (pdfMatch) name = pdfMatch[1];
          else if (docMatch) name = docMatch[1];
        }

        if (name) {
          // Clean up the name
          name = name.trim();
          if (name.length > 100) name = name.substring(0, 100);

          if (!seen[name] && (name.indexOf('.pdf') >= 0 || name.indexOf('.doc') >= 0)) {
            seen[name] = true;
            let url = href;
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

      return result;
    })()`);
        verbose(`Found ${resumes.length} resumes`);
        return resumes;
    },
});
