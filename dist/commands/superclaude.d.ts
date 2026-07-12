export declare function superclaudeCommand(subcommand: string, options: {
    context?: string;
    period?: 'daily' | 'weekly' | 'monthly';
    since?: string;
    file?: string;
    hash?: string;
    count?: string;
}): Promise<void>;
