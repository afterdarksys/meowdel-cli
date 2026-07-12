"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.alarmsListCommand = alarmsListCommand;
exports.alarmsAddCommand = alarmsAddCommand;
exports.alarmsEditCommand = alarmsEditCommand;
exports.alarmsToggleCommand = alarmsToggleCommand;
exports.alarmsDeleteCommand = alarmsDeleteCommand;
exports.alarmsCheckCommand = alarmsCheckCommand;
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const inquirer_1 = __importDefault(require("inquirer"));
const api_1 = require("../lib/api");
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
function fmtTime(h, m) {
    const ampm = h >= 12 ? 'PM' : 'AM';
    const h12 = h % 12 || 12;
    return `${String(h12).padStart(2, '0')}:${String(m).padStart(2, '0')} ${ampm}`;
}
function fmtRepeat(a) {
    if (!a.repeatEnabled)
        return chalk_1.default.gray('once');
    switch (a.repeatFrequency) {
        case 'daily': return 'every day';
        case 'weekdays': return 'weekdays';
        case 'weekends': return 'weekends';
        case 'weekly':
        case 'custom':
            return (a.repeatDays || []).map(d => DOW[d]).join(', ') || a.repeatFrequency;
        default: return a.repeatFrequency;
    }
}
async function alarmsListCommand() {
    const spinner = (0, ora_1.default)('Loading alarms…').start();
    try {
        const { alarms, max } = await (0, api_1.listAlarms)();
        spinner.stop();
        if (!alarms.length) {
            console.log(chalk_1.default.gray(`No alarms. You can create up to ${max}.\n`));
            return;
        }
        console.log(chalk_1.default.bold(`\nALARMS  (${alarms.length}/${max})\n`));
        for (const a of alarms) {
            const status = a.isEnabled ? chalk_1.default.green('●') : chalk_1.default.gray('○');
            const snoozed = a.snoozeUntil && new Date(a.snoozeUntil) > new Date()
                ? chalk_1.default.yellow(` [snoozed until ${new Date(a.snoozeUntil).toLocaleTimeString()}]`)
                : '';
            console.log(`${status} ${chalk_1.default.cyan(fmtTime(a.hour, a.minute))}  ${chalk_1.default.bold(a.label)}  ${chalk_1.default.gray(fmtRepeat(a))}${snoozed}`);
            console.log(`  ${chalk_1.default.dim(a.id)}  tz: ${a.timezone}  pet: ${a.petId || 'default'}`);
            if (a.nextFireAt)
                console.log(`  next: ${chalk_1.default.dim(new Date(a.nextFireAt).toLocaleString())}`);
            console.log();
        }
    }
    catch (err) {
        spinner.stop();
        console.error(chalk_1.default.red('Error:'), (0, api_1.apiError)(err));
        process.exit(1);
    }
}
async function promptAlarmFields(defaults) {
    const answers = await inquirer_1.default.prompt([
        {
            type: 'input',
            name: 'label',
            message: 'Alarm label:',
            default: defaults?.label || 'Alarm',
        },
        {
            type: 'input',
            name: 'time',
            message: 'Time (HH:MM, 24-hour):',
            default: defaults ? `${String(defaults.hour ?? 7).padStart(2, '0')}:${String(defaults.minute ?? 0).padStart(2, '0')}` : '07:00',
            validate: (v) => /^\d{1,2}:\d{2}$/.test(v) || 'Enter time as HH:MM',
        },
        {
            type: 'input',
            name: 'timezone',
            message: 'Timezone (IANA, e.g. America/New_York):',
            default: defaults?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        },
        {
            type: 'confirm',
            name: 'repeatEnabled',
            message: 'Repeat?',
            default: defaults?.repeatEnabled ?? false,
        },
        {
            type: 'list',
            name: 'repeatFrequency',
            message: 'Repeat frequency:',
            choices: [
                { name: 'Daily', value: 'daily' },
                { name: 'Weekdays (Mon–Fri)', value: 'weekdays' },
                { name: 'Weekends (Sat–Sun)', value: 'weekends' },
                { name: 'Specific days', value: 'custom' },
            ],
            when: (a) => a.repeatEnabled,
            default: defaults?.repeatFrequency || 'daily',
        },
        {
            type: 'checkbox',
            name: 'repeatDays',
            message: 'Which days?',
            choices: DOW.map((d, i) => ({ name: d, value: i })),
            when: (a) => a.repeatEnabled && a.repeatFrequency === 'custom',
            default: defaults?.repeatDays || [],
        },
        {
            type: 'list',
            name: 'petId',
            message: 'Which cat wakes you up?',
            choices: [
                { name: 'Default (your selected pet)', value: '' },
                ...api_1.KNOWN_PETS.map(p => ({ name: p, value: p })),
            ],
            default: defaults?.petId || '',
        },
    ]);
    const [hStr, mStr] = answers.time.split(':');
    return {
        label: answers.label,
        hour: parseInt(hStr, 10),
        minute: parseInt(mStr, 10),
        timezone: answers.timezone,
        repeatEnabled: answers.repeatEnabled ?? false,
        repeatFrequency: (answers.repeatFrequency || 'none'),
        repeatDays: answers.repeatDays || [],
        petId: answers.petId || undefined,
    };
}
async function alarmsAddCommand() {
    const fields = await promptAlarmFields();
    const spinner = (0, ora_1.default)('Creating alarm…').start();
    try {
        const alarm = await (0, api_1.createAlarm)(fields);
        spinner.stop();
        console.log(chalk_1.default.green('✓'), `Alarm created: ${chalk_1.default.cyan(fmtTime(alarm.hour, alarm.minute))} — ${alarm.label}`);
        if (alarm.nextFireAt)
            console.log(chalk_1.default.gray(`  Next: ${new Date(alarm.nextFireAt).toLocaleString()}`));
    }
    catch (err) {
        spinner.stop();
        console.error(chalk_1.default.red('Error:'), (0, api_1.apiError)(err));
        process.exit(1);
    }
}
async function alarmsEditCommand(id) {
    let current;
    try {
        const { alarms } = await (0, api_1.listAlarms)();
        current = alarms.find(a => a.id === id);
        if (!current) {
            console.error(chalk_1.default.red(`Alarm ${id} not found`));
            process.exit(1);
        }
    }
    catch (err) {
        console.error(chalk_1.default.red('Error:'), (0, api_1.apiError)(err));
        process.exit(1);
    }
    const fields = await promptAlarmFields(current);
    const spinner = (0, ora_1.default)('Updating alarm…').start();
    try {
        const alarm = await (0, api_1.updateAlarm)(id, fields);
        spinner.stop();
        console.log(chalk_1.default.green('✓'), `Updated: ${chalk_1.default.cyan(fmtTime(alarm.hour, alarm.minute))} — ${alarm.label}`);
    }
    catch (err) {
        spinner.stop();
        console.error(chalk_1.default.red('Error:'), (0, api_1.apiError)(err));
        process.exit(1);
    }
}
async function alarmsToggleCommand(id) {
    try {
        const { alarms } = await (0, api_1.listAlarms)();
        const alarm = alarms.find(a => a.id === id);
        if (!alarm) {
            console.error(chalk_1.default.red(`Alarm ${id} not found`));
            process.exit(1);
        }
        const updated = await (0, api_1.updateAlarm)(id, { isEnabled: !alarm.isEnabled });
        const state = updated.isEnabled ? chalk_1.default.green('enabled') : chalk_1.default.gray('disabled');
        console.log(chalk_1.default.green('✓'), `Alarm ${state}: ${updated.label}`);
    }
    catch (err) {
        console.error(chalk_1.default.red('Error:'), (0, api_1.apiError)(err));
        process.exit(1);
    }
}
async function alarmsDeleteCommand(id) {
    const { confirm } = await inquirer_1.default.prompt([{
            type: 'confirm', name: 'confirm',
            message: `Delete alarm ${id}?`,
            default: false,
        }]);
    if (!confirm) {
        console.log(chalk_1.default.gray('Cancelled.'));
        return;
    }
    const spinner = (0, ora_1.default)('Deleting…').start();
    try {
        await (0, api_1.deleteAlarm)(id);
        spinner.stop();
        console.log(chalk_1.default.green('✓'), 'Alarm deleted');
    }
    catch (err) {
        spinner.stop();
        console.error(chalk_1.default.red('Error:'), (0, api_1.apiError)(err));
        process.exit(1);
    }
}
async function alarmsCheckCommand() {
    const spinner = (0, ora_1.default)('Checking alarms…').start();
    try {
        const fired = await (0, api_1.checkAlarms)();
        spinner.stop();
        if (!fired.length) {
            console.log(chalk_1.default.gray('No alarms due right now.'));
            return;
        }
        for (const a of fired) {
            console.log(chalk_1.default.yellow.bold(`\n🔔 ALARM: ${a.label}`));
            console.log(chalk_1.default.cyan(fmtTime(a.hour, a.minute)), chalk_1.default.gray(a.timezone));
            console.log(chalk_1.default.magenta(`\n${a.catMessage}\n`));
            const { action } = await inquirer_1.default.prompt([{
                    type: 'list', name: 'action',
                    message: 'What do you want to do?',
                    choices: [
                        { name: 'Dismiss', value: 'dismiss' },
                        { name: 'Snooze 9 minutes', value: 'snooze9' },
                        { name: 'Snooze 5 minutes', value: 'snooze5' },
                    ],
                }]);
            if (action === 'snooze9')
                await (0, api_1.snoozeAlarm)(a.id, 9).catch(() => { });
            if (action === 'snooze5')
                await (0, api_1.snoozeAlarm)(a.id, 5).catch(() => { });
        }
    }
    catch (err) {
        spinner.stop();
        console.error(chalk_1.default.red('Error:'), (0, api_1.apiError)(err));
        process.exit(1);
    }
}
