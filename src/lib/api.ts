import axios, { AxiosInstance, AxiosError } from 'axios'
import { loadConfig } from './config'

// ── HTTP client factory ───────────────────────────────────────────────────────

export function createClient(): AxiosInstance {
  const config = loadConfig()
  const apiKey = process.env.MEOWDEL_API_KEY || config.apiKey

  if (!apiKey) {
    throw new Error(
      'API key not configured.\n  Run: meowdel config\n  Or set MEOWDEL_API_KEY env var'
    )
  }

  return axios.create({
    baseURL: (config.baseUrl || 'https://meowdel.ai').replace(/\/$/, '') + '/api',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'User-Agent': 'meowdel-cli/2.0.0',
    },
    timeout: 60_000,
  })
}

export function apiError(err: unknown): string {
  const e = err as AxiosError<{ error?: string }>
  if (e.response) {
    const body = e.response.data
    return `HTTP ${e.response.status}: ${body?.error || JSON.stringify(body)}`
  }
  return (err as Error).message
}

// ── Chat (v2 — pet-based) ─────────────────────────────────────────────────────

export interface ChatRouting {
  tier: string
  model: string
  reason: string
  activeSkills: string[]
  cascadeMemoriesUsed: number
}

export interface ChatResponse {
  message: string
  petId: string
  petName: string
  photo: string
  timestamp: string
  _routing: ChatRouting
  // Direct-API fields
  personality?: { name: string }
  brainContext?: Array<{ title: string }>
  usage?: { inputTokens: number; outputTokens: number }
}

// Per-pet system prompts used when calling Claude or OpenAI directly
const PET_PERSONAS: Record<string, string> = {
  meowdel:    'a helpful, warm AI cat who loves solving problems',
  bandit:     'a bold, street-smart AI cat who is the top expert in knowledge systems and software architecture — opinionated, sharp, and always right',
  luna:       'a mystical, big-picture AI cat who sees connections others miss and thinks in systems',
  professor:  'a scholarly, thorough AI cat who gives careful analysis with supporting evidence',
  ninja:      'a lightning-fast, concise AI cat who cuts straight to the answer with zero fluff',
  bella:      'an elegant, precise AI cat who values correctness and clear thinking above all',
  blubie:     'a playful, curious AI cat who approaches problems with enthusiasm and creative leaps',
  catdog:     'a pleasantly confused AI cat who finds unexpected angles and asks the questions others forgot',
  spotty:     'a pattern-obsessed AI cat who spots inconsistencies and edge cases instantly',
  blinker:    'a sharp, alert AI cat who notices things others overlook',
  nursicat:   'a calm, nurturing AI cat who helps debug problems with patience and care',
  lobstercat: 'a chaotic but brilliant AI cat who thrives in complexity and crisis',
}

function petSystemPrompt(petId: string): string {
  const persona = PET_PERSONAS[petId] ?? `a helpful AI cat with the personality of ${petId}`
  return `You are ${petId}, ${persona}. You are part of Meowdel — an AI cat collective. Be helpful, occasionally use subtle cat-themed language, and always be direct and useful. Never break character.`
}

function makeDirectResponse(text: string, petId: string, model: string, provider: string): ChatResponse {
  const petName = petId.charAt(0).toUpperCase() + petId.slice(1)
  return {
    message: text,
    petId,
    petName,
    photo: '',
    timestamp: new Date().toISOString(),
    _routing: { tier: `direct-${provider}`, model, reason: '', activeSkills: [], cascadeMemoriesUsed: 0 },
    personality: { name: petName },
  }
}

async function callClaude(
  message: string,
  petId: string,
  history: Array<{ role: string; content: string }>,
  claudeApiKey: string,
): Promise<ChatResponse> {
  const Anthropic = (await import('@anthropic-ai/sdk')).default
  const client = new Anthropic({ apiKey: claudeApiKey })

  const messages = [
    ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user' as const, content: message },
  ]

  const response = await client.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 2048,
    system: petSystemPrompt(petId),
    messages,
  })

  const text = response.content[0].type === 'text' ? response.content[0].text : ''
  const res = makeDirectResponse(text, petId, 'claude-sonnet-4-6', 'claude')
  res.usage = { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens }
  return res
}

