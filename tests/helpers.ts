import type { Availability, CheckReport } from 'meodp/check'
import { readFileSync } from 'node:fs'
import { parseReport } from 'meodp/check'

export const snapshot = parseReport(JSON.parse(readFileSync(new URL('../public/status/report.json', import.meta.url), 'utf8')))
// Use an absolute loader URL so child processes also run from temporary directories.
export const tsxImport = import.meta.resolve('tsx')

export function report(status: Availability, consecutiveFailures = 0, observer = 'github-actions-ubuntu'): CheckReport {
  const completedAt = '2026-09-11T01:17:00Z'
  return {
    schemaVersion: 1,
    observer,
    startedAt: completedAt,
    completedAt,
    summary: { total: 1, reachable: Number(status === 'reachable'), restricted: Number(status === 'restricted'), unavailable: Number(status === 'unavailable'), redirected: 0, recovered: 0 },
    results: [{
      name: 'Example',
      url: 'https://example.com/',
      finalUrl: 'https://example.com/',
      status,
      checkedAt: completedAt,
      durationMs: 1,
      attempts: 1,
      redirects: [],
      changed: false,
      recovered: false,
      consecutiveFailures,
      httpStatus: status === 'reachable' ? 200 : 403,
    }],
  }
}
