import { rm } from 'node:fs/promises'
import { readReport, saveReport } from 'meodp/check'

const path = '.cache/friends/github-actions.json'
const report = await readReport('public/status/report.json')
if (report?.observer === 'github-actions-ubuntu') {
  await saveReport(report, path)
  console.log('Restored CI history from the committed status snapshot.')
}
else {
  await rm(path, { force: true })
  console.log('No CI snapshot yet; start a new series of CI observations.')
}
