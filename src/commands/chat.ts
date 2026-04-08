import chalk from 'chalk'
import inquirer from 'inquirer'
import ora from 'ora'
import { sendChat } from '../lib/api'
import { loadConfig } from '../lib/config'

export async function chatCommand(options: { personality?: string; brain?: boolean }) {
  const config = loadConfig()
  const personality = options.personality || config.personality

  if (!config.apiKey && !config.claudeApiKey) {
    console.log(chalk.yellow('\n⚠  No API key configured. Run: meowdel config\n'))
    console.log(chalk.gray('  meowdel.ai API key: get from https://meowdel.ai/profile'))
    console.log(chalk.gray('  Claude API key:     get from https://console.anthropic.com\n'))
    process.exit(1)
  }

  console.clear()
  console.log(chalk.magenta.bold('\n🐱 Meowdel Chat'))
  console.log(chalk.gray(`Personality: ${personality} | Brain: ${options.brain ? 'on' : 'off'}`))
  console.log(chalk.gray('Commands: /exit, /clear, /brain, /personality <name>\n'))

  const history: Array<{ role: string; content: string }> = []

  while (true) {
    const { message } = await inquirer.prompt([
      {
        type: 'input',
        name: 'message',
        message: chalk.blue('You:'),
        prefix: '',
      },
    ])

    const trimmed = message.trim()
    if (!trimmed) continue

    if (['/exit', '/quit', '/q', 'exit', 'quit'].includes(trimmed.toLowerCase())) {
      console.log(chalk.yellow('\n👋 Goodbye! *purr*\n'))
      break
    }

    if (trimmed === '/clear') {
      history.length = 0
      console.clear()
      console.log(chalk.gray('Conversation cleared.\n'))
      continue
    }

    if (trimmed === '/brain') {
      options.brain = !options.brain
      console.log(chalk.gray(`Brain context: ${options.brain ? 'enabled' : 'disabled'}\n`))
      continue
    }

    if (trimmed.startsWith('/personality ')) {
      const newPersonality = trimmed.split(' ')[1]
      options.personality = newPersonality
      console.log(chalk.gray(`Switched to ${newPersonality}\n`))
      continue
    }

    const spinner = ora(chalk.gray('Thinking...')).start()

    try {
      const response = await sendChat(trimmed, history, personality, options.brain ?? false)
      spinner.stop()

      console.log(chalk.magenta(`\n${response.personality?.name ?? 'Meowdel'}:`), response.message)

      if (response.brainContext && response.brainContext.length > 0) {
        console.log(chalk.gray(`\n📚 Brain: ${response.brainContext.map(b => b.title).join(', ')}`))
      }

      if (response.usage) {
        console.log(chalk.gray(`💭 ${response.usage.inputTokens}↑ ${response.usage.outputTokens}↓`))
      }

      console.log()

      history.push({ role: 'user', content: trimmed })
      history.push({ role: 'assistant', content: response.message })
    } catch (err: unknown) {
      spinner.stop()
      const msg = err instanceof Error ? err.message : String(err)
      console.error(chalk.red('\nError:'), msg, '\n')
    }
  }
}
