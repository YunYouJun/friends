import type { FeishuFetch } from '../scripts/feishu-notification.ts'
import assert from 'node:assert/strict'
import { Buffer } from 'node:buffer'
import { spawnSync } from 'node:child_process'
import process from 'node:process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { createFeishuCard, createFeishuPayload, sendFeishuNotification, signFeishu } from '../scripts/feishu-notification.ts'
import { report, tsxImport } from './helpers.ts'

const webhook = 'https://open.feishu.cn/open-apis/bot/v2/hook/test-only'
const message = { subject: '[friends] Test', text: 'A test notification.' }

test('Feishu payload includes bot keyword, plain content and clickable report links', () => {
  const payload = createFeishuPayload(message, { keyword: 'Studio', reportUrl: 'https://example.com/status/', runUrl: 'https://github.com/example/repo/actions/runs/1' })
  assert.equal(payload.msg_type, 'interactive')
  assert.match(payload.card.header.title.content, /Studio/)
  assert.ok('actions' in payload.card.elements[1])
  assert.equal(payload.card.elements[1].actions[0].tag, 'button')
  assert.equal(payload.card.elements[1].actions[0].url, 'https://example.com/status/')
  assert.equal(payload.sign, undefined)
  assert.throws(() => createFeishuPayload(message, { reportUrl: 'javascript:alert(1)' }), /HTTP/)
})

test('long Unicode and control-character reports stay below the Feishu payload limit', () => {
  for (const text of ['异常😀'.repeat(10000), '\u0000'.repeat(10000)]) {
    const payload = createFeishuPayload({ ...message, text }, { keyword: 'Studio', reportUrl: 'https://example.com/status/' })
    assert.ok(Buffer.byteLength(JSON.stringify(payload)) < 20000)
    assert.ok('text' in payload.card.elements[0])
    assert.match(payload.card.elements[0].text.content, /完整内容/)
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
    assert.match(JSON.parse(String(options.body)).card.header.title.content, /Studio/)
    return Response.json({ code: 0 })
  })
  assert.equal(calls, 1)
  await sendFeishuNotification(message, { webhook }, async () => Response.json({ StatusCode: 0 }))
  await assert.rejects(sendFeishuNotification(message, { webhook }, async () => new Response(null, { status: 429 })), /HTTP 429/)
  await assert.rejects(sendFeishuNotification(message, { webhook }, async () => Response.json({ code: 19024, StatusCode: 0 })), /19024/)
  await assert.rejects(sendFeishuNotification(message, { webhook }, async () => Response.json({})), /unknown/)
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
    assert.ok(error instanceof Error)
    assert.ok(!error.message.includes(webhook))
    assert.match(error.message, /check delivery before retrying/)
    return true
  })
  assert.equal(calls, 1)
})

test('CLI defaults off and test dry-run contains neither webhook nor signing secret', () => {
  const entry = fileURLToPath(new URL('../scripts/notify-feishu-report.ts', import.meta.url))
  const env = { PATH: process.env.PATH, FEISHU_WEBHOOK_URL: webhook, FEISHU_WEBHOOK_SECRET: 'test-only-secret', FEISHU_KEYWORD: 'Studio' }
  const disabled = spawnSync(process.execPath, ['--import', tsxImport, entry], { env, encoding: 'utf8' })
  assert.equal(disabled.status, 0)
  assert.match(disabled.stdout, /disabled/)
  const preview = spawnSync(process.execPath, ['--import', tsxImport, entry, '--test', '--dry-run'], { env, encoding: 'utf8' })
  assert.equal(preview.status, 0)
  assert.ok(!preview.stdout.includes(webhook))
  assert.ok(!preview.stdout.includes('test-only-secret'))
  assert.ok(!preview.stdout.includes('"sign"'))
  assert.match(preview.stdout, /通知链路验证/)
})

test('card uses plain text for site data, bounded summaries and accurate metadata', () => {
  const card = createFeishuCard({
    ...message,
    report: { ...report('unavailable'), summary: { total: 12, reachable: 4, restricted: 1, unavailable: 7, redirected: 0, recovered: 0 } },
    entries: Array.from({ length: 8 }, () => ({ reason: '新增不可访问', item: { ...report('unavailable').results[0], name: '<at id=all></at> **example**', url: 'https://example.com/', consecutiveFailures: 2 } })),
  }, { reportUrl: 'https://example.com/status/' })
  assert.equal(card.header.template, 'orange')
  assert.equal(card.config.enable_forward, false)
  assert.ok('fields' in card.elements[0])
  assert.ok('elements' in card.elements[1])
  assert.deepEqual(card.elements[0].fields.map(field => field.text.content.split('\n')[1]), ['12', '4', '1', '7'])
  assert.match(card.elements[1].elements[0].content, /9:17|09:17/)
  const siteRows = card.elements.filter(element => 'text' in element).filter(element => element.text.content.includes('<at'))
  assert.equal(siteRows.length, 6)
  assert.ok(siteRows.every(row => row.text.tag === 'plain_text'))
  assert.match(JSON.stringify(card), /另有 2 项/)
})

