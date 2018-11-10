'use strict';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {

    let config = vscode.workspace.getConfiguration('parameter-maker');
    let defLineEnd = '\n';
    let defSep = '\n';
    let defEnc = '\'';
    let joinNumber = 8;

    if (config != null) {
        defLineEnd = config['defaultLineEnd'] || defLineEnd;
        defSep = config['defaultSeperator'] || defSep;
        defEnc = config['defaultEnclose'] || defEnc;
        joinNumber = config['joinNumber'] || joinNumber;
    }

    function ConvertToParameter(editor: vscode.TextEditor, sep: string, enc: string = null) {
        enc = enc || defEnc;
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
                    if (result.length > 0) result +=',' + defLineEnd;
                    result += enc + t + enc;
                }
                builder.replace(selection, result);
            }
        });
    }

    function JoinNLines(editor: vscode.TextEditor, joinNum: number) {
        const selections: vscode.Selection[] = editor.selections;
        editor.edit(builder => {
            for(const selection of selections) {
                let text = editor.document.getText(selection);
                let count = 0;

                let textList = text.split("\n");
                let result = "";
                let len = textList.length;
                // 行末が改行コードの場合、最後を処理しない
                if (text.match(/[\r\n+]$/) && len > 0) len--;
                for(let i = 0; i < len; i++) {
                    let t = textList[i];
                    // 改行コードを除去
                    t = t.replace(/[\r\n]+$/, '');
                    result += t;
                    count++;
                    if (count == joinNum) {
                        count = 0;
                        result += defLineEnd;
                    }
                }
                builder.replace(selection, result);
            }
        });
    }

    
    function AddCommaToEnd(editor: vscode.TextEditor) {
        const selections: vscode.Selection[] = editor.selections;
        editor.edit(builder => {
            for(const selection of selections) {
                let text = editor.document.getText(selection);
                let textList = text.split("\n");
                let result = "";
                let len = textList.length;
                // 行末が改行コードの場合、最後を処理しない
                if (text.match(/[\r\n+]$/) && len > 0) len--;
                for(let i = 0; i < len; i++) {
                    let t = textList[i];
                    // 改行コードを除去
                    t = t.replace(/[\r\n]+$/, '');
                    result += t + ',' + defLineEnd;
                }
                builder.replace(selection, result);
            }
        });
    }


    // パラメータにする(区切り文字と囲う文字は設定した値を使用する)
    let disposable = vscode.commands.registerCommand('parameter-maker.convertParameter', () => {
        ConvertToParameter(vscode.window.activeTextEditor,defSep,defEnc);
    });

    // パラメータにする(区切り文字と囲う文字は入力する)
    disposable = vscode.commands.registerCommand('parameter-maker.convertParameterSepEnc', () => {
        vscode.window.showInputBox({ prompt:'Seperator (Default: configurated value)'}).then((sep) => {
            if (sep === undefined) return;
            if (sep == '') sep = defSep;
            vscode.window.showInputBox({prompt:'Charactor to Enclose (Default: configurated value)'}).then((enc) => {
                if (enc === undefined) return;
                if (enc == '') enc = defEnc;
                ConvertToParameter(vscode.window.activeTextEditor, sep, enc);
            });
        });
    });

    // タブ区切りをパラメータにする
    disposable = vscode.commands.registerCommand('parameter-maker.selectedTabToParameter', () => {
        ConvertToParameter(vscode.window.activeTextEditor,"\t",defEnc);
    });

    // タブ区切りをパラメータにする(囲う文字は入力する)
    disposable = vscode.commands.registerCommand('parameter-maker.selectedTabToParameterEnc', () => {
        vscode.window.showInputBox({prompt:'Charactor to Enclose (Default: configurated value)'}).then((enc) => {
            if (enc === undefined) return;
            if (enc == '') enc = defEnc;
            ConvertToParameter(vscode.window.activeTextEditor,"\t",enc);
        });
    });

    // 複数行選択をパラメータにする
    disposable = vscode.commands.registerCommand('parameter-maker.selectedMultilineToParameter', () => {
        ConvertToParameter(vscode.window.activeTextEditor,"\n",defEnc);
    });

    // 複数行選択をパラメータにする(囲う文字は入力する)
    disposable = vscode.commands.registerCommand('parameter-maker.selectedMultilineToParameterEnc', () => {
        vscode.window.showInputBox({prompt:'Charactor to Enclose (Default: configurated value)'}).then((enc) => {
            if (enc === undefined) return;
            if (enc == '') enc = defEnc;
            ConvertToParameter(vscode.window.activeTextEditor,"\n",enc);
        });
    });
    
    // 複数行を結合する
    disposable = vscode.commands.registerCommand('parameter-maker.joinNLinesAtALine', () => {
        vscode.window.showInputBox({prompt:'N lines (Default: configurated value)'}).then((n) => {
            if (n === undefined) return;
            let num = joinNumber;
            if (n != '') num = parseInt(n);
            JoinNLines(vscode.window.activeTextEditor, num);
        });
    });

    // カンマを行末に追加する
    disposable = vscode.commands.registerCommand('parameter-maker.AddCommaToEnd', () => {
        AddCommaToEnd(vscode.window.activeTextEditor);
    });

    context.subscriptions.push(disposable);
}

export function deactivate() {
}