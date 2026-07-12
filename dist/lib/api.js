"use strict";
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
exports.KNOWN_PETS = void 0;
exports.createClient = createClient;
exports.apiError = apiError;
exports.chatRequest = chatRequest;
exports.sendChat = sendChat;
exports.callAI = callAI;
exports.listNotes = listNotes;
exports.getNote = getNote;
exports.createNote = createNote;
exports.updateNote = updateNote;
exports.deleteNote = deleteNote;
exports.searchNotes = searchNotes;
exports.listAlarms = listAlarms;
exports.createAlarm = createAlarm;
exports.updateAlarm = updateAlarm;
exports.deleteAlarm = deleteAlarm;
exports.checkAlarms = checkAlarms;
exports.snoozeAlarm = snoozeAlarm;
exports.getPet = getPet;
const axios_1 = __importDefault(require("axios"));
const config_1 = require("./config");
// ── HTTP client factory ───────────────────────────────────────────────────────
function createClient() {
    const config = (0, config_1.loadConfig)();
    const apiKey = process.env.MEOWDEL_API_KEY || config.apiKey;
    if (!apiKey) {
        throw new Error('API key not configured.\n  Run: meowdel config\n  Or set MEOWDEL_API_KEY env var');
    }
    return axios_1.default.create({
        baseURL: (config.baseUrl || 'https://meowdel.ai').replace(/\/$/, '') + '/api',
        headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
            'User-Agent': 'meowdel-cli/2.0.0',
        },
        timeout: 60000,
    });
}
function apiError(err) {
    const e = err;
    if (e.response) {
        const body = e.response.data;
        return `HTTP ${e.response.status}: ${body?.error || JSON.stringify(body)}`;
    }
    return err.message;
}
// Per-pet system prompts used when calling Claude or OpenAI directly
const PET_PERSONAS = {
    meowdel: 'a helpful, warm AI cat who loves solving problems',
    bandit: 'a bold, street-smart AI cat who is the top expert in knowledge systems and software architecture — opinionated, sharp, and always right',
    luna: 'a mystical, big-picture AI cat who sees connections others miss and thinks in systems',
    professor: 'a scholarly, thorough AI cat who gives careful analysis with supporting evidence',
    ninja: 'a lightning-fast, concise AI cat who cuts straight to the answer with zero fluff',
    bella: 'an elegant, precise AI cat who values correctness and clear thinking above all',
    blubie: 'a playful, curious AI cat who approaches problems with enthusiasm and creative leaps',
    catdog: 'a pleasantly confused AI cat who finds unexpected angles and asks the questions others forgot',
    spotty: 'a pattern-obsessed AI cat who spots inconsistencies and edge cases instantly',
    blinker: 'a sharp, alert AI cat who notices things others overlook',
    nursicat: 'a calm, nurturing AI cat who helps debug problems with patience and care',
    lobstercat: 'a chaotic but brilliant AI cat who thrives in complexity and crisis',
};
function petSystemPrompt(petId) {
    const persona = PET_PERSONAS[petId] ?? `a helpful AI cat with the personality of ${petId}`;
    return `You are ${petId}, ${persona}. You are part of Meowdel — an AI cat collective. Be helpful, occasionally use subtle cat-themed language, and always be direct and useful. Never break character.`;
}
function makeDirectResponse(text, petId, model, provider) {
    const petName = petId.charAt(0).toUpperCase() + petId.slice(1);
    return {
        message: text,
        petId,
        petName,
        photo: '',
        timestamp: new Date().toISOString(),
        _routing: { tier: `direct-${provider}`, model, reason: '', activeSkills: [], cascadeMemoriesUsed: 0 },
        personality: { name: petName },
    };
}
async function callClaude(message, petId, history, claudeApiKey) {
    const Anthropic = (await Promise.resolve().then(() => __importStar(require('@anthropic-ai/sdk')))).default;
    const client = new Anthropic({ apiKey: claudeApiKey });
    const messages = [
        ...history.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: message },
    ];
    const response = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 2048,
        system: petSystemPrompt(petId),
        messages,
    });
    const text = response.content[0].type === 'text' ? response.content[0].text : '';
    const res = makeDirectResponse(text, petId, 'claude-sonnet-4-6', 'claude');
    res.usage = { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens };
    return res;
}
async function callOpenAI(message, petId, history, openAiKey) {
    const model = 'gpt-4o';
    const messages = [
        { role: 'system', content: petSystemPrompt(petId) },
        ...history.map(m => ({ role: m.role, content: m.content })),
        { role: 'user', content: message },
    ];
    const res = await axios_1.default.post('https://api.openai.com/v1/chat/completions', { model, messages, max_tokens: 2048 }, {
        headers: { Authorization: `Bearer ${openAiKey}`, 'Content-Type': 'application/json' },
        timeout: 60000,
    });
    const text = res.data.choices?.[0]?.message?.content ?? '';
    const usage = res.data.usage;
    const resp = makeDirectResponse(text, petId, model, 'openai');
    if (usage)
        resp.usage = { inputTokens: usage.prompt_tokens, outputTokens: usage.completion_tokens };
    return resp;
}
/**
 * Primary chat entrypoint. Routing priority:
 *   1. meowdel.ai API  (apiKey)     — full pet personality + brain
 *   2. Anthropic Claude (claudeApiKey) — direct, meowdel cat persona
 *   3. OpenAI / Codex  (openAiKey)  — direct, meowdel cat persona
 */
