'use strict';
import * as vscode from 'vscode';

class Cordinate {
    start: number;
    end: number;
    constructor(start:number, end:number) {
        this.start = start;
        this.end = end;
    }
}

class TextLine {

    lineNo: number; 
    col: number;
    text: string;
    editor: vscode.TextEditor;
    startPos: vscode.Position;

    constructor(editor: vscode.TextEditor, lineNo: number, col: number, text: string) {
        this.editor = editor;
        this.lineNo = lineNo;
        this.col = col;
        this.text = text;
        this.startPos = new vscode.Position(lineNo, col);
    }

    getEndPosition(): vscode.Position {
        return new vscode.Position(this.lineNo, this.col + this.text.length);
    }

    getStartPosition(): vscode.Position {
        return new vscode.Position(this.lineNo, this.col);
    }

    positionAt(index: number) {
        let offset = this.editor.document.offsetAt(this.startPos);
        return this.editor.document.positionAt(offset + index);
    }

    charactorAt(index: number): string {
        return this.text[index];
    }


    getRange(co: Cordinate) : vscode.Range {
        let startPos = this.positionAt(co.start);
        let endPos = this.positionAt(co.end);
        return new vscode.Range(startPos, endPos);
    }

}

// 選択したテキスト行
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
    
            var lineText = editor.document.getText(new vscode.Range(startPos, endPos));
            var col = startPos.character;

            lines.push(new TextLine(editor, lno, col, lineText));
        }
    }
    return lines;
}

/** テキストを正規表現パターンで分割再選択する */
export function ReselectTextWithPattern(editor: vscode.TextEditor, pattern: string) {
    let LineList = GetSelectedTextLines(editor);
    let newSelections: vscode.Selection[] = [];
    for(const l of LineList) {
        // 範囲の取得
        var cord = GetRangeFromPattern(l.text, pattern);
        for (var ci = 0; ci < cord.length; ci++) {
            var co = cord[ci];
            let range = l.getRange(co);
            let sel = new vscode.Selection(range.start, range.end);
            newSelections.push(sel);
        }
    }

    if (newSelections.length > 0) editor.selections = newSelections;
}



/** 正規表現のパターンと一致したインデックスのリストを得る */
export function GetIndexList(text: string, pattern: string) : number[] {
    var re = new RegExp(pattern, "g");
    var positions = [];
    if (text.length == 0) return positions;
    while (true) {
        var match = re.exec(text);
        if (match == null || match[0].length == 0) break;
        positions.push(match.index);
    }
    return positions;
}

/** 正規表現のパターンと一致したリストを得る */
export function SplitText(text: string) {
    text = text.replace(/[\r\n]+/g, "\n");
    text = text.replace(/\t+/g, "\n");
    return text.split("\n");
}

/** {}の範囲リストを作成 */
export function MakeBracketRangeList(text: string) : Cordinate[] {
    var re = new RegExp('\{\}', "g");
    var coordinates : Cordinate[] = [];

    if (text.length == 0) return coordinates;
    while (true) {
        var match = re.exec(text);
        if (match == null || match[0].length == 0) break;
        let start = match.index;
        let end = start + match[0].length;
        coordinates.push(new Cordinate(start, end));
    }

    return coordinates;
}


/** 選択位置の追加 */
function PushCoordinate(coordinates: Cordinate[], start: number, end: number) {
    // 開始と終了が同じ場合は選択しない
    if (start == end) return;
    coordinates.push(new Cordinate(start, end));
}


/** 正規表現を区切りとした範囲を得る */
export function GetRangeFromPattern(text: string, pattern: string) : Cordinate[] {
    var re = new RegExp(pattern, "g");
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


/** 入力文字の範囲を得る */
export function GetRangeFromIntext(text: string, seperator: string) {
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

/** インデックスリストをテキストより作成 */
export function IndexFromText(text: string, headNumber: number, tailNumber: number) {
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


// {}を再選択する
export async function SelectBracket(editor: vscode.TextEditor) {
    let newsel: vscode.Selection[] = [];
    let LineList = GetSelectedTextLines(editor);

    for (const l of LineList) {
        // {}の範囲を取得
        var cord = MakeBracketRangeList(l.text);
        for (var ci = 0; ci < cord.length; ci++) {
            var co = cord[ci];
            let range = l.getRange(co);
            let sel = new vscode.Selection(range.start, range.end);
            newsel.push(sel);
        }
    }

    if (newsel.length > 0) {
        editor.selections = newsel;
    }
}

// 全体の範囲を取得する
export function GetDocumentRange(doc:vscode.TextDocument) : vscode.Range  {
    let start = doc.lineAt(0);
    let end = doc.lineAt(doc.lineCount-1);
    return new vscode.Range(start.range.start, end.range.end);
}

// 全体の範囲を取得する
export function GetDocumentSelect(doc:vscode.TextDocument) : vscode.Selection  {
    let range = GetDocumentRange(doc);
    return new vscode.Selection(range.start, range.end);
}