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
            // カーソル
            if (textutil.IsCursor(selection) && joinNum > 0) {
                let line = editor.document.lineAt(selection.start.line);
                let endLine = editor.document.lineAt(selection.start.line + joinNum - 1);
                let range = new vscode.Range(line.range.start, endLine.range.end);
                let text = editor.document.getText(range);
                text = text.replace(/[\r\n]+/g,'');
                builder.replace(range, text);
                continue;
            }
            let text = editor.document.getText(selection);
            let count = 0;

            let textList = textutil.getTextList(text);
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
                    result += "\n";
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
            // カーソルの場合は１行とする
            let isCursor = textutil.IsCursor(selection);
            let text = "";
            let range : vscode.Range = selection;

            let result : string;
            if (isCursor) {
                let line = editor.document.lineAt(selection.start.line);
                range = line.range;
                text = editor.document.getText(range) + "\n";
                result = textutil.repeatString(count, text, true);
            } else {
                text = editor.document.getText(selection);
                result = textutil.repeatString(count, text, false);
            }
            builder.replace(range, result);
        }
    });

    // {}を再選択する
    await textutil.SelectBracket(editor);
}


/** テキストを入力テキストによって再選択する */
function MakeSelectionsFromText(editor: vscode.TextEditor, intext: string) {
    let LineList = textutil.GetSelectedTextLines(editor);
    let newSelections: vscode.Selection[] = [];
    for(const l of LineList) {
        // 範囲の取得
        var cord = textutil.GetRangeFromIntext(l.text, intext);
        for (var ci = 0; ci < cord.length; ci++) {
            var co = cord[ci];
            let startPos = l.positionAt(co[0]);
            let endPos = l.positionAt(co[1]);
            let sel = new vscode.Selection(startPos, endPos);
            newSelections.push(sel);
        }
    }

    if (newSelections.length > 0) editor.selections = newSelections;

}

/** テキストを1行ごとに選択する */
function MakeLineSelections(editor: vscode.TextEditor) {
    let newSelections: vscode.Selection[] = [];

    let LineList = textutil.GetSelectedTextLines(editor);
    for (const l of LineList) {
        let sel = new vscode.Selection(l.getStartPosition(), l.getEndPosition());
        newSelections.push(sel);
    }

    if (newSelections.length > 0) editor.selections = newSelections;
}


/** 
 * 引用符を選択リストにする
*/
function MakeQuoteSelections(quoteList:textutil.CharactorPosition[], outer:boolean) : vscode.Selection[] {
    let newSelections: vscode.Selection[] = [];

    var qi = 0;
    var startQuote = null;
    var startPos : vscode.Position = null;

    while(qi < quoteList.length) {
        var qp = quoteList[qi];
        var ch = qp.text;
        var currentPos = qp.pos;
        if (startQuote == null) {
            startPos = currentPos;
            startQuote = ch;
            qi++;
            continue;
        }
        if (startQuote == ch) {
            var startCharacter = outer ? startPos.character : startPos.character+1;
            var epos = outer ? new vscode.Position(currentPos.line, currentPos.character+1) : currentPos;
            var spos = new vscode.Position(startPos.line, startCharacter);
            var sel = new vscode.Selection(spos, epos);
            startQuote = null;
            newSelections.push(sel);
        }
        qi++;
    }
    return newSelections;
}

/** 引用符の中身を選択する */
function QuoteSelectBody(editor: vscode.TextEditor, outer: boolean) {
    let quoteList : textutil.CharactorPosition[] = [];

    let LineList = textutil.GetSelectedTextLines(editor);
    for (const l of LineList) {
        var poslist = textutil.GetIndexList(l.text, "['\"]");
        for (var pi = 0; pi < poslist.length; pi++) {
            var index = poslist[pi];
            var pos = l.positionAt(index);
            var pair = new textutil.CharactorPosition(l.charactorAt(index), pos);
            quoteList.push(pair);
        }
    }

    let newSelections = MakeQuoteSelections(quoteList, outer);
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

    if (newSelections.length > 0) editor.selections = newSelections;
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
    QuoteSelectBody(vscode.window.activeTextEditor, false);
}

// クオートの外側を選択
function QuoteOuterSelect() {
    QuoteSelectBody(vscode.window.activeTextEditor, true);
}

// 1行ごとに選択する
function ReselectLineFromText() {
    MakeLineSelections(vscode.window.activeTextEditor);
}