async function callOpenAI(
  message: string,
  petId: string,
  history: Array<{ role: string; content: string }>,
  openAiKey: string,
): Promise<ChatResponse> {
  const model = 'gpt-4o'
  const messages = [
    { role: 'system', content: petSystemPrompt(petId) },
    ...history.map(m => ({ role: m.role as 'user' | 'assistant', content: m.content })),
    { role: 'user', content: message },
  ]

  const res = await axios.post(
    'https://api.openai.com/v1/chat/completions',
    { model, messages, max_tokens: 2048 },
    {
      headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
      timeout: 60_000,
    }
  )

  const text: string = res.data.choices?.[0]?.message?.content ?? ''
  const usage = res.data.usage
  const resp = makeDirectResponse(text, petId, model, 'openai')
  if (usage) resp.usage = { inputTokens: usage.prompt_tokens, outputTokens: usage.completion_tokens }
  return resp
}

/**
 * Primary chat entrypoint. Routing priority:
 *   1. meowdel.ai API  (apiKey)     — full pet personality + brain
 *   2. Anthropic Claude (claudeApiKey) — direct, meowdel cat persona
 *   3. OpenAI / Codex  (openAiKey)  — direct, meowdel cat persona
 */
export async function chatRequest(
  message: string,
  petId: string,
  conversationHistory: Array<{ role: string; content: string }> = [],
  sessionId?: string,
): Promise<ChatResponse> {
  const config = loadConfig()
  const meowdelKey = process.env.MEOWDEL_API_KEY || config.apiKey

  if (meowdelKey) {
    const client = createClient()
    const res = await client.post(`/pets/${petId}/chat`, {
      message,
      conversationHistory: conversationHistory.slice(-20),
      sessionId,
    })
    return res.data.response as ChatResponse
  }

  if (config.claudeApiKey) {
    return callClaude(message, petId, conversationHistory, config.claudeApiKey)
  }

  if (config.openAiKey) {
    return callOpenAI(message, petId, conversationHistory, config.openAiKey)
  }

  throw new Error('No API key configured. Run: meowdel config')
}

// ── sendChat (kept for internal use — same routing as chatRequest) ─────────────

export async function sendChat(
  message: string,
  history: Array<{ role: string; content: string }>,
  personality: string,
  _useBrain: boolean
): Promise<ChatResponse> {
  return chatRequest(message, personality, history)
}

// ── callAI — provider-agnostic helper for superclaude ────────────────────────

export async function callAI(prompt: string): Promise<string> {
  const config = loadConfig()

  if (config.claudeApiKey) {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey: config.claudeApiKey })
    const res = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })
    return res.content[0].type === 'text' ? res.content[0].text : ''
  }

  if (config.openAiKey) {
    const res = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      { model: 'gpt-4o', messages: [{ role: 'user', content: prompt }], max_tokens: 4096 },
      {
        headers: { Authorization: `Bearer ${config.openAiKey}`, 'Content-Type': 'application/json' },
        timeout: 60_000,
      }
    )
    return res.data.choices?.[0]?.message?.content ?? ''
  }

  if (config.apiKey) {
    const client = createClient()
    const res = await client.post('/v1/chat', {
      message: prompt,
      personality: config.defaultPet || config.personality,
      useBrainContext: false,
      conversationHistory: [],
    })
    return res.data?.message ?? ''
  }

  throw new Error('No API key configured. Run: meowdel config')
}

// ── Notes ─────────────────────────────────────────────────────────────────────

export interface NoteSummary {
  id: string
  slug: string
  title: string
  tags: string[]
  summary: string | null
  wordCount: number
  updatedAt: string
}

export interface NoteDetail extends NoteSummary {
  content: string
  frontmatter: Record<string, unknown> | null
  createdAt: string
}

