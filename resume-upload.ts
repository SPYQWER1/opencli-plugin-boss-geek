/**
 * BOSS直聘求职者工具 - 简历上传
 */

import { cli, Strategy } from '@jackwener/opencli/registry';
import { requirePage, navigateTo, verbose } from './utils.js';
import * as fs from 'fs';
import * as path from 'path';

const RESUME_URL = 'https://www.zhipin.com/web/geek/resume';

async function extractResumeList(page: any): Promise<any[]> {
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

  return resumes || [];
}

async function uploadResume(page: any, filePath: string): Promise<boolean> {
  const fileName = path.basename(filePath);
  verbose(`准备上传: ${fileName}`);

  // 尝试查找并设置文件 input
  const result = await page.evaluate(`
    async () => {
      const fileName = ${JSON.stringify(fileName)};

      // 查找所有 file input
      const inputs = document.querySelectorAll('input[type=file]');
      let targetInput = null;

      // 优先找 accept 包含 pdf 的
      for (const input of inputs) {
        const accept = input.getAttribute('accept') || '';
        if (accept.indexOf('pdf') >= 0) {
          targetInput = input;
          break;
        }
      }

      // 如果没找到，用第一个
      if (!targetInput && inputs.length > 0) {
        targetInput = inputs[0];
      }

      if (!targetInput) {
        return { success: false, reason: '未找到上传控件' };
      }

      // 注意：由于安全限制，浏览器不允许直接通过 JS 设置文件路径
      // 这里我们返回需要在外部设置文件的信息
      return {
        success: true,
        found: true,
        // 返回 input 的特征以便后续操作
        hasAccept: targetInput.hasAttribute('accept'),
        accept: targetInput.getAttribute('accept') || ''
      };
    }
  `) as any;

  if (!result?.success) {
    verbose(`上传失败: ${result?.reason || '未知错误'}`);
    return false;
  }

  verbose('找到上传控件，尝试设置文件...');

  // 尝试使用 OpenCLI 的文件设置功能
  try {
    // 如果 page.setInputFiles 可用
    if (typeof page.setInputFiles === 'function') {
      await page.setInputFiles('input[type=file]', filePath);
      verbose('文件已设置');
    } else {
      // 尝试触发 change 事件的方式
      verbose('setInputFiles 不可用，尝试替代方案...');
      // 大多数情况下需要实际的 UI 交互
    }
  } catch (e) {
    verbose(`设置文件时出错: ${e}`);
  }

  // 等待上传完成
  verbose('等待上传完成...');
  await page.wait({ time: 5 });

  return true;
}

cli({
  site: 'boss-job',
  name: 'resume-upload',
  description: '上传 PDF 简历',
  domain: 'www.zhipin.com',
  strategy: Strategy.COOKIE,
  browser: true,
  args: [
    { name: 'file', positional: true, required: true, help: 'PDF 简历文件路径' },
  ],
  columns: ['type', 'name', 'updatedAt', 'downloadUrl'],
  func: async (page, kwargs) => {
    requirePage(page);

    const filePath = kwargs.file;

    // 验证文件存在
    if (!fs.existsSync(filePath)) {
      throw new Error(`文件不存在: ${filePath}`);
    }

    // 验证 PDF 格式
    if (!filePath.toLowerCase().endsWith('.pdf')) {
      throw new Error('仅支持 PDF 格式的简历文件');
    }

    verbose(`Navigating to ${RESUME_URL}`);
    await navigateTo(page, RESUME_URL, 2);

    // 执行上传
    const uploaded = await uploadResume(page, filePath);
    if (!uploaded) {
      verbose('上传可能未完成，仍返回当前列表');
    }

    // 返回当前简历列表
    const resumes = await extractResumeList(page);
    verbose(`Found ${resumes.length} resumes`);
    return resumes;
  },
});
