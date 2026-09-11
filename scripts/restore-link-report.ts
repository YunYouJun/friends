import { execFile } from 'node:child_process'
import process from 'node:process'
import { promisify } from 'node:util'
import { parseReport, saveReport } from 'meodp/check'
import config from '../meodp.config'

const args = process.argv.slice(2)
if (args[0] === '--')
  args.shift()
if (args.length > 1)
  throw new Error('Provide at most one destination file.')

const exec = promisify(execFile)
await exec('git', ['fetch', '--no-tags', '--depth=1', 'origin', 'gh-pages'])
const { stdout } = await exec('git', ['show', 'FETCH_HEAD:status/report.json'], { maxBuffer: 10 * 1024 * 1024 })
const report = parseReport(JSON.parse(stdout))
const destination = args[0] || config.report.input
await saveReport(report, destination)
console.log(`Restored published snapshot to ${destination}`)
