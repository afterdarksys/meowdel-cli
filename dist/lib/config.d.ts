export interface MeowdelConfig {
    apiKey?: string;
    baseUrl: string;
    personality: string;
    defaultPet?: string;
    claudeApiKey?: string;
    openAiKey?: string;
}
export declare function loadConfig(): MeowdelConfig;
export declare function saveConfig(config: Partial<MeowdelConfig>): void;
export declare function getConfigPath(): string;