const appOptions = { transport: 'app', appId: 'test-app', appSecret: 'test-app-secret', receiveId: 'test-self', receiveIdType: 'user_id' }
const success = (data: object) => Response.json({ code: 0, ...data })

test('application bot authenticates then sends an interactive direct message with stable deduplication', async () => {
  const sent: { uuid: string }[] = []
  const fetcher: FeishuFetch = async (url, options) => {
    assert.equal(options.redirect, 'error')
    const body = JSON.parse(String(options.body))
    if (url.endsWith('/tenant_access_token/internal')) {
      assert.deepEqual(body, { app_id: 'test-app', app_secret: 'test-app-secret' })
      return success({ tenant_access_token: 'test-token' })
    }
    assert.equal(url, 'https://open.feishu.cn/open-apis/im/v1/messages?receive_id_type=user_id')
    assert.equal(new Headers(options.headers).get('Authorization'), 'Bearer test-token')
    assert.equal(body.receive_id, 'test-self')
    assert.equal(body.msg_type, 'interactive')
    assert.equal(JSON.parse(body.content).header.title.content, message.subject)
    assert.ok(body.uuid.length <= 50)
    sent.push(body)
    return success({ data: { message_id: 'test-message-id' } })
  }
  assert.deepEqual(await sendFeishuNotification(message, appOptions, fetcher), { messageId: 'test-message-id' })
  await sendFeishuNotification(message, appOptions, fetcher)
  await sendFeishuNotification({ ...message, text: 'Changed content' }, appOptions, fetcher)
  assert.equal(sent[0].uuid, sent[1].uuid)
  assert.notEqual(sent[0].uuid, sent[2].uuid)
})

test('application configuration and authentication failures never attempt delivery', async () => {
  const forbidden = async () => assert.fail('Must not make a network request')
  await assert.rejects(sendFeishuNotification(message, { ...appOptions, transport: 'unexpected' }, forbidden), /FEISHU_TRANSPORT/)
  await assert.rejects(sendFeishuNotification(message, { ...appOptions, appSecret: '' }, forbidden), /FEISHU_APP_SECRET/)
  await assert.rejects(sendFeishuNotification(message, { ...appOptions, receiveIdType: 'chat_id' }, forbidden), /direct messages/)
  for (const result of [{ code: 10003, msg: 'test-app-secret' }, { code: 0 }]) {
    let calls = 0
    await assert.rejects(sendFeishuNotification(message, appOptions, async () => {
      calls++
      return Response.json(result)
    }), (error) => {
      assert.ok(error instanceof Error)
      assert.ok(!error.message.includes('test-app-secret'))
      return true
    })
    assert.equal(calls, 1)
  }
})

test('direct message rejection and uncertain delivery are not retried or logged with secrets', async () => {
  for (const failure of ['network', 'business', 'missing-id']) {
    let calls = 0
    await assert.rejects(sendFeishuNotification(message, appOptions, async (url) => {
      calls++
      if (url.endsWith('/internal'))
        return success({ tenant_access_token: 'test-token' })
      if (failure === 'network')
        throw new Error('test-app-secret test-token')
      return Response.json(failure === 'business' ? { code: 230013, msg: 'test-token' } : { code: 0 })
    }), (error) => {
      assert.ok(error instanceof Error)
      assert.ok(!error.message.includes('test-token') && !error.message.includes('test-app-secret'))
      return true
    })
    assert.equal(calls, 2)
  }
})

test('application dry-run excludes recipient and app credentials', () => {
  const entry = fileURLToPath(new URL('../scripts/notify-feishu-report.ts', import.meta.url))
  const env = { PATH: process.env.PATH, FEISHU_TRANSPORT: 'app', FEISHU_APP_ID: 'private-app-id', FEISHU_APP_SECRET: 'private-app-secret', FEISHU_RECEIVE_ID: 'private-user-id' }
  const result = spawnSync(process.execPath, ['--import', tsxImport, entry, '--test', '--dry-run'], { env, encoding: 'utf8' })
  assert.equal(result.status, 0, result.stderr)
  assert.ok(!result.stdout.includes('private-'))
  const payload = JSON.parse(result.stdout)
  assert.equal(payload.msg_type, 'interactive')
  assert.equal(payload.card.header.template, 'blue')
  assert.match(JSON.stringify(payload), /历史快照/)
})
