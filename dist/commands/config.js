"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.configCommand = configCommand;
const chalk_1 = __importDefault(require("chalk"));
const inquirer_1 = __importDefault(require("inquirer"));
const config_1 = require("../lib/config");
const api_1 = require("../lib/api");
async function configCommand(options) {
    const config = (0, config_1.loadConfig)();
    if (options.show) {
        const pet = config.defaultPet || config.personality;
        console.log(chalk_1.default.magenta('\n🐱 Meowdel Configuration\n'));
        console.log(chalk_1.default.gray(`Config file: ${(0, config_1.getConfigPath)()}`));
        console.log(chalk_1.default.cyan('API Key:     ') + (config.apiKey ? chalk_1.default.green('✓ configured') : chalk_1.default.red('not set')));
        console.log(chalk_1.default.cyan('Claude Key:  ') + (config.claudeApiKey ? chalk_1.default.green('✓ configured') : chalk_1.default.gray('not set (optional)')));
        console.log(chalk_1.default.cyan('OpenAI Key:  ') + (config.openAiKey ? chalk_1.default.green('✓ configured') : chalk_1.default.gray('not set (optional)')));
        console.log(chalk_1.default.cyan('Base URL:    ') + config.baseUrl);
        console.log(chalk_1.default.cyan('Default pet: ') + pet);
        console.log();
        return;
    }
    if (options.key) {
        (0, config_1.saveConfig)({ apiKey: options.key });
        console.log(chalk_1.default.green('✓ API key saved'));
        return;
    }
    if (options.url) {
        (0, config_1.saveConfig)({ baseUrl: options.url });
        console.log(chalk_1.default.green(`✓ Base URL set to ${options.url}`));
        return;
    }
    const newPet = options.pet || options.personality;
    if (newPet) {
        (0, config_1.saveConfig)({ defaultPet: newPet, personality: newPet });
        console.log(chalk_1.default.green(`✓ Default pet set to ${newPet}`));
        return;
    }
    if (options.claude) {
        (0, config_1.saveConfig)({ claudeApiKey: options.claude });
        console.log(chalk_1.default.green('✓ Claude API key saved — direct Anthropic integration enabled'));
        return;
    }
    if (options.openai) {
        (0, config_1.saveConfig)({ openAiKey: options.openai });
        console.log(chalk_1.default.green('✓ OpenAI API key saved — Codex/ChatGPT integration enabled'));
        return;
    }
    // Interactive setup
    console.log(chalk_1.default.magenta('\n🐱 Meowdel Setup\n'));
    console.log(chalk_1.default.gray('Configure your Meowdel CLI. Press Enter to keep current values.\n'));
    const petChoices = api_1.KNOWN_PETS;
    const answers = await inquirer_1.default.prompt([
        {
            type: 'input',
            name: 'apiKey',
            message: 'Meowdel API key (from meowdel.ai/profile):',
            default: config.apiKey || '',
        },
        {
            type: 'input',
            name: 'claudeApiKey',
            message: 'Claude API key (optional, Anthropic direct access):',
            default: config.claudeApiKey || '',
        },
        {
            type: 'input',
            name: 'openAiKey',
            message: 'OpenAI API key (optional, Codex/ChatGPT direct access):',
            default: config.openAiKey || '',
        },
        {
            type: 'list',
            name: 'defaultPet',
            message: 'Default pet:',
            choices: petChoices,
            default: config.defaultPet || config.personality || 'meowdel',
        },
    ]);
    (0, config_1.saveConfig)({
        apiKey: answers.apiKey || undefined,
        claudeApiKey: answers.claudeApiKey || undefined,
        openAiKey: answers.openAiKey || undefined,
        defaultPet: answers.defaultPet,
        personality: answers.defaultPet,
    });
    console.log(chalk_1.default.green('\n✓ Configuration saved!'));
    console.log(chalk_1.default.gray(`Stored at: ${(0, config_1.getConfigPath)()}\n`));
}
