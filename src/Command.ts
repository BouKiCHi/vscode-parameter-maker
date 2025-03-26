import * as vscode from 'vscode';
import * as nls from 'vscode-nls';
import * as textutil from './textutil';
import { SetEditorSelection } from './SetEditorSelection';
import { ReselectBrace, ReselectClipboardContents, 
    ReselectComma, ReselectLineByReg, ReselectLineFromText, 
    ReselectN, ReselectNumber, ReselectSpace, ReselectTextWithRegExp, 
    ReselectWithCommaDelimiter, 
    ReselectWithDelimiter, ReselectWithInputDelimiter, ReselectWordsFromText } from './Reselect';
import { QuoteSelectBody } from './SelectUtils';

let stateStore : vscode.Memento;

let localize = nls.loadMessageBundle();

/** 選択部分を編集する */
function EditSelections(editor: vscode.TextEditor, openEnclose: string | null, closeEnclose: string | null, delimiter: string | null) {
    let selections = editor.selections;
    editor.edit(builder => {
        for (const selection of selections) {
            let text = editor.document.getText(selection);
            if (openEnclose) {text = openEnclose + text;}
            if (closeEnclose) {text = text + closeEnclose;}
            if (delimiter) {text = text + delimiter;}
            builder.replace(selection, text);
        }
    });
}

