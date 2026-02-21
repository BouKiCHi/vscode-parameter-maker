import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

type MessageMap = Record<string, string>;

function readJsonIfExists(filePath: string): MessageMap {
    try {
        if (!fs.existsSync(filePath)) {
            return {};
        }
        const text = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(text) as MessageMap;
    } catch {
        return {};
    }
}

function formatMessage(template: string, args: unknown[]): string {
    return template.replace(/\{(\d+)\}/g, (_, indexText: string) => {
        const index = Number(indexText);
        const value = args[index];
        return value === undefined || value === null ? '' : String(value);
    });
}

const projectRoot = path.resolve(__dirname, '..');
const baseMessages = readJsonIfExists(path.join(projectRoot, 'package.nls.json'));

const language = (vscode.env.language || 'en').toLowerCase();
const languageTag = language.split('-')[0];
const localeFile = `package.nls.${languageTag}.json`;
const localeMessages = readJsonIfExists(path.join(projectRoot, localeFile));

export function localize(key: string, defaultMessage: string, ...args: unknown[]): string {
    const template = localeMessages[key] ?? baseMessages[key] ?? defaultMessage;
    return formatMessage(template, args);
}
