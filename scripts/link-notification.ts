import type { CheckReport, LinkObservation } from 'meodp/check'
import type SMTPTransport from 'nodemailer/lib/smtp-transport'
import process from 'node:process'
import { readReport } from 'meodp/check'

export interface NotificationEntry {
  item: LinkObservation
  reason: string
}

export interface LinkNotification {
  subject: string
  text: string
  test?: boolean
  report?: Pick<CheckReport, 'summary' | 'completedAt' | 'observer'>
  entries?: NotificationEntry[]
}

const labels = { reachable: '可访问', restricted: '访问受限', unavailable: '本次不可访问' }
const singleLine = (value: unknown) => String(value).replace(/[\r\n]+/g, ' ')

export function createNotification(report: CheckReport, previous: CheckReport | undefined, mode: string, reportUrl: string, runUrl: string): LinkNotification | undefined {
  if (!['changes', 'weekly'].includes(mode))
    throw new Error('Notification mode must be off, changes, or weekly.')

  const oldResults = new Map((previous?.observer === report.observer ? previous.results : []).map(item => [item.url, item]))
  const changes = []
  for (const item of report.results) {
    const old = oldResults.get(item.url)
    let reason
    if (item.status === 'unavailable' && old?.status !== 'unavailable')
      reason = '新增不可访问'
    else if (item.status === 'unavailable' && item.consecutiveFailures === 2 && old && old.consecutiveFailures < 2)
      reason = '连续两次检测失败'
    else if (item.status === 'restricted' && old?.status !== 'restricted')
      reason = '新增访问限制'
    else if (item.status === 'reachable' && old && old.status !== 'reachable')
      reason = '恢复访问'

    if (reason)
      changes.push({ item, reason })
  }

  if (mode === 'changes' && !changes.length)
    return undefined

  const { total, reachable, restricted, unavailable } = report.summary
  const entries = mode === 'changes'
    ? changes
    : report.results.filter(item => item.status !== 'reachable').map(item => ({ item, reason: labels[item.status] }))
  const lines = [
    `检测时间：${report.completedAt}`,
    `检测环境：${singleLine(report.observer)}`,
    `共 ${total} 个站点：${reachable} 可访问，${restricted} 访问受限，${unavailable} 本次不可访问。`,
    '',
    ...entries.map(({ item, reason }) => `- ${reason}：${singleLine(item.name || item.url)}\n  ${item.url}\n  HTTP / 原因：${item.httpStatus ?? item.reason ?? '—'}；连续失败 ${item.consecutiveFailures} 次`),
  ]
  if (mode === 'weekly') {
    const recovered = changes.filter(({ reason }) => reason === '恢复访问')
    lines.push(...recovered.map(({ item }) => `- 恢复访问：${singleLine(item.name || item.url)} ${item.url}`))
    entries.push(...recovered)
  }
  lines.push('', `状态页：${reportUrl}`, `本次运行与报告附件：${runUrl}`, '', '访问受限不等于失效；连续失败次数是独立观测，不代表期间持续宕机。')
  return {
    subject: mode === 'weekly' ? '[friends] 每周友链检测摘要' : `[friends] ${changes.length} 项友链状态变化`,
    text: lines.join('\n'),
    report,
    entries,
  }
}

export async function loadNotification(mode: string, env: NodeJS.ProcessEnv = process.env) {
  const report = await readReport('reports/friends/report.json')
  if (!report)
    throw new Error('Missing completed report; run check:links first.')
  const previous = await readReport('public/status/report.json')
  const server = env.GITHUB_SERVER_URL || 'https://github.com'
  const repository = env.GITHUB_REPOSITORY || 'YunYouJun/friends'
  const reportUrl = 'https://friends.yunyoujun.cn/status/'
  const runUrl = env.GITHUB_RUN_ID ? `${server}/${repository}/actions/runs/${env.GITHUB_RUN_ID}` : `${server}/${repository}/actions`
  return { message: createNotification(report, previous, mode, reportUrl, runUrl), reportUrl, runUrl }
}

export function smtpOptions(env: NodeJS.ProcessEnv): SMTPTransport.Options {
  for (const key of ['SMTP_HOST', 'SMTP_USER', 'SMTP_PASSWORD', 'MAIL_FROM', 'MAIL_TO']) {
    if (!env[key]?.trim())
      throw new Error(`Missing ${key}; configure GitHub Secrets before enabling email.`)
  }
  const port = Number(env.SMTP_PORT || 465)
  if (![465, 587].includes(port))
    throw new Error('SMTP_PORT must be 465 (TLS) or 587 (STARTTLS).')
  return {
    host: env.SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: true,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASSWORD },
    connectionTimeout: 15000,
    greetingTimeout: 15000,
    socketTimeout: 30000,
    disableFileAccess: true,
    disableUrlAccess: true,
  }
}
