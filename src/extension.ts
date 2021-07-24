'use strict';
import * as vscode from 'vscode';

import * as nls from 'vscode-nls';

let localize = nls.loadMessageBundle();

export function activate(context: vscode.ExtensionContext) {

    /** 選択部分を編集する */
    function EditSelections(editor: vscode.TextEditor, openEnclose: string, closeEnclose: string, delimiter: string) {
        const selections: vscode.Selection[] = editor.selections;
        editor.edit(builder => {
            for (const selection of selections) {
                let text = editor.document.getText(selection);
                if (openEnclose) text = openEnclose + text;
                if (closeEnclose) text = text + closeEnclose;
                if (delimiter) text = text + delimiter;
                builder.replace(selection, text);
            }
        });
    }

    /** N行を一行に結合する */
    function JoinNLines(editor: vscode.TextEditor, joinNum: number) {
        const selections: vscode.Selection[] = editor.selections;
        editor.edit(builder => {
            for (const selection of selections) {
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
                for (let i = 0; i < len; i++) {
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

    /** N回コピーする */
    async function CopySelectedTextNTimes(editor: vscode.TextEditor, count: number) {
        let selections = editor.selections;
        await editor.edit(builder => {
            // 各選択ごとにN回コピーする
            for (const selection of selections) {
                let text = editor.document.getText(selection);
                let result = "";
                for (let i = 0; i < count; i++) { result += text; }
                builder.replace(selection, result);
            }
        });

        // 再選択する
        selections = editor.selections;

        await editor.edit(builder => {
            let newsel: vscode.Selection[] = [];
            // 各選択ごとにN回コピーする
            for (const selection of selections) {
                let startLine = selection.start.line;
                let endLine = selection.end.line;

                for (let lno = startLine; lno <= endLine; lno++) {
                    // 行を得る
                    let line = editor.document.lineAt(lno);

                    // 開始と終了
                    let startPos = (startLine == lno) ? selection.start : line.range.start;
                    let endPos = (endLine == lno) ? selection.end : line.range.end;
                    var lineText = editor.document.getText(new vscode.Range(startPos, endPos));

                    var anchorLine = startPos.line;
                    var activeLine = endPos.line;

                    // {}の範囲を取得
                    var cord = MakeBracketRangeList(lineText);
                    for (var ci = 0; ci < cord.length; ci++) {
                        var co = cord[ci];
                        var col = startPos.character;
                        let sel = new vscode.Selection(anchorLine, col + co[0], activeLine, col + co[1]);
                        newsel.push(sel);
                    }
                }
            }
            if (newsel.length > 0) {
                editor.selections = newsel;
            }
        });
    }

    /** 選択位置の追加 */
    function PushCoordinate(coordinates: Array<Array<number>>, start: number, end: number) {
        // 開始と終了が同じ場合は選択しない
        if (start == end) return;
        coordinates.push([start, end]);
    }

    /** 正規表現を区切りとした範囲を得る */
    function GetRangeFromSeperator(text: string, seperator: string) {
        var re = new RegExp(seperator, "g");
        var start = 0;
        var end = 0;
        var coordinates = [];

        if (text.length == 0) return coordinates;
        while (true) {
            var match = re.exec(text);
            if (match == null || match[0].length == 0) break;

            end = match.index;
            PushCoordinate(coordinates, start, end);

            start = re.lastIndex;
        }

        end = text.length;
        PushCoordinate(coordinates, start, end);
        return coordinates;
    }

    /** {}の範囲リストを作成 */
    function MakeBracketRangeList(text: string) {
        var re = new RegExp('\{\}', "g");
        var coordinates = [];

        if (text.length == 0) return coordinates;
        while (true) {
            var match = re.exec(text);
            if (match == null || match[0].length == 0) break;

            let start = match.index;
            let end = start + match[0].length;
            coordinates.push([start, end]);
        }

        return coordinates;
    }

    /** テキストをセパレータを使用して再選択する */
    function ReselectTextWithSeparator(editor: vscode.TextEditor, separator: string) {
        const selections: vscode.Selection[] = editor.selections;
        let newSelections: vscode.Selection[] = [];
        editor.edit(builder => {
            for (const selection of selections) {
                let startLine = selection.start.line;
                let endLine = selection.end.line;

                for (let lno = startLine; lno <= endLine; lno++) {
                    // 行を得る
                    let line = editor.document.lineAt(lno);

                    // 開始と終了
                    let startPos = (startLine == lno) ? selection.start : line.range.start;
                    let endPos = (endLine == lno) ? selection.end : line.range.end;
                    var lineText = editor.document.getText(new vscode.Range(startPos, endPos));

                    var anchorLine = startPos.line;
                    var activeLine = endPos.line;

                    // 範囲の取得
                    var cord = GetRangeFromSeperator(lineText, separator);
                    for (var ci = 0; ci < cord.length; ci++) {
                        var co = cord[ci];
                        var col = startPos.character;
                        let sel = new vscode.Selection(anchorLine, col + co[0], activeLine, col + co[1]);
                        newSelections.push(sel);
                    }
                }
            }
        });
        if (newSelections.length > 0) editor.selections = newSelections;
    }

    /** 入力文字の範囲を得る */
    function GetRangeFromIntext(text: string, seperator: string) {
        var re = new RegExp(seperator, "g");
        var coordinates = [];

        if (text.length == 0) return coordinates;
        while (true) {
            var match = re.exec(text);
            if (match == null || match[0].length == 0) break;
            var start = match.index;
            var length = match[0].length;
            coordinates.push([start, start + length]);
            start = re.lastIndex;
        }
        return coordinates;
    }

    /** テキストを入力テキストによって再選択する */
    function MakeSelectionsFromText(editor: vscode.TextEditor, intext: string) {
        const selections: vscode.Selection[] = editor.selections;
        let newSelections: vscode.Selection[] = [];
        editor.edit(builder => {
            for (const selection of selections) {
                let startLine = selection.start.line;
                let endLine = selection.end.line;

                for (let lno = startLine; lno <= endLine; lno++) {
                    // 行を得る
                    let line = editor.document.lineAt(lno);

                    // 開始と終了
                    let startPos = (startLine == lno) ? selection.start : line.range.start;
                    let endPos = (endLine == lno) ? selection.end : line.range.end;
                    var lineText = editor.document.getText(new vscode.Range(startPos, endPos));

                    var anchorLine = startPos.line;
                    var activeLine = endPos.line;

                    // 範囲の取得
                    var cord = GetRangeFromIntext(lineText, intext);
                    for (var ci = 0; ci < cord.length; ci++) {
                        var co = cord[ci];
                        var col = startPos.character;
                        let sel = new vscode.Selection(anchorLine, col + co[0], activeLine, col + co[1]);
                        newSelections.push(sel);
                    }
                }
            }
        });
        if (newSelections.length > 0) editor.selections = newSelections;
    }

    /** テキストを1行ごとに選択する */
    function MakeLineSelections(editor: vscode.TextEditor) {
        const selections: vscode.Selection[] = editor.selections;
        let newSelections: vscode.Selection[] = [];
        editor.edit(builder => {
            for (const selection of selections) {
                let startLine = selection.start.line;
                let endLine = selection.end.line;

                for (let lno = startLine; lno <= endLine; lno++) {
                    let line = editor.document.lineAt(lno);
                    let sel = new vscode.Selection(line.range.start, line.range.end);
                    newSelections.push(sel);
                }
            }
        });
        if (newSelections.length > 0) editor.selections = newSelections;
    }

    /** インデックスリストをテキストより作成 */
    function IndexFromText(text: string, headNumber: number, tailNumber: number) {
        var indexData = text.split(",");
        var map = {};
        headNumber = headNumber || 0;

        for (var i = 0; i < indexData.length; i++) {
            var v = indexData[i];
            if (v.indexOf("-") >= 0) {
                var values = v.split("-");
                var start = parseInt(values[0]);
                if (isNaN(start)) start = headNumber;
                var end = values.length > 0 ? parseInt(values[1]) : -1;
                if (isNaN(end) || end < start || end > tailNumber) end = tailNumber;
                for (var j = start; j <= end; j++) {
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
        for (var k in map) keys.push(parseInt(k));
        keys.sort((a, b) => { return a - b; });
        return keys;
    }

    function Filtering(output: vscode.Selection[], source: vscode.Selection[], text: string) {
        var indexMap = IndexFromText(text, 1, source.length);
        for (var i = 0; i < indexMap.length; i++) {
            var k = indexMap[i] - 1;
            output.push(source[k]);
        }
    }

    /** フィルタをインデックスで選択する */
    function FilterSelections(editor: vscode.TextEditor, indexText: string) {
        const selections: vscode.Selection[] = editor.selections;
        let newSelections: vscode.Selection[] = [];
        let tempSelections: vscode.Selection[] = [];
        let lastStartLine = -1;
        editor.edit(builder => {
            for (const selection of selections) {
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

    let disposable: vscode.Disposable = null;

    // テキストフィルタ
    disposable = vscode.commands.registerCommand('parameter-maker.FilterSelectionByIndexInLine', () => {
        vscode.window.showInputBox({ prompt: 'Index Text(ex: "1-2,4,7"' }).then((intext) => {
            if (intext === undefined || intext.length == 0) return;
            FilterSelections(vscode.window.activeTextEditor, intext);
        });
    });
    context.subscriptions.push(disposable);

    // 選択を囲む
    disposable = vscode.commands.registerCommand('parameter-maker.EncloseAllSectionsWithInputChars', () => {
        vscode.window.showInputBox({ prompt: 'Text to surround' }).then((intext) => {
            if (intext === undefined || intext.length == 0) return;
            EditSelections(vscode.window.activeTextEditor, intext, intext, null);
        });
    });
    context.subscriptions.push(disposable);

    // 選択の最後に追加する
    disposable = vscode.commands.registerCommand('parameter-maker.AddTextToSelections', () => {
        vscode.window.showInputBox({ prompt: 'Text to append' }).then((intext) => {
            if (intext === undefined || intext.length == 0) return;
            EditSelections(vscode.window.activeTextEditor, null, null, intext);
        });
    });
    context.subscriptions.push(disposable);

    // 1行ごとに選択する
    disposable = vscode.commands.registerCommand('parameter-maker.ReselectLineFromText', () => {
        MakeLineSelections(vscode.window.activeTextEditor);
    });
    context.subscriptions.push(disposable);

    // 選択されているテキストの単語を分割して再選択する
    disposable = vscode.commands.registerCommand('parameter-maker.ReselectWordsFromText', () => {
        ReselectTextWithSeparator(vscode.window.activeTextEditor, "\\s+");
    });
    context.subscriptions.push(disposable);

    // 正規表現による区切りで範囲選択を行う
    disposable = vscode.commands.registerCommand('parameter-maker.PerformRangeSelectionsWithRegExp', () => {
        vscode.window.showInputBox({ prompt: 'Text to separate(RegExp)' }).then((intext) => {
            if (intext === undefined || intext.length == 0) return;
            ReselectTextWithSeparator(vscode.window.activeTextEditor, intext);
        });
    });
    context.subscriptions.push(disposable);


    // 複数行を結合する
    disposable = vscode.commands.registerCommand('parameter-maker.MergeNLines', () => {
        vscode.window.showInputBox({ prompt: 'N lines' }).then((n) => {
            if (n === undefined || n.length == 0) return;
            var num = parseInt(n);
            JoinNLines(vscode.window.activeTextEditor, num);
        });
    });
    context.subscriptions.push(disposable);

    // クリップボードの行数を取得
    async function CountTextLines() {
        let value = await vscode.env.clipboard.readText();

        let value2 = value.replace(/[\r\n]+/g, "\n");
        let data = value2.split("\n");

        return data.length;
    }

    // 選択テキストを複数回コピーする
    disposable = vscode.commands.registerCommand('parameter-maker.CopySelectedTextNTimes', () => {

        vscode.window.showInputBox({ prompt: 'N times(default: Number of clipboard lines' }).then(async (n) => {
            if (n === undefined) { return; }

            let num = n.length == 0 ? 0 : parseInt(n);
            if (num == 0) num = await CountTextLines();

            CopySelectedTextNTimes(vscode.window.activeTextEditor, num);
        });
    });
    context.subscriptions.push(disposable);

    // 選択したテキストをクリップボードの行数分コピーする
    disposable = vscode.commands.registerCommand('parameter-maker.CopySelectedText', async () => {
        let num = await CountTextLines();
        CopySelectedTextNTimes(vscode.window.activeTextEditor, num);
    });
    context.subscriptions.push(disposable);

    // 選択範囲を入力文字列でパラメータ化する
    disposable = vscode.commands.registerCommand('parameter-maker.ParameterizeSelectionWithInput', async () => {
        let config = vscode.workspace.getConfiguration('parameter-maker');
        let openEncloseConfig = config.get<string>('OpeningEnclosureCharacter') || null;
        let closeEncloseConfig = config.get<string>('ClosingEnclosureCharacter') || null;
        let DelimiterConfig = config.get<string>('Delimiter') || null;

        let openEnclose = await vscode.window.showInputBox({ prompt: 'Opening Enclosure(Empty: Follow the setting)' });
        let closeEnclose = await vscode.window.showInputBox({ prompt: 'Closing Enclosure(Empty: Follow the setting)' });
        let Delimiter = await vscode.window.showInputBox({ prompt: 'Delimiter(Empty: Follow the setting)' });

        openEnclose = openEnclose || openEncloseConfig;
        closeEnclose = closeEnclose || closeEncloseConfig;
        Delimiter = Delimiter || DelimiterConfig;

        EditSelections(vscode.window.activeTextEditor, openEnclose, closeEnclose, Delimiter);
    });
    context.subscriptions.push(disposable);

    // 選択範囲を設定でパラメータ化する
    disposable = vscode.commands.registerCommand('parameter-maker.ParameterizeSelectionBySettings', () => {
        let config = vscode.workspace.getConfiguration('parameter-maker');
        let openEnclose = config.get<string>('OpeningEnclosureCharacter') || null;
        let closeEnclose = config.get<string>('ClosingEnclosureCharacter') || null;
        let Delimiter = config.get<string>('Delimiter') || null;

        EditSelections(vscode.window.activeTextEditor, openEnclose, closeEnclose, Delimiter);

    });
    context.subscriptions.push(disposable);

    // 選択されているテキストを正規表現で再選択する
    disposable = vscode.commands.registerCommand('parameter-maker.ReselectTextWithRegExp', () => {
        vscode.window.showInputBox({ prompt: 'Text(RegExp)' }).then((intext) => {
            if (intext === undefined || intext.length == 0) return Promise.reject();
            MakeSelectionsFromText(vscode.window.activeTextEditor, intext);
        });
    });
    context.subscriptions.push(disposable);
}

export function deactivate() {
}