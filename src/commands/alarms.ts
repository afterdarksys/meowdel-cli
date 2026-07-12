import chalk from 'chalk'
import ora from 'ora'
import inquirer from 'inquirer'
import {
  listAlarms, createAlarm, updateAlarm, deleteAlarm, checkAlarms, snoozeAlarm,
  KNOWN_PETS, apiError, type RepeatFrequency, type Alarm,
} from '../lib/api'

const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

function fmtTime(h: number, m: number): string {
  const ampm = h >= 12 ? 'PM' : 'AM'
  const h12 = h % 12 || 12
  return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`
}

function fmtRepeat(a: Alarm): string {
  if (!a.repeatEnabled) return chalk.gray('once')
  switch (a.repeatFrequency) {
    case 'daily':    return 'every day'
    case 'weekdays': return 'weekdays'
    case 'weekends': return 'weekends'
    case 'weekly':
    case 'custom':
      return (a.repeatDays || []).map(d => DOW[d]).join(', ') || a.repeatFrequency
    default:         return a.repeatFrequency
  }
}

export async function alarmsListCommand() {
  const spinner = ora('Loading alarms…').start()
  try {
    const { alarms, max } = await listAlarms()
    spinner.stop()

    if (!alarms.length) {
      console.log(chalk.gray(`No alarms. You can create up to ${max}.\n`))
      return
    }

    console.log(chalk.bold(`\nALARMS  (${alarms.length}/${max})\n`))
    for (const a of alarms) {
      const status = a.isEnabled ? chalk.green('●') : chalk.gray('○')
      const snoozed = a.snoozeUntil && new Date(a.snoozeUntil) > new Date()
        ? chalk.yellow(` [snoozed until ${new Date(a.snoozeUntil).toLocaleTimeString()}]`)
        : ''
      console.log(`${status} ${chalk.cyan(fmtTime(a.hour, a.minute))}  ${chalk.bold(a.label)}  ${chalk.gray(fmtRepeat(a))}${snoozed}`)
      console.log(`  ${chalk.dim(a.id)}  tz: ${a.timezone}  pet: ${a.petId || 'default'}`)
      if (a.nextFireAt) console.log(`  next: ${chalk.dim(new Date(a.nextFireAt).toLocaleString())}`)
      console.log()
    }
  } catch (err) {
    spinner.stop()
    console.error(chalk.red('Error:'), apiError(err))
    process.exit(1)
  }
}

async function promptAlarmFields(defaults?: Partial<Alarm>) {
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'label',
      message: 'Alarm label:',
      default: defaults?.label || 'Alarm',
    },
    {
      type: 'input',
      name: 'time',
      message: 'Time (HH:MM, 24-hour):',
      default: defaults ? `${String(defaults.hour ?? 7).padStart(2, '0')}:${String(defaults.minute ?? 0).padStart(2, '0')}` : '07:00',
      validate: (v: string) => /^\d{1,2}:\d{2}$/.test(v) || 'Enter time as HH:MM',
    },
    {
      type: 'input',
      name: 'timezone',
      message: 'Timezone (IANA, e.g. America/New_York):',
      default: defaults?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
    },
    {
      type: 'confirm',
      name: 'repeatEnabled',
      message: 'Repeat?',
      default: defaults?.repeatEnabled ?? false,
    },
    {
      type: 'list',
      name: 'repeatFrequency',
      message: 'Repeat frequency:',
      choices: [
        { name: 'Daily',             value: 'daily' },
        { name: 'Weekdays (Mon–Fri)', value: 'weekdays' },
        { name: 'Weekends (Sat–Sun)', value: 'weekends' },
        { name: 'Specific days',      value: 'custom' },
      ],
      when: (a: any) => a.repeatEnabled,
      default: defaults?.repeatFrequency || 'daily',
    },
    {
      type: 'checkbox',
      name: 'repeatDays',
      message: 'Which days?',
      choices: DOW.map((d, i) => ({ name: d, value: i })),
      when: (a: any) => a.repeatEnabled && a.repeatFrequency === 'custom',
      default: defaults?.repeatDays || [],
    },
    {
      type: 'list',
      name: 'petId',
      message: 'Which cat wakes you up?',
      choices: [
        { name: 'Default (your selected pet)', value: '' },
        ...KNOWN_PETS.map(p => ({ name: p, value: p })),
      ],
      default: defaults?.petId || '',
    },
  ])

  const [hStr, mStr] = answers.time.split(':')
  return {
    label: answers.label,
    hour: parseInt(hStr, 10),
    minute: parseInt(mStr, 10),
    timezone: answers.timezone,
    repeatEnabled: answers.repeatEnabled ?? false,
    repeatFrequency: (answers.repeatFrequency || 'none') as RepeatFrequency,
    repeatDays: answers.repeatDays || [],
    petId: answers.petId || undefined,
  }
}

export async function alarmsAddCommand() {
  const fields = await promptAlarmFields()
  const spinner = ora('Creating alarm…').start()
  try {
    const alarm = await createAlarm(fields)
    spinner.stop()
    console.log(chalk.green('✓'), `Alarm created: ${chalk.cyan(fmtTime(alarm.hour, alarm.minute))} — ${alarm.label}`)
    if (alarm.nextFireAt) console.log(chalk.gray(`  Next: ${new Date(alarm.nextFireAt).toLocaleString()}`))
  } catch (err) {
    spinner.stop()
    console.error(chalk.red('Error:'), apiError(err))
    process.exit(1)
  }
}

export async function alarmsEditCommand(id: string) {
  let current: Alarm | undefined
  try {
    const { alarms } = await listAlarms()
    current = alarms.find(a => a.id === id)
    if (!current) { console.error(chalk.red(`Alarm ${id} not found`)); process.exit(1) }
  } catch (err) {
    console.error(chalk.red('Error:'), apiError(err)); process.exit(1)
  }

  const fields = await promptAlarmFields(current)
  const spinner = ora('Updating alarm…').start()
  try {
    const alarm = await updateAlarm(id, fields)
    spinner.stop()
    console.log(chalk.green('✓'), `Updated: ${chalk.cyan(fmtTime(alarm.hour, alarm.minute))} — ${alarm.label}`)
  } catch (err) {
    spinner.stop()
    console.error(chalk.red('Error:'), apiError(err))
    process.exit(1)
  }
}

export async function alarmsToggleCommand(id: string) {
  try {
    const { alarms } = await listAlarms()
    const alarm = alarms.find(a => a.id === id)
    if (!alarm) { console.error(chalk.red(`Alarm ${id} not found`)); process.exit(1) }
    const updated = await updateAlarm(id, { isEnabled: !alarm.isEnabled })
    const state = updated.isEnabled ? chalk.green('enabled') : chalk.gray('disabled')
    console.log(chalk.green('✓'), `Alarm ${state}: ${updated.label}`)
  } catch (err) {
    console.error(chalk.red('Error:'), apiError(err)); process.exit(1)
  }
}

export async function alarmsDeleteCommand(id: string) {
  const { confirm } = await inquirer.prompt([{
    type: 'confirm', name: 'confirm',
    message: `Delete alarm ${id}?`,
    default: false,
  }])
  if (!confirm) { console.log(chalk.gray('Cancelled.')); return }

  const spinner = ora('Deleting…').start()
  try {
    await deleteAlarm(id)
    spinner.stop()
    console.log(chalk.green('✓'), 'Alarm deleted')
  } catch (err) {
    spinner.stop()
    console.error(chalk.red('Error:'), apiError(err))
    process.exit(1)
  }
}

export async function alarmsCheckCommand() {
  const spinner = ora('Checking alarms…').start()
  try {
    const fired = await checkAlarms()
    spinner.stop()
    if (!fired.length) {
      console.log(chalk.gray('No alarms due right now.'))
      return
    }
    for (const a of fired) {
      console.log(chalk.yellow.bold(`\n🔔 ALARM: ${a.label}`))
      console.log(chalk.cyan(fmtTime(a.hour, a.minute)), chalk.gray(a.timezone))
      console.log(chalk.magenta(`\n${a.catMessage}\n`))
      const { action } = await inquirer.prompt([{
        type: 'list', name: 'action',
        message: 'What do you want to do?',
        choices: [
          { name: 'Dismiss', value: 'dismiss' },
          { name: 'Snooze 9 minutes', value: 'snooze9' },
          { name: 'Snooze 5 minutes', value: 'snooze5' },
        ],
      }])
      if (action === 'snooze9') await snoozeAlarm(a.id, 9).catch(() => {})
      if (action === 'snooze5') await snoozeAlarm(a.id, 5).catch(() => {})
    }
  } catch (err) {
    spinner.stop()
    console.error(chalk.red('Error:'), apiError(err))
    process.exit(1)
  }
}
