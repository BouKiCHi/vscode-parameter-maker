
import * as vscode from 'vscode';
import { TextLine } from './TextLine';
import { SetEditorSelection } from './SetEditorSelection';

// 開始位置、終了位置、インデックスを格納するクラス
export class Cordinate {
    index: number;
    start: number;
    end: number;

    constructor(start:number, end:number);
    constructor(start:number, end:number, index:number);

    constructor(start:number, end:number, index?:number) {
        this.start = start;
        this.end = end;
        this.index = index ?? -1;
    }
}

// 文字と位置を格納するクラス
export class CharactorPosition {
    text: string;
    pos: vscode.Position;

    constructor(text:string, pos: vscode.Position) {
        this.text = text;
        this.pos = pos;
    }
}

// クリップボードの行数を取得
export async function CountClipboardTextLines() {
    let value = await vscode.env.clipboard.readText();
    let value2 = value.replace(/[\r\n]+/g, "\n");
    let data = value2.split("\n");
    return data.length;
}


/** 選択したテキスト行を取得する */
export function GetSelectedTextLines(editor: vscode.TextEditor) : TextLine[] {
    let selections = editor.selections;
    let lines : TextLine[] = [];
    for (const selection of selections) {
        let startLineNo = selection.start.line;
        let endLineNo = selection.end.line;
    
        for (let lno = startLineNo; lno <= endLineNo; lno++) {
            let line = editor.document.lineAt(lno);
            let startPos = lno == startLineNo ? selection.start : line.range.start;
            let endPos = lno == endLineNo ? selection.end : line.range.end;

            if (startPos.isEqual(endPos)) {continue;}
    
            var lineText = editor.document.getText(new vscode.Range(startPos, endPos));
            var col = startPos.character;

            lines.push(new TextLine(editor, lno, col, lineText));
        }
    }
    return lines;
}

/** テキストを行ごとに正規表現パターンで分割再選択する */
export function ReselectTextWithPattern(editor: vscode.TextEditor, pattern: string) {

    // 行ごとに選択する
    let lineList = GetSelectedTextLines(editor);
    let newSelections: vscode.Selection[] = [];
    for(const l of lineList) {
        // 範囲の取得
        var cord = GetRangeFromPattern(l.text, pattern);
        for (var ci = 0; ci < cord.length; ci++) {
            var co = cord[ci];
            const range = l.getRange(co);
            let sel = new vscode.Selection(range.start, range.end);
            newSelections.push(sel);
        }
    }

    if (newSelections.length > 0) {
        SetEditorSelection(editor, newSelections);
    }
}

/** テキスト選択を正規表現パターンで分割して再選択する */
export function ReselectByRegex(editor: vscode.TextEditor, pattern: string) {
    let newSelections: vscode.Selection[] = [];

    // ここでは選択を一つのまとまりとして使用する
    for(const sel of editor.selections) {
        const text = editor.document.getText(sel);

        // 範囲の取得
        var cord = GetRangeFromPattern(text, pattern);

        for (var ci = 0; ci < cord.length; ci++) {
            const co = cord[ci];
            const start = editor.document.positionAt(editor.document.offsetAt(sel.start) + co.start);
            const end = editor.document.positionAt(editor.document.offsetAt(sel.start) + co.end);
            const newSel = new vscode.Selection(start, end);
            newSelections.push(newSel);
        }
    }

    if (newSelections.length > 0) {
        SetEditorSelection(editor, newSelections);
    }
}

/** 正規表現のパターンと一致したインデックスのリストを得る */
export function GetIndexList(text: string, pattern: string) : number[] {
    var re = new RegExp(pattern, "g");
    var positions : number[] = [];
    if (text.length == 0) {return positions;}
    while (true) {
        var match = re.exec(text);
        if (match == null || match[0].length == 0) {break;}
        positions.push(match.index);
    }
    return positions;
}

/** テキストを改行やタブで分離する */
export function SplitText(text: string) {
    text = text.trimEnd();
    text = text.replace(/[\r\n]+/g, "\n");
    text = text.replace(/\t+/g, "\n");
    return text.split("\n");
}

/** テキストを行ごとにタブで分離する */
export function SplitTabRow(text: string) {
    text = text.trimEnd();
    text = text.replace(/[\r\n]+/g, "\n");
    return text.split("\n").map(x => x.split("\t"));
}

/** カンマ区切りから各要素の配列を取得する */
export function GetRowsFromCommaSeparatedLines(text: string) {
    text = text.trimEnd();
    text = text.replace(/[\r\n]+/g, "\n");
    return text.split("\n").map(x => x.split(","));
}

/** 正規表現に一致した部分の範囲リストを作成 */
function MakeRangeList(re: RegExp, text: string) : Cordinate[] {
    var coordinates : Cordinate[] = [];

    if (text.length == 0) {return coordinates;}
    while (true) {
        var match = re.exec(text);
        if (match == null || match[0].length == 0) {break;}
        let start = match.index;
        let end = start + match[0].length;
        coordinates.push(new Cordinate(start, end));
    }

    return coordinates;
}

/** {n}を置換する */
export function ReplaceBraceIndex(text: string, values: string[]) : string {
    return text.replace(/\{(\d+)\}/g, function(sub,p1) {
        let index = +p1;
        if (index < 0 || values.length <= index) {return '';}
        return values[index];
    });
}


/** 選択位置の追加 */
function PushCoordinate(coordinates: Cordinate[], start: number, end: number) {
    // 開始と終了が同じ場合は選択しない
    if (start == end) {return;}
    coordinates.push(new Cordinate(start, end));
}


