/**
 * BOSS直聘求职者工具 - 查看聊天记录
 */

import { cli, Strategy } from '@jackwener/opencli/registry';
import { requirePage, navigateTo, bossFetch, verbose } from './utils.js';

cli({
  site: 'boss-geek',
  name: 'chatmsg',
  description: '查看与招聘方的聊天记录',
  domain: 'www.zhipin.com',
  strategy: Strategy.COOKIE,
  navigateBefore: false,
  browser: true,
  args: [
    { name: 'uid', positional: true, required: true, help: '加密 UID (来自 chatlist 的 encrypt_uid)' },
    { name: 'security-id', required: true, help: '安全 ID (来自 chatlist 的 security_id)' },
    { name: 'limit', type: 'int', default: 20, help: '返回数量' },
  ],
  columns: ['from', 'type', 'text', 'time'],
  func: async (page, kwargs) => {
    requirePage(page);
    verbose('获取聊天记录...');

    await navigateTo(page, 'https://www.zhipin.com/web/geek/chat');

    const uid = kwargs.uid;
    const securityId = encodeURIComponent(kwargs['security-id']);
    const url = `https://www.zhipin.com/wapi/zpchat/geek/historyMsg?gid=${uid}&securityId=${securityId}&page=1&c=${kwargs.limit}&src=0`;

    const msgData = await bossFetch(page, url, { allowNonZero: true });

    const TYPE_MAP: Record<number, string> = {
      1: '文本', 2: '图片', 3: '招呼', 4: '简历', 5: '系统',
      6: '名片', 7: '语音', 8: '视频', 9: '表情', 10: '文件',
      11: '位置', 12: '链接', 13: '小程序',
    };

    const messages = msgData.zpData?.messages || msgData.zpData?.historyMsgList || [];

    return messages.slice(0, kwargs.limit).map((m: any) => {
      const fromObj = m.from || {};
      // 判断是否是自己发的消息
      const isSelf = m.direction === 1 || m.isSelf === true;

      return {
        from: isSelf ? '我' : (fromObj.name || '招聘方'),
        type: TYPE_MAP[m.type] || `类型${m.type}`,
        text: (m.text || m.body?.text || m.content || '').substring(0, 100),
        time: m.time ? new Date(m.time).toLocaleString('zh-CN') : (m.ct || ''),
      };
    });
  },
});
