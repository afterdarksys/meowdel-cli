"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.brainCommand = brainCommand;
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const api_1 = require("../lib/api");
const config_1 = require("../lib/config");
const inquirer_1 = __importDefault(require("inquirer"));
const fs_1 = __importDefault(require("fs"));
async function brainCommand(options) {
    const config = (0, config_1.loadConfig)();
    if (!config.apiKey) {
        console.log(chalk_1.default.yellow('\n⚠  API key required for Brain. Run: meowdel config\n'));
        process.exit(1);
    }
    const client = (0, api_1.createClient)();
    const spinner = (0, ora_1.default)();
    switch (options.action) {
        case 'list': {
            spinner.start('Fetching notes...');
            const res = await client.get('/api/brain/notes');
            spinner.stop();
            const notes = res.data;
            if (!notes.length) {
                console.log(chalk_1.default.gray('\nNo notes yet. Create one with: meowdel brain new\n'));
                return;
            }
            console.log(chalk_1.default.magenta(`\n📝 Brain Notes (${notes.length})\n`));
            notes.forEach((note) => {
                console.log(chalk_1.default.cyan(`  ${note.title}`));
                console.log(chalk_1.default.gray(`     /${note.slug} | ${note.wordCount} words`));
                if (note.tags?.length)
                    console.log(chalk_1.default.gray(`     #${note.tags.join(' #')}`));
                if (note.summary)
                    console.log(chalk_1.default.gray(`     ${note.summary.slice(0, 80)}...`));
                console.log();
            });
            break;
        }
        case 'search': {
            const query = options.query || (await inquirer_1.default.prompt([
                { type: 'input', name: 'q', message: 'Search query:' }
            ])).q;
            spinner.start(`Searching: "${query}"`);
            const res = await client.get('/api/brain/search', { params: { q: query } });
            spinner.stop();
            const results = res.data.results ?? res.data;
            if (!results?.length) {
                console.log(chalk_1.default.gray('\nNo results found.\n'));
                return;
            }
            console.log(chalk_1.default.magenta(`\n🔍 Results for "${query}"\n`));
            results.forEach((r, i) => {
                console.log(chalk_1.default.cyan(`  ${i + 1}. ${r.title}`));
                if (r.score)
                    console.log(chalk_1.default.gray(`     Score: ${r.score.toFixed(3)}`));
                if (r.summary)
                    console.log(chalk_1.default.gray(`     ${r.summary.slice(0, 100)}`));
                console.log(chalk_1.default.gray(`     meowdel.ai/brain/notes/${r.slug}`));
                console.log();
            });
            break;
        }
        case 'new': {
            const title = options.title || (await inquirer_1.default.prompt([
                { type: 'input', name: 't', message: 'Note title:' }
            ])).t;
            let content = '';
            if (options.file) {
                if (!fs_1.default.existsSync(options.file)) {
                    console.error(chalk_1.default.red(`File not found: ${options.file}`));
                    process.exit(1);
                }
                content = fs_1.default.readFileSync(options.file, 'utf8');
            }
            else {
                const { body } = await inquirer_1.default.prompt([
                    { type: 'editor', name: 'body', message: 'Note content (opens editor):', default: `# ${title}\n\n` }
                ]);
                content = body;
            }
            spinner.start('Creating note...');
            const res = await client.post('/api/brain/notes', {
                title,
                content,
                tags: options.tag ? [options.tag] : [],
            });
            spinner.stop();
            console.log(chalk_1.default.green(`\n✓ Note created: ${res.data.slug}`));
            console.log(chalk_1.default.gray(`  View at: ${config.baseUrl}/brain/notes/${res.data.slug}\n`));
            break;
        }
        case 'get': {
            const slug = options.slug || options.query;
            if (!slug) {
                console.error(chalk_1.default.red('Slug required: meowdel brain get --slug <slug>'));
                process.exit(1);
            }
            spinner.start(`Loading ${slug}...`);
            const res = await client.get(`/api/brain/notes/${slug}`);
            spinner.stop();
            const note = res.data;
            console.log(chalk_1.default.magenta.bold(`\n# ${note.title}\n`));
            if (note.tags?.length)
                console.log(chalk_1.default.gray(`Tags: #${note.tags.join(' #')}\n`));
            if (note.summary)
                console.log(chalk_1.default.italic.gray(`${note.summary}\n`));
            console.log(note.content);
            break;
        }
        case 'graph': {
            spinner.start('Loading graph...');
            const res = await client.get('/api/brain/graph');
            spinner.stop();
            const { nodes, links } = res.data;
            console.log(chalk_1.default.magenta('\n🕸️  Brain Knowledge Graph\n'));
            console.log(chalk_1.default.cyan(`  Nodes: ${nodes.length}  Links: ${links.length}`));
            // Top connected nodes
            const connected = nodes
                .map((n) => ({ ...n, connections: links.filter((l) => l.source === n.id || l.target === n.id).length }))
                .sort((a, b) => b.connections - a.connections)
                .slice(0, 10);
            console.log(chalk_1.default.gray('\n  Top connected nodes:'));
            connected.forEach((n, i) => {
                console.log(chalk_1.default.gray(`    ${i + 1}. ${n.id} (${n.connections} links)`));
            });
            console.log();
            break;
        }
        case 'agent': {
            // Queue an agent job for a note
            const slug = options.slug || options.query;
            if (!slug) {
                console.error(chalk_1.default.red('Slug required'));
                process.exit(1);
            }
            const { jobType } = await inquirer_1.default.prompt([
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
            ]);
            // First get the note ID
            const noteRes = await client.get(`/api/brain/notes/${slug}`);
            const noteId = noteRes.data.id;
            spinner.start('Queuing agent job...');
            await client.post('/api/brain/agent-jobs', { jobType, noteId });
            spinner.stop();
            console.log(chalk_1.default.green(`\n✓ Agent job queued: ${jobType} for "${noteRes.data.title}"`));
            console.log(chalk_1.default.gray('  The job will run in the background. Check back in a few seconds.\n'));
            break;
        }
        default:
            console.error(chalk_1.default.red(`Unknown brain action: ${options.action}`));
            console.log(chalk_1.default.gray('Actions: list, search, new, get, graph, agent'));
            process.exit(1);
    }
}
