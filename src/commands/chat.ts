import inquirer from 'inquirer'
import chalk from 'chalk'
import ora from 'ora'
import { chatRequest, apiError } from '../lib/api'
import { loadConfig } from '../lib/config'

export async function chatCommand(options: { pet?: string; personality?: string; brain?: boolean }) {
  const config = loadConfig()
  const petId = options.pet || options.personality || config.defaultPet || config.personality || 'meowdel'

  if (!config.apiKey && !config.claudeApiKey) {
    console.log(chalk.yellow('\n⚠  No API key configured. Run: meowdel config\n'))
    console.log(chalk.gray('  meowdel.ai API key: get from https://meowdel.ai/profile'))
    console.log(chalk.gray('  Claude API key:     get from https://console.anthropic.com\n'))
    process.exit(1)
  }

  console.log(chalk.magenta.bold('\n🐱 Meowdel Chat'))
  console.log(chalk.gray(`Pet: ${petId}  |  type "exit" to quit\n`))

  const history: Array<{ role: string; content: string }> = []

  while (true) {
    const { message } = await inquirer.prompt([{
      type: 'input',
      name: 'message',
      message: chalk.blue('You:'),
      prefix: '',
    }])

    const trimmed = message.trim()
    if (!trimmed) continue
    if (['/exit', '/quit', '/q', 'exit', 'quit'].includes(trimmed.toLowerCase())) {
      console.log(chalk.yellow('\n👋 Goodbye! *purr*\n'))
      break
    }

    if (trimmed === '/clear') {
      history.length = 0
      console.log(chalk.gray('Conversation cleared.\n'))
      continue
    }

    const spinner = ora(chalk.gray('Thinking...')).start()
    try {
      const res = await chatRequest(trimmed, petId, history)
      spinner.stop()

      console.log(chalk.magenta(`\n${res.petName ?? 'Meowdel'}:`), res.message)

      const r = res._routing
      if (r) {
        const parts: string[] = [`${r.tier} · ${r.model}`]
        if (r.activeSkills?.length) parts.push(`skills: ${r.activeSkills.join(', ')}`)
        if (r.cascadeMemoriesUsed) parts.push(`${r.cascadeMemoriesUsed} memories`)
        console.log(chalk.gray(`  ↳ ${parts.join(' · ')}\n`))
      } else {
        console.log()
      }

      history.push({ role: 'user', content: trimmed })
      history.push({ role: 'assistant', content: res.message })
      if (history.length > 20) history.splice(0, 2)
    } catch (err) {
      spinner.stop()
      console.error(chalk.red('\nError:'), apiError(err), '\n')
      if ((err as any).response?.status === 401) {
        console.log(chalk.yellow('💡 Run: meowdel config YOUR_API_KEY\n'))
        break
      }
    }
  }
}
