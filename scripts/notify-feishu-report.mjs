import process from 'node:process'
import { parseArgs } from 'node:util'
import { readReport } from 'meodp/check'
import { createFeishuPayload, sendFeishuNotification } from './feishu-notification.mjs'
import { createNotification } from './link-notification.mjs'

const { values } = parseArgs({ options: { 'dry-run': { type: 'boolean' }, 'test': { type: 'boolean' } } })
const dryRun = values['dry-run']
const mode = process.env.LINK_FEISHU_MODE || (dryRun ? 'changes' : 'off')
if (mode === 'off' && !values.test) {
  console.log('Feishu notifications are disabled.')
}
else {
  const options = {
    webhook: process.env.FEISHU_WEBHOOK_URL,
    secret: process.env.FEISHU_WEBHOOK_SECRET,
    keyword: process.env.FEISHU_KEYWORD,
  }
  let message
  if (values.test) {
    message = {
      subject: '[friends] 飞书通知链路验证',
      text: `这是一条由 friends 项目发送的测试消息。\n时间：${new Date().toISOString()}\n\n用于确认机器人可以向你发送通知。每周检测与部署是否上线，请以 GitHub Actions 为准；本条消息不代表公开报告已更新。`,
    }
  }
  else {
    const report = await readReport('reports/friends/report.json')
    if (!report)
      throw new Error('Missing completed report; run check:links first.')
    const previous = await readReport('public/status/report.json')
    const server = process.env.GITHUB_SERVER_URL || 'https://github.com'
    const repository = process.env.GITHUB_REPOSITORY || 'YunYouJun/friends'
    options.reportUrl = 'https://friends.yunyoujun.cn/status/'
    options.runUrl = process.env.GITHUB_RUN_ID ? `${server}/${repository}/actions/runs/${process.env.GITHUB_RUN_ID}` : `${server}/${repository}/actions`
    message = createNotification(report, previous, mode, options.reportUrl, options.runUrl)
  }
  if (!message) {
    console.log('No important status changes; Feishu notification skipped.')
  }
  else if (dryRun) {
    // Signatures and webhook credentials never appear in preview output.
    console.log(JSON.stringify(createFeishuPayload(message, { ...options, secret: undefined }), null, 2))
  }
  else {
    await sendFeishuNotification(message, options)
    console.log('Feishu accepted the notification.')
  }
}
