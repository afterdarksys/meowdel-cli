export declare function notesListCommand(options: {
    tag?: string;
    search?: string;
}): Promise<void>;
export declare function notesViewCommand(slug: string): Promise<void>;
export declare function notesNewCommand(titleArg?: string): Promise<void>;
export declare function notesEditCommand(slug: string): Promise<void>;
export declare function notesDeleteCommand(slug: string): Promise<void>;
export declare function notesSearchCommand(query: string): Promise<void>;
export declare function notesTagsCommand(): Promise<void>;
