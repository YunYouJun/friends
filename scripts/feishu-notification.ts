import type { LinkNotification } from './link-notification.ts'
import { createHash, createHmac } from 'node:crypto'

export interface FeishuOptions {
  transport?: string
  appId?: string
  appSecret?: string
  receiveId?: string
  receiveIdType?: string
  webhook?: string
  keyword?: string
  secret?: string
  timestamp?: number
  reportUrl?: string
  runUrl?: string
  reportLabel?: string
}

export type FeishuFetch = (url: string, init: RequestInit) => Promise<Response>

interface PlainText {
  tag: 'plain_text'
  content: string
}

interface CardButton {
  tag: 'button'
  text: PlainText
  type: 'default' | 'primary'
  url: string
}

type CardElement
  = { tag: 'div', text: PlainText }
    | { tag: 'div', fields: { is_short: boolean, text: PlainText }[] }
    | { tag: 'note', elements: PlainText[] }
    | { tag: 'hr' }
    | { tag: 'markdown', content: string }
    | { tag: 'action', actions: CardButton[] }

function truncate(text: unknown, limit: number) {
  const characters = Array.from(String(text))
  return characters.length > limit ? `${characters.slice(0, limit).join('')}\n…完整内容请查看报告。` : characters.join('')
}

function safeLink(url: string) {
  let parsed
  try {
    parsed = new URL(url)
  }
  catch {
    throw new Error('Notification links must use HTTP(S) without credentials.')
  }
  if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password)
    throw new Error('Notification links must use HTTP(S) without credentials.')
  return parsed.href
}

export function signFeishu(timestamp: string | number, secret: string) {
  return createHmac('sha256', `${timestamp}\n${secret}`).digest('base64')
}

export function createFeishuCard(message: LinkNotification, { keyword = '', reportUrl, runUrl, reportLabel = '查看完整报告' }: FeishuOptions = {}) {
  const text = (content: string): PlainText => ({ tag: 'plain_text', content })
  const elements: CardElement[] = []
  if (message.test)
    elements.push({ tag: 'div', text: text(message.text) })
  if (message.report) {
    const { total, reachable, restricted, unavailable } = message.report.summary
    elements.push({
      tag: 'div',
      fields: [['🌐 检测站点', total], ['✅ 可访问', reachable], ['🟠 访问受限', restricted], ['🔴 本次不可访问', unavailable]]
        .map(([label, value]) => ({ is_short: true, text: text(`${label}\n${value}`) })),
    })
    const date = new Date(message.report.completedAt)
    const time = Number.isNaN(date.valueOf())
      ? message.report.completedAt
      : new Intl.DateTimeFormat('zh-CN', {
          timeZone: 'Asia/Shanghai',
          dateStyle: 'medium',
          timeStyle: 'short',
          hour12: false,
        }).format(date)
    elements.push({ tag: 'note', elements: [text(`${message.test ? '示例快照' : '检测完成'}：${time}（北京时间）\n检测环境：${truncate(message.report.observer, 80)}`)] })
    if (message.entries?.length) {
      elements.push({ tag: 'hr' }, { tag: 'markdown', content: '**状态摘要**' })
      for (const { item, reason } of message.entries.slice(0, 6)) {
        elements.push({ tag: 'div', text: text(`${reason} · ${truncate(item.name || item.url, 60)}\n${truncate(item.url, 160)}\nHTTP / 原因：${truncate(item.httpStatus ?? item.reason ?? '—', 80)} · 连续失败 ${item.consecutiveFailures} 次`) })
      }
      if (message.entries.length > 6)
        elements.push({ tag: 'note', elements: [text(`另有 ${message.entries.length - 6} 项，点击下方查看完整报告。`)] })
    }
    else {
      elements.push({ tag: 'div', text: text('本次没有需要关注的状态变化。') })
    }
  }
  else if (!message.test) {
    elements.push({ tag: 'div', text: text(truncate(message.text, 2500)) })
  }
  const actions: CardButton[] = []
  for (const [label, url] of [[reportLabel, reportUrl], ['查看 Actions', runUrl]] as const) {
    if (url)
      actions.push({ tag: 'button', text: text(label), type: actions.length ? 'default' : 'primary', url: safeLink(url) })
  }
  if (actions.length)
    elements.push({ tag: 'action', actions })
  elements.push({ tag: 'note', elements: [text('访问受限不等于失效；连续失败次数不代表期间持续宕机。')] })
  const template = message.test ? 'blue' : message.report?.summary?.unavailable ? 'orange' : message.report?.summary?.restricted ? 'yellow' : 'green'
  return {
    config: { wide_screen_mode: true, enable_forward: false },
    header: { template, title: text(`${keyword ? `${truncate(keyword, 64)} · ` : ''}${truncate(message.subject, 100)}`) },
    elements,
  }
}

