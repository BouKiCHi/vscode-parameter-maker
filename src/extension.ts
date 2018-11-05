'use strict';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

    let config = vscode.workspace.getConfiguration('parameter-maker');
    let defSep = '\n';
    let defEnc = '\'';
    if (config != null) {
        defSep = config['defaultSeperator'] || defSep;
        defEnc = config['defaultEnclose'] || defEnc;
    }

    function ConvertToParameter(editor: vscode.TextEditor, sep: string, enc: string = '\'') {
        const selections: vscode.Selection[] = editor.selections;
        editor.edit(builder => {
            for(const selection of selections) {
                let text = editor.document.getText(selection);

                let textList = text.split(sep);

                let result = "";
                let len = textList.length;
                // 行末が改行コードの場合、最後を処理しない
                if (sep == "\n" && text.match(/[\r\n+]$/) && len > 0) len--;
                for(let i = 0; i < len; i++) {
                    let t = textList[i];
                    t = t.replace(/[\r\n]+$/, '');
                    if (result.length > 0) result +=',';
                    result += enc + t + enc;
                }
                builder.replace(selection, result);
            }
        });
    }

    // パラメータにする
    let disposable = vscode.commands.registerCommand('parameter-maker.convertParameter', () => {
        ConvertToParameter(vscode.window.activeTextEditor,defSep,defEnc);
    });

    // パラメータにする
    disposable = vscode.commands.registerCommand('parameter-maker.convertParameterWithInput', () => {
        vscode.window.showInputBox({ prompt:'Separator to Split Selected Text(Default: TAB)'}).then((sep) => {
            if (sep === undefined) return;
            if (sep == '') sep = "\t";
            vscode.window.showInputBox({prompt:'Charactor to Enclose (Default: [\'])'}).then((enc) => {
                if (enc === undefined) return;
                if (enc == '') enc = "'";
                ConvertToParameter(vscode.window.activeTextEditor,sep,enc);
            });
        });
    });

    // タブ区切りをパラメータにする
    disposable = vscode.commands.registerCommand('parameter-maker.selectedTabToParameter', () => {
        ConvertToParameter(vscode.window.activeTextEditor,"\t",defEnc);
    });

    // 複数行選択をパラメータにする
    disposable = vscode.commands.registerCommand('parameter-maker.selectedMultilineToParameter', () => {
        ConvertToParameter(vscode.window.activeTextEditor,"\n",defEnc);
    });

    // タブ区切りをパラメータにする
    disposable = vscode.commands.registerCommand('parameter-maker.selectedTabToParameterEnclose', () => {
        vscode.window.showInputBox({prompt:'Charactor to Enclose (Default: [\'])'}).then((enc) => {
            if (enc === undefined) return;
            if (enc == '') enc = "'";
            ConvertToParameter(vscode.window.activeTextEditor,"\t",enc);
        });
    });

    // 複数行選択をパラメータにする
    disposable = vscode.commands.registerCommand('parameter-maker.selectedMultilineToParameterEnclose', () => {
        vscode.window.showInputBox({prompt:'Charactor to Enclose (Default: [\'])'}).then((enc) => {
            if (enc === undefined) return;
            if (enc == '') enc = "'";
            ConvertToParameter(vscode.window.activeTextEditor,"\n",enc);
        });
    });
    

    context.subscriptions.push(disposable);
}

export function deactivate() {
}