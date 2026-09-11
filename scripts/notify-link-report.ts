import process from 'node:process'
import nodemailer from 'nodemailer'
import { loadNotification, smtpOptions } from './link-notification.ts'

const dryRun = process.argv.includes('--dry-run')
const mode = process.env.LINK_EMAIL_MODE || (dryRun ? 'changes' : 'off')
if (mode === 'off') {
  console.log('Email notifications are disabled.')
}
else {
  const { message } = await loadNotification(mode)
  if (!message) {
    console.log('No important status changes; email skipped.')
  }
  else if (dryRun) {
    console.log(`${message.subject}\n\n${message.text}`)
  }
  else {
    const transport = nodemailer.createTransport(smtpOptions(process.env))
    try {
      const result = await transport.sendMail({ subject: message.subject, text: message.text, from: process.env.MAIL_FROM, to: process.env.MAIL_TO })
      if (result.rejected.length)
        throw new Error('SMTP rejected one or more recipients.')
      console.log('SMTP accepted the notification for delivery.')
    }
    finally {
      transport.close()
    }
  }
}
