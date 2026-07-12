import { AxiosInstance } from 'axios';
export declare function createClient(): AxiosInstance;
export declare function apiError(err: unknown): string;
export interface ChatRouting {
    tier: string;
    model: string;
    reason: string;
    activeSkills: string[];
    cascadeMemoriesUsed: number;
}
export interface ChatResponse {
    message: string;
    petId: string;
    petName: string;
    photo: string;
    timestamp: string;
    _routing: ChatRouting;
    personality?: {
        name: string;
    };
    brainContext?: Array<{
        title: string;
    }>;
    usage?: {
        inputTokens: number;
        outputTokens: number;
    };
}
/**
 * Primary chat entrypoint. Routing priority:
 *   1. meowdel.ai API  (apiKey)     — full pet personality + brain
 *   2. Anthropic Claude (claudeApiKey) — direct, meowdel cat persona
 *   3. OpenAI / Codex  (openAiKey)  — direct, meowdel cat persona
 */
export declare function chatRequest(message: string, petId: string, conversationHistory?: Array<{
    role: string;
    content: string;
}>, sessionId?: string): Promise<ChatResponse>;
export declare function sendChat(message: string, history: Array<{
    role: string;
    content: string;
}>, personality: string, _useBrain: boolean): Promise<ChatResponse>;
export declare function callAI(prompt: string): Promise<string>;
export interface NoteSummary {
    id: string;
    slug: string;
    title: string;
    tags: string[];
    summary: string | null;
    wordCount: number;
    updatedAt: string;
}
export interface NoteDetail extends NoteSummary {
    content: string;
    frontmatter: Record<string, unknown> | null;
    createdAt: string;
}
export declare function listNotes(): Promise<NoteSummary[]>;
export declare function getNote(slug: string): Promise<NoteDetail>;
export declare function createNote(title: string, content: string, tags?: string[]): Promise<{
    id: string;
    slug: string;
}>;
export declare function updateNote(slug: string, updates: {
    title?: string;
    content?: string;
    tags?: string[];
}): Promise<void>;
export declare function deleteNote(slug: string): Promise<void>;
export declare function searchNotes(query: string, limit?: number): Promise<NoteSummary[]>;
export type RepeatFrequency = 'none' | 'daily' | 'weekdays' | 'weekends' | 'weekly' | 'custom';
export interface Alarm {
    id: string;
    userId: string;
    label: string;
    hour: number;
    minute: number;
    timezone: string;
    isEnabled: boolean;
    repeatEnabled: boolean;
    repeatFrequency: RepeatFrequency;
    repeatDays: number[];
    petId: string | null;
    nextFireAt: string | null;
    lastFiredAt: string | null;
    snoozeUntil: string | null;
    createdAt: string;
    updatedAt: string;
}
export interface FiredAlarm {
    id: string;
    label: string;
    hour: number;
    minute: number;
    timezone: string;
    petId: string;
    catMessage: string;
    photo: string | null;
    nextFireAt: string | null;
}
export declare function listAlarms(): Promise<{
    alarms: Alarm[];
    max: number;
}>;
export declare function createAlarm(payload: {
    label: string;
    hour: number;
    minute: number;
    timezone: string;
    repeatEnabled: boolean;
    repeatFrequency: RepeatFrequency;
    repeatDays: number[];
    petId?: string;
}): Promise<Alarm>;
export declare function updateAlarm(id: string, payload: Partial<{
    label: string;
    hour: number;
    minute: number;
    timezone: string;
    isEnabled: boolean;
    repeatEnabled: boolean;
    repeatFrequency: RepeatFrequency;
    repeatDays: number[];
    petId: string | null;
}>): Promise<Alarm>;
export declare function deleteAlarm(id: string): Promise<void>;
export declare function checkAlarms(): Promise<FiredAlarm[]>;
export declare function snoozeAlarm(id: string, minutes?: number): Promise<void>;
export declare const KNOWN_PETS: string[];
export interface PetInfo {
    id: string;
    name: string;
    breed: string;
    personality: string;
    greeting: string;
    photo: string;
}
export declare function getPet(petId: string): Promise<PetInfo>;
