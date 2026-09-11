import { readReport, saveReport } from 'meodp/check'
import config from '../meodp.config'

const report = await readReport(config.notify.input)
if (!report)
  throw new Error('Missing reports/friends/report.json. Run pnpm run check:links or download a completed CI report first.')

await saveReport(report, config.report.input)
console.log('Saved status page snapshot. Run pnpm run build to render it; CI publishes the generated files to gh-pages.')
