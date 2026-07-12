"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.chatCommand = chatCommand;
const inquirer_1 = __importDefault(require("inquirer"));
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const api_1 = require("../lib/api");
const config_1 = require("../lib/config");
async function chatCommand(options) {
    const config = (0, config_1.loadConfig)();
    const petId = options.pet || options.personality || config.defaultPet || config.personality || 'meowdel';
    if (!config.apiKey && !config.claudeApiKey) {
        console.log(chalk_1.default.yellow('\n⚠  No API key configured. Run: meowdel config\n'));
        console.log(chalk_1.default.gray('  meowdel.ai API key: get from https://meowdel.ai/profile'));
        console.log(chalk_1.default.gray('  Claude API key:     get from https://console.anthropic.com\n'));
        process.exit(1);
    }
    console.log(chalk_1.default.magenta.bold('\n🐱 Meowdel Chat'));
    console.log(chalk_1.default.gray(`Pet: ${petId}  |  type "exit" to quit\n`));
    const history = [];
    while (true) {
        const { message } = await inquirer_1.default.prompt([{
                type: 'input',
                name: 'message',
                message: chalk_1.default.blue('You:'),
                prefix: '',
            }]);
        const trimmed = message.trim();
        if (!trimmed)
            continue;
        if (['/exit', '/quit', '/q', 'exit', 'quit'].includes(trimmed.toLowerCase())) {
            console.log(chalk_1.default.yellow('\n👋 Goodbye! *purr*\n'));
            break;
        }
        if (trimmed === '/clear') {
            history.length = 0;
            console.log(chalk_1.default.gray('Conversation cleared.\n'));
            continue;
        }
        const spinner = (0, ora_1.default)(chalk_1.default.gray('Thinking...')).start();
        try {
            const res = await (0, api_1.chatRequest)(trimmed, petId, history);
            spinner.stop();
            console.log(chalk_1.default.magenta(`\n${res.petName ?? 'Meowdel'}:`), res.message);
            const r = res._routing;
            if (r) {
                const parts = [`${r.tier} · ${r.model}`];
                if (r.activeSkills?.length)
                    parts.push(`skills: ${r.activeSkills.join(', ')}`);
                if (r.cascadeMemoriesUsed)
                    parts.push(`${r.cascadeMemoriesUsed} memories`);
                console.log(chalk_1.default.gray(`  ↳ ${parts.join(' · ')}\n`));
            }
            else {
                console.log();
            }
            history.push({ role: 'user', content: trimmed });
            history.push({ role: 'assistant', content: res.message });
            if (history.length > 20)
                history.splice(0, 2);
        }
        catch (err) {
            spinner.stop();
            console.error(chalk_1.default.red('\nError:'), (0, api_1.apiError)(err), '\n');
            if (err.response?.status === 401) {
                console.log(chalk_1.default.yellow('💡 Run: meowdel config YOUR_API_KEY\n'));
                break;
            }
        }
    }
}
