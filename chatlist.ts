/**
 * BOSS直聘求职者工具 - 查看聊天列表
 */

import { cli, Strategy } from '@jackwener/opencli/registry';
import { requirePage, navigateTo, bossFetch, verbose } from './utils.js';

cli({
  site: 'boss-geek',
  name: 'chatlist',
  description: '查看聊天列表',
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
    verbose('获取聊天列表...');

    await navigateTo(page, 'https://www.zhipin.com/web/geek/chat', 2);

    const url = `https://www.zhipin.com/wapi/zprelation/friend/getGeekFriendList.json?page=${kwargs.page}&pageSize=20`;
    const data = await bossFetch(page, url);

    const friends = data.zpData?.result || [];

    return friends.slice(0, kwargs.limit).map((f: any) => ({
      boss_name: f.name || '',
      boss_title: f.title || '',
      company: f.brandName || '',
      last_msg: (f.lastMsg || '').substring(0, 50),
      last_time: f.lastTime || '',
      unread: f.unreadMsgCount || 0,
      encrypt_uid: f.encryptUid || '',
      security_id: f.securityId || '',
    }));
  },
});
