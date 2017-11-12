'use strict';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

    let disposable = vscode.commands.registerCommand('extension.convertParameter', () => {
        let editor = vscode.window.activeTextEditor;
        if (editor == null) return;
        if (editor.selection.isEmpty) return;
    
        vscode.window.showInputBox({ prompt:'Separator to Divide Selected Text(Default: TAB)'}).then((sep) => {
            if (sep === undefined) return;
            if (sep == '') sep = "\t";
            vscode.window.showInputBox({prompt:'Charactor to Enclose (Default: [\'])'}).then((enc) => {
                if (enc === undefined) return;
                if (enc == '') enc = "'";
                const selections: vscode.Selection[] = editor.selections;
                
                editor.edit(builder => {
                    for(const selection of selections) {
                        let text = editor.document.getText(selection);
                        let textList = text.split(sep);
                        let result = "";
                        for(let t of textList) {
                            if (result.length > 0) result +=',';
                            result += enc + t + enc;
                        }
                        builder.replace(selection, result);
                    }
                });
            });
        });

    });



    context.subscriptions.push(disposable);
}

export function deactivate() {
}