// 単語を分割して再選択する
function ReselectWordsFromText() {
    textutil.ReselectTextWithPattern(vscode.window.activeTextEditor, "\\s+");
}

// 区切り文字で再選択
function ReselectWithDelimiter() {
    let config = vscode.workspace.getConfiguration('parameter-maker');
    let delimiter = config.get<string>('Delimiter') || null;
    if (!delimiter) return;
    textutil.ReselectTextWithPattern(vscode.window.activeTextEditor, delimiter);
}

// 入力区切り文字で再選択
async function ReselectWithInputDelimiter() {
    let delimiter = await vscode.window.showInputBox({ prompt: 'delimiter' });
    if (!delimiter) return;
    textutil.ReselectTextWithPattern(vscode.window.activeTextEditor, delimiter);
}

// {}を再選択
function ReselectBracket() {
    textutil.SelectBracket(vscode.window.activeTextEditor);
}


// 複数行を結合する
async function MergeNLines() {
    let n = await vscode.window.showInputBox({ prompt: 'N lines' });
    
    if (n === undefined || n.length == 0) return;
    var num = parseInt(n);
    JoinNLines(vscode.window.activeTextEditor, num);
}
// 選択テキストを複数回コピーする
function CopySelectedTextNTimes() {
    vscode.window.showInputBox({ prompt: 'N times(default: Number of clipboard lines' }).then(async (n) => {
        if (n === undefined) { return; }

        let num = n.length == 0 ? 0 : parseInt(n);
        if (num == 0) num = await textutil.CountTextLines();

        CopySelectedTextNTimesBody(vscode.window.activeTextEditor, num);
    });
}



// 選択したテキストをクリップボードの行数分コピーする
async function CopySelectedText() {
    let num = await textutil.CountTextLines();
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

// 単語を分割してパラメータ化する
function SplitParameterize() { 
    textutil.ReselectTextWithPattern(vscode.window.activeTextEditor, "\\s+");

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

// クリップボードを結合して挿入
async function CombineClipboard() { 
    let config = vscode.workspace.getConfiguration('parameter-maker');
    let Delimiter = await vscode.window.showInputBox({ prompt: 'Delimiter(Empty: Follow the setting)' });
    if (Delimiter === undefined) { return; }

    Delimiter = Delimiter || config.get<string>('Delimiter') || null;

    let editor = vscode.window.activeTextEditor;
    let text = await vscode.env.clipboard.readText();
    let values = textutil.SplitText(text);

    const position = editor.selection.active;

    let len = 0;

    editor.edit(builder => {
        for (const v of values) {
            let t = '';
            t += v;
            if (Delimiter) t += Delimiter;
            if (len + t.length >= 60) {
                builder.insert(position, "\n");
                len = 0;
            }
            builder.insert(position, t);
            len += t.length;
        }
    });
}

// クリップボード内容をパターンで挿入
async function InsertPatternClipboard() { 
    let pattern = await vscode.window.showInputBox({ prompt: 'Pattern(ex. "{}",' });
    if (pattern === undefined) { return; }

    let editor = vscode.window.activeTextEditor;
    let text = await vscode.env.clipboard.readText();
    let values = textutil.SplitText(text);

    const position = editor.selection.active;

    let len = 0;

    editor.edit(builder => {
        for (const v of values) {
            let t = '';
            t += pattern.replace('{}',v);
            if (len + t.length >= 60) {
                builder.insert(position, "\n");
                len = 0;
            }
            builder.insert(position, t);
            len += t.length;
        }
    });
}



// 正規表現で再選択する
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
        ['MergeNLines', MergeNLines],
        ['CopySelectedTextNTimes', CopySelectedTextNTimes],
        ['CopySelectedText', CopySelectedText],
        ['ParameterizeSelectionWithInput', ParameterizeSelectionWithInput],
        ['ParameterizeSelection', ParameterizeSelection],
        ['ReselectTextWithRegExp', ReselectTextWithRegExp],
        ['ParameterizeClipboard', ParameterizeClipboard],
        ['ReselectWithDelimiter', ReselectWithDelimiter],
        ['ReselectWithInputDelimiter', ReselectWithInputDelimiter],
        ['ReselectBracket', ReselectBracket],
        ['InsertPatternClipboard', InsertPatternClipboard],

        ['CombineClipboard', CombineClipboard],
        ['SplitParameterize', SplitParameterize],
        ['QuoteOuterSelect', QuoteOuterSelect],
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
