import chalk from 'chalk'
import ora from 'ora'
import { sendChat } from '../lib/api'
import { loadConfig } from '../lib/config'

export async function askCommand(
  question: string,
  options: { personality?: string; brain?: boolean; json?: boolean }
) {
  const config = loadConfig()
  const personality = options.personality || config.personality

  if (!config.apiKey && !config.claudeApiKey) {
    console.error(chalk.red('API key required. Run: meowdel config'))
    process.exit(1)
  }

  const spinner = ora(chalk.gray('Asking Meowdel...')).start()

  try {
    const response = await sendChat(question, [], personality, options.brain ?? false)
    spinner.stop()

    if (options.json) {
      console.log(JSON.stringify(response, null, 2))
      return
    }

    console.log(chalk.magenta(`\n${response.personality?.name ?? 'Meowdel'}:`))
    console.log(response.message)

    if (response.brainContext?.length) {
      console.log(chalk.gray(`\n📚 Sources: ${response.brainContext.map(b => b.title).join(', ')}`))
    }

    if (response.usage) {
      console.log(chalk.gray(`\n💭 ${response.usage.inputTokens}↑ ${response.usage.outputTokens}↓`))
    }
    console.log()
  } catch (err: unknown) {
    spinner.stop()
    const msg = err instanceof Error ? err.message : String(err)
    console.error(chalk.red('Error:'), msg)
    process.exit(1)
  }
}