export async function listNotes(): Promise<NoteSummary[]> {
  const client = createClient()
  const res = await client.get('/brain/notes')
  return Array.isArray(res.data) ? res.data : res.data.notes ?? []
}

export async function getNote(slug: string): Promise<NoteDetail> {
  const client = createClient()
  const res = await client.get(`/brain/notes/${slug}`)
  return res.data
}

export async function createNote(
  title: string,
  content: string,
  tags: string[] = [],
): Promise<{ id: string; slug: string }> {
  const client = createClient()
  const res = await client.post('/brain/notes', { title, content, tags })
  return res.data
}

export async function updateNote(
  slug: string,
  updates: { title?: string; content?: string; tags?: string[] },
): Promise<void> {
  const client = createClient()
  await client.put(`/brain/notes/${slug}`, updates)
}

export async function deleteNote(slug: string): Promise<void> {
  const client = createClient()
  await client.delete(`/brain/notes/${slug}`)
}

export async function searchNotes(query: string, limit = 10): Promise<NoteSummary[]> {
  const client = createClient()
  const res = await client.post('/brain/search', { query, limit })
  const data = res.data
  if (Array.isArray(data)) return data
  return data.results ?? data.documents ?? []
}

// ── Alarms ────────────────────────────────────────────────────────────────────

export type RepeatFrequency = 'none' | 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'custom'

export interface Alarm {
  id: string
  userId: string
  label: string
  hour: number
  minute: number
  timezone: string
  isEnabled: boolean
  repeatEnabled: boolean
  repeatFrequency: RepeatFrequency
  repeatDays: number[]
  petId: string | null
  nextFireAt: string | null
  lastFiredAt: string | null
  snoozeUntil: string | null
  createdAt: string
  updatedAt: string
}

export interface FiredAlarm {
  id: string
  label: string
  hour: number
  minute: number
  timezone: string
  petId: string
  catMessage: string
  photo: string | null
  nextFireAt: string | null
}

export async function listAlarms(): Promise<{ alarms: Alarm[]; max: number }> {
  const client = createClient()
  const res = await client.get('/brain/alarms')
  return res.data
}

export async function createAlarm(payload: {
  label: string
  hour: number
  minute: number
  timezone: string
  repeatEnabled: boolean
  repeatFrequency: RepeatFrequency
  repeatDays: number[]
  petId?: string
}): Promise<Alarm> {
  const client = createClient()
  const res = await client.post('/brain/alarms', payload)
  return res.data.alarm
}

export async function updateAlarm(
  id: string,
  payload: Partial<{
    label: string
    hour: number
    minute: number
    timezone: string
    isEnabled: boolean
    repeatEnabled: boolean
    repeatFrequency: RepeatFrequency
    repeatDays: number[]
    petId: string | null
  }>,
): Promise<Alarm> {
  const client = createClient()
  const res = await client.put(`/brain/alarms/${id}`, payload)
  return res.data.alarm
}

export async function deleteAlarm(id: string): Promise<void> {
  const client = createClient()
  await client.delete(`/brain/alarms/${id}`)
}

export async function checkAlarms(): Promise<FiredAlarm[]> {
  const client = createClient()
  const res = await client.get('/brain/alarms/check')
  return res.data.fired ?? []
}

export async function snoozeAlarm(id: string, minutes = 9): Promise<void> {
  const client = createClient()
  await client.patch(`/brain/alarms/${id}/snooze`, { minutes })
}

// ── Pets ──────────────────────────────────────────────────────────────────────

export const KNOWN_PETS = [
  'meowdel', 'bandit', 'luna', 'catdog', 'spotty',
  'bella', 'blubie', 'blinker', 'nursicat', 'lobstercat',
]

export interface PetInfo {
  id: string
  name: string
  breed: string
  personality: string
  greeting: string
  photo: string
}

export async function getPet(petId: string): Promise<PetInfo> {
  const client = createClient()
  const res = await client.get(`/pets/${petId}`)
  return res.data.pet
}
