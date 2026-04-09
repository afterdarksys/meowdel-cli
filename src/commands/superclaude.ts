import chalk from 'chalk'
import ora from 'ora'
import { execSync } from 'child_process'
import { loadConfig } from '../lib/config'

// ── Git helpers ───────────────────────────────────────────────────────────────

function git(cmd: string): string {
  try {
    return execSync(`git ${cmd}`, { encoding: 'utf8' }).trim()
  } catch {
    return ''
  }
}

function requireGitRepo() {
  const root = git('rev-parse --show-toplevel')
  if (!root) {
    console.error(chalk.red('Not inside a git repository.'))
    process.exit(1)
  }
}

// ── Claude helper ─────────────────────────────────────────────────────────────

async function callClaude(prompt: string): Promise<string> {
  const config = loadConfig()

  if (config.claudeApiKey) {
    const Anthropic = (await import('@anthropic-ai/sdk')).default
    const client = new Anthropic({ apiKey: config.claudeApiKey })
    const res = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    })
    return res.content[0].type === 'text' ? res.content[0].text : ''
  }

  if (config.apiKey) {
    const axios = (await import('axios')).default
    const res = await axios.post(
      `${config.baseUrl}/api/v1/chat`,
      { message: prompt, personality: config.personality, useBrainContext: false, conversationHistory: [] },
      { headers: { Authorization: `Bearer ${config.apiKey}` }, timeout: 60000 }
    )
    return res.data?.message ?? ''
  }

  console.error(chalk.red('No API key configured. Run: meowdel config'))
  process.exit(1)
}

// ── Subcommand handlers ───────────────────────────────────────────────────────

async function cmdCommit(options: { context?: string }) {
  requireGitRepo()

  const staged = git('diff --cached --name-only')
  if (!staged) {
    console.error(chalk.red('No staged changes. Run `git add` first.'))
    process.exit(1)
  }

  const diffStat = git('diff --cached --stat')
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
- Start directly with the commit message (e.g. 'feat: add user authentication')`

  const spinner = ora(chalk.gray('Generating commit message...')).start()
  try {
    const result = await callClaude(prompt)
    spinner.stop()
    console.log(chalk.cyan('\nSuggested commit message:\n'))
    console.log(result)
    console.log()
  } catch (err) {
    spinner.stop()
    throw err
  }
}

async function cmdChangelog(options: { period?: 'daily' | 'weekly' | 'monthly'; since?: string }) {
  requireGitRepo()

  const since = options.since ?? (options.period === 'daily' ? '1 day ago' : options.period === 'weekly' ? '1 week ago' : options.period === 'monthly' ? '1 month ago' : '1 week ago')
  const commits = git(`log --oneline --since="${since}"`)

  if (!commits) {
    console.log(chalk.yellow('No commits found in that period.'))
    return
  }

  let intro = 'Create a CHANGELOG.md from these recent commits'
  let requirements = `- Follow Keep a Changelog format
- Group changes by type (Added, Changed, Fixed, Removed)
- Use clear, user-friendly language
- Include version number and date
- Focus on user-facing changes
- Output ONLY the changelog content`

  if (options.period === 'daily') {
    intro = 'Create a brief, human-readable daily changelog from these recent commits'
    requirements = `- Keep it concise and conversational
- Focus on what was accomplished today
- Group related changes together
- Use present tense
- Highlight key improvements or fixes
- Make it readable for non-technical stakeholders
- Output ONLY the changelog content`
  } else if (options.period === 'weekly') {
    intro = 'Create a weekly summary from these commits'
    requirements = `- Provide a high-level overview of the week's progress
- Group changes by major themes or features
- Highlight significant milestones or achievements
- Include both technical and business impact
- Keep it executive-friendly but technically accurate
- Use bullet points for clarity
- Output ONLY the summary content`
  } else if (options.period === 'monthly') {
    intro = 'Create a monthly summary from these commits'
    requirements = `- Provide a comprehensive monthly overview
- Focus on major features, improvements, and milestones
- Structure by themes: Features, Improvements, Fixes, Infrastructure
- Make it suitable for stakeholder reports
- Highlight team achievements and progress
- Use professional, clear language
- Output ONLY the summary content`
  }

  const prompt = `${intro}:

${commits}

Requirements:
${requirements}`

  const spinner = ora(chalk.gray('Generating changelog...')).start()
  try {
    const result = await callClaude(prompt)
    spinner.stop()
    console.log(chalk.cyan('\nChangelog:\n'))
    console.log(result)
    console.log()
  } catch (err) {
    spinner.stop()
    throw err
  }
}

async function cmdReadme() {
  requireGitRepo()

  const packageJson = (() => {
    try {
      return require(`${git('rev-parse --show-toplevel')}/package.json`)
    } catch {
      return {}
    }
  })()

  const files = git('ls-files --others --exclude-standard -c')
  const recentCommits = git('log --oneline -20')

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
- Output ONLY the README content`

  const spinner = ora(chalk.gray('Generating README...')).start()
  try {
    const result = await callClaude(prompt)
    spinner.stop()
    console.log(chalk.cyan('\nGenerated README:\n'))
    console.log(result)
    console.log()
  } catch (err) {
    spinner.stop()
    throw err
  }
}

