import { app, dialog } from 'electron'
import { writeFile, mkdir } from 'fs/promises'
import { existsSync } from 'fs'
import { join } from 'path'
import { APP_NAME, APP_VERSION } from '../shared/constants'

interface ErrorReport {
  timestamp: string
  version: string
  platform: string
  errorType: string
  message: string
  stack?: string
  context?: Record<string, string>
}

let logDir: string

function getLogDir(): string {
  if (!logDir) {
    logDir = join(app.getPath('userData'), 'logs')
  }
  return logDir
}

async function ensureLogDir(): Promise<void> {
  const dir = getLogDir()
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true })
  }
}

function formatReport(report: ErrorReport): string {
  const lines = [
    `=== ${report.errorType} ===`,
    `Time: ${report.timestamp}`,
    `App: ${APP_NAME} v${report.version}`,
    `Platform: ${report.platform}`,
    `Message: ${report.message}`,
  ]
  if (report.stack) {
    lines.push('', 'Stack:', report.stack)
  }
  if (report.context) {
    lines.push('', 'Context:')
    for (const [key, value] of Object.entries(report.context)) {
      lines.push(`  ${key}: ${value}`)
    }
  }
  lines.push('', '---')
  return lines.join('\n')
}

function createReport(errorType: string, error: Error | any, context?: Record<string, string>): ErrorReport {
  return {
    timestamp: new Date().toISOString(),
    version: APP_VERSION,
    platform: `${process.platform} ${process.arch}`,
    errorType,
    message: error?.message || String(error),
    stack: error?.stack,
    context
  }
}

export async function writeErrorLog(report: ErrorReport): Promise<string> {
  await ensureLogDir()
  const date = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
  const filename = `error-${date}.log`
  const filepath = join(getLogDir(), filename)
  await writeFile(filepath, formatReport(report), 'utf-8')
  return filepath
}

export function setupErrorHandling(): void {
  process.on('uncaughtException', async (error) => {
    console.error('[uncaughtException]', error)
    const report = createReport('uncaughtException', error)
    await writeErrorLog(report)
  })

  process.on('unhandledRejection', async (reason) => {
    console.error('[unhandledRejection]', reason)
    const report = createReport('unhandledRejection', reason)
    await writeErrorLog(report)
  })
}

export function getLogDirPath(): string {
  return getLogDir()
}

export async function collectLogsForReport(): Promise<string> {
  const { readdir, readFile } = require('fs/promises')
  await ensureLogDir()
  try {
    const files = await readdir(getLogDir())
    const logFiles = files.filter((f: string) => f.endsWith('.log')).sort().slice(-5)
    const contents: string[] = []
    for (const file of logFiles) {
      const content = await readFile(join(getLogDir(), file), 'utf-8')
      contents.push(`=== ${file} ===\n${content}`)
    }
    return contents.join('\n\n')
  } catch {
    return 'No log files found.'
  }
}

export function generateIssueUrl(title: string, body: string): string {
  const repoUrl = 'https://github.com/NicholasQu/NicMD'
  const params = new URLSearchParams({
    title: title || 'Bug report',
    body: body || ''
  })
  return `${repoUrl}/issues/new?${params.toString()}`
}

export { createReport, formatReport }
