"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.listPersonalities = listPersonalities;
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const api_1 = require("../lib/api");
async function listPersonalities() {
    console.log(chalk_1.default.magenta('\n🐱 Fetching personalities…\n'));
    for (const petId of api_1.KNOWN_PETS) {
        const spinner = (0, ora_1.default)(petId).start();
        try {
            const pet = await (0, api_1.getPet)(petId);
            spinner.stop();
            console.log(chalk_1.default.cyan.bold(pet.id));
            console.log(chalk_1.default.gray(`  Name:        ${pet.name}`));
            console.log(chalk_1.default.gray(`  Breed:       ${pet.breed}`));
            console.log(chalk_1.default.gray(`  Personality: ${pet.personality}`));
            console.log(chalk_1.default.gray(`  Greeting:    "${pet.greeting.slice(0, 80).replace(/\n/g, ' ')}…"`));
            console.log();
        }
        catch (err) {
            spinner.stop();
            console.log(chalk_1.default.gray(`  ${petId}: ${(0, api_1.apiError)(err)}`));
        }
    }
    console.log(chalk_1.default.gray('Use: meowdel chat --pet <id>  or  meowdel ask --pet <id> "question"'));
}