async function cmdReview(options: { file?: string }) {
  requireGitRepo()

  let diff: string
  if (options.file) {
    diff = git(`diff HEAD -- ${options.file}`) || git(`show HEAD:${options.file}`)
  } else {
    diff = git('diff HEAD~1..HEAD') || git('diff --cached')
  }

  if (!diff) {
    console.error(chalk.red('No changes to review.'))
    process.exit(1)
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
Be specific — reference actual line numbers or code snippets.`

  const spinner = ora(chalk.gray('Reviewing code...')).start()
  try {
    const result = await callClaude(prompt)
    spinner.stop()
    console.log(chalk.cyan('\nCode Review:\n'))
    console.log(result)
    console.log()
  } catch (err) {
    spinner.stop()
    throw err
  }
}

async function cmdDocs() {
  requireGitRepo()

  const files = git('ls-files --others --exclude-standard -c')
  const recentCommits = git('log --oneline -30')

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

Output clean, well-structured markdown.`

  const spinner = ora(chalk.gray('Generating docs...')).start()
  try {
    const result = await callClaude(prompt)
    spinner.stop()
    console.log(chalk.cyan('\nTechnical Documentation:\n'))
    console.log(result)
    console.log()
  } catch (err) {
    spinner.stop()
    throw err
  }
}

async function cmdBrainstorm() {
  requireGitRepo()

  const files = git('ls-files --others --exclude-standard -c')
  const recentCommits = git('log --oneline -30')

  let packageJson = {}
  try {
    packageJson = require(`${git('rev-parse --show-toplevel')}/package.json`)
  } catch {}

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

Be specific and actionable. Prioritize by impact.`

  const spinner = ora(chalk.gray('Brainstorming ideas...')).start()
  try {
    const result = await callClaude(prompt)
    spinner.stop()
    console.log(chalk.cyan('\nIdeas & Suggestions:\n'))
    console.log(result)
    console.log()
  } catch (err) {
    spinner.stop()
    throw err
  }
}

async function cmdAnnotate(options: { hash?: string; count?: string }) {
  requireGitRepo()

  const count = parseInt(options.count ?? '5', 10)
  const hashes = options.hash
    ? [options.hash]
    : git(`log --format=%H -${count}`).split('\n').filter(Boolean)

  if (!hashes.length) {
    console.error(chalk.red('No commits found.'))
    process.exit(1)
  }

  for (const hash of hashes) {
    const message = git(`log -1 --format=%s ${hash}`)
    const diff = git(`show ${hash} --stat --patch`)

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

Be detailed but concise. Output only the annotation content.`

    const spinner = ora(chalk.gray(`Annotating ${hash.slice(0, 7)}...`)).start()
    try {
      const result = await callClaude(prompt)
      spinner.stop()
      console.log(chalk.cyan(`\n── ${hash.slice(0, 7)}: ${message} ──\n`))
      console.log(result)
      console.log()
    } catch (err) {
      spinner.stop()
      throw err
    }
  }
}

async function cmdVerify() {
  console.log(chalk.cyan('\n🔍 Checking dependencies...\n'))

  // Git
  try {
    const v = execSync('git --version', { encoding: 'utf8' }).trim()
    console.log(chalk.green('  ✓ Git'), chalk.gray(v))
  } catch {
    console.log(chalk.red('  ✗ Git not found'))
  }

  // Node
  try {
    const v = execSync('node --version', { encoding: 'utf8' }).trim()
    console.log(chalk.green('  ✓ Node'), chalk.gray(v))
  } catch {
    console.log(chalk.red('  ✗ Node not found'))
  }

  // Config
  const config = loadConfig()
  if (config.claudeApiKey) {
    console.log(chalk.green('  ✓ Claude API key'), chalk.gray('configured'))
  } else if (config.apiKey) {
    console.log(chalk.green('  ✓ Meowdel API key'), chalk.gray('configured'))
  } else {
    console.log(chalk.red('  ✗ No API key — run: meowdel config'))
  }

  // Git repo check
  const inRepo = git('rev-parse --show-toplevel')
  if (inRepo) {
    console.log(chalk.green('  ✓ Git repo'), chalk.gray(inRepo))
  } else {
    console.log(chalk.yellow('  ⚠ Not in a git repo'))
  }

  console.log()
}

// ── Main export ───────────────────────────────────────────────────────────────

export async function superclaudeCommand(
  subcommand: string,
  options: {
    context?: string
    period?: 'daily' | 'weekly' | 'monthly'
    since?: string
    file?: string
    hash?: string
    count?: string
  }
) {
  try {
    switch (subcommand) {
      case 'commit':
        await cmdCommit(options)
        break
      case 'changelog':
        await cmdChangelog(options)
        break
      case 'readme':
        await cmdReadme()
        break
      case 'review':
        await cmdReview(options)
        break
      case 'docs':
        await cmdDocs()
        break
      case 'brainstorm':
        await cmdBrainstorm()
        break
      case 'annotate':
        await cmdAnnotate(options)
        break
      case 'verify':
        await cmdVerify()
        break
      default:
        console.error(chalk.red(`Unknown subcommand: ${subcommand}`))
        console.log(chalk.gray('\nAvailable: commit, changelog, readme, review, docs, brainstorm, annotate, verify\n'))
        process.exit(1)
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error(chalk.red('Error:'), msg)
    process.exit(1)
  }
}
