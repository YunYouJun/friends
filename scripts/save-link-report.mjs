import { readReport, saveReport } from 'meodp/check'

const report = await readReport('reports/friends/report.json')
if (!report)
  throw new Error('Missing reports/friends/report.json. Run pnpm run check:links or download a completed CI report first.')

await saveReport(report, 'public/status/report.json')
console.log('Saved status page snapshot. Run pnpm run build to render it, then review and commit public/status/report.json.')
