import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { readFileSync } from 'node:fs'
import process from 'node:process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'
import { parseReport } from 'meodp/check'
import { createNotification } from 'meodp/notify'
import { createFeishuCard } from 'meodp/notify/feishu'
import config from '../meodp.config'

const exec = promisify(execFile)
const cli = fileURLToPath(new URL('../../bin/index.mjs', import.meta.resolve('meodp/config')))

test('friends configuration renders the committed snapshot through meodp public exports', () => {
  const report = parseReport(JSON.parse(readFileSync(config.report.input, 'utf8')))
  const message = createNotification(report, { ...config.notify, previousReport: undefined, mode: 'weekly' })
  assert.ok(message)
  const card = createFeishuCard(message, config.notify)
  assert.match(card.header.title.content, /friends/)
  assert.ok(card.elements.some(item => item.tag === 'action'))
  assert.equal(config.check.input, 'public/links.yml')
  assert.equal(config.report.output, 'dist/status')
  assert.equal(config.report.reporter, 'html')
  assert.equal(config.check.reporter.length, 4)
})

test('notification CLI stays off by default and previews a test card without credentials', async () => {
  // Deliberately omit the user's real credentials and CI environment.
  const env = { PATH: process.env.PATH }
  const disabled = await exec(process.execPath, [cli, 'notify', '--channel', 'feishu'], { env })
  assert.match(disabled.stdout, /disabled/)
  const preview = await exec(process.execPath, [cli, 'notify', '--channel', 'feishu', '--test', '--dry-run'], { env })
  const card = JSON.parse(preview.stdout)
  assert.equal(card.header.template, 'blue')
  assert.match(JSON.stringify(card), /历史快照/)
})
