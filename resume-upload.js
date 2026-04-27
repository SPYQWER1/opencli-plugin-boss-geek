/**
 * BOSS直聘求职者工具 - 简历上传（API方式）
 *
 * 流程：
 * 1. 通过 /wapi/zpupload/resume/uploadFile.json 上传文件到 OSS
 * 2. 通过 /wapi/zpgeek/resume/attachment/save.json 保存附件关联
 * 3. 查询最新简历列表返回
 *
 * save.json 需要 zp_token 请求头（值为 cookie 中的 bst）
 */
import { cli, Strategy } from '@jackwener/opencli/registry';
import { requirePage, navigateTo, bossFetch, verbose } from './utils.js';
import * as fs from 'fs';
import * as path from 'path';
cli({
    site: 'boss-job',
    name: 'resume-upload',
    description: '上传 PDF 简历',
    domain: 'www.zhipin.com',
    strategy: Strategy.COOKIE,
    navigateBefore: false,
    browser: true,
    args: [
        { name: 'file', positional: true, required: true, help: 'PDF 简历文件路径' },
    ],
    columns: ['type', 'name', 'size', 'uploadTime', 'resumeId'],
    func: async (page, kwargs) => {
        requirePage(page);
        const filePath = kwargs.file;
        if (!fs.existsSync(filePath)) {
            throw new Error(`文件不存在: ${filePath}`);
        }
        if (!filePath.toLowerCase().endsWith('.pdf')) {
            throw new Error('仅支持 PDF 格式的简历文件');
        }
        const fileName = path.basename(filePath);
        verbose(`上传: ${fileName}`);
        await navigateTo(page, 'https://www.zhipin.com/web/geek/chat', 2);
        // 1. 读取文件并转为 base64，传给浏览器上下文
        const fileBuffer = fs.readFileSync(filePath);
        const fileBase64 = fileBuffer.toString('base64');
        // 2. 在浏览器上下文中上传文件到 OSS
        verbose('上传文件到 OSS...');
        const uploadResult = await page.evaluate(`
      (async () => {
        const base64 = ${JSON.stringify(fileBase64)};
        const fileName = ${JSON.stringify(fileName)};
        const binaryStr = atob(base64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) {
          bytes[i] = binaryStr.charCodeAt(i);
        }
        const blob = new Blob([bytes], { type: 'application/pdf' });
        const formData = new FormData();
        formData.append('file', blob, fileName);
        const resp = await fetch('https://www.zhipin.com/wapi/zpupload/resume/uploadFile.json', {
          method: 'POST', credentials: 'include', body: formData,
        });
        return await resp.json();
      })()
    `);
        if (uploadResult.code !== 0) {
            throw new Error(`上传失败: ${uploadResult.message || JSON.stringify(uploadResult)}`);
        }
        const previewUrl = uploadResult.zpData?.previewUrl || '';
        const attachmentName = uploadResult.zpData?.attachmentName || fileName;
        verbose(`文件已上传: ${attachmentName}`);
        // 3. 保存附件关联（需要 zp_token 请求头）
        verbose('保存附件...');
        const saveResult = await page.evaluate(`
      (async () => {
        const previewUrl = ${JSON.stringify(previewUrl)};
        // 获取 bst cookie 作为 zp_token
        const cookies = document.cookie;
        const match = cookies.match(/(?:^|; )bst=([^;]+)/);
        const bstValue = match ? decodeURIComponent(match[1]) : '';

        const url = 'https://www.zhipin.com/wapi/zpgeek/resume/attachment/save.json?previewUrl='
          + encodeURIComponent(previewUrl) + '&annexType=0&from=8';
        const resp = await fetch(url, {
          method: 'POST', credentials: 'include',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
            'X-Requested-With': 'XMLHttpRequest',
            'zp_token': bstValue,
          },
        });
        return await resp.json();
      })()
    `);
        if (saveResult.code !== 0) {
            throw new Error(`保存附件失败: ${saveResult.message || JSON.stringify(saveResult)}`);
        }
        verbose('附件保存成功');
        // 4. 返回最新简历列表
        const results = [];
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
