'use strict';

import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import * as textutil from './textutil';

let localize = nls.loadMessageBundle();

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
async function CopySelectedTextNTimesBody(editor: vscode.TextEditor, count: number) {
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
                var cord = textutil.MakeBracketRangeList(lineText);
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
                var cord = textutil.GetRangeFromSeperator(lineText, separator);
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
                var cord = textutil.GetRangeFromIntext(lineText, intext);
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

/** 引用符の中身を選択する */
function QuoteSelectBody(editor: vscode.TextEditor) {
    const selections: vscode.Selection[] = editor.selections;
    let newSelections: vscode.Selection[] = [];
    editor.edit(builder => {

        for (const selection of selections) {
            let quoteList = [];

            let startLineNo = selection.start.line;
            let endLineNo = selection.end.line;

            for (let lno = startLineNo; lno <= endLineNo; lno++) {
                // 行を得る
                let line = editor.document.lineAt(lno);
                let startPos = lno == startLineNo ? selection.start : line.range.start;
                let endPos = lno == endLineNo ? selection.end : line.range.end;

                var lineText = editor.document.getText(new vscode.Range(startPos, endPos));

                // 位置の取得
                var poslist = textutil.GetIndex(lineText, "['\"]");
                for (var pi = 0; pi < poslist.length; pi++) {
                    var index = poslist[pi];
                    var col = index + startPos.character;
                    var pair = [lineText[index], new vscode.Position(lno, col)];
                    quoteList.push(pair);
                }
            }

            var qi = 0;
            var startQuote = null;
            var startPos : vscode.Position = null;
            while(qi < quoteList.length) {
                var qp = quoteList[qi];
                var ch = qp[0];
                var currentPos = qp[1];
                if (startQuote == null) {
                    startPos = currentPos;
                    startQuote = ch;
                    qi++;
                    continue;
                }
                if (startQuote == ch) {
                    var spos = new vscode.Position(startPos.line, startPos.character+1);
                    var sel = new vscode.Selection(spos, currentPos);
                    startQuote = null;
                    newSelections.push(sel);
                }
                qi++;
            }
        }
    });
    if (newSelections.length > 0) editor.selections = newSelections;
}


function Filtering(output: vscode.Selection[], source: vscode.Selection[], text: string) {
    var indexMap = textutil.IndexFromText(text, 1, source.length);
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

// クリップボードの行数を取得
async function CountTextLines() {
    let value = await vscode.env.clipboard.readText();

    let value2 = value.replace(/[\r\n]+/g, "\n");
    let data = value2.split("\n");

    return data.length;
}

// テキストフィルタ
function FilterSelectionByIndexInLine() {
    vscode.window.showInputBox({ prompt: 'Index Text(ex: "1-2,4,7"' }).then((intext) => {
        if (intext === undefined || intext.length == 0) return;
        FilterSelections(vscode.window.activeTextEditor, intext);
    });
}

// 選択を囲む
function EncloseAllSectionsWithInputChars() {
    vscode.window.showInputBox({ prompt: 'Text to surround' }).then((intext) => {
        if (intext === undefined || intext.length == 0) return;
        EditSelections(vscode.window.activeTextEditor, intext, intext, null);
    });
}

// 選択の最後に追加する
function AddTextToSelections() {
    vscode.window.showInputBox({ prompt: 'Text to append' }).then((intext) => {
        if (intext === undefined || intext.length == 0) return;
        EditSelections(vscode.window.activeTextEditor, null, null, intext);
    });
}

// クオートの中身を選択
function QuoteSelect() {
    QuoteSelectBody(vscode.window.activeTextEditor);
}

// 1行ごとに選択する
function ReselectLineFromText() {
    MakeLineSelections(vscode.window.activeTextEditor);
}
// 単語を分割して再選択する
function ReselectWordsFromText() {
    ReselectTextWithSeparator(vscode.window.activeTextEditor, "\\s+");
}
// 正規表現による区切りで範囲選択を行う
function PerformRangeSelectionsWithRegExp() {
    vscode.window.showInputBox({ prompt: 'Text to separate(RegExp)' }).then((intext) => {
        if (intext === undefined || intext.length == 0) return;
        ReselectTextWithSeparator(vscode.window.activeTextEditor, intext);
    });
}
// 複数行を結合する
function MergeNLines() {
    vscode.window.showInputBox({ prompt: 'N lines' }).then((n) => {
        if (n === undefined || n.length == 0) return;
        var num = parseInt(n);
        JoinNLines(vscode.window.activeTextEditor, num);
    });
}
// 選択テキストを複数回コピーする
function CopySelectedTextNTimes() {
    vscode.window.showInputBox({ prompt: 'N times(default: Number of clipboard lines' }).then(async (n) => {
        if (n === undefined) { return; }

        let num = n.length == 0 ? 0 : parseInt(n);
        if (num == 0) num = await CountTextLines();

        CopySelectedTextNTimesBody(vscode.window.activeTextEditor, num);
    });
}



// 選択したテキストをクリップボードの行数分コピーする
async function CopySelectedText() {
    let num = await CountTextLines();
    CopySelectedTextNTimesBody(vscode.window.activeTextEditor, num);
}

// 選択範囲を入力文字列でパラメータ化する
async function ParameterizeSelectionWithInput() {
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
}

// 選択範囲を設定でパラメータ化する
function ParameterizeSelection() { 
    let config = vscode.workspace.getConfiguration('parameter-maker');
    let openEnclose = config.get<string>('Quote') || null;
    let closeEnclose = openEnclose;
    let Delimiter = config.get<string>('Delimiter') || null;

    EditSelections(vscode.window.activeTextEditor, openEnclose, closeEnclose, Delimiter);
}

// クリップボード内容をパラメータ化する
async function ParameterizeClipboard() { 
    let config = vscode.workspace.getConfiguration('parameter-maker');
    let openEnclose = config.get<string>('Quote') || null;
    let closeEnclose = openEnclose;
    let delimiter = config.get<string>('Delimiter') || null;

    let editor = vscode.window.activeTextEditor;
    let text = await vscode.env.clipboard.readText();
    let values = textutil.SplitText(text);

    const position = editor.selection.active;

    let len = 0;

    editor.edit(builder => {
        for (const v of values) {
            let t = '';
            if (openEnclose) t += openEnclose;
            t += v;
            if (closeEnclose) t += closeEnclose;
            if (delimiter) t += delimiter;
            if (len + t.length >= 60) {
                builder.insert(position, "\n");
                len = 0;
            }
            builder.insert(position, t);
            len += t.length;
        }
    });
}


// 選択されているテキストを正規表現で再選択する
function ReselectTextWithRegExp() {
    vscode.window.showInputBox({ prompt: 'Text(RegExp)' }).then((intext) => {
        if (intext === undefined || intext.length == 0) return Promise.reject();
        MakeSelectionsFromText(vscode.window.activeTextEditor, intext);
    });
}

export function activate(context: vscode.ExtensionContext) {

    let disposable: vscode.Disposable = null;

    let CommandList : [string, (...args: any[]) => any][] = [
        ['FilterSelectionByIndexInLine', FilterSelectionByIndexInLine],
        ['EncloseAllSectionsWithInputChars', EncloseAllSectionsWithInputChars],
        ['AddTextToSelections', AddTextToSelections],
        ['QuoteSelect', QuoteSelect],
        ['ReselectLineFromText', ReselectLineFromText],
        ['ReselectWordsFromText', ReselectWordsFromText],
        ['PerformRangeSelectionsWithRegExp', PerformRangeSelectionsWithRegExp],
        ['MergeNLines', MergeNLines],
        ['CopySelectedTextNTimes', CopySelectedTextNTimes],
        ['CopySelectedText', CopySelectedText],
        ['ParameterizeSelectionWithInput', ParameterizeSelectionWithInput],
        ['ParameterizeSelection', ParameterizeSelection],
        ['ReselectTextWithRegExp', ReselectTextWithRegExp],
        ['ParameterizeClipboard', ParameterizeClipboard],
    ];

    for(var i = 0; i < CommandList.length; i++) {
        var Command = CommandList[i];
        var Name = Command[0];
        var Func = Command[1];

        disposable = vscode.commands.registerCommand('parameter-maker.' + Name, Func);
        context.subscriptions.push(disposable);
    }
}

export function deactivate() {}

export { QuoteSelectBody }
