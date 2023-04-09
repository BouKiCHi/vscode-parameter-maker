'use strict';
import * as vscode from 'vscode';

export function SetEditorSelection(editor: vscode.TextEditor, newSelections: vscode.Selection[]) {
    editor.selections = newSelections;
    // 一時的な解決策
    vscode.window.showTextDocument(editor.document.uri, { preview: false, viewColumn: editor.viewColumn, });
}
