import { setTimeout } from 'node:timers/promises'
import { parseReport } from 'meodp/check'

export async function waitForReport(expected, { url = 'https://friends.yunyoujun.cn/status/report.json', attempts = 12, delayMs = 15000 } = {}) {
  const expectedJson = JSON.stringify(parseReport(expected))
  for (let attempt = 0; attempt < attempts; attempt++) {
    try {
      const reportUrl = new URL(url)
      reportUrl.searchParams.set('observation', expected.completedAt)
      const options = { cache: 'no-store', signal: AbortSignal.timeout(10000) }
      const response = await fetch(reportUrl, options)
      if (response.ok && JSON.stringify(parseReport(await response.json())) === expectedJson) {
        const page = await fetch(new URL('./', url), { cache: 'no-store', signal: AbortSignal.timeout(10000) })
        if (page.ok && (await page.text()).includes('id="meodp-data"'))
          return
      }
    }
    catch {
      // A stale CDN response, pending deployment or invalid response may recover.
    }
    if (attempt + 1 < attempts)
      await setTimeout(delayMs)
  }
  throw new Error('The public status page did not serve this report in time. Check the GitHub Pages / EdgeOne deployment; report artifacts remain available.')
}