export function createFeishuPayload(message: LinkNotification, options: FeishuOptions = {}) {
  const payload: { msg_type: 'interactive', card: ReturnType<typeof createFeishuCard>, timestamp?: string, sign?: string } = { msg_type: 'interactive', card: createFeishuCard(message, options) }
  if (options.secret) {
    payload.timestamp = String(options.timestamp ?? Math.floor(Date.now() / 1000))
    payload.sign = signFeishu(payload.timestamp, options.secret)
  }
  return payload
}

async function requestFeishu(url: string, init: RequestInit, fetcher: FeishuFetch, phase: string) {
  let response
  try {
    response = await fetcher(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(15000) })
  }
  catch {
    // Never expose credentials, server messages, or retry an uncertain delivery.
    throw new Error(`Feishu ${phase} request failed or timed out; check delivery before retrying.`)
  }
  if (!response.ok)
    throw new Error(`Feishu ${phase} returned HTTP ${response.status}.`)
  let result: unknown
  try {
    result = await response.json()
  }
  catch {
    throw new Error(`Feishu ${phase} returned an invalid response; check delivery before retrying.`)
  }
  if (!result || typeof result !== 'object')
    throw new Error(`Feishu ${phase} returned an invalid response; check delivery before retrying.`)
  const code = ('code' in result ? result.code : undefined) ?? ('StatusCode' in result ? result.StatusCode : undefined)
  if (code !== 0)
    throw new Error(`Feishu ${phase} rejected the request (code ${Number.isInteger(code) ? code : 'unknown'}). Check the bot configuration and permissions.`)
  return result
}

export async function sendFeishuNotification(message: LinkNotification, options: FeishuOptions, fetcher: FeishuFetch = fetch) {
  const transport = options.transport || 'webhook'
  if (!['app', 'webhook'].includes(transport))
    throw new Error('FEISHU_TRANSPORT must be app or webhook.')
  if (transport === 'app') {
    for (const [name, value] of [['FEISHU_APP_ID', options.appId], ['FEISHU_APP_SECRET', options.appSecret], ['FEISHU_RECEIVE_ID', options.receiveId]]) {
      if (!value?.trim())
        throw new Error(`Configure ${name} in GitHub Secrets.`)
    }
    const receiveIdType = options.receiveIdType || 'open_id'
    // Restrict the application transport to individual recipients.
    if (!['open_id', 'user_id', 'union_id', 'email'].includes(receiveIdType))
      throw new Error('FEISHU_RECEIVE_ID_TYPE must be open_id, user_id, union_id, or email for direct messages.')
    const card = createFeishuCard(message, options)
    const auth = await requestFeishu('https://open.feishu.cn/open-apis/auth/v3/tenant_access_token/internal', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ app_id: options.appId, app_secret: options.appSecret }),
    }, fetcher, 'authentication')
    if (!('tenant_access_token' in auth) || typeof auth.tenant_access_token !== 'string' || !auth.tenant_access_token)
      throw new Error('Feishu authentication returned no tenant access token.')
    const content = JSON.stringify(card)
    // Same card and recipient share a deduplication key within Feishu's UUID window.
    const uuid = createHash('sha256').update(`${options.appId}\n${receiveIdType}\n${options.receiveId}\n${content}`).digest('hex').slice(0, 40)
    const result = await requestFeishu(`https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=${receiveIdType}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${auth.tenant_access_token}` },
      body: JSON.stringify({ receive_id: options.receiveId, msg_type: 'interactive', content, uuid }),
    }, fetcher, 'direct message')
    if (!('data' in result) || !result.data || typeof result.data !== 'object'
      || !('message_id' in result.data) || typeof result.data.message_id !== 'string' || !result.data.message_id) {
      throw new Error('Feishu returned no message ID; check delivery before retrying.')
    }
    return { messageId: result.data.message_id }
  }

  let webhook
  try {
    webhook = new URL(options.webhook || '')
  }
  catch {
    throw new Error('Configure FEISHU_WEBHOOK_URL in GitHub Secrets.')
  }
  if (webhook.protocol !== 'https:' || !['open.feishu.cn', 'open.larksuite.com'].includes(webhook.hostname)
    || !/^\/open-apis\/bot\/v2\/hook\/[a-z0-9-]+$/i.test(webhook.pathname)
    || webhook.username || webhook.password || webhook.search || webhook.hash || webhook.port) {
    throw new Error('FEISHU_WEBHOOK_URL must be an official Feishu/Lark custom bot webhook.')
  }
  await requestFeishu(webhook.href, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(createFeishuPayload(message, options)),
  }, fetcher, 'webhook')
}
