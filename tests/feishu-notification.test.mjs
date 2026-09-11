import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { spawnSync } from 'node:child_process'
import process from 'node:process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { createFeishuPayload, sendFeishuNotification, signFeishu } from '../scripts/feishu-notification.mjs'

const webhook = 'https://open.feishu.cn/open-apis/bot/v2/hook/test-only'
const message = { subject: '[friends] Test', text: 'A test notification.' }

test('Feishu payload includes bot keyword, plain content and clickable report links', () => {
  const payload = createFeishuPayload(message, { keyword: 'Studio', reportUrl: 'https://example.com/status/', runUrl: 'https://github.com/example/repo/actions/runs/1' })
  assert.equal(payload.msg_type, 'post')
  assert.match(payload.content.post.zh_cn.title, /Studio/)
  assert.match(payload.content.post.zh_cn.content[0][0].text, /Studio/)
  assert.equal(payload.content.post.zh_cn.content[1][0].tag, 'a')
  assert.equal(payload.content.post.zh_cn.content[1][0].href, 'https://example.com/status/')
  assert.equal(payload.sign, undefined)
  assert.throws(() => createFeishuPayload(message, { reportUrl: 'javascript:alert(1)' }), /HTTP/)
})

test('long Unicode and control-character reports stay below the Feishu payload limit', () => {
  for (const text of ['异常😀'.repeat(10000), '\u0000'.repeat(10000)]) {
    const payload = createFeishuPayload({ ...message, text }, { keyword: 'Studio', reportUrl: 'https://example.com/status/' })
    assert.ok(Buffer.byteLength(JSON.stringify(payload)) < 20000)
    assert.match(payload.content.post.zh_cn.content[0][0].text, /完整内容/)
    assert.ok(!JSON.stringify(payload).includes('\uFFFD'))
  }
})

test('signature uses timestamp and secret as HMAC key with an empty message', () => {
  const timestamp = 1599360473
  const secret = 'test-only-signing-secret'
  // Cross-checked with Python's hmac implementation using an empty message.
  const expected = 'W61JvWLV84QqH2/KWWKGPmXBjmEFSdE8o1jRviJxEDE='
  const payload = createFeishuPayload(message, { secret, timestamp })
  assert.equal(signFeishu(timestamp, secret), expected)
  assert.equal(payload.timestamp, String(timestamp))
  assert.equal(payload.sign, expected)
})

test('sending checks both HTTP and Feishu business status without following redirects', async () => {
  let calls = 0
  await sendFeishuNotification(message, { webhook, keyword: 'Studio' }, async (url, options) => {
    calls++
    assert.equal(url, webhook)
    assert.equal(options.redirect, 'error')
    assert.equal(options.method, 'POST')
    assert.ok(options.signal instanceof AbortSignal)
    assert.match(JSON.parse(options.body).content.post.zh_cn.title, /Studio/)
    return { ok: true, json: async () => ({ code: 0 }) }
  })
  assert.equal(calls, 1)
  await sendFeishuNotification(message, { webhook }, async () => ({ ok: true, json: async () => ({ StatusCode: 0 }) }))
  await assert.rejects(sendFeishuNotification(message, { webhook }, async () => ({ ok: false, status: 429 })), /HTTP 429/)
  await assert.rejects(sendFeishuNotification(message, { webhook }, async () => ({ ok: true, json: async () => ({ code: 19024, StatusCode: 0 }) })), /19024/)
  await assert.rejects(sendFeishuNotification(message, { webhook }, async () => ({ ok: true, json: async () => ({}) })), /unknown/)
})

test('invalid webhook destinations cannot receive messages', async () => {
  const forbidden = async () => assert.fail('Must not make a network request')
  for (const invalid of [undefined, 'not-a-url', 'http://open.feishu.cn/open-apis/bot/v2/hook/test', 'https://example.com/open-apis/bot/v2/hook/test', `${webhook}?token=secret`, 'https://user:password@open.feishu.cn/open-apis/bot/v2/hook/test'])
    await assert.rejects(sendFeishuNotification(message, { webhook: invalid }, forbidden), /FEISHU_WEBHOOK_URL/)
})

test('uncertain delivery is not retried and does not expose webhook credentials', async () => {
  let calls = 0
  await assert.rejects(sendFeishuNotification(message, { webhook }, async () => {
    calls++
    throw new Error(`Network error requesting ${webhook}`)
  }), (error) => {
    assert.ok(!error.message.includes(webhook))
    assert.match(error.message, /check delivery before retrying/)
    return true
  })
  assert.equal(calls, 1)
})

test('CLI defaults off and test dry-run contains neither webhook nor signing secret', () => {
  const entry = fileURLToPath(new URL('../scripts/notify-feishu-report.mjs', import.meta.url))
  const env = { PATH: process.env.PATH, FEISHU_WEBHOOK_URL: webhook, FEISHU_WEBHOOK_SECRET: 'test-only-secret', FEISHU_KEYWORD: 'Studio' }
  const disabled = spawnSync(process.execPath, [entry], { env, encoding: 'utf8' })
  assert.equal(disabled.status, 0)
  assert.match(disabled.stdout, /disabled/)
  const preview = spawnSync(process.execPath, [entry, '--test', '--dry-run'], { env, encoding: 'utf8' })
  assert.equal(preview.status, 0)
  assert.ok(!preview.stdout.includes(webhook))
  assert.ok(!preview.stdout.includes('test-only-secret'))
  assert.ok(!preview.stdout.includes('"sign"'))
  assert.match(preview.stdout, /通知链路验证/)
})
