import blessed from 'blessed'
import { chatRequest, apiError } from '../lib/api'
import { loadConfig } from '../lib/config'

export async function consoleCommand(options: { pet: string }) {
  const config = loadConfig()
  const petId = options.pet || config.defaultPet || config.personality || 'meowdel'

  const screen = blessed.screen({ smartCSR: true, title: 'Meowdel Console' })

  const header = blessed.box({
    top: 0, left: 0, width: '100%', height: 3,
    content: `{center}🐱 Meowdel Console — ${petId}{/center}`,
    tags: true,
    style: { fg: 'magenta', bold: true, border: { fg: 'cyan' } },
    border: { type: 'line' },
  })

  const chatBox = blessed.box({
    top: 3, left: 0, width: '100%', height: '80%-3',
    scrollable: true, alwaysScroll: true, keys: true, vi: true, mouse: true, tags: true,
    scrollbar: { ch: ' ', style: { bg: 'cyan' } },
    border: { type: 'line' },
    style: { border: { fg: 'cyan' } },
  })

  const inputBox = blessed.textarea({
    bottom: 0, left: 0, width: '100%', height: 3,
    inputOnFocus: true, keys: true, mouse: true,
    border: { type: 'line' },
    style: { fg: 'white', border: { fg: 'cyan' }, focus: { border: { fg: 'magenta' } } },
    label: ' Message (Enter to send, Ctrl+C to exit) ',
  })

  screen.append(header)
  screen.append(chatBox)
  screen.append(inputBox)
  inputBox.focus()

  const history: Array<{ role: string; content: string }> = []
  let chatContent = ''

  function append(role: string, message: string, color = 'white') {
    const ts = new Date().toLocaleTimeString()
    chatContent += `{${color}-fg}[${ts}] ${role}:{/${color}-fg} ${message}\n\n`
    chatBox.setContent(chatContent)
    chatBox.setScrollPerc(100)
    screen.render()
  }

  append('System', `Connected to ${petId}. Start chatting!`, 'gray')

  async function send() {
    const message = inputBox.getValue().trim()
    if (!message) return
    inputBox.clearValue()
    screen.render()
    append('You', message, 'blue')
    try {
      const res = await chatRequest(message, petId, history)
      append(res.petName, res.message, 'magenta')
      history.push({ role: 'user', content: message })
      history.push({ role: 'assistant', content: res.message })
      if (history.length > 20) history.splice(0, 2)
    } catch (err) {
      append('Error', apiError(err), 'red')
    }
    inputBox.focus()
  }

  inputBox.key(['enter'], (_ch: any, key: any) => { if (!key.shift) send() })
  inputBox.key(['C-s'], () => send())
  screen.key(['C-c', 'q'], () => process.exit(0))
  screen.render()
}