async function chatRequest(message, petId, conversationHistory = [], sessionId) {
    const config = (0, config_1.loadConfig)();
    const meowdelKey = process.env.MEOWDEL_API_KEY || config.apiKey;
    if (meowdelKey) {
        const client = createClient();
        const res = await client.post(`/pets/${petId}/chat`, {
            message,
            conversationHistory: conversationHistory.slice(-20),
            sessionId,
        });
        return res.data.response;
    }
    if (config.claudeApiKey) {
        return callClaude(message, petId, conversationHistory, config.claudeApiKey);
    }
    if (config.openAiKey) {
        return callOpenAI(message, petId, conversationHistory, config.openAiKey);
    }
    throw new Error('No API key configured. Run: meowdel config');
}
// ── sendChat (kept for internal use — same routing as chatRequest) ─────────────
async function sendChat(message, history, personality, _useBrain) {
    return chatRequest(message, personality, history);
}
// ── callAI — provider-agnostic helper for superclaude ────────────────────────
async function callAI(prompt) {
    const config = (0, config_1.loadConfig)();
    if (config.claudeApiKey) {
        const Anthropic = (await Promise.resolve().then(() => __importStar(require('@anthropic-ai/sdk')))).default;
        const client = new Anthropic({ apiKey: config.claudeApiKey });
        const res = await client.messages.create({
            model: 'claude-sonnet-4-6',
            max_tokens: 4096,
            messages: [{ role: 'user', content: prompt }],
        });
        return res.content[0].type === 'text' ? res.content[0].text : '';
    }
    if (config.openAiKey) {
        const res = await axios_1.default.post('https://api.openai.com/v1/chat/completions', { model: 'gpt-4o', messages: [{ role: 'user', content: prompt }], max_tokens: 4096 }, {
            headers: { Authorization: `Bearer ${config.openAiKey}`, 'Content-Type': 'application/json' },
            timeout: 60000,
        });
        return res.data.choices?.[0]?.message?.content ?? '';
    }
    if (config.apiKey) {
        const client = createClient();
        const res = await client.post('/v1/chat', {
            message: prompt,
            personality: config.defaultPet || config.personality,
            useBrainContext: false,
            conversationHistory: [],
        });
        return res.data?.message ?? '';
    }
    throw new Error('No API key configured. Run: meowdel config');
}
async function listNotes() {
    const client = createClient();
    const res = await client.get('/brain/notes');
    return Array.isArray(res.data) ? res.data : res.data.notes ?? [];
}
async function getNote(slug) {
    const client = createClient();
    const res = await client.get(`/brain/notes/${slug}`);
    return res.data;
}
async function createNote(title, content, tags = []) {
    const client = createClient();
    const res = await client.post('/brain/notes', { title, content, tags });
    return res.data;
}
async function updateNote(slug, updates) {
    const client = createClient();
    await client.put(`/brain/notes/${slug}`, updates);
}
async function deleteNote(slug) {
    const client = createClient();
    await client.delete(`/brain/notes/${slug}`);
}
async function searchNotes(query, limit = 10) {
    const client = createClient();
    const res = await client.post('/brain/search', { query, limit });
    const data = res.data;
    if (Array.isArray(data))
        return data;
    return data.results ?? data.documents ?? [];
}
async function listAlarms() {
    const client = createClient();
    const res = await client.get('/brain/alarms');
    return res.data;
}
async function createAlarm(payload) {
    const client = createClient();
    const res = await client.post('/brain/alarms', payload);
    return res.data.alarm;
}
async function updateAlarm(id, payload) {
    const client = createClient();
    const res = await client.put(`/brain/alarms/${id}`, payload);
    return res.data.alarm;
}
async function deleteAlarm(id) {
    const client = createClient();
    await client.delete(`/brain/alarms/${id}`);
}
async function checkAlarms() {
    const client = createClient();
    const res = await client.get('/brain/alarms/check');
    return res.data.fired ?? [];
}
async function snoozeAlarm(id, minutes = 9) {
    const client = createClient();
    await client.patch(`/brain/alarms/${id}/snooze`, { minutes });
}
// ── Pets ──────────────────────────────────────────────────────────────────────
exports.KNOWN_PETS = [
    'meowdel', 'bandit', 'luna', 'catdog', 'spotty',
    'bella', 'blubie', 'blinker', 'nursicat', 'lobstercat',
];
async function getPet(petId) {
    const client = createClient();
    const res = await client.get(`/pets/${petId}`);
    return res.data.pet;
}
