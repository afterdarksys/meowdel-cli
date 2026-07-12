"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.superclaudeCommand = superclaudeCommand;
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const child_process_1 = require("child_process");
const config_1 = require("../lib/config");
const api_1 = require("../lib/api");
// ── Git helpers ───────────────────────────────────────────────────────────────
function git(cmd) {
    try {
        return (0, child_process_1.execSync)(`git ${cmd}`, { encoding: 'utf8' }).trim();
    }
    catch {
        return '';
    }
}
function requireGitRepo() {
    const root = git('rev-parse --show-toplevel');
    if (!root) {
        console.error(chalk_1.default.red('Not inside a git repository.'));
        process.exit(1);
    }
}
// ── Subcommand handlers ───────────────────────────────────────────────────────
async function cmdCommit(options) {
    requireGitRepo();
    const staged = git('diff --cached --name-only');
    if (!staged) {
        console.error(chalk_1.default.red('No staged changes. Run `git add` first.'));
        process.exit(1);
    }
    const diffStat = git('diff --cached --stat');
    const prompt = `Write a concise commit message in conventional commits format for these changes:

Files changed: ${staged}

Git diff stat:
${diffStat}

${options.context ? `Additional context: ${options.context}` : ''}

Requirements:
- Use conventional commits format (feat:, fix:, refactor:, etc.)
- Keep the first line under 50 characters
- Add bullet points for details if needed
- Be specific about what was changed
- Output ONLY the raw commit message text
- Do NOT include any prefatory text
- Do NOT use markdown formatting, backticks, or code blocks
- Do NOT include attribution lines
- Start directly with the commit message (e.g. 'feat: add user authentication')`;
    const spinner = (0, ora_1.default)(chalk_1.default.gray('Generating commit message...')).start();
    try {
        const result = await (0, api_1.callAI)(prompt);
        spinner.stop();
        console.log(chalk_1.default.cyan('\nSuggested commit message:\n'));
        console.log(result);
        console.log();
    }
    catch (err) {
        spinner.stop();
        throw err;
    }
}
async function cmdChangelog(options) {
    requireGitRepo();
    const since = options.since ?? (options.period === 'daily' ? '1 day ago' : options.period === 'weekly' ? '1 week ago' : options.period === 'monthly' ? '1 month ago' : '1 week ago');
    const commits = git(`log --oneline --since="${since}"`);
    if (!commits) {
        console.log(chalk_1.default.yellow('No commits found in that period.'));
        return;
    }
    let intro = 'Create a CHANGELOG.md from these recent commits';
    let requirements = `- Follow Keep a Changelog format
- Group changes by type (Added, Changed, Fixed, Removed)
- Use clear, user-friendly language
- Include version number and date
- Focus on user-facing changes
- Output ONLY the changelog content`;
    if (options.period === 'daily') {
        intro = 'Create a brief, human-readable daily changelog from these recent commits';
        requirements = `- Keep it concise and conversational
- Focus on what was accomplished today
- Group related changes together
- Use present tense
- Highlight key improvements or fixes
- Make it readable for non-technical stakeholders
- Output ONLY the changelog content`;
    }
    else if (options.period === 'weekly') {
        intro = 'Create a weekly summary from these commits';
        requirements = `- Provide a high-level overview of the week's progress
- Group changes by major themes or features
- Highlight significant milestones or achievements
- Include both technical and business impact
- Keep it executive-friendly but technically accurate
- Use bullet points for clarity
- Output ONLY the summary content`;
    }
    else if (options.period === 'monthly') {
        intro = 'Create a monthly summary from these commits';
        requirements = `- Provide a comprehensive monthly overview
- Focus on major features, improvements, and milestones
- Structure by themes: Features, Improvements, Fixes, Infrastructure
- Make it suitable for stakeholder reports
- Highlight team achievements and progress
- Use professional, clear language
- Output ONLY the summary content`;
    }
    const prompt = `${intro}:

${commits}

Requirements:
${requirements}`;
    const spinner = (0, ora_1.default)(chalk_1.default.gray('Generating changelog...')).start();
    try {
        const result = await (0, api_1.callAI)(prompt);
        spinner.stop();
        console.log(chalk_1.default.cyan('\nChangelog:\n'));
        console.log(result);
        console.log();
    }
    catch (err) {
        spinner.stop();
        throw err;
    }
}
async function cmdReadme() {
    requireGitRepo();
    const packageJson = (() => {
        try {
            return require(`${git('rev-parse --show-toplevel')}/package.json`);
        }
        catch {
            return {};
        }
    })();
    const files = git('ls-files --others --exclude-standard -c');
    const recentCommits = git('log --oneline -20');
    const prompt = `Generate a professional README.md for this project.

Project metadata: ${JSON.stringify(packageJson, null, 2)}

Files in repo:
${files}

Recent commits:
${recentCommits}

Requirements:
- Include: project title, description, features, installation, usage, configuration, contributing, license
- Be specific based on the actual project files and commits
- Use proper markdown formatting
- Make it welcoming and clear
- Output ONLY the README content`;
    const spinner = (0, ora_1.default)(chalk_1.default.gray('Generating README...')).start();
    try {
        const result = await (0, api_1.callAI)(prompt);
        spinner.stop();
        console.log(chalk_1.default.cyan('\nGenerated README:\n'));
        console.log(result);
        console.log();
    }
    catch (err) {
        spinner.stop();
        throw err;
    }
}
async function cmdReview(options) {
    requireGitRepo();
    let diff;
    if (options.file) {
        diff = git(`diff HEAD -- ${options.file}`) || git(`show HEAD:${options.file}`);
    }
    else {
        diff = git('diff HEAD~1..HEAD') || git('diff --cached');
    }
    if (!diff) {
        console.error(chalk_1.default.red('No changes to review.'));
        process.exit(1);
    }
    const prompt = `Perform a thorough code review of these changes:

${diff}

Analyze for:
- Security vulnerabilities (injection, auth issues, data exposure)
- Performance problems (N+1 queries, unnecessary loops, memory leaks)
- Maintainability (readability, naming, complexity)
- Correctness (logic errors, edge cases, error handling)
- Best practices violations

Format your response with clear sections and severity levels (Critical, Warning, Suggestion).
Be specific — reference actual line numbers or code snippets.`;
    const spinner = (0, ora_1.default)(chalk_1.default.gray('Reviewing code...')).start();
    try {
        const result = await (0, api_1.callAI)(prompt);
        spinner.stop();
        console.log(chalk_1.default.cyan('\nCode Review:\n'));
        console.log(result);
        console.log();
    }
    catch (err) {
        spinner.stop();
        throw err;
    }
}
async function cmdDocs() {
    requireGitRepo();
    const files = git('ls-files --others --exclude-standard -c');
    const recentCommits = git('log --oneline -30');
    const prompt = `Generate comprehensive technical documentation for this codebase.

Files:
${files}

Recent commits:
${recentCommits}

Include:
- Architecture overview
- Key components and their responsibilities
- Data flow and system design
- API / interface documentation if applicable
- Setup and development guide
- Deployment notes

Output clean, well-structured markdown.`;
    const spinner = (0, ora_1.default)(chalk_1.default.gray('Generating docs...')).start();
    try {
        const result = await (0, api_1.callAI)(prompt);
        spinner.stop();
        console.log(chalk_1.default.cyan('\nTechnical Documentation:\n'));
        console.log(result);
        console.log();
    }
    catch (err) {
        spinner.stop();
        throw err;
    }
}
async function cmdBrainstorm() {
    requireGitRepo();
    const files = git('ls-files --others --exclude-standard -c');
    const recentCommits = git('log --oneline -30');
    let packageJson = {};
    try {
        packageJson = require(`${git('rev-parse --show-toplevel')}/package.json`);
    }
    catch { }
    const prompt = `Based on this codebase, brainstorm concrete improvement ideas.

Project: ${JSON.stringify(packageJson, null, 2)}

Files:
${files}

Recent activity:
${recentCommits}

Suggest:
- New features that would add the most value
- Performance or scalability improvements
- Developer experience improvements
- Architecture refactors worth considering
- Security hardening opportunities

Be specific and actionable. Prioritize by impact.`;
    const spinner = (0, ora_1.default)(chalk_1.default.gray('Brainstorming ideas...')).start();
    try {
        const result = await (0, api_1.callAI)(prompt);
        spinner.stop();
        console.log(chalk_1.default.cyan('\nIdeas & Suggestions:\n'));
        console.log(result);
        console.log();
    }
    catch (err) {
        spinner.stop();
        throw err;
    }
}
async function cmdAnnotate(options) {
    requireGitRepo();
    const count = parseInt(options.count ?? '5', 10);
    const hashes = options.hash
        ? [options.hash]
        : git(`log --format=%H -${count}`).split('\n').filter(Boolean);
    if (!hashes.length) {
        console.error(chalk_1.default.red('No commits found.'));
        process.exit(1);
    }
    for (const hash of hashes) {
        const message = git(`log -1 --format=%s ${hash}`);
        const diff = git(`show ${hash} --stat --patch`);
        const prompt = `Create a detailed technical annotation for this commit:

Commit: ${hash}
Message: ${message}

Diff:
${diff}

Explain:
- What specific changes were made
- Why these changes were likely necessary
- Technical implementation details
- Impact on the codebase

Be detailed but concise. Output only the annotation content.`;
        const spinner = (0, ora_1.default)(chalk_1.default.gray(`Annotating ${hash.slice(0, 7)}...`)).start();
        try {
            const result = await (0, api_1.callAI)(prompt);
            spinner.stop();
            console.log(chalk_1.default.cyan(`\n── ${hash.slice(0, 7)}: ${message} ──\n`));
            console.log(result);
            console.log();
        }
        catch (err) {
            spinner.stop();
            throw err;
        }
    }
}
async function cmdVerify() {
    console.log(chalk_1.default.cyan('\n🔍 Checking dependencies...\n'));
    // Git
    try {
        const v = (0, child_process_1.execSync)('git --version', { encoding: 'utf8' }).trim();
        console.log(chalk_1.default.green('  ✓ Git'), chalk_1.default.gray(v));
    }
    catch {
        console.log(chalk_1.default.red('  ✗ Git not found'));
    }
    // Node
    try {
        const v = (0, child_process_1.execSync)('node --version', { encoding: 'utf8' }).trim();
        console.log(chalk_1.default.green('  ✓ Node'), chalk_1.default.gray(v));
    }
    catch {
        console.log(chalk_1.default.red('  ✗ Node not found'));
    }
    // Config
    const config = (0, config_1.loadConfig)();
    if (config.claudeApiKey) {
        console.log(chalk_1.default.green('  ✓ Claude API key'), chalk_1.default.gray('configured'));
    }
    else if (config.openAiKey) {
        console.log(chalk_1.default.green('  ✓ OpenAI API key'), chalk_1.default.gray('configured'));
    }
    else if (config.apiKey) {
        console.log(chalk_1.default.green('  ✓ Meowdel API key'), chalk_1.default.gray('configured'));
    }
    else {
        console.log(chalk_1.default.red('  ✗ No API key — run: meowdel config'));
    }
    // Git repo check
    const inRepo = git('rev-parse --show-toplevel');
    if (inRepo) {
        console.log(chalk_1.default.green('  ✓ Git repo'), chalk_1.default.gray(inRepo));
    }
    else {
        console.log(chalk_1.default.yellow('  ⚠ Not in a git repo'));
    }
    console.log();
}
// ── Main export ───────────────────────────────────────────────────────────────
async function superclaudeCommand(subcommand, options) {
    try {
        switch (subcommand) {
            case 'commit':
                await cmdCommit(options);
                break;
            case 'changelog':
                await cmdChangelog(options);
                break;
            case 'readme':
                await cmdReadme();
                break;
            case 'review':
                await cmdReview(options);
                break;
            case 'docs':
                await cmdDocs();
                break;
            case 'brainstorm':
                await cmdBrainstorm();
                break;
            case 'annotate':
                await cmdAnnotate(options);
                break;
            case 'verify':
                await cmdVerify();
                break;
            default:
                console.error(chalk_1.default.red(`Unknown subcommand: ${subcommand}`));
                console.log(chalk_1.default.gray('\nAvailable: commit, changelog, readme, review, docs, brainstorm, annotate, verify\n'));
                process.exit(1);
        }
    }
    catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        console.error(chalk_1.default.red('Error:'), msg);
        process.exit(1);
    }
}
