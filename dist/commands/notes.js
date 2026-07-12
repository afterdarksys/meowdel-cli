"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.notesListCommand = notesListCommand;
exports.notesViewCommand = notesViewCommand;
exports.notesNewCommand = notesNewCommand;
exports.notesEditCommand = notesEditCommand;
exports.notesDeleteCommand = notesDeleteCommand;
exports.notesSearchCommand = notesSearchCommand;
exports.notesTagsCommand = notesTagsCommand;
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const inquirer_1 = __importDefault(require("inquirer"));
const child_process_1 = require("child_process");
const fs_1 = require("fs");
const os_1 = require("os");
const path_1 = require("path");
const api_1 = require("../lib/api");
function timeAgo(iso) {
    const secs = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (secs < 60)
        return 'just now';
    if (secs < 3600)
        return `${Math.floor(secs / 60)}m ago`;
    if (secs < 86400)
        return `${Math.floor(secs / 3600)}h ago`;
    return `${Math.floor(secs / 86400)}d ago`;
}
function openEditor(initial = '') {
    const editor = process.env.EDITOR || process.env.VISUAL || 'nano';
    const tmp = (0, path_1.join)((0, os_1.tmpdir)(), `meowdel-note-${Date.now()}.md`);
    (0, fs_1.writeFileSync)(tmp, initial, 'utf-8');
    (0, child_process_1.spawnSync)(editor, [tmp], { stdio: 'inherit' });
    const result = (0, fs_1.readFileSync)(tmp, 'utf-8');
    try {
        (0, fs_1.unlinkSync)(tmp);
    }
    catch { /* ignore */ }
    return result;
}
async function notesListCommand(options) {
    const spinner = (0, ora_1.default)('Loading notes…').start();
    try {
        let notes = await (0, api_1.listNotes)();
        spinner.stop();
        if (options.search) {
            const q = options.search.toLowerCase();
            notes = notes.filter(n => n.title.toLowerCase().includes(q) ||
                (n.summary || '').toLowerCase().includes(q) ||
                n.tags.some(t => t.toLowerCase().includes(q)));
        }
        if (options.tag) {
            notes = notes.filter(n => n.tags.includes(options.tag));
        }
        if (!notes.length) {
            console.log(chalk_1.default.gray('No notes found.'));
            return;
        }
        const slugW = Math.min(30, Math.max(...notes.map(n => n.slug.length)));
        const titleW = Math.min(40, Math.max(...notes.map(n => n.title.length)));
        console.log(chalk_1.default.bold(`${'SLUG'.padEnd(slugW)}  ${'TITLE'.padEnd(titleW)}  ${'TAGS'.padEnd(20)}  WORDS  UPDATED`));
        for (const n of notes.slice(0, 50)) {
            const tags = (n.tags || []).slice(0, 3).join(', ');
            console.log(`${chalk_1.default.cyan(n.slug.padEnd(slugW))}  ${n.title.padEnd(titleW)}  ${chalk_1.default.gray(tags.padEnd(20))}  ${String(n.wordCount || 0).padStart(5)}  ${chalk_1.default.dim(timeAgo(n.updatedAt))}`);
        }
        if (notes.length > 50)
            console.log(chalk_1.default.gray(`…and ${notes.length - 50} more`));
        console.log(chalk_1.default.gray(`\nTotal: ${notes.length}`));
    }
    catch (err) {
        spinner.stop();
        console.error(chalk_1.default.red('Error:'), (0, api_1.apiError)(err));
        process.exit(1);
    }
}
async function notesViewCommand(slug) {
    const spinner = (0, ora_1.default)('Fetching note…').start();
    try {
        const note = await (0, api_1.getNote)(slug);
        spinner.stop();
        console.log(chalk_1.default.bold.cyan(`\n${note.title}`), chalk_1.default.gray(`  (${slug})`));
        if (note.tags?.length)
            console.log(chalk_1.default.gray(`Tags: ${note.tags.join(', ')}`));
        if (note.summary)
            console.log(chalk_1.default.italic.gray(note.summary));
        console.log(chalk_1.default.gray(`${note.wordCount}w · updated ${timeAgo(note.updatedAt)}\n`));
        console.log(note.content);
    }
    catch (err) {
        spinner.stop();
        console.error(chalk_1.default.red('Error:'), (0, api_1.apiError)(err));
        process.exit(1);
    }
}
async function notesNewCommand(titleArg) {
    let title = titleArg?.trim();
    if (!title) {
        const { t } = await inquirer_1.default.prompt([{ type: 'input', name: 't', message: 'Note title:' }]);
        title = t.trim();
    }
    if (!title)
        return;
    console.log(chalk_1.default.gray(`Opening editor for "${title}"…`));
    const content = openEditor(`# ${title}\n\n`);
    if (content.trim() === `# ${title}`) {
        console.log(chalk_1.default.gray('No content — note not created.'));
        return;
    }
    const spinner = (0, ora_1.default)('Creating note…').start();
    try {
        const result = await (0, api_1.createNote)(title, content);
        spinner.stop();
        console.log(chalk_1.default.green('✓'), `Created: ${chalk_1.default.cyan(result.slug)}`);
    }
    catch (err) {
        spinner.stop();
        console.error(chalk_1.default.red('Error:'), (0, api_1.apiError)(err));
        process.exit(1);
    }
}
async function notesEditCommand(slug) {
    const spinner = (0, ora_1.default)('Fetching note…').start();
    try {
        const note = await (0, api_1.getNote)(slug);
        spinner.stop();
        console.log(chalk_1.default.gray(`Opening "${note.title}" in editor…`));
        const content = openEditor(note.content);
        if (content === note.content) {
            console.log(chalk_1.default.gray('No changes.'));
            return;
        }
        const saveSpinner = (0, ora_1.default)('Saving…').start();
        await (0, api_1.updateNote)(slug, { content });
        saveSpinner.stop();
        console.log(chalk_1.default.green('✓'), `Saved (${content.trim().split(/\s+/).length} words)`);
    }
    catch (err) {
        spinner.stop();
        console.error(chalk_1.default.red('Error:'), (0, api_1.apiError)(err));
        process.exit(1);
    }
}
async function notesDeleteCommand(slug) {
    let note;
    try {
        note = await (0, api_1.getNote)(slug);
    }
    catch (err) {
        console.error(chalk_1.default.red('Error:'), (0, api_1.apiError)(err));
        process.exit(1);
        return;
    }
    const { confirm } = await inquirer_1.default.prompt([{
            type: 'confirm', name: 'confirm',
            message: `Delete "${note.title}"?`,
            default: false,
        }]);
    if (!confirm) {
        console.log(chalk_1.default.gray('Cancelled.'));
        return;
    }
    const spinner = (0, ora_1.default)('Deleting…').start();
    try {
        await (0, api_1.deleteNote)(slug);
        spinner.stop();
        console.log(chalk_1.default.green('✓'), `Deleted: ${slug}`);
    }
    catch (err) {
        spinner.stop();
        console.error(chalk_1.default.red('Error:'), (0, api_1.apiError)(err));
        process.exit(1);
    }
}
async function notesSearchCommand(query) {
    const spinner = (0, ora_1.default)(`Searching "${query}"…`).start();
    try {
        const results = await (0, api_1.searchNotes)(query);
        spinner.stop();
        if (!results.length) {
            console.log(chalk_1.default.gray('No results.'));
            return;
        }
        console.log(chalk_1.default.gray(`\n${results.length} result(s):\n`));
        for (const r of results.slice(0, 10)) {
            console.log(`${chalk_1.default.cyan(r.title || r.slug)}  ${chalk_1.default.gray(r.slug)}`);
            if (r.summary)
                console.log(chalk_1.default.gray(`  ${r.summary.slice(0, 120)}…`));
        }
    }
    catch (err) {
        spinner.stop();
        console.error(chalk_1.default.red('Error:'), (0, api_1.apiError)(err));
        process.exit(1);
    }
}
async function notesTagsCommand() {
    const spinner = (0, ora_1.default)('Loading notes…').start();
    try {
        const notes = await (0, api_1.listNotes)();
        spinner.stop();
        const counts = {};
        for (const n of notes)
            for (const t of (n.tags || []))
                counts[t] = (counts[t] || 0) + 1;
        if (!Object.keys(counts).length) {
            console.log(chalk_1.default.gray('No tags.'));
            return;
        }
        const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
        console.log(chalk_1.default.bold('\nTAG                  COUNT'));
        for (const [tag, count] of sorted) {
            console.log(`${chalk_1.default.cyan(tag.padEnd(20))}  ${count}`);
        }
    }
    catch (err) {
        spinner.stop();
        console.error(chalk_1.default.red('Error:'), (0, api_1.apiError)(err));
        process.exit(1);
    }
}
