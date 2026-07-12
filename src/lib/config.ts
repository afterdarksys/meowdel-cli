import fs from 'fs'
import os from 'os'
import path from 'path'

const CONFIG_DIR = path.join(os.homedir(), '.meowdel')
const CONFIG_FILE = path.join(CONFIG_DIR, 'config.json')

export interface MeowdelConfig {
  apiKey?: string
  baseUrl: string
  personality: string
  defaultPet?: string    // v2 alias — used by chat, ask, console, alarms
  claudeApiKey?: string  // For direct Anthropic Claude integration
  openAiKey?: string     // For direct OpenAI/Codex integration
}

const DEFAULTS: MeowdelConfig = {
  baseUrl: 'https://meowdel.ai',
  personality: 'mittens',
}

export function loadConfig(): MeowdelConfig {
  if (!fs.existsSync(CONFIG_FILE)) return { ...DEFAULTS }
  try {
    const raw = fs.readFileSync(CONFIG_FILE, 'utf8')
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return { ...DEFAULTS }
  }
}

export function saveConfig(config: Partial<MeowdelConfig>): void {
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true })
  const existing = loadConfig()
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({ ...existing, ...config }, null, 2))
}

export function getConfigPath(): string {
  return CONFIG_FILE
}
