import process from 'node:process'
import { defineConfig } from 'meodp/config'

const inActions = process.env.GITHUB_ACTIONS === 'true'
const report = 'reports/friends/report.json'
const snapshot = 'public/status/report.json'
const reportUrl = 'https://friends.yunyoujun.cn/status/'
const repository = `${process.env.GITHUB_SERVER_URL || 'https://github.com'}/${process.env.GITHUB_REPOSITORY || 'YunYouJun/friends'}`

export default defineConfig({
  check: {
    reporter: [
      'json',
      'markdown',
      ['html', { outputFile: 'reports/friends/report.html' }],
      ['html', { outputFolder: 'reports/site' }],
    ],
    input: 'public/links.yml',
    output: 'reports/friends',
    history: inActions ? '.cache/friends/github-actions.json' : '.cache/friends/local.json',
    historySeed: inActions ? snapshot : undefined,
    observer: inActions ? 'github-actions-ubuntu' : undefined,
    observerMismatch: 'reset',
    failOn: 'none',
  },
  report: {
    reporter: 'html',
    input: snapshot,
    output: 'dist/status',
    verify: { url: `${reportUrl}report.json` },
  },
  notify: {
    input: report,
    previousReport: snapshot,
    observerMismatch: 'reset',
    failureThreshold: 2,
    title: 'friends',
    timeZone: 'Asia/Shanghai',
    maxItems: 6,
    reportUrl,
    runUrl: process.env.GITHUB_RUN_ID ? `${repository}/actions/runs/${process.env.GITHUB_RUN_ID}` : `${repository}/actions`,
    // Actions selects --mode from repository variables after deployment verification.
    feishu: {
      mode: 'off',
      transport: process.env.FEISHU_TRANSPORT || 'app',
      appId: process.env.FEISHU_APP_ID,
      appSecret: process.env.FEISHU_APP_SECRET,
      receiveId: process.env.FEISHU_RECEIVE_ID,
      receiveIdType: process.env.FEISHU_RECEIVE_ID_TYPE,
      webhook: process.env.FEISHU_WEBHOOK_URL,
      secret: process.env.FEISHU_WEBHOOK_SECRET,
      keyword: process.env.FEISHU_KEYWORD,
    },
    email: {
      mode: 'off',
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : undefined,
      user: process.env.SMTP_USER,
      password: process.env.SMTP_PASSWORD,
      from: process.env.MAIL_FROM,
      to: process.env.MAIL_TO,
    },
  },
})
