import type { FeishuOptions } from './feishu-notification.ts'
import type { LinkNotification } from './link-notification.ts'
import process from 'node:process'
import { parseArgs } from 'node:util'
import { readReport } from 'meodp/check'
import { createFeishuCard, createFeishuPayload, sendFeishuNotification } from './feishu-notification.ts'
import { createNotification, loadNotification } from './link-notification.ts'

const { values } = parseArgs({ options: { 'dry-run': { type: 'boolean' }, 'test': { type: 'boolean' } } })
const dryRun = values['dry-run']
const mode = process.env.LINK_FEISHU_MODE || (dryRun ? 'changes' : 'off')
if (mode === 'off' && !values.test) {
  console.log('Feishu notifications are disabled.')
}
else {
  const options: FeishuOptions = {
    transport: process.env.FEISHU_TRANSPORT || 'webhook',
    appId: process.env.FEISHU_APP_ID,
    appSecret: process.env.FEISHU_APP_SECRET,
    receiveId: process.env.FEISHU_RECEIVE_ID,
    receiveIdType: process.env.FEISHU_RECEIVE_ID_TYPE,
    webhook: process.env.FEISHU_WEBHOOK_URL,
    secret: process.env.FEISHU_WEBHOOK_SECRET,
    keyword: process.env.FEISHU_KEYWORD,
  }
  let message: LinkNotification | undefined
  if (values.test) {
    const snapshot = await readReport('public/status/report.json')
    options.reportUrl = 'https://github.com/YunYouJun/friends'
    options.reportLabel = '查看 friends 项目'
    options.runUrl = 'https://github.com/YunYouJun/friends/actions'
    message = {
      ...(snapshot ? createNotification(snapshot, undefined, 'weekly', options.reportUrl, options.runUrl) : {}),
      subject: '[friends] 飞书通知链路验证',
      test: true,
      text: `你好，云游君 ☁️\n这是 friends 的通知卡片测试。\n发送时间：${new Date().toISOString()}\n\n下方使用已保存的历史快照展示卡片，不代表本周检测结果或公开报告已更新。`,
    }
  }
  else {
    const context = await loadNotification(mode)
    options.reportUrl = context.reportUrl
    options.runUrl = context.runUrl
    message = context.message
  }
  if (!message) {
    console.log('No important status changes; Feishu notification skipped.')
  }
  else if (dryRun) {
    // Only render card content: no app credentials, recipient IDs, or signatures.
    const preview = options.transport === 'app'
      ? { msg_type: 'interactive', card: createFeishuCard(message, options) }
      : createFeishuPayload(message, { ...options, secret: undefined })
    console.log(JSON.stringify(preview, null, 2))
  }
  else {
    await sendFeishuNotification(message, options)
    console.log('Feishu accepted the notification.')
  }
}