/** N行を一行に結合する */
function JoinNLines(editor: vscode.TextEditor, joinNum: number, delim: string | null = null) { 
    let selections = editor.selections;
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
            if (text.match(/[\r\n]+$/) && len > 0) {len--;}
            for (let i = 0; i < len; i++) {
                let t = textList[i];
                // 改行コードを除去
                t = t.replace(/[\r\n]+$/, '');
                result += t;
                count++;
                if (count === joinNum) {
                    count = 0;
                    result += "\n";
                } else {
                    if(delim) {
                        // delimがnullだった場合追加しない
                        result += delim;
                    }
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
    await textutil.ReselectBrace(editor);
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
    let selections = editor.selections;
    let newSelections: vscode.Selection[] = [];
    let tempSelections: vscode.Selection[] = [];
    let lastStartLine = -1;

    for (const selection of selections) {
        let startLine = selection.start.line;
        if (startLine !== lastStartLine) {
            Filtering(newSelections, tempSelections, indexText);
            lastStartLine = startLine;
            tempSelections = [];
        }
        tempSelections.push(selection);
    }
    Filtering(newSelections, tempSelections, indexText);

    if (newSelections.length > 0) {
        SetEditorSelection(editor, newSelections);
    }
}

// テキストフィルタ
export function FilterSelectionByIndexInLine() {
    vscode.window.showInputBox({ prompt: 'Index Text(ex: "1-2,4,7", Start:1)' }).then((intext) => {
        if (intext === undefined || intext.length === 0 || !vscode.window.activeTextEditor) {return;}
        FilterSelections(vscode.window.activeTextEditor, intext);
    });
}

// 選択を囲む
export function EncloseAllSectionsWithInputChars() {
    vscode.window.showInputBox({ prompt: 'Text to surround' }).then((intext) => {
        if (intext === undefined || intext.length === 0 || !vscode.window.activeTextEditor) {return;}
        EditSelections(vscode.window.activeTextEditor, intext, intext, null);
    });
}

// 選択の最後に追加する
export function AddTextToSelections() {
    vscode.window.showInputBox({ prompt: 'Text to append' }).then((intext) => {
        if (intext === undefined || intext.length === 0 || !vscode.window.activeTextEditor) {return;}
        EditSelections(vscode.window.activeTextEditor, null, null, intext);
    });
}

// クオートの中身を選択
export function QuoteSelect() {
    if (!vscode.window.activeTextEditor) {return;}
    QuoteSelectBody(vscode.window.activeTextEditor, false);
}

// クオートの外側を選択
export function QuoteOuterSelect() {
    if (!vscode.window.activeTextEditor) {return;}
    QuoteSelectBody(vscode.window.activeTextEditor, true);
}

// クリップボード内容をテンプレート埋め込み
export async function ClipboardToTemplate() {
    if (!vscode.window.activeTextEditor) {return;}
    let editor = vscode.window.activeTextEditor;
    let text = await vscode.env.clipboard.readText();
    let rows = textutil.SplitTabRow(text);

    let selections = editor.selections;


    editor.edit(builder => {
        for (const selection of selections) {
            // 選択全体を取得
            let text = editor.document.getText(selection);
            let newText = '';
            for(const row of rows) {
                // ブレイスの位置を取得
                newText += textutil.ReplaceBraceIndex(text, row);
            }
            builder.replace(selection, newText);
        }
    });
}

// テンプレート埋め込み(カンマ区切り)
export async function ClipboardToTemplateCommaSepareted() {
    if (!vscode.window.activeTextEditor) {return;}
    let editor = vscode.window.activeTextEditor;
    let text = await vscode.env.clipboard.readText();
    let rows = textutil.GetRowsFromCommaSeparatedLines(text);

    let selections = editor.selections;

    editor.edit(builder => {
        for (const selection of selections) {
            // 選択全体を取得
            let text = editor.document.getText(selection);
            let newText = '';
            for(const row of rows) {
                // ブレイスの位置を取得
                newText += textutil.ReplaceBraceIndex(text, row);
            }
            builder.replace(selection, newText);
        }
    });
}

// ダブルクオートをシングルクオートに変換
export function ToSingleQuote() {
    replaceEditorText(/"/g, "'");
}

// シングルクオートをダブルクオートに変換
export function ToDoubleQuote() {
    replaceEditorText(/'/g, '"');
}

// 正規表現でエディタのテキストを置換する。
function replaceEditorText(from: RegExp, to: string) {
    if (!vscode.window.activeTextEditor) {return;}
    let editor = vscode.window.activeTextEditor;

    let selections = editor.selections;

    editor.edit(builder => {
        for (const selection of selections) {
            let text = editor.document.getText(selection);
            const newText = text.replace(from, to);
            builder.replace(selection, newText);
        }
    });
}

// カンマ区切りをタブ区切りに変換
export function CommaValuesToTabValues() {
    replaceEditorText(/,/g, '\t');
}

// スペース区切りをタブ区切りに変換する
export function SpaceSeparatedToTabSeparated() {
    replaceEditorText(/[^\S\r\n]+/g, '\t');
}

// タブ区切りとしてクリップボードにコピー(カンマ区切りから)
export function CopyAsTabValues() {
    if (!vscode.window.activeTextEditor) {return;}
    let editor = vscode.window.activeTextEditor;
    let selections = editor.selections;

    let output = "";
    for (const selection of selections) {
        let text = editor.document.getText(selection);
        const newText = text.replace(/,/g, '\t');
        output += newText;
    }

    vscode.env.clipboard.writeText(output);
}

// 行数の表示
export async function CountNumberOfLines() {
    if (!vscode.window.activeTextEditor) {return;}
    const editor = vscode.window.activeTextEditor;
    const selections = editor.selections;

    const start = selections[0].start.line;
    const end = selections[0].end.line;
    const lines = end - start;

    const clipboardLines = await textutil.CountClipboardTextLines();

    await vscode.window.showInformationMessage(`${lines} line(s) selected. (${clipboardLines} clipboard lines)`);
}

// ヘルプの表示
export async function ShowHelp() {
    vscode.env.openExternal(vscode.Uri.parse('https://boukichi.github.io/vscode-parameter-maker/'));
}

// 複数行を結合する
export async function MergeNLines() {
    if (!vscode.window.activeTextEditor) {return;}
    const n = await vscode.window.showInputBox({ prompt: 'N lines' });

    if (n === undefined || n.length === 0) {return;}
    const num = parseInt(n);
    JoinNLines(vscode.window.activeTextEditor, num);
}

// 複数行を結合する
export async function MergeNLinesWithDelimiter() {
    if (!vscode.window.activeTextEditor) {return;}
    let n = await vscode.window.showInputBox({ prompt: 'N lines(default. 2)' });
    const num = n ? parseInt(n) : 2;
    
    let delim = await vscode.window.showInputBox({ prompt: 'Delimiter(default. tab)' });
    delim = delim || '\t';
    const unescapedDelim = UnescapeText(delim);

    JoinNLines(vscode.window.activeTextEditor, num, unescapedDelim);
}

// エスケープされた文字を変換
function UnescapeText(text: string): string {
    if (text.length === 0) {return "";}
    return text
        .replace(/\\\\/g, '\\')  // \\ -> \
        .replace(/\\t/g, '\t')    // \t -> タブ
        .replace(/\\n/g, '\n')    // \n -> 改行
        .replace(/\\r/g, '\r')    // \r -> 復帰
        .replace(/\\"/g, '"')     // \" -> "
        .replace(/\\'/g, "'")     // \' -> '
        .replace(/\\0/g, '\0');   // \0 -> NULL
}


// 選択テキストを複数回コピーする
export function CopySelectedTextNTimes() {
    vscode.window.showInputBox({ prompt: 'N times(default: Number of clipboard lines' }).then(async (n) => {
        if (n === undefined) { return; }
        if (!vscode.window.activeTextEditor) {return;}

        let num = n.length === 0 ? 0 : parseInt(n);
        if (num === 0) {num = await textutil.CountClipboardTextLines();}

        CopySelectedTextNTimesBody(vscode.window.activeTextEditor, num);
    });
}

// 選択したテキストをクリップボードの行数分コピーする
export async function CopySelectedText() {
    let num = await textutil.CountClipboardTextLines();
    if (!vscode.window.activeTextEditor) {return;}
    CopySelectedTextNTimesBody(vscode.window.activeTextEditor, num);
}

// 選択範囲を入力文字列でパラメータ化する
export async function ParameterizeSelectionWithInput() {
    if (!vscode.window.activeTextEditor) {return;}
    let config = vscode.workspace.getConfiguration('parameter-maker');
    let openEncloseConfig = config.get<string>('OpeningEnclosureCharacter') || null;
    let closeEncloseConfig = config.get<string>('ClosingEnclosureCharacter') || null;
    let DelimiterConfig = config.get<string>('Delimiter') || null;

    let openEnclose = await vscode.window.showInputBox({ prompt: 'Opening Enclosure(Empty: Follow the setting)' }) || null;
    let closeEnclose = await vscode.window.showInputBox({ prompt: 'Closing Enclosure(Empty: Follow the setting)' }) || null;
    let Delimiter = await vscode.window.showInputBox({ prompt: 'Delimiter(Empty: Follow the setting)' }) || null;

    openEnclose = openEnclose || openEncloseConfig;
    closeEnclose = closeEnclose || closeEncloseConfig;
    Delimiter = Delimiter || DelimiterConfig;

    EditSelections(vscode.window.activeTextEditor, openEnclose, closeEnclose, Delimiter);
}

// 選択範囲を設定でパラメータ化する
export function ParameterizeSelection() {
    if (!vscode.window.activeTextEditor) {return;}
    let config = vscode.workspace.getConfiguration('parameter-maker');
    let openEnclose = config.get<string>('Quote') || null;
    let closeEnclose = openEnclose;
    let Delimiter = config.get<string>('Delimiter') || null;

    EditSelections(vscode.window.activeTextEditor, openEnclose, closeEnclose, Delimiter);
}

// 選択を分割してパラメータにする
export function SplitSelectionIntoParameters() {
    if (!vscode.window.activeTextEditor) {return;}
    // スペース区切りで分割する
    textutil.ReselectTextWithPattern(vscode.window.activeTextEditor, "\\s+");
    EditSelections(vscode.window.activeTextEditor, null, null, ',');
}

// 選択を分割してクオートしたパラメータにする
export function SplitSelectionIntoQuotedParams() {
    if (!vscode.window.activeTextEditor) {return;}

    // 正規表現分割
    textutil.ReselectTextWithPattern(vscode.window.activeTextEditor, "\\s+");

    let config = vscode.workspace.getConfiguration('parameter-maker');
    let openEnclose = config.get<string>('Quote') || null;
    let closeEnclose = openEnclose;
    let Delimiter = config.get<string>('Delimiter') || null;

    EditSelections(vscode.window.activeTextEditor, openEnclose, closeEnclose, Delimiter);
}


// クオートしたパラメータとしてペースト
export async function PasteAsParameterWithQuote() {
    if (!vscode.window.activeTextEditor) {return;}

    let config = vscode.workspace.getConfiguration('parameter-maker');
    let openEnclose = config.get<string>('Quote') || null;
    let closeEnclose = openEnclose;
    let delimiter = config.get<string>('Delimiter') || null;

    let editor = vscode.window.activeTextEditor;
    let text = await vscode.env.clipboard.readText();
    let values = textutil.SplitText(text);

    insertParameter(editor, values, openEnclose, closeEnclose, delimiter);
}

// クオートしたパラメータを個数指定で改行してペーストする
export async function PasteAsParameterWithLineBreakByCount() {
    if (!vscode.window.activeTextEditor) {return;}

    let config = vscode.workspace.getConfiguration('parameter-maker');
    let openEnclose = config.get<string>('Quote') || null;
    let closeEnclose = openEnclose;
    let delimiter = config.get<string>('Delimiter') || null;

    let editor = vscode.window.activeTextEditor;
    let text = await vscode.env.clipboard.readText();
    let values = textutil.SplitText(text);

    const countText = await vscode.window.showInputBox({ 
        prompt: 'count(default.1)'
    });

    const count = countText ? parseInt(countText) : 1;
    
    insertParametersWithLineBreaksByCount(editor, count, values, openEnclose, closeEnclose, delimiter);
}

// 結合文字で指定個数を結合してペースト
export async function PasteWithDelimiterAndCount() {
    if (!vscode.window.activeTextEditor) { return; }

    const editor = vscode.window.activeTextEditor;
    const text = await vscode.env.clipboard.readText();
    const values = textutil.SplitText(text);

    // 結合個数の入力
    const countText = await vscode.window.showInputBox({ prompt: 'Enter the number of items to join (default. 2)' });
    const count = countText ? parseInt(countText) : 2;
    if (count <= 0) {
        vscode.window.showErrorMessage('Invalid count. Please enter a positive number.');
        return;
    }

    // 結合文字の入力
    let delim = await vscode.window.showInputBox({ prompt: 'Delimiter(default. tab)' });
    delim = delim || '\t';
    const unescapedDelim = UnescapeText(delim);

    // 結合処理とペースト処理
    pasteWithDelimiterAndCount(editor, values, unescapedDelim, count);
}

// 結合処理とペースト処理の実装
function pasteWithDelimiterAndCount(editor: vscode.TextEditor, values: string[], delimiter: string, count: number) {
    const position = editor.selection.active;
    let result = "";
    let currentCount = 0;
    editor.edit(builder => {
        for (const v of values) {
            result += v;
            currentCount++;
            if (currentCount < count) {
                result += delimiter;
            } else {
                builder.insert(position, result);
                builder.insert(position, "\n");
                result = "";
                currentCount = 0;
            }
        }
        if (result.length > 0) {
            builder.insert(position, result);
        }
    });
}


// パラメータとしてペースト
export async function PasteAsParameter() {
    if (!vscode.window.activeTextEditor) {return;}

    let editor = vscode.window.activeTextEditor;
    let text = await vscode.env.clipboard.readText();
    let values = textutil.SplitText(text);

    insertParameter(editor, values, null, null, ',');
}

// 行ごとにカンマ区切りでペースト
export async function PasteWithCommasSeparatingEachLine() {
    if (!vscode.window.activeTextEditor) {return;}

    let editor = vscode.window.activeTextEditor;
    let text = await vscode.env.clipboard.readText();
    let values = textutil.SplitTabRow(text);

    insertCommaLines(editor, values, null, null, ',');
}

// 選択テキストをパターンで置換する
export async function ReplaceSelectedTextWithAPattern() {
    if (!vscode.window.activeTextEditor) {return;}

    const editor = vscode.window.activeTextEditor;

    const key = 'replacePattern'; 
    const value = stateStore.get<string>(key) ?? '"{0}"';

    const pattern = await vscode.window.showInputBox({ 
        prompt: 'Please enter a pattern. The {0} part in the pattern will reflect the original selected content.',
        value: value
    });

    if (!pattern) {return;}

    await stateStore.update(key, pattern);

    editor.edit(builder => {
        const selections = editor.selections;
        for (const selection of selections) {
            const text = editor.document.getText(selection);
            const newText = pattern.replaceAll("{0}", text);
            builder.replace(selection, newText);
        }
    });
}

// 行ごとのパラメータ出力
export function insertCommaLines(editor: vscode.TextEditor, values: string[][], openEnclose: string | null, closeEnclose: string | null, delimiter: string | null) {
    const position = editor.selection.active;

    let firstLine = true;

    editor.edit(builder => {
        for (const row of values) {
            if (firstLine) {
                firstLine = false;
            } else {
                builder.insert(position, "\n");
            }

            for (const v of row) {
                let t = '';
                if (openEnclose) {t += openEnclose;}
                t += v;
                if (closeEnclose) {t += closeEnclose;}
                if (delimiter) {t += delimiter;}
                builder.insert(position, t);
            }
        }
    });
}

// パラメータとして挿入する
function insertParameter(editor: vscode.TextEditor, values: string[], openEnclose: string | null, closeEnclose: string | null, delimiter: string | null) {
    const position = editor.selection.active;

    let len = 0;

    editor.edit(builder => {
        for (const v of values) {
            let t = '';
            if (openEnclose) {t += openEnclose;}
            t += v;
            if (closeEnclose) {t += closeEnclose;}
            if (delimiter) {t += delimiter;}
            if (len + t.length >= 60) {
                builder.insert(position, "\n");
                len = 0;
            }
            builder.insert(position, t);
            len += t.length;
        }
    });
}

// 指定のパラメータ個数で改行する
function insertParametersWithLineBreaksByCount(editor: vscode.TextEditor, count: number, values: string[], openEnclose: string | null, closeEnclose: string | null, delimiter: string | null) {
    const position = editor.selection.active;

    let cnt = 0;
    editor.edit(builder => {
        for (const v of values) {
            let t = '';
            if (openEnclose) {t += openEnclose;}
            t += v;
            if (closeEnclose) {t += closeEnclose;}
            if (delimiter) {t += delimiter;}
            if (count <= cnt) {
                builder.insert(position, "\n");
                count = 0;
            }

            builder.insert(position, t);
            cnt++;
        }
    });
}


// クリップボードを結合して挿入
export async function CombineClipboard() {
    let config = vscode.workspace.getConfiguration('parameter-maker');
    let Delimiter = await vscode.window.showInputBox({ prompt: 'Delimiter(Empty: Follow the setting)' });
    if (Delimiter === undefined) { return; }

    Delimiter = Delimiter || config.get<string>('Delimiter') || undefined;

    const editor = vscode.window.activeTextEditor;
    if (!editor) {return;}
    let text = await vscode.env.clipboard.readText();
    let values = textutil.SplitText(text);

    const position = editor.selection.active;

    let len = 0;

    editor.edit(builder => {
        for (const v of values) {
            let t = '';
            t += v;
            if (Delimiter) {t += Delimiter;}
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
export async function InsertPatternClipboard() {
    const pattern = await vscode.window.showInputBox({ prompt: 'Pattern(ex. "{}"),' });

    if (!pattern) { return; }

    let editor = vscode.window.activeTextEditor;
    if (!editor) { return; }
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

// 連番リプレース処理
async function ReplaceWithSerialNumberBody() {
    if (!vscode.window.activeTextEditor) { return; }
    const editor = vscode.window.activeTextEditor;
    const selections = editor.selections;

    // 開始番号の入力を求める
    const startNumberText = await vscode.window.showInputBox({ prompt: 'Input start number (default: 1)' });

    const startNumber = startNumberText ? parseInt(startNumberText) : 1;
    if (isNaN(startNumber)) {
        vscode.window.showErrorMessage('Invalid number');
        return;
    }

    let currentNumber = startNumber;

    editor.edit(builder => {
        for (const selection of selections) {
            builder.replace(selection, currentNumber.toString());
            currentNumber++;
        }
    });
}

// テンプレート連番リプレース処理
async function ReplaceWithTemplateSerialNumberBody() {
    if (!vscode.window.activeTextEditor) { return; }
    const editor = vscode.window.activeTextEditor;
    const selections = editor.selections;

    // 開始番号の入力を求める
    const startNumberText = await vscode.window.showInputBox({ prompt: 'Input start number (default: 0)' });

    const startNumber = startNumberText ? parseInt(startNumberText) : 0;
    if (isNaN(startNumber)) {
        vscode.window.showErrorMessage('Invalid number');
        return;
    }

    let currentNumber = startNumber;

    editor.edit(builder => {
        for (const selection of selections) {
            builder.replace(selection, '{' + currentNumber.toString() + '}');
            currentNumber++;
        }
    });
}

// コマンド登録
export function registerCommands(context: vscode.ExtensionContext) {
    stateStore = context.workspaceState;

    const CommandList: [string, (...args: any[]) => any][] = [
        ['PasteAsParameter', PasteAsParameter],
        ['PasteAsParameterWithQuote', PasteAsParameterWithQuote],
        ['PasteAsParameterWithLineBreakByCount', PasteAsParameterWithLineBreakByCount],
        ['PasteWithDelimiterAndCount', PasteWithDelimiterAndCount],

        ['FilterSelectionByIndexInLine', FilterSelectionByIndexInLine],
        ['EncloseAllSectionsWithInputChars', EncloseAllSectionsWithInputChars],
        ['AddTextToSelections', AddTextToSelections],
        ['QuoteSelect', QuoteSelect],
        ['ReselectLineFromText', ReselectLineFromText],
        ['ReselectWordsFromText', ReselectWordsFromText],
        ['MergeNLines', MergeNLines],
        ['MergeNLinesWithDelimiter', MergeNLinesWithDelimiter],
        ['CopySelectedTextNTimes', CopySelectedTextNTimes],
        ['CopySelectedText', CopySelectedText],

        ['ParameterizeSelectionWithInput', ParameterizeSelectionWithInput],
        ['ParameterizeSelection', ParameterizeSelection],

        ['ReselectWithDelimiter', ReselectWithDelimiter],
        ['ReselectWithCommaDelimiter', ReselectWithCommaDelimiter],
        ['ReselectWithInputDelimiter', ReselectWithInputDelimiter],
        ['ReselectTextWithRegExp', ReselectTextWithRegExp],
        ['InsertPatternClipboard', InsertPatternClipboard],

        ['ReselectBrace', ReselectBrace],
        ['ReselectSpace', ReselectSpace],
        ['ReselectNumber', ReselectNumber],
        ['ReselectComma', ReselectComma],

        ['SplitSelectionIntoParameters', SplitSelectionIntoParameters],
        ['SplitSelectionIntoQuotedParams', SplitSelectionIntoQuotedParams],

        ['CombineClipboard', CombineClipboard],
        ['QuoteOuterSelect', QuoteOuterSelect],
        ['ReselectNthSkip', ReselectN],
        ['ReselectClipboardContents', ReselectClipboardContents],
        ['ClipboardToTemplate', ClipboardToTemplate],
        ['ClipboardToTemplateCommaSepareted', ClipboardToTemplateCommaSepareted],

        ['ToSingleQuote', ToSingleQuote],
        ['ToDoubleQuote', ToDoubleQuote],
        ['CommaValuesToTabValues', CommaValuesToTabValues],

        ['CountNumberOfLines', CountNumberOfLines],
        ['CopyAsTabValues', CopyAsTabValues],

        ['ReselectLineByReg', ReselectLineByReg],

        ['SpaceSeparatedToTabSeparated', SpaceSeparatedToTabSeparated],
        ['PasteWithCommasSeparatingEachLine', PasteWithCommasSeparatingEachLine],

        ['ShowHelp', ShowHelp],

        ['ReplaceSelectedTextWithAPattern', ReplaceSelectedTextWithAPattern],

        ['ReplaceWithSerialNumber', ReplaceWithSerialNumberBody],
        ['ReplaceWithTemplateSerialNumber', ReplaceWithTemplateSerialNumberBody],
    ];

    for (let i = 0; i < CommandList.length; i++) {
        const Command = CommandList[i];
        const Name = Command[0];
        const Func = Command[1];

        const disposable = vscode.commands.registerCommand('parameter-maker.' + Name, Func);
        context.subscriptions.push(disposable);
    }
}
