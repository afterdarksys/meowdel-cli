"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.askCommand = askCommand;
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const api_1 = require("../lib/api");
const config_1 = require("../lib/config");
async function askCommand(question, options) {
    const config = (0, config_1.loadConfig)();
    const petId = options.pet || options.personality || config.defaultPet || config.personality || 'meowdel';
    if (!config.apiKey && !config.claudeApiKey) {
        console.error(chalk_1.default.red('API key required. Run: meowdel config'));
        process.exit(1);
    }
    const spinner = (0, ora_1.default)(chalk_1.default.gray('Thinking...')).start();
    try {
        const res = await (0, api_1.chatRequest)(question, petId);
        spinner.stop();
        if (options.json) {
            console.log(JSON.stringify(res, null, 2));
            return;
        }
        console.log(chalk_1.default.magenta(`\n${res.petName ?? 'Meowdel'}:`));
        console.log(res.message);
        const r = res._routing;
        if (r) {
            console.log(chalk_1.default.gray(`\n↳ ${r.tier} · ${r.model}${r.reason ? ' · ' + r.reason : ''}\n`));
        }
        else {
            console.log();
        }
    }
    catch (err) {
        spinner.stop();
        console.error(chalk_1.default.red('Error:'), (0, api_1.apiError)(err));
        if (err.response?.status === 401) {
            console.log(chalk_1.default.yellow('💡 Run: meowdel config YOUR_API_KEY'));
        }
        process.exit(1);
    }
}
