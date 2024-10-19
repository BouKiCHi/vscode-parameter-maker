import * as vscode from 'vscode';
import * as command from './Command';


export function activate(context: vscode.ExtensionContext) {
    command.registerCommands(context);
}

export function deactivate() {}
