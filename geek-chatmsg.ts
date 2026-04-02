/**
 * BOSS直聘求职者聊天消息 — 查看与招聘方的聊天记录
 */
import { cli, Strategy } from '@jackwener/opencli/registry';
import { requirePage, navigateTo, bossFetch, verbose } from './utils.js';

cli({
  site: 'boss',
  name: 'geek-chatmsg',
  description: 'BOSS直聘求职者查看与招聘方的聊天消息',
  domain: 'www.zhipin.com',
  strategy: Strategy.COOKIE,
  navigateBefore: false,
  browser: true,
  args: [
    { name: 'uid', required: true, positional: true, help: '加密 UID (来自 geek-chatlist)' },
    { name: 'security-id', required: true, help: '安全 ID (来自 geek-chatlist)' },
    { name: 'page', type: 'int', default: 1, help: '页码' },
  ],
  columns: ['from', 'type', 'text', 'time'],
  func: async (page, kwargs) => {
    requirePage(page);
    verbose('Fetching geek chat messages...');

    // 导航到求职者聊天页面建立 session
    await navigateTo(page, 'https://www.zhipin.com/web/geek/chat');

    const uid = kwargs.uid;
    const securityId = encodeURIComponent(kwargs['security-id']);
    const msgUrl = `https://www.zhipin.com/wapi/zpchat/geek/historyMsg?gid=${uid}&securityId=${securityId}&page=${kwargs.page}&c=20&src=0`;

    const msgData = await bossFetch(page, msgUrl);

    const TYPE_MAP: Record<number, string> = {
      1: '文本', 2: '图片', 3: '招呼', 4: '简历', 5: '系统',
      6: '名片', 7: '语音', 8: '视频', 9: '表情',
    };

    const messages = msgData.zpData?.messages || msgData.zpData?.historyMsgList || [];

    return messages.map((m: any) => {
      const fromObj = m.from || {};
      const isSelf = typeof fromObj === 'object' ? fromObj.uid === m.to?.uid : false;
      return {
        from: isSelf ? '我' : (typeof fromObj === 'object' ? fromObj.name : 'BOSS'),
        type: TYPE_MAP[m.type] || '其他',
        text: (m.text || m.body?.text || '').substring(0, 100),
        time: m.time ? new Date(m.time).toLocaleString('zh-CN') : '',
      };
    });
  },
});
