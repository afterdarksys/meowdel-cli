#!/usr/bin/env node
/**
 * Meowdel CLI
 * Chat with AI, manage your Brain knowledge base, and run AI agents from your terminal.
 *
 * Install: npm install -g meowdel
 * Setup:   meowdel config
 * Chat:    meowdel chat
 * Brain:   meowdel brain list
 */

import { Command } from 'commander'
import chalk from 'chalk'
import dotenv from 'dotenv'

dotenv.config()

const program = new Command()

program
  .name('meowdel')
  .description(chalk.magenta('🐱 Meowdel — AI knowledge, chat, and agents from your terminal'))
  .version('1.0.0')

// ── config ────────────────────────────────────────────────────────────────────
program
  .command('config')
  .description('Configure Meowdel CLI (API keys, personality, URL)')
  .option('-k, --key <key>', 'Set meowdel.ai API key')
  .option('-c, --claude <key>', 'Set your Claude API key for direct AI access')
  .option('-u, --url <url>', 'Set meowdel.ai base URL')
  .option('-p, --personality <name>', 'Set default personality')
  .option('-s, --show', 'Show current config')
  .action(async (options) => {
    const { configCommand } = await import('./commands/config')
    await configCommand(options)
  })

// ── chat ──────────────────────────────────────────────────────────────────────
program
  .command('chat')
  .description('Start an interactive chat session with Meowdel')
  .option('-p, --personality <name>', 'Choose personality (mittens, luna, bandit...)')
  .option('-b, --brain', 'Enable Brain context', false)
  .action(async (options) => {
    const { chatCommand } = await import('./commands/chat')
    await chatCommand(options)
  })

// ── ask ───────────────────────────────────────────────────────────────────────
program
  .command('ask <question>')
  .description('Ask a one-off question')
  .option('-p, --personality <name>', 'Choose personality')
  .option('-b, --brain', 'Enable Brain context', false)
  .option('-j, --json', 'Output as JSON', false)
  .action(async (question, options) => {
    const { askCommand } = await import('./commands/ask')
    await askCommand(question, options)
  })

// ── brain ─────────────────────────────────────────────────────────────────────
program
  .command('brain <action> [query]')
  .description('Brain knowledge base operations')
  .option('-t, --title <title>', 'Note title (for new)')
  .option('-f, --file <path>', 'Import from file (for new)')
  .option('--tag <tag>', 'Tag (for new)')
  .option('-s, --slug <slug>', 'Note slug (for get/agent)')
  .addHelpText('after', `
Actions:
  list          List all notes
  search        Semantic search
  new           Create a new note
  get           Get note content
  graph         Show knowledge graph stats
  agent         Queue an AI agent job (summarize, embed, auto-link)

Examples:
  meowdel brain list
  meowdel brain search "machine learning"
  meowdel brain new --title "My Note" --file ./notes/foo.md
  meowdel brain get --slug my-note
  meowdel brain agent --slug my-note
  `)
  .action(async (action, query, options) => {
    const { brainCommand } = await import('./commands/brain')
    await brainCommand({ action, query, ...options })
  })

// ── login ─────────────────────────────────────────────────────────────────────
program
  .command('login')
  .description('Login to meowdel.ai and save your API key')
  .action(async () => {
    const open = (await import('open')).default
    const { loadConfig } = await import('./lib/config')
    const config = loadConfig()
    console.log(chalk.magenta('\n🐱 Opening meowdel.ai in your browser...\n'))
    console.log(chalk.gray('After logging in, go to Profile → API Keys and run:'))
    console.log(chalk.cyan('  meowdel config --key YOUR_API_KEY\n'))
    await open(`${config.baseUrl}/profile`)
  })

// ── personalities ─────────────────────────────────────────────────────────────
program
  .command('personalities')
  .description('List available AI cat personalities')
  .action(() => {
    console.log(chalk.magenta('\n🐱 Meowdel Personalities\n'))
    const personalities = [
      { id: 'mittens', desc: 'Friendly, helpful, warm — the default' },
      { id: 'luna', desc: 'Mystical, poetic, dreamy' },
      { id: 'bandit', desc: 'Bold, quick, street-smart (the Brain expert)' },
      { id: 'bella', desc: 'Elegant, precise, detail-oriented' },
      { id: 'blubie', desc: 'Playful, curious, enthusiastic' },
      { id: 'professor', desc: 'Academic, thorough, loves footnotes' },
      { id: 'ninja', desc: 'Concise, fast, no fluff' },
      { id: 'kiki', desc: 'Creative, quirky, outside-the-box' },
    ]
    personalities.forEach(p => {
      console.log(chalk.cyan(`  ${p.id.padEnd(12)}`), chalk.gray(p.desc))
    })
    console.log()
    console.log(chalk.gray('Usage: meowdel chat -p bandit'))
    console.log()
  })

program.parse(process.argv)

if (!process.argv.slice(2).length) {
  console.log(chalk.magenta('\n🐱 Meowdel CLI\n'))
  program.outputHelp()
}