/** 正規表現を区切りとした範囲を得る */
export function GetRangeFromPattern(text: string, pattern: string) : Cordinate[] {
    var re = new RegExp(pattern, "g");
    var start = 0;
    var end = 0;
    var coordinates : Cordinate[] = [];

    if (text.length == 0) {return coordinates;}
    while (true) {
        var match = re.exec(text);
        if (match == null || match[0].length == 0) {break;}
        end = match.index;
        PushCoordinate(coordinates, start, end);
        start = re.lastIndex;
    }

    end = text.length;
    PushCoordinate(coordinates, start, end);
    return coordinates;
}


/** 入力文字の範囲を得る */
export function GetRangeFromIntext(text: string, seperator: string) {
    var re = new RegExp(seperator, "g");
    var coordinates : any[] = [];

    if (text.length == 0) {return coordinates;}
    while (true) {
        var match = re.exec(text);
        if (match == null || match[0].length == 0) {break;}
        var start = match.index;
        var length = match[0].length;
        coordinates.push([start, start + length]);
        start = re.lastIndex;
    }
    return coordinates;
}

/** keyで指定した文字列の範囲を得る */
export function GetRangeAll(text: string, key: string) {
    // 正規表現エスケープ
    let KeyEscaped = EscapeRegExp(key);
    var re = new RegExp(KeyEscaped, "g");
    var coordinates : any[] = [];

    if (text.length == 0) {return coordinates;}
    while (true) {
        var m = re.exec(text);
        if (m == null || m[0].length == 0) {break;}
        var start = m.index;
        var length = m[0].length;
        coordinates.push([start, start + length]);
    }
    return coordinates;
}

/** 正規表現のエスケープ */
function EscapeRegExp(text: string) {
    return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); 
}

/** インデックスリストをテキストより作成 */
export function IndexFromText(text: string, headNumber: number, tailNumber: number) {
    var indexData = text.split(",");
    var map : any = {};
    headNumber = headNumber || 0;

    for (var i = 0; i < indexData.length; i++) {
        var v = indexData[i];
        if (v.indexOf("-") >= 0) {
            var values = v.split("-");
            var start = parseInt(values[0]);
            if (isNaN(start)) {start = headNumber;}
            var end = values.length > 0 ? parseInt(values[1]) : -1;
            if (isNaN(end) || end < start || end > tailNumber) {end = tailNumber;}
            for (var j = start; j <= end; j++) {
                if (j < headNumber || j > tailNumber) {continue;}
                if (j in map) {continue;}
                map[j] = true;
            }
        } else {
            var j = parseInt(v);
            if (j < headNumber || j > tailNumber) {continue;}
            if (j in map) {continue;}
            map[j] = true;
        }
    }

    var keys = [];
    for (var k in map) {keys.push(parseInt(k));}
    keys.sort((a, b) => { return a - b; });
    return keys;
}

// スペース(空白)を再選択する
export async function ReselectSpace(editor: vscode.TextEditor) {
    const re = new RegExp(/\s+/, 'g');
    ReselectWithRegExp(editor, re);
}

// 数字を再選択する
export async function ReselectNumber(editor: vscode.TextEditor) {
    const re = new RegExp(/[\d.][\d_.]*/, 'g');
    ReselectWithRegExp(editor, re);
}

// カンマを再選択する
export async function ReselectComma(editor: vscode.TextEditor) {
    const re = new RegExp(/,/, 'g');
    ReselectWithRegExp(editor, re);
}

// {}を再選択する
export async function ReselectBrace(editor: vscode.TextEditor) {
    const re = new RegExp(/\{\}/, 'g');
    ReselectWithRegExp(editor, re);
}

// 正規表現で再選択する
function ReselectWithRegExp(editor: vscode.TextEditor, re: RegExp) {
    let newsel: vscode.Selection[] = [];
    let LineList = GetSelectedTextLines(editor);

    for (const l of LineList) {
        // 正規表現で選択
        var cord = MakeRangeList(re, l.text);
        for (var ci = 0; ci < cord.length; ci++) {
            var co = cord[ci];
            let range = l.getRange(co);
            let sel = new vscode.Selection(range.start, range.end);
            newsel.push(sel);
        }
    }

    if (newsel.length > 0) {
        SetEditorSelection(editor, newsel);
    }
}

// 複数選択をN個ごとに再選択
export async function ReselectN(editor: vscode.TextEditor, num: number) {
    let newsel: vscode.Selection[] = [];
    let selections = editor.selections;

    let c = 0;
    for(let i = 0; i < selections.length; i++) {
        let s = selections[i];
        if (c == 0) {
            newsel.push(s); 
            c = num;
        }
        c--;
    }
    
    if (newsel.length > 0) {
        SetEditorSelection(editor, newsel);
    }
}

/** 全体の範囲を取得する */
export function GetDocumentRange(doc:vscode.TextDocument) : vscode.Range  {
    let start = doc.lineAt(0);
    let end = doc.lineAt(doc.lineCount-1);
    return new vscode.Range(start.range.start, end.range.end);
}

/** 全体の範囲を取得する */
export function GetDocumentSelect(doc:vscode.TextDocument) : vscode.Selection  {
    let range = GetDocumentRange(doc);
    return new vscode.Selection(range.start, range.end);
}

/** 改行テキストを取得 */
export function getTextList(text: string) {
    var regex = /[\r\n]+/;
    return text.split(regex);
}

/** 選択内容はカーソルか？(範囲の長さがないもの) */
export function IsCursor(selection: vscode.Selection) : boolean {
    return selection.start.isEqual(selection.end);
}

/** リピートする文字列の作成 */
export function repeatString(count: number, text: string, trim: boolean) : string {
    let result = "";
    for (let i = 0; i < count; i++) { result += text; }
    if (trim) {result = result.trimEnd();}
    return result;
}
