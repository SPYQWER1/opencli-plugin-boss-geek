/**
 * BOSS直聘求职者聊天列表 — 查看与招聘方的对话列表
 */
import { cli, Strategy } from '@jackwener/opencli/registry';
import { requirePage, navigateTo, bossFetch, verbose } from './utils.js';

cli({
  site: 'boss',
  name: 'geek-chatlist',
  description: 'BOSS直聘求职者查看聊天列表（与 BOSS 的对话）',
  domain: 'www.zhipin.com',
  strategy: Strategy.COOKIE,
  navigateBefore: false,
  browser: true,
  args: [
    { name: 'page', type: 'int', default: 1, help: '页码' },
    { name: 'limit', type: 'int', default: 20, help: '返回数量' },
  ],
  columns: ['boss_name', 'boss_title', 'company', 'last_msg', 'last_time', 'unread', 'encrypt_uid', 'security_id'],
  func: async (page, kwargs) => {
    requirePage(page);
    verbose('Fetching geek chat list...');

    // 导航到求职者聊天页面建立 session，等待页面完全加载
    await navigateTo(page, 'https://www.zhipin.com/web/geek/chat', 3);

    const url = `https://www.zhipin.com/wapi/zprelation/friend/getGeekFriendList.json?page=${kwargs.page || 1}&pageSize=20`;
    const data = await bossFetch(page, url);

    const friends = data.zpData?.result || [];
    const limit = kwargs.limit || 20;

    return friends.slice(0, limit).map((f: any) => ({
      boss_name: f.name || '',
      boss_title: f.title || '',
      company: f.brandName || '',
      last_msg: (f.lastMsg || '').substring(0, 50),  // 截断长消息
      last_time: f.lastTime || '',
      unread: f.unreadMsgCount || 0,
      encrypt_uid: f.encryptUid || '',
      security_id: f.securityId || '',
    }));
  },
});
