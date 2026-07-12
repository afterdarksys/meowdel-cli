#!/usr/bin/env node
"use strict";
/**
 * Meowdel CLI v2
 * Chat, notes, alarms, and AI agents from your terminal.
 *
 * Install: npm install -g meowdel
 * Setup:   meowdel config
 * Chat:    meowdel chat
 * Notes:   meowdel notes list
 * Alarms:  meowdel alarms list
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config();
const program = new commander_1.Command();
program
    .name('meowdel')
    .description(chalk_1.default.magenta('🐱 Meowdel — AI knowledge, chat, alarms, and agents from your terminal'))
    .version('2.0.0');
// ── config ────────────────────────────────────────────────────────────────────
program
    .command('config')
    .description('Configure Meowdel CLI (API keys, default pet, URL)')
    .option('-k, --key <key>', 'Set meowdel.ai API key')
    .option('-c, --claude <key>', 'Set your Claude (Anthropic) API key for direct AI access')
    .option('-o, --openai <key>', 'Set your OpenAI API key for Codex/ChatGPT direct access')
    .option('-u, --url <url>', 'Set meowdel.ai base URL')
    .option('-p, --pet <name>', 'Set default pet personality')
    .option('--personality <name>', 'Alias for --pet')
    .option('-s, --show', 'Show current config')
    .action(async (options) => {
    const { configCommand } = await Promise.resolve().then(() => __importStar(require('./commands/config')));
    await configCommand(options);
});
// ── chat ──────────────────────────────────────────────────────────────────────
program
    .command('chat')
    .description('Start an interactive chat session with Meowdel')
    .option('-p, --pet <name>', 'Choose pet personality (meowdel, bandit, luna…)')
    .option('--personality <name>', 'Alias for --pet')
    .option('-b, --brain', 'Enable Brain context (legacy flag)', false)
    .action(async (options) => {
    const { chatCommand } = await Promise.resolve().then(() => __importStar(require('./commands/chat')));
    await chatCommand(options);
});
// ── console ───────────────────────────────────────────────────────────────────
program
    .command('console')
    .description('Full-screen TUI chat')
    .option('-p, --pet <name>', 'Choose pet personality', 'meowdel')
    .action(async (options) => {
    const { consoleCommand } = await Promise.resolve().then(() => __importStar(require('./commands/console')));
    await consoleCommand(options);
});
// ── ask ───────────────────────────────────────────────────────────────────────
program
    .command('ask <question>')
    .description('Ask a one-off question')
    .option('-p, --pet <name>', 'Choose pet personality')
    .option('--personality <name>', 'Alias for --pet')
    .option('-b, --brain', 'Enable Brain context (legacy flag)', false)
    .option('-j, --json', 'Output as JSON', false)
    .action(async (question, options) => {
    const { askCommand } = await Promise.resolve().then(() => __importStar(require('./commands/ask')));
    await askCommand(question, options);
});
// ── notes ─────────────────────────────────────────────────────────────────────
const notes = program.command('notes').description('Brain knowledge management');
notes
    .command('list')
    .description('List all notes')
    .option('-t, --tag <tag>', 'Filter by tag')
    .option('-s, --search <query>', 'Filter by title/summary/tag')
    .action(async (opts) => {
    const { notesListCommand } = await Promise.resolve().then(() => __importStar(require('./commands/notes')));
    await notesListCommand(opts);
});
notes
    .command('view <slug>')
    .description('View a note')
    .action(async (slug) => {
    const { notesViewCommand } = await Promise.resolve().then(() => __importStar(require('./commands/notes')));
    await notesViewCommand(slug);
});
notes
    .command('new [title]')
    .description('Create a note (opens $EDITOR)')
    .action(async (title) => {
    const { notesNewCommand } = await Promise.resolve().then(() => __importStar(require('./commands/notes')));
    await notesNewCommand(title);
});
notes
    .command('edit <slug>')
    .description('Edit a note in $EDITOR')
    .action(async (slug) => {
    const { notesEditCommand } = await Promise.resolve().then(() => __importStar(require('./commands/notes')));
    await notesEditCommand(slug);
});
notes
    .command('delete <slug>')
    .alias('rm')
    .description('Delete a note')
    .action(async (slug) => {
    const { notesDeleteCommand } = await Promise.resolve().then(() => __importStar(require('./commands/notes')));
    await notesDeleteCommand(slug);
});
notes
    .command('search <query>')
    .description('Semantic search')
    .action(async (query) => {
    const { notesSearchCommand } = await Promise.resolve().then(() => __importStar(require('./commands/notes')));
    await notesSearchCommand(query);
});
notes
    .command('tags')
    .description('List all tags with counts')
    .action(async () => {
    const { notesTagsCommand } = await Promise.resolve().then(() => __importStar(require('./commands/notes')));
    await notesTagsCommand();
});
// ── brain (legacy — kept for backward compat) ─────────────────────────────────
program
    .command('brain <action> [query]')
    .description('Brain knowledge base operations (legacy — prefer: meowdel notes)')
    .option('-t, --title <title>', 'Note title (for new)')
    .option('-f, --file <path>', 'Import from file (for new)')
    .option('--tag <tag>', 'Tag (for new)')
    .option('-s, --slug <slug>', 'Note slug (for get/agent)')
    .addHelpText('after', `
Actions:
  list          List all notes
  search        Semantic search
  new           Create a new note
  get           Get note content
  graph         Show knowledge graph stats
  agent         Queue an AI agent job

Examples:
  meowdel brain list
  meowdel brain search "machine learning"
  meowdel brain new --title "My Note" --file ./notes/foo.md
  meowdel brain get --slug my-note
  `)
    .action(async (action, query, options) => {
    const { brainCommand } = await Promise.resolve().then(() => __importStar(require('./commands/brain')));
    await brainCommand({ action, query, ...options });
});
// ── alarms ────────────────────────────────────────────────────────────────────
const alarms = program.command('alarms').description('Alarm clock management (max 5)');
alarms
    .command('list')
    .description('List alarms')
    .action(async () => {
    const { alarmsListCommand } = await Promise.resolve().then(() => __importStar(require('./commands/alarms')));
    await alarmsListCommand();
});
alarms
    .command('add')
    .description('Create a new alarm (interactive)')
    .action(async () => {
    const { alarmsAddCommand } = await Promise.resolve().then(() => __importStar(require('./commands/alarms')));
    await alarmsAddCommand();
});
alarms
    .command('edit <id>')
    .description('Edit an alarm')
    .action(async (id) => {
    const { alarmsEditCommand } = await Promise.resolve().then(() => __importStar(require('./commands/alarms')));
    await alarmsEditCommand(id);
});
alarms
    .command('toggle <id>')
    .description('Enable/disable an alarm')
    .action(async (id) => {
    const { alarmsToggleCommand } = await Promise.resolve().then(() => __importStar(require('./commands/alarms')));
    await alarmsToggleCommand(id);
});
alarms
    .command('delete <id>')
    .alias('rm')
    .description('Delete an alarm')
    .action(async (id) => {
    const { alarmsDeleteCommand } = await Promise.resolve().then(() => __importStar(require('./commands/alarms')));
    await alarmsDeleteCommand(id);
});
alarms
    .command('check')
    .description('Check for alarms due now')
    .action(async () => {
    const { alarmsCheckCommand } = await Promise.resolve().then(() => __importStar(require('./commands/alarms')));
    await alarmsCheckCommand();
});
// ── pets / personalities ──────────────────────────────────────────────────────
program
    .command('pets')
    .alias('personalities')
    .description('List available AI cat personalities (fetches live from API)')
    .action(async () => {
    const { listPersonalities } = await Promise.resolve().then(() => __importStar(require('./commands/personalities')));
    await listPersonalities();
});
// ── claude ────────────────────────────────────────────────────────────────────
const claude = program.command('claude').description('Claude Code integration');
claude
    .command('setup')
    .description('Register Meowdel as a Claude MCP server (the only cat that understands software design)')
    .action(async () => {
    const { claudeSetupCommand } = await Promise.resolve().then(() => __importStar(require('./commands/claude')));
    await claudeSetupCommand();
});
claude
    .command('status')
    .description('Check if Meowdel MCP server is configured')
    .action(async () => {
    const { claudeStatusCommand } = await Promise.resolve().then(() => __importStar(require('./commands/claude')));
    await claudeStatusCommand();
});
// ── login ─────────────────────────────────────────────────────────────────────
program
    .command('login')
    .description('Open meowdel.ai in your browser to get an API key')
    .action(async () => {
    const open = (await Promise.resolve().then(() => __importStar(require('open')))).default;
    const { loadConfig } = await Promise.resolve().then(() => __importStar(require('./lib/config')));
    const config = loadConfig();
    console.log(chalk_1.default.magenta('\n🐱 Opening meowdel.ai in your browser...\n'));
    console.log(chalk_1.default.gray('After logging in, go to Profile → API Keys and run:'));
    console.log(chalk_1.default.cyan('  meowdel config --key YOUR_API_KEY\n'));
    await open(`${config.baseUrl}/profile`);
});
// ── superclaude ───────────────────────────────────────────────────────────────
program
    .command('superclaude <subcommand>')
    .description('AI-powered git & code tools (commit, changelog, readme, review, docs, brainstorm, annotate, verify)')
    .option('-c, --context <text>', 'Additional context for commit message')
    .option('--period <period>', 'Changelog period: daily, weekly, monthly')
    .option('--since <date>', 'Changelog since date (e.g. "2 weeks ago")')
    .option('-f, --file <path>', 'File to review')
    .option('--hash <hash>', 'Commit hash to annotate')
    .option('--count <n>', 'Number of commits to annotate', '5')
    .addHelpText('after', `
Subcommands:
  commit       Generate a conventional commit message from staged changes
  changelog    Generate a changelog (--period daily|weekly|monthly)
  readme       Generate a README.md for the project
  review       Review recent code changes for issues
  docs         Generate technical documentation
  brainstorm   Suggest features and improvements
  annotate     Add AI annotations to git history (--hash or --count)
  verify       Check that all dependencies and API keys are configured

Examples:
  meowdel superclaude commit
  meowdel superclaude commit --context "part of auth refactor"
  meowdel superclaude changelog --period weekly
  meowdel superclaude changelog --since "2 weeks ago"
  meowdel superclaude review --file src/auth.ts
  meowdel superclaude annotate --count 10
  meowdel superclaude verify
  `)
    .action(async (subcommand, options) => {
    const { superclaudeCommand } = await Promise.resolve().then(() => __importStar(require('./commands/superclaude')));
    await superclaudeCommand(subcommand, options);
});
program.parse(process.argv);
if (!process.argv.slice(2).length) {
    console.log(chalk_1.default.magenta('\n🐱 Meowdel CLI\n'));
    program.outputHelp();
}
