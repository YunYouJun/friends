import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { snapshot, tsxImport } from './helpers.ts'

const script = fileURLToPath(new URL('../scripts/restore-link-history.ts', import.meta.url))

test('CI history restores only matching observers and rejects malformed snapshots', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'friends-history-'))
  const historyPath = join(directory, '.cache/friends/github-actions.json')
  const snapshotPath = join(directory, 'public/status/report.json')
  const run = () => spawnSync(process.execPath, ['--import', tsxImport, script], { cwd: directory, encoding: 'utf8' })
  try {
    await mkdir(join(directory, 'public/status'), { recursive: true })
    assert.equal(run().status, 0)
    await assert.rejects(readFile(historyPath), { code: 'ENOENT' })

    const ciReport = { ...snapshot, observer: 'github-actions-ubuntu' }
    await writeFile(snapshotPath, JSON.stringify(ciReport))
    assert.equal(run().status, 0)
    assert.deepEqual(JSON.parse(await readFile(historyPath, 'utf8')), ciReport)

    await writeFile(snapshotPath, JSON.stringify({ ...snapshot, observer: 'home' }))
    assert.equal(run().status, 0)
    await assert.rejects(readFile(historyPath), { code: 'ENOENT' })

    await writeFile(snapshotPath, '{broken')
    assert.notEqual(run().status, 0)
    await assert.rejects(readFile(historyPath), { code: 'ENOENT' })
  }
  finally {
    await rm(directory, { recursive: true, force: true })
  }
})

test('notification is off by default and dry-run never needs SMTP credentials', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'friends-email-'))
  const entry = fileURLToPath(new URL('../scripts/notify-link-report.ts', import.meta.url))
  // Deliberately omit all inherited SMTP configuration.
  const env = { PATH: process.env.PATH, LINK_EMAIL_MODE: 'off' }
  try {
    const disabled = spawnSync(process.execPath, ['--import', tsxImport, entry], { cwd: directory, env, encoding: 'utf8' })
    assert.equal(disabled.status, 0)
    assert.match(disabled.stdout, /disabled/)
    await mkdir(join(directory, 'reports/friends'), { recursive: true })
    await writeFile(join(directory, 'reports/friends/report.json'), JSON.stringify(snapshot))
    const preview = spawnSync(process.execPath, ['--import', tsxImport, entry, '--dry-run'], { cwd: directory, env: { ...env, LINK_EMAIL_MODE: 'weekly' }, encoding: 'utf8' })
    assert.equal(preview.status, 0)
    assert.match(preview.stdout, /每周友链检测摘要/)
    const missingConfig = spawnSync(process.execPath, ['--import', tsxImport, entry], { cwd: directory, env: { ...env, LINK_EMAIL_MODE: 'weekly' }, encoding: 'utf8' })
    assert.notEqual(missingConfig.status, 0)
    assert.match(missingConfig.stderr, /Missing SMTP_HOST/)
  }
  finally {
    await rm(directory, { recursive: true, force: true })
  }
})
