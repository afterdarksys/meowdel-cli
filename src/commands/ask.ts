import chalk from 'chalk'
import ora from 'ora'
import { chatRequest, apiError } from '../lib/api'
import { loadConfig } from '../lib/config'

export async function askCommand(
  question: string,
  options: { pet?: string; personality?: string; brain?: boolean; json?: boolean }
) {
  const config = loadConfig()
  const petId = options.pet || options.personality || config.defaultPet || config.personality || 'meowdel'

  if (!config.apiKey && !config.claudeApiKey) {
    console.error(chalk.red('API key required. Run: meowdel config'))
    process.exit(1)
  }

  const spinner = ora(chalk.gray('Thinking...')).start()
  try {
    const res = await chatRequest(question, petId)
    spinner.stop()

    if (options.json) {
      console.log(JSON.stringify(res, null, 2))
      return
    }

    console.log(chalk.magenta(`\n${res.petName ?? 'Meowdel'}:`))
    console.log(res.message)

    const r = res._routing
    if (r) {
      console.log(chalk.gray(`\n↳ ${r.tier} · ${r.model}${r.reason ? ' · ' + r.reason : ''}\n`))
    } else {
      console.log()
    }
  } catch (err) {
    spinner.stop()
    console.error(chalk.red('Error:'), apiError(err))
    if ((err as any).response?.status === 401) {
      console.log(chalk.yellow('💡 Run: meowdel config YOUR_API_KEY'))
    }
    process.exit(1)
  }
}
