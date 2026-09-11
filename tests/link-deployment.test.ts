import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import test from 'node:test'
import { waitForReport } from '../scripts/link-deployment.ts'
import { snapshot as report } from './helpers.ts'

test('deployment verification waits through missing, invalid and stale data before accepting the exact report', async () => {
  let requests = 0
  let hasViewer = true
  const server = createServer((request, response) => {
    if (request.url === '/status/') {
      response.writeHead(200, { 'Content-Type': 'text/html' })
      response.end(hasViewer ? '<script id="meodp-data"></script>' : 'unrelated page')
      return
    }
    requests++
    assert.ok(request.url?.includes('observation='))
    if (requests === 1) {
      response.writeHead(404).end()
      return
    }
    const data = requests === 2 ? {} : requests === 3 ? { ...report, completedAt: '2025-01-01T00:00:00Z' } : report
    response.writeHead(200, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify(data))
  })
  await new Promise<void>(resolve => server.listen(0, '127.0.0.1', resolve))
  const address = server.address()
  assert.ok(address && typeof address !== 'string')
  const options = { url: `http://127.0.0.1:${address.port}/status/report.json`, attempts: 4, delayMs: 0 }
  try {
    await waitForReport(report, options)
    assert.equal(requests, 4)
    hasViewer = false
    await assert.rejects(waitForReport(report, { ...options, attempts: 1 }), /did not serve/)
    await assert.rejects(waitForReport({ ...report, completedAt: '2025-02-01T00:00:00Z' }, { ...options, attempts: 1 }), /did not serve/)
  }
  finally {
    await new Promise<void>((resolve, reject) => server.close(error => error ? reject(error) : resolve()))
  }
})
