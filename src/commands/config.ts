import chalk from 'chalk'
import inquirer from 'inquirer'
import { loadConfig, saveConfig, getConfigPath } from '../lib/config'
import { KNOWN_PETS } from '../lib/api'

export async function configCommand(options: {
  key?: string
  url?: string
  pet?: string
  personality?: string
  claude?: string
  openai?: string
  show?: boolean
}) {
  const config = loadConfig()

  if (options.show) {
    const pet = config.defaultPet || config.personality
    console.log(chalk.magenta('\n🐱 Meowdel Configuration\n'))
    console.log(chalk.gray(`Config file: ${getConfigPath()}`))
    console.log(chalk.cyan('API Key:     ') + (config.apiKey ? chalk.green('✓ configured') : chalk.red('not set')))
    console.log(chalk.cyan('Claude Key:  ') + (config.claudeApiKey ? chalk.green('✓ configured') : chalk.gray('not set (optional)')))
    console.log(chalk.cyan('OpenAI Key:  ') + (config.openAiKey ? chalk.green('✓ configured') : chalk.gray('not set (optional)')))
    console.log(chalk.cyan('Base URL:    ') + config.baseUrl)
    console.log(chalk.cyan('Default pet: ') + pet)
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

  const newPet = options.pet || options.personality
  if (newPet) {
    saveConfig({ defaultPet: newPet, personality: newPet })
    console.log(chalk.green(`✓ Default pet set to ${newPet}`))
    return
  }

  if (options.claude) {
    saveConfig({ claudeApiKey: options.claude })
    console.log(chalk.green('✓ Claude API key saved — direct Anthropic integration enabled'))
    return
  }

  if (options.openai) {
    saveConfig({ openAiKey: options.openai })
    console.log(chalk.green('✓ OpenAI API key saved — Codex/ChatGPT integration enabled'))
    return
  }

  // Interactive setup
  console.log(chalk.magenta('\n🐱 Meowdel Setup\n'))
  console.log(chalk.gray('Configure your Meowdel CLI. Press Enter to keep current values.\n'))

  const petChoices = KNOWN_PETS
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
      message: 'Claude API key (optional, Anthropic direct access):',
      default: config.claudeApiKey || '',
    },
    {
      type: 'input',
      name: 'openAiKey',
      message: 'OpenAI API key (optional, Codex/ChatGPT direct access):',
      default: config.openAiKey || '',
    },
    {
      type: 'list',
      name: 'defaultPet',
      message: 'Default pet:',
      choices: petChoices,
      default: config.defaultPet || config.personality || 'meowdel',
    },
  ])

  saveConfig({
    apiKey: answers.apiKey || undefined,
    claudeApiKey: answers.claudeApiKey || undefined,
    openAiKey: answers.openAiKey || undefined,
    defaultPet: answers.defaultPet,
    personality: answers.defaultPet,
  })

  console.log(chalk.green('\n✓ Configuration saved!'))
  console.log(chalk.gray(`Stored at: ${getConfigPath()}\n`))
}
