import * as vscode from 'vscode';
import { MakeLineSelections } from './SelectUtils';
import { AddSelection } from './SelectUtils';
import { SelectLineByRegExpString } from './SelectUtils';
import { SetEditorSelection } from './SetEditorSelection';
import * as textutil from './textutil';
import { localize } from './localize';

// テキストを入力テキストによって再選択する
export function MakeSelectionsFromText(editor: vscode.TextEditor, intext: string) {
    let LineList = textutil.GetSelectedTextLines(editor);
    let newSelections: vscode.Selection[] = [];
    for (const l of LineList) {
        // 範囲の取得
        var cord = textutil.GetRangeFromIntext(l.text, intext);
        AddSelection(newSelections, l, cord);
    }

    if (newSelections.length > 0) {
        SetEditorSelection(editor, newSelections);
    }
}
// 正規表現で再選択する
export function ReselectTextWithRegExp() {
    vscode.window.showInputBox({ prompt: localize('prompt.reselectTextWithRegExp', 'Text (RegExp)') }).then((intext) => {
        if (intext === undefined || intext.length === 0 || !vscode.window.activeTextEditor) { return Promise.reject(); }
        MakeSelectionsFromText(vscode.window.activeTextEditor, intext);
    });
}

// 正規表現で一行を再選択する
export function ReselectLineByReg() {
    vscode.window.showInputBox({ prompt: localize('prompt.reselectLineByReg', 'Text (RegExp)') }).then((intext) => {
        if (intext === undefined || intext.length === 0 || !vscode.window.activeTextEditor) { return Promise.reject(); }
        SelectLineByRegExpString(vscode.window.activeTextEditor, intext);
    });
}

// 複数選択をN個飛ばしで再選択
export async function ReselectN() {
    if (!vscode.window.activeTextEditor) { return; }
    const n = await vscode.window.showInputBox({ prompt: localize('prompt.reselectN', 'Number of N') });
    if (n === undefined || n.length === 0) { return; }
    const num = parseInt(n);
    if (isNaN(num) || num <= 0) { return; }
    textutil.ReselectN(vscode.window.activeTextEditor, num);
}

// クリップボード内容を再選択
export async function ReselectClipboardContents() {
    if (!vscode.window.activeTextEditor) { return; }
    let editor = vscode.window.activeTextEditor;
    let text = await vscode.env.clipboard.readText();
    let keywords = textutil.SplitText(text);
    MakeSelectionsFromKeywords(editor, keywords);
}

// テキストを入力テキストによって再選択する
export function MakeSelectionsFromKeywords(editor: vscode.TextEditor, keywords: string[]) {
    const lineList = textutil.GetSelectedTextLines(editor);
    const newSelections: vscode.Selection[] = [];
    for (const l of lineList) {
        // 範囲の取得
        for (let ki in keywords) {
            let key = keywords[ki];
            let cord = textutil.GetRangeAll(l.text, key);
            AddSelection(newSelections, l, cord);
        }
    }
    if (newSelections.length > 0) {
        SetEditorSelection(editor, newSelections);
    }
}

// カンマを再選択する
export function ReselectComma() {
    if (!vscode.window.activeTextEditor) { return; }
    textutil.ReselectComma(vscode.window.activeTextEditor);
}

// 数字を再選択
export function ReselectNumber() {
    if (!vscode.window.activeTextEditor) { return; }
    textutil.ReselectNumber(vscode.window.activeTextEditor);
}

// スペース(空白)を再選択
export function ReselectSpace() {
    if (!vscode.window.activeTextEditor) { return; }
    textutil.ReselectSpace(vscode.window.activeTextEditor);
}

// {}を再選択
export function ReselectBrace() {
    if (!vscode.window.activeTextEditor) { return; }
    textutil.ReselectBrace(vscode.window.activeTextEditor);
}

// 入力区切り文字で再選択
export async function ReselectWithInputDelimiter() {
    let delimiter = await vscode.window.showInputBox({ prompt: localize('prompt.reselectWithInputDelimiter', 'Delimiter') });
    if (!delimiter) { return; }
    if (!vscode.window.activeTextEditor) { return; }
    textutil.ReselectTextWithPattern(vscode.window.activeTextEditor, delimiter);
}

// 区切り文字で再選択
export function ReselectWithDelimiter() {
    let config = vscode.workspace.getConfiguration('parameter-maker');
    let delimiter = config.get<string>('Delimiter') || null;
    if (!delimiter) { return; }
    if (!vscode.window.activeTextEditor) { return; }
    textutil.ReselectTextWithPattern(vscode.window.activeTextEditor, delimiter);
}

// カンマ区切りで再選択
export function ReselectWithCommaDelimiter() {
    if (!vscode.window.activeTextEditor) { return; }
    let config = vscode.workspace.getConfiguration('parameter-maker');
    let delimiter = ",\\s*";
    if (!delimiter) { return; }
    textutil.ReselectByRegex(vscode.window.activeTextEditor, delimiter);
}

// 単語を分割して再選択する
export function ReselectWordsFromText() {
    if (!vscode.window.activeTextEditor) { return; }
    textutil.ReselectTextWithPattern(vscode.window.activeTextEditor, "\\s+");
}

// １行を分割して再選択
export function ReselectLineFromText() {
    if (!vscode.window.activeTextEditor) { return; }
    MakeLineSelections(vscode.window.activeTextEditor);
}

