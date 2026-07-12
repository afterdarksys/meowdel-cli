#!/usr/bin/env node
/**
 * Meowdel MCP Server
 *
 * Exposes your Meowdel Brain and AI cat personalities as MCP tools
 * so Claude can query them as an intelligent knowledge source.
 *
 * Registered automatically by: meowdel claude setup
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js'
import { loadConfig } from './lib/config'
import {
  listNotes, getNote, searchNotes, chatRequest, apiError,
} from './lib/api'

const server = new Server(
  { name: 'meowdel', version: '2.0.0' },
  { capabilities: { tools: {} } }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'search_brain',
      description:
        'Semantic search through Meowdel Brain — a personal knowledge base of notes, ' +
        'decisions, and learnings. Use this to find relevant context before answering.',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            description: 'What to search for (natural language)',
          },
          limit: {
            type: 'number',
            description: 'Max results to return (default 5)',
          },
        },
        required: ['query'],
      },
    },
    {
      name: 'get_note',
      description:
        'Read the full content of a specific Brain note by its slug. ' +
        'Use after search_brain to get the complete text of a relevant note.',
      inputSchema: {
        type: 'object',
        properties: {
          slug: {
            type: 'string',
            description: 'The note slug (from search_brain results)',
          },
        },
        required: ['slug'],
      },
    },
    {
      name: 'list_notes',
      description:
        'List all notes in Meowdel Brain with titles, tags, and word counts. ' +
        'Use to browse available knowledge or find notes by tag.',
      inputSchema: {
        type: 'object',
        properties: {
          tag: {
            type: 'string',
            description: 'Filter by tag (optional)',
          },
        },
        required: [],
      },
    },
    {
      name: 'ask_meowdel',
      description:
        'Ask a Meowdel AI cat personality a question. These cats are opinionated AI advisors ' +
        'with deep software design intuition. Use when you want a second opinion, creative take, ' +
        'or expert framing on an architecture or engineering decision. ' +
        'Available pets: meowdel, bandit (Brain/systems expert), luna (big-picture thinker), ' +
        'professor (thorough/analytical), ninja (fast/concise), bella (precise).',
      inputSchema: {
        type: 'object',
        properties: {
          question: {
            type: 'string',
            description: 'The question to ask',
          },
          pet: {
            type: 'string',
            description: 'Which cat to ask (default: bandit)',
            enum: ['meowdel', 'bandit', 'luna', 'bella', 'blubie', 'professor', 'ninja', 'catdog', 'spotty', 'blinker'],
          },
        },
        required: ['question'],
      },
    },
  ],
}))

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params

  try {
    if (name === 'search_brain') {
      const query = String(args?.query ?? '')
      const limit = Number(args?.limit ?? 5)
      const results = await searchNotes(query, limit)

      if (!results.length) {
        return { content: [{ type: 'text', text: 'No notes found matching that query.' }] }
      }

      const text = results.map(n =>
        `**${n.title}** (slug: \`${n.slug}\`)\n` +
        (n.summary ? `${n.summary}\n` : '') +
        `Tags: ${(n.tags || []).join(', ') || 'none'} · ${n.wordCount}w`
      ).join('\n\n')

      return { content: [{ type: 'text', text }] }
    }

    if (name === 'get_note') {
      const slug = String(args?.slug ?? '')
      const note = await getNote(slug)

      const header =
        `# ${note.title}\n` +
        (note.tags?.length ? `Tags: ${note.tags.join(', ')}\n` : '') +
        (note.summary ? `> ${note.summary}\n` : '') +
        `\n`

      return { content: [{ type: 'text', text: header + note.content }] }
    }

    if (name === 'list_notes') {
      const tag = args?.tag ? String(args.tag) : undefined
      let notes = await listNotes()
      if (tag) notes = notes.filter(n => n.tags.includes(tag))

      if (!notes.length) {
        return { content: [{ type: 'text', text: tag ? `No notes tagged "${tag}".` : 'No notes found.' }] }
      }

      const text = notes.map(n =>
        `- **${n.title}** (\`${n.slug}\`) · ${n.wordCount}w` +
        (n.tags?.length ? ` · #${n.tags.join(' #')}` : '')
      ).join('\n')

      return { content: [{ type: 'text', text: `${notes.length} note(s):\n\n${text}` }] }
    }

    if (name === 'ask_meowdel') {
      const question = String(args?.question ?? '')
      const pet = String(args?.pet ?? 'bandit')

      const res = await chatRequest(question, pet)

      const routing = res._routing
        ? `\n\n*— ${res.petName} · ${res._routing.tier} · ${res._routing.model}*`
        : `\n\n*— ${res.petName ?? pet}*`

      return { content: [{ type: 'text', text: res.message + routing }] }
    }

    throw new Error(`Unknown tool: ${name}`)
  } catch (err) {
    const msg = apiError(err)
    return { content: [{ type: 'text', text: `Error: ${msg}` }], isError: true }
  }
})

async function main() {
  const config = loadConfig()
  const hasKey = process.env.MEOWDEL_API_KEY || config.apiKey || config.claudeApiKey || config.openAiKey
  if (!hasKey) {
    process.stderr.write(
      'Meowdel MCP: No API key found. Run `meowdel config` or set MEOWDEL_API_KEY.\n'
    )
    process.exit(1)
  }

  const transport = new StdioServerTransport()
  await server.connect(transport)
  process.stderr.write('Meowdel MCP server running\n')
}

main()
