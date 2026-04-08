import axios, { AxiosInstance } from 'axios'
import { loadConfig } from './config'

export function createClient(): AxiosInstance {
  const config = loadConfig()
  return axios.create({
    baseURL: config.baseUrl,
    headers: config.apiKey ? { Authorization: `Bearer ${config.apiKey}` } : {},
    timeout: 60000,
  })
}

export interface ChatResponse {
  message: string
  personality?: { name: string }
  brainContext?: Array<{ title: string }>
  usage?: { inputTokens: number; outputTokens: number }
}

export async function sendChat(
  message: string,
  history: Array<{ role: string; content: string }>,
  personality: string,
  useBrain: boolean
): Promise<ChatResponse> {
  const config = loadConfig()

  // If user has their own Claude API key, call Claude directly
  if (config.claudeApiKey) {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey: config.claudeApiKey })

    const systemPrompt = `You are Meowdel, an AI ${personality} cat with superpowers. You help users with knowledge management, coding, and creative tasks. Be helpful, occasionally use cat-themed language, and always be direct and useful.`

    const messages = [
      ...history.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user' as const, content: message },
    ]

    const response = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      messages,
    })

    const text = response.content[0].type === 'text' ? response.content[0].text : ''
    return {
      message: text,
      personality: { name: `Meowdel (${personality})` },
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    }
  }

  // Otherwise call meowdel.ai API
  const client = createClient()
  const res = await client.post('/api/v1/chat', {
    message,
    personality,
    useBrainContext: useBrain,
    conversationHistory: history,
  })
  return res.data
}
