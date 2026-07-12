import chalk from 'chalk'
import ora from 'ora'
import inquirer from 'inquirer'
import { spawnSync } from 'child_process'
import { writeFileSync, readFileSync, unlinkSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import {
  listNotes, getNote, createNote, updateNote, deleteNote, searchNotes, apiError,
} from '../lib/api'

function timeAgo(iso: string): string {
  const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (secs < 60) return 'just now'
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`
  return `${Math.floor(secs / 86400)}d ago`
}

function openEditor(initial = ''): string {
  const editor = process.env.EDITOR || process.env.VISUAL || 'nano'
  const tmp = join(tmpdir(), `meowdel-note-${Date.now()}.md`)
  writeFileSync(tmp, initial, 'utf-8')
  spawnSync(editor, [tmp], { stdio: 'inherit' })
  const result = readFileSync(tmp, 'utf-8')
  try { unlinkSync(tmp) } catch { /* ignore */ }
  return result
}

export async function notesListCommand(options: { tag?: string; search?: string }) {
  const spinner = ora('Loading notes…').start()
  try {
    let notes = await listNotes()
    spinner.stop()

    if (options.search) {
      const q = options.search.toLowerCase()
      notes = notes.filter(n =>
        n.title.toLowerCase().includes(q) ||
        (n.summary || '').toLowerCase().includes(q) ||
        n.tags.some(t => t.toLowerCase().includes(q))
      )
    }
    if (options.tag) {
      notes = notes.filter(n => n.tags.includes(options.tag!))
    }

    if (!notes.length) {
      console.log(chalk.gray('No notes found.'))
      return
    }

    const slugW = Math.min(30, Math.max(...notes.map(n => n.slug.length)))
    const titleW = Math.min(40, Math.max(...notes.map(n => n.title.length)))
    console.log(
      chalk.bold(
        `${'SLUG'.padEnd(slugW)}  ${'TITLE'.padEnd(titleW)}  ${'TAGS'.padEnd(20)}  WORDS  UPDATED`
      )
    )
    for (const n of notes.slice(0, 50)) {
      const tags = (n.tags || []).slice(0, 3).join(', ')
      console.log(
        `${chalk.cyan(n.slug.padEnd(slugW))}  ${n.title.padEnd(titleW)}  ${chalk.gray(tags.padEnd(20))}  ${String(n.wordCount || 0).padStart(5)}  ${chalk.dim(timeAgo(n.updatedAt))}`
      )
    }
    if (notes.length > 50) console.log(chalk.gray(`…and ${notes.length - 50} more`))
    console.log(chalk.gray(`\nTotal: ${notes.length}`))
  } catch (err) {
    spinner.stop()
    console.error(chalk.red('Error:'), apiError(err))
    process.exit(1)
  }
}

export async function notesViewCommand(slug: string) {
  const spinner = ora('Fetching note…').start()
  try {
    const note = await getNote(slug)
    spinner.stop()
    console.log(chalk.bold.cyan(`\n${note.title}`), chalk.gray(`  (${slug})`))
    if (note.tags?.length) console.log(chalk.gray(`Tags: ${note.tags.join(', ')}`))
    if (note.summary) console.log(chalk.italic.gray(note.summary))
    console.log(chalk.gray(`${note.wordCount}w · updated ${timeAgo(note.updatedAt)}\n`))
    console.log(note.content)
  } catch (err) {
    spinner.stop()
    console.error(chalk.red('Error:'), apiError(err))
    process.exit(1)
  }
}

export async function notesNewCommand(titleArg?: string) {
  let title = titleArg?.trim()
  if (!title) {
    const { t } = await inquirer.prompt([{ type: 'input', name: 't', message: 'Note title:' }])
    title = t.trim()
  }
  if (!title) return

  console.log(chalk.gray(`Opening editor for "${title}"…`))
  const content = openEditor(`# ${title}\n\n`)

  if (content.trim() === `# ${title}`) {
    console.log(chalk.gray('No content — note not created.'))
    return
  }

  const spinner = ora('Creating note…').start()
  try {
    const result = await createNote(title, content)
    spinner.stop()
    console.log(chalk.green('✓'), `Created: ${chalk.cyan(result.slug)}`)
  } catch (err) {
    spinner.stop()
    console.error(chalk.red('Error:'), apiError(err))
    process.exit(1)
  }
}

export async function notesEditCommand(slug: string) {
  const spinner = ora('Fetching note…').start()
  try {
    const note = await getNote(slug)
    spinner.stop()
    console.log(chalk.gray(`Opening "${note.title}" in editor…`))
    const content = openEditor(note.content)
    if (content === note.content) {
      console.log(chalk.gray('No changes.'))
      return
    }
    const saveSpinner = ora('Saving…').start()
    await updateNote(slug, { content })
    saveSpinner.stop()
    console.log(chalk.green('✓'), `Saved (${content.trim().split(/\s+/).length} words)`)
  } catch (err) {
    spinner.stop()
    console.error(chalk.red('Error:'), apiError(err))
    process.exit(1)
  }
}

export async function notesDeleteCommand(slug: string) {
  let note: Awaited<ReturnType<typeof getNote>>
  try {
    note = await getNote(slug)
  } catch (err) {
    console.error(chalk.red('Error:'), apiError(err))
    process.exit(1)
    return
  }

  const { confirm } = await inquirer.prompt([{
    type: 'confirm', name: 'confirm',
    message: `Delete "${note.title}"?`,
    default: false,
  }])
  if (!confirm) { console.log(chalk.gray('Cancelled.')); return }

  const spinner = ora('Deleting…').start()
  try {
    await deleteNote(slug)
    spinner.stop()
    console.log(chalk.green('✓'), `Deleted: ${slug}`)
  } catch (err) {
    spinner.stop()
    console.error(chalk.red('Error:'), apiError(err))
    process.exit(1)
  }
}

export async function notesSearchCommand(query: string) {
  const spinner = ora(`Searching "${query}"…`).start()
  try {
    const results = await searchNotes(query)
    spinner.stop()
    if (!results.length) { console.log(chalk.gray('No results.')); return }
    console.log(chalk.gray(`\n${results.length} result(s):\n`))
    for (const r of results.slice(0, 10)) {
      console.log(`${chalk.cyan(r.title || r.slug)}  ${chalk.gray(r.slug)}`)
      if (r.summary) console.log(chalk.gray(`  ${r.summary.slice(0, 120)}…`))
    }
  } catch (err) {
    spinner.stop()
    console.error(chalk.red('Error:'), apiError(err))
    process.exit(1)
  }
}

export async function notesTagsCommand() {
  const spinner = ora('Loading notes…').start()
  try {
    const notes = await listNotes()
    spinner.stop()
    const counts: Record<string, number> = {}
    for (const n of notes) for (const t of (n.tags || [])) counts[t] = (counts[t] || 0) + 1
    if (!Object.keys(counts).length) { console.log(chalk.gray('No tags.')); return }
    const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1])
    console.log(chalk.bold('\nTAG                  COUNT'))
    for (const [tag, count] of sorted) {
      console.log(`${chalk.cyan(tag.padEnd(20))}  ${count}`)
    }
  } catch (err) {
    spinner.stop()
    console.error(chalk.red('Error:'), apiError(err))
    process.exit(1)
  }
}
