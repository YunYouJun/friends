import process from 'node:process'
import { readReport } from 'meodp/check'
import nodemailer from 'nodemailer'
import { createNotification, smtpOptions } from './link-notification.mjs'

const dryRun = process.argv.includes('--dry-run')
const mode = process.env.LINK_EMAIL_MODE || (dryRun ? 'changes' : 'off')
if (mode === 'off') {
  console.log('Email notifications are disabled.')
}
else {
  const report = await readReport('reports/friends/report.json')
  if (!report)
    throw new Error('Missing completed report; run check:links first.')
  const previous = await readReport('public/status/report.json')
  const server = process.env.GITHUB_SERVER_URL || 'https://github.com'
  const repository = process.env.GITHUB_REPOSITORY || 'YunYouJun/friends'
  const runUrl = process.env.GITHUB_RUN_ID ? `${server}/${repository}/actions/runs/${process.env.GITHUB_RUN_ID}` : `${server}/${repository}/actions`
  const message = createNotification(report, previous, mode, 'https://friends.yunyoujun.cn/status/', runUrl)
  if (!message) {
    console.log('No important status changes; email skipped.')
  }
  else if (dryRun) {
    console.log(`${message.subject}\n\n${message.text}`)
  }
  else {
    const transport = nodemailer.createTransport(smtpOptions(process.env))
    try {
      const result = await transport.sendMail({ ...message, from: process.env.MAIL_FROM, to: process.env.MAIL_TO })
      if (result.rejected.length)
        throw new Error('SMTP rejected one or more recipients.')
      console.log('SMTP accepted the notification for delivery.')
    }
    finally {
      transport.close()
    }
  }
}
