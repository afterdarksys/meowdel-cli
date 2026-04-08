import chalk from 'chalk'
import ora from 'ora'
import { createClient } from '../lib/api'
import { loadConfig } from '../lib/config'
import inquirer from 'inquirer'
import fs from 'fs'

export async function brainCommand(options: {
  action: string
  query?: string
  title?: string
  file?: string
  tag?: string
  slug?: string
}) {
  const config = loadConfig()

  if (!config.apiKey) {
    console.log(chalk.yellow('\n⚠  API key required for Brain. Run: meowdel config\n'))
    process.exit(1)
  }

  const client = createClient()
  const spinner = ora()

  switch (options.action) {
    case 'list': {
      spinner.start('Fetching notes...')
      const res = await client.get('/api/brain/notes')
      spinner.stop()
      const notes = res.data
      if (!notes.length) {
        console.log(chalk.gray('\nNo notes yet. Create one with: meowdel brain new\n'))
        return
      }
      console.log(chalk.magenta(`\n📝 Brain Notes (${notes.length})\n`))
      notes.forEach((note: { title: string; slug: string; tags: string[]; summary?: string; wordCount: number }) => {
        console.log(chalk.cyan(`  ${note.title}`))
        console.log(chalk.gray(`     /${note.slug} | ${note.wordCount} words`))
        if (note.tags?.length) console.log(chalk.gray(`     #${note.tags.join(' #')}`))
        if (note.summary) console.log(chalk.gray(`     ${note.summary.slice(0, 80)}...`))
        console.log()
      })
      break
    }

    case 'search': {
      const query = options.query || (await inquirer.prompt([
        { type: 'input', name: 'q', message: 'Search query:' }
      ])).q

      spinner.start(`Searching: "${query}"`)
      const res = await client.get('/api/brain/search', { params: { q: query } })
      spinner.stop()

      const results = res.data.results ?? res.data
      if (!results?.length) {
        console.log(chalk.gray('\nNo results found.\n'))
        return
      }
      console.log(chalk.magenta(`\n🔍 Results for "${query}"\n`))
      results.forEach((r: { title: string; slug: string; score?: number; summary?: string }, i: number) => {
        console.log(chalk.cyan(`  ${i + 1}. ${r.title}`))
        if (r.score) console.log(chalk.gray(`     Score: ${r.score.toFixed(3)}`))
        if (r.summary) console.log(chalk.gray(`     ${r.summary.slice(0, 100)}`))
        console.log(chalk.gray(`     meowdel.ai/brain/notes/${r.slug}`))
        console.log()
      })
      break
    }

    case 'new': {
      const title = options.title || (await inquirer.prompt([
        { type: 'input', name: 't', message: 'Note title:' }
      ])).t

      let content = ''
      if (options.file) {
        if (!fs.existsSync(options.file)) {
          console.error(chalk.red(`File not found: ${options.file}`))
          process.exit(1)
        }
        content = fs.readFileSync(options.file, 'utf8')
      } else {
        const { body } = await inquirer.prompt([
          { type: 'editor', name: 'body', message: 'Note content (opens editor):', default: `# ${title}\n\n` }
        ])
        content = body
      }

      spinner.start('Creating note...')
      const res = await client.post('/api/brain/notes', {
        title,
        content,
        tags: options.tag ? [options.tag] : [],
      })
      spinner.stop()

      console.log(chalk.green(`\n✓ Note created: ${res.data.slug}`))
      console.log(chalk.gray(`  View at: ${config.baseUrl}/brain/notes/${res.data.slug}\n`))
      break
    }

    case 'get': {
      const slug = options.slug || options.query
      if (!slug) {
        console.error(chalk.red('Slug required: meowdel brain get --slug <slug>'))
        process.exit(1)
      }
      spinner.start(`Loading ${slug}...`)
      const res = await client.get(`/api/brain/notes/${slug}`)
      spinner.stop()

      const note = res.data
      console.log(chalk.magenta.bold(`\n# ${note.title}\n`))
      if (note.tags?.length) console.log(chalk.gray(`Tags: #${note.tags.join(' #')}\n`))
      if (note.summary) console.log(chalk.italic.gray(`${note.summary}\n`))
      console.log(note.content)
      break
    }

    case 'graph': {
      spinner.start('Loading graph...')
      const res = await client.get('/api/brain/graph')
      spinner.stop()

      const { nodes, links } = res.data
      console.log(chalk.magenta('\n🕸️  Brain Knowledge Graph\n'))
      console.log(chalk.cyan(`  Nodes: ${nodes.length}  Links: ${links.length}`))

      // Top connected nodes
      const connected = nodes
        .map((n: { id: string; connections?: number }) => ({ ...n, connections: links.filter((l: { source: string; target: string }) => l.source === n.id || l.target === n.id).length }))
        .sort((a: { connections: number }, b: { connections: number }) => b.connections - a.connections)
        .slice(0, 10)

      console.log(chalk.gray('\n  Top connected nodes:'))
      connected.forEach((n: { id: string; connections: number }, i: number) => {
        console.log(chalk.gray(`    ${i + 1}. ${n.id} (${n.connections} links)`))
      })
      console.log()
      break
    }

    case 'agent': {
      // Queue an agent job for a note
      const slug = options.slug || options.query
      if (!slug) {
        console.error(chalk.red('Slug required'))
        process.exit(1)
      }

      const { jobType } = await inquirer.prompt([
        {
          type: 'list',
          name: 'jobType',
          message: 'Agent task:',
          choices: [
            { name: 'Summarize note', value: 'summarize_note' },
            { name: 'Generate embeddings', value: 'embed_note' },
            { name: 'Auto-link to other notes', value: 'auto_link' },
          ],
        },
      ])

      // First get the note ID
      const noteRes = await client.get(`/api/brain/notes/${slug}`)
      const noteId = noteRes.data.id

      spinner.start('Queuing agent job...')
      await client.post('/api/brain/agent-jobs', { jobType, noteId })
      spinner.stop()

      console.log(chalk.green(`\n✓ Agent job queued: ${jobType} for "${noteRes.data.title}"`))
      console.log(chalk.gray('  The job will run in the background. Check back in a few seconds.\n'))
      break
    }

    default:
      console.error(chalk.red(`Unknown brain action: ${options.action}`))
      console.log(chalk.gray('Actions: list, search, new, get, graph, agent'))
      process.exit(1)
  }
}
