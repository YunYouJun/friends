import { readReport } from 'meodp/check'
import { waitForReport } from './link-deployment.ts'

const report = await readReport('reports/friends/report.json')
if (!report)
  throw new Error('Missing completed report to verify against the deployed site.')
await waitForReport(report)
console.log('The public status page is serving this run\'s report.')
