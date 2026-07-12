"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadConfig = loadConfig;
exports.saveConfig = saveConfig;
exports.getConfigPath = getConfigPath;
const fs_1 = __importDefault(require("fs"));
const os_1 = __importDefault(require("os"));
const path_1 = __importDefault(require("path"));
const CONFIG_DIR = path_1.default.join(os_1.default.homedir(), '.meowdel');
const CONFIG_FILE = path_1.default.join(CONFIG_DIR, 'config.json');
const DEFAULTS = {
    baseUrl: 'https://meowdel.ai',
    personality: 'mittens',
};
function loadConfig() {
    if (!fs_1.default.existsSync(CONFIG_FILE))
        return { ...DEFAULTS };
    try {
        const raw = fs_1.default.readFileSync(CONFIG_FILE, 'utf8');
        return { ...DEFAULTS, ...JSON.parse(raw) };
    }
    catch {
        return { ...DEFAULTS };
    }
}
function saveConfig(config) {
    if (!fs_1.default.existsSync(CONFIG_DIR))
        fs_1.default.mkdirSync(CONFIG_DIR, { recursive: true });
    const existing = loadConfig();
    fs_1.default.writeFileSync(CONFIG_FILE, JSON.stringify({ ...existing, ...config }, null, 2));
}
function getConfigPath() {
    return CONFIG_FILE;
}
