import chalk from 'chalk'
import ora from 'ora'
import { getPet, KNOWN_PETS, apiError } from '../lib/api'

export async function listPersonalities() {
  console.log(chalk.magenta('\n🐱 Fetching personalities…\n'))

  for (const petId of KNOWN_PETS) {
    const spinner = ora(petId).start()
    try {
      const pet = await getPet(petId)
      spinner.stop()
      console.log(chalk.cyan.bold(pet.id))
      console.log(chalk.gray(`  Name:        ${pet.name}`))
      console.log(chalk.gray(`  Breed:       ${pet.breed}`))
      console.log(chalk.gray(`  Personality: ${pet.personality}`))
      console.log(chalk.gray(`  Greeting:    "${pet.greeting.slice(0, 80).replace(/\n/g, ' ')}…"`))
      console.log()
    } catch (err) {
      spinner.stop()
      console.log(chalk.gray(`  ${petId}: ${apiError(err)}`))
    }
  }

  console.log(chalk.gray('Use: meowdel chat --pet <id>  or  meowdel ask --pet <id> "question"'))
}
