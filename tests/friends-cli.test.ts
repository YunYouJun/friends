import assert from 'node:assert/strict'
import { execFile } from 'node:child_process'
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import process from 'node:process'
import test from 'node:test'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const loader = import.meta.resolve('tsx')
const cli = fileURLToPath(new URL('../scripts/index.ts', import.meta.url))
const generator = fileURLToPath(new URL('../scripts/generate.ts', import.meta.url))

test('friend CLI exposes help and its version with Commander 15', async () => {
  const help = await exec(process.execPath, ['--import', loader, cli, '--help'])
  assert.match(help.stdout, /Usage:/)
  assert.match(help.stdout, /add/)

  const version = await exec(process.execPath, ['--import', loader, cli, '--version'])
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
  assert.equal(version.stdout.trim(), pkg.version)
})

test('friend generation preserves YAML values and removes emails from public JSON', async (t) => {
  const directory = await mkdtemp(join(tmpdir(), 'friends-generate-'))
  t.after(() => rm(directory, { recursive: true, force: true }))
  await mkdir(join(directory, 'public'))
  await writeFile(join(directory, 'public/links.yml'), `- url: https://example.com
  avatar: https://example.com/avatar.png
  name: 云 ☁️
  blog: "测试: friends"
  desc: "2026-10-12"
  email: private@example.com
  color: '#0078e7'
- url: https://example.org
  name: No email
`)

  await exec(process.execPath, ['--import', loader, generator], { cwd: directory })
  const friends = JSON.parse(await readFile(join(directory, 'dist/links.json'), 'utf8'))
  assert.deepEqual(friends, [
    {
      url: 'https://example.com',
      avatar: 'https://example.com/avatar.png',
      name: '云 ☁️',
      blog: '测试: friends',
      desc: '2026-10-12',
      color: '#0078e7',
    },
    { url: 'https://example.org', name: 'No email' },
  ])
})
