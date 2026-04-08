import chalk from 'chalk'
import inquirer from 'inquirer'
import { loadConfig, saveConfig, getConfigPath } from '../lib/config'

export async function configCommand(options: {
  key?: string
  url?: string
  personality?: string
  claude?: string
  show?: boolean
}) {
  const config = loadConfig()

  if (options.show) {
    console.log(chalk.magenta('\n🐱 Meowdel Configuration\n'))
    console.log(chalk.gray(`Config file: ${getConfigPath()}`))
    console.log(chalk.cyan('API Key:     ') + (config.apiKey ? chalk.green('✓ configured') : chalk.red('not set')))
    console.log(chalk.cyan('Claude Key:  ') + (config.claudeApiKey ? chalk.green('✓ configured') : chalk.gray('not set (optional)')))
    console.log(chalk.cyan('Base URL:    ') + config.baseUrl)
    console.log(chalk.cyan('Personality: ') + config.personality)
    console.log()
    return
  }

  if (options.key) {
    saveConfig({ apiKey: options.key })
    console.log(chalk.green('✓ API key saved'))
    return
  }

  if (options.url) {
    saveConfig({ baseUrl: options.url })
    console.log(chalk.green(`✓ Base URL set to ${options.url}`))
    return
  }

  if (options.personality) {
    saveConfig({ personality: options.personality })
    console.log(chalk.green(`✓ Default personality set to ${options.personality}`))
    return
  }

  if (options.claude) {
    saveConfig({ claudeApiKey: options.claude })
    console.log(chalk.green('✓ Claude API key saved — direct Claude integration enabled'))
    return
  }

  // Interactive setup
  console.log(chalk.magenta('\n🐱 Meowdel Setup\n'))
  console.log(chalk.gray('Configure your Meowdel CLI. Press Enter to keep current values.\n'))

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'apiKey',
      message: 'Meowdel API key (from meowdel.ai/profile):',
      default: config.apiKey || '',
    },
    {
      type: 'input',
      name: 'claudeApiKey',
      message: 'Claude API key (optional, for direct AI access):',
      default: config.claudeApiKey || '',
    },
    {
      type: 'list',
      name: 'personality',
      message: 'Default personality:',
      choices: ['mittens', 'luna', 'bandit', 'bella', 'blubie', 'professor', 'ninja', 'kiki'],
      default: config.personality,
    },
  ])

  saveConfig({
    apiKey: answers.apiKey || undefined,
    claudeApiKey: answers.claudeApiKey || undefined,
    personality: answers.personality,
  })

  console.log(chalk.green('\n✓ Configuration saved!'))
  console.log(chalk.gray(`Stored at: ${getConfigPath()}\n`))
}
