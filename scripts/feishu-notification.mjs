import { createHmac } from 'node:crypto'

function truncate(text, limit) {
  const characters = Array.from(String(text))
  return characters.length > limit ? `${characters.slice(0, limit).join('')}\n…完整内容请查看报告。` : characters.join('')
}

export function signFeishu(timestamp, secret) {
  return createHmac('sha256', `${timestamp}\n${secret}`).digest('base64')
}

export function createFeishuPayload(message, { keyword = '', secret, timestamp = Math.floor(Date.now() / 1000), reportUrl, runUrl } = {}) {
  const content = [[{ tag: 'text', text: `${truncate(keyword, 64)}${keyword ? '\n' : ''}${truncate(message.text, 2500)}` }]]
  const links = []
  for (const [label, url] of [['查看完整报告', reportUrl], ['查看运行与附件', runUrl]]) {
    if (!url)
      continue
    const parsed = new URL(url)
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password)
      throw new Error('Notification links must use HTTP(S) without credentials.')
    links.push({ tag: 'a', text: label, href: parsed.href })
  }
  if (links.length)
    content.push(links)
  const title = `${keyword ? `${truncate(keyword, 64)} · ` : ''}${truncate(message.subject, 100)}`
  const payload = { msg_type: 'post', content: { post: { zh_cn: { title, content } } } }
  if (secret) {
    payload.timestamp = String(timestamp)
    payload.sign = signFeishu(timestamp, secret)
  }
  return payload
}

export async function sendFeishuNotification(message, options, fetcher = fetch) {
  let webhook
  try {
    webhook = new URL(options.webhook)
  }
  catch {
    throw new Error('Configure FEISHU_WEBHOOK_URL in GitHub Secrets.')
  }
  if (webhook.protocol !== 'https:' || !['open.feishu.cn', 'open.larksuite.com'].includes(webhook.hostname)
    || !/^\/open-apis\/bot\/v2\/hook\/[a-z0-9-]+$/i.test(webhook.pathname)
    || webhook.username || webhook.password || webhook.search || webhook.hash || webhook.port) {
    throw new Error('FEISHU_WEBHOOK_URL must be an official Feishu/Lark custom bot webhook.')
  }

  const payload = createFeishuPayload(message, options)
  let response
  try {
    response = await fetcher(webhook.href, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      redirect: 'error',
      signal: AbortSignal.timeout(15000),
    })
  }
  catch {
    // Do not log the credential-bearing URL or retry an uncertain delivery.
    throw new Error('Feishu request failed or timed out; check delivery before retrying.')
  }
  if (!response.ok)
    throw new Error(`Feishu returned HTTP ${response.status}.`)
  let result
  try {
    result = await response.json()
  }
  catch {
    throw new Error('Feishu returned an invalid response; check delivery before retrying.')
  }
  const code = result?.code ?? result?.StatusCode
  if (code !== 0)
    throw new Error(`Feishu rejected the notification (code ${Number.isInteger(code) ? code : 'unknown'}). Check the webhook, keyword and signature settings.`)
}
