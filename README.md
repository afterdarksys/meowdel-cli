# Meowdel CLI

Chat with AI, manage your Brain knowledge base, and run AI agents — all from your terminal.

## Install

```bash
npm install -g meowdel
```

Or use npx without installing:
```bash
npx meowdel chat
```

## Quick Start

```bash
# 1. Configure your API key
meowdel config

# 2. Chat with Meowdel
meowdel chat

# 3. Use your Brain
meowdel brain list
meowdel brain search "machine learning fundamentals"
meowdel brain new --title "Meeting Notes"
```

## Commands

| Command | Description |
|---------|-------------|
| `meowdel config` | Interactive setup — API keys, personality, URL |
| `meowdel config --key <key>` | Set meowdel.ai API key directly |
| `meowdel config --claude <key>` | Set your Claude API key (direct AI access) |
| `meowdel chat` | Interactive chat session |
| `meowdel chat -p bandit -b` | Chat with Bandit + Brain context |
| `meowdel ask "what is RAG?"` | One-shot question |
| `meowdel brain list` | List all Brain notes |
| `meowdel brain search "query"` | Semantic search |
| `meowdel brain new` | Create a new note (opens editor) |
| `meowdel brain new --file notes.md` | Import a markdown file |
| `meowdel brain get --slug my-note` | View a note |
| `meowdel brain graph` | Show knowledge graph stats |
| `meowdel brain agent --slug my-note` | Run AI agent on a note |
| `meowdel login` | Open meowdel.ai to get your API key |
| `meowdel personalities` | List all cat personalities |

## Bring Your Own Claude Key

If you have an Anthropic API key, you can use Claude directly without going through meowdel.ai:

```bash
meowdel config --claude sk-ant-your-key-here
```

Brain operations still go through meowdel.ai (requires meowdel.ai API key).

## Configuration

Config is stored at `~/.meowdel/config.json`:

```json
{
  "apiKey": "your-meowdel-api-key",
  "claudeApiKey": "sk-ant-...",
  "baseUrl": "https://meowdel.ai",
  "personality": "mittens"
}
```

## Self-Hosted

Point the CLI at your own meowdel.ai instance:

```bash
meowdel config --url http://localhost:3000
```

## License

MIT — After Dark Systems
