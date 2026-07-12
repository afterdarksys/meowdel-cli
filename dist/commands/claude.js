"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.claudeSetupCommand = claudeSetupCommand;
exports.claudeStatusCommand = claudeStatusCommand;
const chalk_1 = __importDefault(require("chalk"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const os_1 = __importDefault(require("os"));
const config_1 = require("../lib/config");
const CLAUDE_SETTINGS_PATH = path_1.default.join(os_1.default.homedir(), '.claude', 'settings.json');
function readClaudeSettings() {
    try {
        if (fs_1.default.existsSync(CLAUDE_SETTINGS_PATH)) {
            return JSON.parse(fs_1.default.readFileSync(CLAUDE_SETTINGS_PATH, 'utf-8'));
        }
    }
    catch {
        // fall through
    }
    return {};
}
function writeClaudeSettings(settings) {
    const dir = path_1.default.dirname(CLAUDE_SETTINGS_PATH);
    if (!fs_1.default.existsSync(dir))
        fs_1.default.mkdirSync(dir, { recursive: true });
    fs_1.default.writeFileSync(CLAUDE_SETTINGS_PATH, JSON.stringify(settings, null, 2));
}
function findMcpServerPath() {
    // 1. Resolved path of this running process's package dist directory
    const distMcp = path_1.default.resolve(__dirname, '..', 'dist', 'mcp-server.js');
    if (fs_1.default.existsSync(distMcp))
        return distMcp;
    // 2. If we are already in dist (compiled), sibling mcp-server.js
    const siblingMcp = path_1.default.resolve(__dirname, 'mcp-server.js');
    if (fs_1.default.existsSync(siblingMcp))
        return siblingMcp;
    // 3. Global npm install: find via `npm root -g`
    try {
        const { execSync } = require('child_process');
        const npmRoot = execSync('npm root -g', { encoding: 'utf-8' }).trim();
        const globalMcp = path_1.default.join(npmRoot, 'meowdel', 'dist', 'mcp-server.js');
        if (fs_1.default.existsSync(globalMcp))
            return globalMcp;
    }
    catch {
        // npm not available or not installed globally
    }
    return null;
}
async function claudeSetupCommand() {
    console.log(chalk_1.default.magenta('\n🐱 Setting up Meowdel as a Claude MCP server...\n'));
    // ── Check API key ──────────────────────────────────────────────────────────
    const config = (0, config_1.loadConfig)();
    const apiKey = process.env.MEOWDEL_API_KEY || config.apiKey;
    if (!apiKey) {
        console.log(chalk_1.default.red('✗ No Meowdel API key configured.'));
        console.log(chalk_1.default.yellow('  Run: meowdel config --key YOUR_API_KEY'));
        console.log(chalk_1.default.gray('  Get a key: https://meowdel.ai/profile\n'));
        process.exit(1);
    }
    console.log(chalk_1.default.green('✓'), 'API key:', chalk_1.default.gray('****' + apiKey.slice(-8)));
    // ── Find MCP server binary ─────────────────────────────────────────────────
    const mcpPath = findMcpServerPath();
    let mcpConfig;
    if (mcpPath) {
        console.log(chalk_1.default.green('✓'), 'MCP server:', chalk_1.default.gray(mcpPath));
        mcpConfig = {
            command: process.execPath, // node binary
            args: [mcpPath],
            env: {
                MEOWDEL_API_KEY: apiKey,
            },
        };
    }
    else {
        // Fall back to the meowdel-mcp bin (if globally linked)
        console.log(chalk_1.default.yellow('⚠'), 'dist/mcp-server.js not found — using meowdel-mcp binary');
        console.log(chalk_1.default.gray('  If this fails, run: meowdel build first\n'));
        mcpConfig = {
            command: 'meowdel-mcp',
            env: {
                MEOWDEL_API_KEY: apiKey,
            },
        };
    }
    // ── Write to ~/.claude/settings.json ──────────────────────────────────────
    console.log(chalk_1.default.gray(`\nUpdating ${CLAUDE_SETTINGS_PATH}…`));
    const settings = readClaudeSettings();
    if (!settings.mcpServers)
        settings.mcpServers = {};
    const isUpdate = !!settings.mcpServers.meowdel;
    settings.mcpServers.meowdel = mcpConfig;
    writeClaudeSettings(settings);
    console.log(chalk_1.default.green('✓'), isUpdate ? 'Meowdel MCP config updated!' : 'Meowdel MCP server registered!');
    // ── Summary ────────────────────────────────────────────────────────────────
    console.log(`
${chalk_1.default.magenta.bold('Restart Claude Code for changes to take effect.')}

${chalk_1.default.bold('Claude can now:')}
  ${chalk_1.default.cyan('•')} Search your Brain notes
  ${chalk_1.default.cyan('•')} Read full note content
  ${chalk_1.default.cyan('•')} Browse your knowledge base by tag
  ${chalk_1.default.cyan('•')} Ask Meowdel cats for expert opinions

${chalk_1.default.bold('Try asking Claude:')}
  ${chalk_1.default.gray('"Search my notes for authentication patterns"')}
  ${chalk_1.default.gray('"Ask meowdel what bandit thinks about this architecture"')}
  ${chalk_1.default.gray('"List my notes tagged #system-design"')}
`);
}
async function claudeStatusCommand() {
    const settings = readClaudeSettings();
    const meowdel = settings?.mcpServers?.meowdel;
    if (!meowdel) {
        console.log(chalk_1.default.yellow('\n⚠  Meowdel MCP server is not registered with Claude.\n'));
        console.log(chalk_1.default.gray('Run: meowdel claude setup\n'));
        return;
    }
    console.log(chalk_1.default.magenta('\n🐱 Meowdel MCP Status\n'));
    console.log(chalk_1.default.green('✓'), 'Registered in', chalk_1.default.gray(CLAUDE_SETTINGS_PATH));
    console.log(chalk_1.default.cyan('  Command:'), meowdel.command);
    if (meowdel.args?.length)
        console.log(chalk_1.default.cyan('  Args:   '), meowdel.args.join(' '));
    const key = meowdel.env?.MEOWDEL_API_KEY;
    console.log(chalk_1.default.cyan('  API key:'), key ? chalk_1.default.gray('****' + key.slice(-8)) : chalk_1.default.red('not set'));
    console.log();
}
