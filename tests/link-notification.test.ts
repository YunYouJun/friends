import type { CheckReport } from 'meodp/check'
import assert from 'node:assert/strict'
import test from 'node:test'
import { createNotification, smtpOptions } from '../scripts/link-notification.ts'
import { report } from './helpers.ts'

const message = (current: CheckReport, previous?: CheckReport, mode = 'changes') => createNotification(current, previous, mode, 'https://friends.yunyoujun.cn/status/', 'https://github.com/YunYouJun/friends/actions/runs/1')

function notification(current: CheckReport, previous?: CheckReport, mode = 'changes') {
  const result = message(current, previous, mode)
  assert.ok(result, 'Expected a notification')
  return result
}

test('healthy first observation and unchanged states stay quiet', () => {
  assert.equal(message(report('reachable')), undefined)
  assert.equal(message(report('reachable'), report('reachable')), undefined)
  assert.equal(message(report('restricted'), report('restricted')), undefined)
  assert.equal(message(report('unavailable', 3), report('unavailable', 2)), undefined)
  assert.equal(message(report('unavailable', 2), report('unavailable', 2)), undefined)
})

test('first unavailable observation or newly unavailable site sends a notification', () => {
  assert.match(notification(report('unavailable', 1)).text, /新增不可访问/)
  assert.match(notification(report('unavailable', 1), report('reachable')).text, /新增不可访问/)
})

test('second consecutive failure triggers one escalation', () => {
  assert.match(notification(report('unavailable', 2), report('unavailable', 1)).text, /连续两次检测失败/)
  assert.equal(message(report('unavailable', 4), report('unavailable', 3)), undefined)
})

test('new restrictions and recovery from either failure state are reported', () => {
  assert.match(notification(report('restricted'), report('reachable')).text, /新增访问限制/)
  assert.match(notification(report('reachable'), report('restricted')).text, /恢复访问/)
  assert.match(notification(report('reachable'), report('unavailable', 3)).text, /恢复访问/)
})

test('new URLs and different observers start a new baseline', () => {
  const previous = report('unavailable', 1)
  previous.results[0].url = 'https://other.example/'
  assert.match(notification(report('unavailable', 1), previous).text, /新增不可访问/)
  assert.match(notification(report('unavailable', 1), report('unavailable', 8, 'home')).text, /新增不可访问/)
  assert.equal(message(report('reachable'), report('unavailable', 8, 'home')), undefined)
})

test('weekly mode sends even healthy summaries and includes stable issues and recoveries', () => {
  assert.match(notification(report('reachable'), report('reachable'), 'weekly').subject, /每周/)
  assert.match(notification(report('unavailable', 5), report('unavailable', 4), 'weekly').text, /连续失败 5 次/)
  assert.match(notification(report('reachable'), report('unavailable', 4), 'weekly').text, /恢复访问/)
})

test('notification has plain text, fixed subject, report and artifact links', () => {
  const current = report('restricted')
  current.results[0].name = 'Injected\r\nSubject: nope'
  const result = notification(current)
  assert.match(result.text, /Injected Subject: nope/)
  assert.ok(!result.subject.includes('Injected'))
  assert.ok(!('html' in result))
  assert.match(result.text, /https:\/\/friends.yunyoujun.cn\/status\//)
  assert.match(result.text, /actions\/runs\/1/)
  assert.throws(() => message(current, undefined, 'unexpected'), /Notification mode/)
})

test('SMTP requires configuration, TLS, valid ports and bounded timeouts', () => {
  const env = { SMTP_HOST: 'smtp.example.com', SMTP_USER: 'user', SMTP_PASSWORD: 'test-only', MAIL_FROM: 'from@example.com', MAIL_TO: 'to@example.com' }
  assert.throws(() => smtpOptions({}), /Missing SMTP_HOST/)
  assert.throws(() => smtpOptions({ ...env, SMTP_PORT: '25' }), /SMTP_PORT/)
  assert.throws(() => smtpOptions({ ...env, SMTP_PORT: 'NaN' }), /SMTP_PORT/)
  assert.equal(smtpOptions(env).secure, true)
  assert.equal(smtpOptions({ ...env, SMTP_PORT: '587' }).secure, false)
  assert.equal(smtpOptions({ ...env, SMTP_PORT: '587' }).requireTLS, true)
  assert.equal(smtpOptions(env).socketTimeout, 30000)
  assert.equal(smtpOptions(env).disableFileAccess, true)
  assert.equal(smtpOptions(env).disableUrlAccess, true)
})
