import chalk from 'chalk'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { loadConfig } from '../lib/config'

const CLAUDE_SETTINGS_PATH = path.join(os.homedir(), '.claude', 'settings.json')

function readClaudeSettings(): Record<string, any> {
  try {
    if (fs.existsSync(CLAUDE_SETTINGS_PATH)) {
      return JSON.parse(fs.readFileSync(CLAUDE_SETTINGS_PATH, 'utf-8'))
    }
  } catch {
    // fall through
  }
  return {}
}

function writeClaudeSettings(settings: Record<string, any>) {
  const dir = path.dirname(CLAUDE_SETTINGS_PATH)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2))
}

function findMcpServerPath(): string | null {
  // 1. Resolved path of this running process's package dist directory
  const distMcp = path.resolve(__dirname, '..', 'dist', 'mcp-server.js')
  if (fs.existsSync(distMcp)) return distMcp

  // 2. If we are already in dist (compiled), sibling mcp-server.js
  const siblingMcp = path.resolve(__dirname, 'mcp-server.js')
  if (fs.existsSync(siblingMcp)) return siblingMcp

  // 3. Global npm install: find via `npm root -g`
  try {
    const { execSync } = require('child_process')
    const npmRoot = execSync('npm root -g', { encoding: 'utf-8' }).trim()
    const globalMcp = path.join(npmRoot, 'meowdel', 'dist', 'mcp-server.js')
    if (fs.existsSync(globalMcp)) return globalMcp
  } catch {
    // npm not available or not installed globally
  }

  return null
}

export async function claudeSetupCommand() {
  console.log(chalk.magenta('\n🐱 Setting up Meowdel as a Claude MCP server...\n'))

  // ── Check API key ──────────────────────────────────────────────────────────
  const config = loadConfig()
  const apiKey = process.env.MEOWDEL_API_KEY || config.apiKey

  if (!apiKey) {
    console.log(chalk.red('✗ No Meowdel API key configured.'))
    console.log(chalk.yellow('  Run: meowdel config --key YOUR_API_KEY'))
    console.log(chalk.gray('  Get a key: https://meowdel.ai/profile\n'))
    process.exit(1)
  }

  console.log(chalk.green('✓'), 'API key:', chalk.gray('****' + apiKey.slice(-8)))

  // ── Find MCP server binary ─────────────────────────────────────────────────
  const mcpPath = findMcpServerPath()

  let mcpConfig: Record<string, any>

  if (mcpPath) {
    console.log(chalk.green('✓'), 'MCP server:', chalk.gray(mcpPath))
    mcpConfig = {
      command: process.execPath,   // node binary
      args: [mcpPath],
      env: {
        MEOWDEL_API_KEY: apiKey,
      },
    }
  } else {
    // Fall back to the meowdel-mcp bin (if globally linked)
    console.log(chalk.yellow('⚠'), 'dist/mcp-server.js not found — using meowdel-mcp binary')
    console.log(chalk.gray('  If this fails, run: meowdel build first\n'))
    mcpConfig = {
      command: 'meowdel-mcp',
      env: {
        MEOWDEL_API_KEY: apiKey,
      },
    }
  }

  // ── Write to ~/.claude/settings.json ──────────────────────────────────────
  console.log(chalk.gray(`\nUpdating ${CLAUDE_SETTINGS_PATH}…`))

  const settings = readClaudeSettings()
  if (!settings.mcpServers) settings.mcpServers = {}

  const isUpdate = !!settings.mcpServers.meowdel
  settings.mcpServers.meowdel = mcpConfig

  writeClaudeSettings(settings)

  console.log(chalk.green('✓'), isUpdate ? 'Meowdel MCP config updated!' : 'Meowdel MCP server registered!')

  // ── Summary ────────────────────────────────────────────────────────────────
  console.log(`
${chalk.magenta.bold('Restart Claude Code for changes to take effect.')}

${chalk.bold('Claude can now:')}
  ${chalk.cyan('•')} Search your Brain notes
  ${chalk.cyan('•')} Read full note content
  ${chalk.cyan('•')} Browse your knowledge base by tag
  ${chalk.cyan('•')} Ask Meowdel cats for expert opinions

${chalk.bold('Try asking Claude:')}
  ${chalk.gray('"Search my notes for authentication patterns"')}
  ${chalk.gray('"Ask meowdel what bandit thinks about this architecture"')}
  ${chalk.gray('"List my notes tagged #system-design"')}
`)
}

export async function claudeStatusCommand() {
  const settings = readClaudeSettings()
  const meowdel = settings?.mcpServers?.meowdel

  if (!meowdel) {
    console.log(chalk.yellow('\n⚠  Meowdel MCP server is not registered with Claude.\n'))
    console.log(chalk.gray('Run: meowdel claude setup\n'))
    return
  }

  console.log(chalk.magenta('\n🐱 Meowdel MCP Status\n'))
  console.log(chalk.green('✓'), 'Registered in', chalk.gray(CLAUDE_SETTINGS_PATH))
  console.log(chalk.cyan('  Command:'), meowdel.command)
  if (meowdel.args?.length) console.log(chalk.cyan('  Args:   '), meowdel.args.join(' '))
  const key = meowdel.env?.MEOWDEL_API_KEY
  console.log(chalk.cyan('  API key:'), key ? chalk.gray('****' + key.slice(-8)) : chalk.red('not set'))
  console.log()
}
