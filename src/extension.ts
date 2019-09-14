'use strict';
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
    
    // 選択する
    function EditSelections(editor: vscode.TextEditor, surround: string, separator: string) {
        const selections: vscode.Selection[] = editor.selections;
        editor.edit(builder => {
            for(const selection of selections) {
                let text = editor.document.getText(selection);
                if (surround) text = surround + text + surround;
                if (separator) text = text + separator;
                builder.replace(selection, text);
            }
        });
    }

    // N行を一行に結合する
    function JoinNLines(editor: vscode.TextEditor, joinNum: number) {
        const selections: vscode.Selection[] = editor.selections;
        editor.edit(builder => {
            for(const selection of selections) {
                let text = editor.document.getText(selection);
                let count = 0;

                var regex = /[\r\n]+/;
                var match = regex.exec(text);
                var nextLine = (!match) ? match[0] : "\n";
                
                let textList = text.split(nextLine);
                let result = "";
                let len = textList.length;
                // 行末が改行コードの場合、最後を処理しない
                if (text.match(/[\r\n]+$/) && len > 0) len--;
                for(let i = 0; i < len; i++) {
                    let t = textList[i];
                    // 改行コードを除去
                    t = t.replace(/[\r\n]+$/, '');
                    result += t;
                    count++;
                    if (count == joinNum) {
                        count = 0;
                        result += nextLine;
                    }
                }
                builder.replace(selection, result);
            }
        });
    }

    // N回コピーする
    function CopyNTimes(editor: vscode.TextEditor, num: number) {
        const selections: vscode.Selection[] = editor.selections;
        editor.edit(builder => {
            for(const selection of selections) {
                let text = editor.document.getText(selection);
                let result = "";
                for(let i = 0; i < num; i++) { result += text; }
                builder.replace(selection, result);
            }
        });
    }

    // テキストから範囲を得る
    function getRangeInfoFromText(text, seperator) {
        // var seperator = '\\s';
    
        var re = new RegExp(seperator,"g");
        var start = 0;
        var coordinates = [];
        
        if (text.length == 0) return coordinates;
        while(true) {
            var match = re.exec(text);
            if (match == null || match[0].length == 0) break;
            var end = match.index;
            coordinates.push([start,end]);
            start = re.lastIndex;
        }
        coordinates.push([start,text.length]);
        return coordinates;
    }

    // テキストを選択する
    function MakeSelections(editor: vscode.TextEditor, separator: string) {
        const selections: vscode.Selection[] = editor.selections;
        let newSelections: vscode.Selection[] = [];
        editor.edit(builder => {
            for(const selection of selections) {
                let startLine = selection.start.line;
                let endLine = selection.end.line;
                
                for(let lno=startLine; lno <= endLine; lno++) {
                    let line = editor.document.lineAt(lno);
                    let startPos = (startLine == lno) ? selection.start : line.range.start;
                    let endPos = (endLine == lno) ? selection.end : line.range.end;
                    var lineText = editor.document.getText(new vscode.Range(startPos, endPos));

                    var anchorLine = startPos.line;
                    var activeLine = endPos.line;
                    var cord = getRangeInfoFromText(lineText, separator);
                    for(var ci=0; ci < cord.length; ci++) {
                        var co = cord[ci];
                        var col = startPos.character;
                        let sel = new vscode.Selection(anchorLine, col + co[0], activeLine,  col + co[1]);
                        newSelections.push(sel);
                    }
                }
            }
        });
        if (newSelections.length > 0) editor.selections = newSelections;
    }

    // インデックスリストをテキストより作成
    function IndexFromText(text: string, headNumber : number, tailNumber: number) {
        var indexData = text.split(",");
        var map = {};
        headNumber = headNumber || 0;
         
        for(var i = 0; i < indexData.length; i++) {
            var v = indexData[i];
            if (v.indexOf("-") >= 0) {
                var values = v.split("-");
                var start = parseInt(values[0]);
                if (isNaN(start)) start = headNumber;
                var end = values.length > 0 ? parseInt(values[1]) : -1;
                if (isNaN(end) || end < start || end > tailNumber) end = tailNumber;
                for(var j=start; j <= end; j++) {
                    if (j < headNumber || j > tailNumber) continue;
                    if (j in map) continue;
                    map[j] = true;
                }
            } else {
                var j = parseInt(v);
                if (j < headNumber || j > tailNumber) continue;
                if (j in map) continue;
                map[j] = true;
            }
        }
    
        var keys = [];
        for(var k in map) keys.push(parseInt(k));
        keys.sort((a,b) => { return a-b;});
        return keys;
    }

    function Filtering(output : vscode.Selection[], source : vscode.Selection[], text : string) {
        var indexMap = IndexFromText(text, 1, source.length);
        for(var i = 0; i < indexMap.length; i++) {
            var k = indexMap[i] -1;
            output.push(source[k]);
        }
    }

    // フィルタをインデックスで選択する
    function FilterSelections(editor: vscode.TextEditor, indexText: string) {
        const selections: vscode.Selection[] = editor.selections;
        let newSelections: vscode.Selection[] = [];
        let tempSelections: vscode.Selection[] = [];
        let lastStartLine = -1;
        editor.edit(builder => {
            for(const selection of selections) {
                let startLine = selection.start.line;
                if (startLine != lastStartLine) {
                    Filtering(newSelections, tempSelections, indexText);
                    lastStartLine = startLine;
                    tempSelections = [];
                }
                tempSelections.push(selection);
            }
            Filtering(newSelections, tempSelections, indexText);
        });
        if (newSelections.length > 0) editor.selections = newSelections;
    }

    let disposable : vscode.Disposable = null;

    // テキストフィルタ
    disposable = vscode.commands.registerCommand('parameter-maker.FilterSelectionByIndexInLine', () => {
        vscode.window.showInputBox({prompt:'Index Text(ex: "1-2,4,7"'}).then((intext) => {
            if (intext === undefined || intext.length == 0) return;
            FilterSelections(vscode.window.activeTextEditor, intext);
        });
    });
    context.subscriptions.push(disposable);

    // 選択を囲む
    disposable = vscode.commands.registerCommand('parameter-maker.SurroundSelectionWithText', () => {
        vscode.window.showInputBox({prompt:'Text to surround'}).then((intext) => {
            if (intext === undefined || intext.length == 0) return;
            EditSelections(vscode.window.activeTextEditor, intext, null);
        });
    });
    context.subscriptions.push(disposable);
    

    // 選択の最後に追加する
    disposable = vscode.commands.registerCommand('parameter-maker.AppendTextToEndOfSelections', () => {
        vscode.window.showInputBox({prompt:'Text to append'}).then((intext) => {
            if (intext === undefined || intext.length == 0) return;
            EditSelections(vscode.window.activeTextEditor, null, intext);
        });
    });
    context.subscriptions.push(disposable);

    // 複数行を個別選択にする
    disposable = vscode.commands.registerCommand('parameter-maker.MakeSelectionsFromText', () => {
        MakeSelections(vscode.window.activeTextEditor, "\\s+");
    });
    context.subscriptions.push(disposable);

    // 複数行を個別選択にする
    disposable = vscode.commands.registerCommand('parameter-maker.MakeSelectionsWithRegexp', () => {
        vscode.window.showInputBox({prompt:'Text to separate(RegExp)'}).then((intext) => {
            if (intext === undefined || intext.length == 0) return;
            MakeSelections(vscode.window.activeTextEditor, intext);
        });
    });
    context.subscriptions.push(disposable);
    

    // 複数行を結合する
    disposable = vscode.commands.registerCommand('parameter-maker.JoinNLinesAtALine', () => {
        vscode.window.showInputBox({prompt:'N lines'}).then((n) => {
            if (n === undefined || n.length == 0) return;
            var num = parseInt(n);
            JoinNLines(vscode.window.activeTextEditor, num);
        });
    });
    context.subscriptions.push(disposable);

    // 選択テキストを複数回コピーする
    disposable = vscode.commands.registerCommand('parameter-maker.CopyNTimes', () => {
        vscode.window.showInputBox({prompt:'N times'}).then((n) => {
            if (n === undefined || n.length == 0) return;
            var num = parseInt(n);
            CopyNTimes(vscode.window.activeTextEditor, num);
        });
    });
    context.subscriptions.push(disposable);
}

export function deactivate() {
}