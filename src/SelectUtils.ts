import * as vscode from 'vscode';
import { SetEditorSelection } from './SetEditorSelection';
import { TextLine } from './TextLine';
import * as textutil from './textutil';

/** 入力テキストで一致する行を選択する */
export function SelectLineByRegExpString(editor: vscode.TextEditor, intext: string) {
    var re = new RegExp(intext, "g");

    const newSelections: vscode.Selection[] = [];

    const LineList = textutil.GetSelectedTextLines(editor);

    for (const l of LineList) {
        var match = re.exec(l.text);
        if (match === null || match[0].length === 0) { continue; }

        let start = l.getStartPosition();
        let end = l.getEndPosition();
        let sel = new vscode.Selection(start, end);
        newSelections.push(sel);
    }

    if (newSelections.length > 0) {
        SetEditorSelection(editor, newSelections);
    }
}

/** 選択をリストに追加 */
export function AddSelection(list: vscode.Selection[], currentLine: TextLine, cord: any[]) {
    for (var ci = 0; ci < cord.length; ci++) {
        var co = cord[ci];
        let startPos = currentLine.positionAt(co[0]);
        let endPos = currentLine.positionAt(co[1]);
        let sel = new vscode.Selection(startPos, endPos);
        list.push(sel);
    }
}

/** テキストを1行ごとに選択する */
export function MakeLineSelections(editor: vscode.TextEditor) {
    let newSelections: vscode.Selection[] = [];

    let LineList = textutil.GetSelectedTextLines(editor);

    for (const l of LineList) {
        let start = l.getStartPosition();
        let end = l.getEndPosition();

        let sel = new vscode.Selection(start, end);
        newSelections.push(sel);
    }

    if (newSelections.length > 0) {
        SetEditorSelection(editor, newSelections);
    }
}

/** 引用符を選択リストにする */
export function MakeQuoteSelections(quoteList: textutil.CharactorPosition[], outer: boolean): vscode.Selection[] {
    let newSelections: vscode.Selection[] = [];

    var qi = 0;
    var startQuote = null;
    var startPos: vscode.Position = new vscode.Position(0, 0);

    while (qi < quoteList.length) {
        var qp = quoteList[qi];
        var ch = qp.text;
        var currentPos = qp.pos;
        if (startQuote === null) {
            startPos = currentPos;
            startQuote = ch;
            qi++;
            continue;
        }
        if (startQuote === ch) {
            var startCharacter = outer ? startPos.character : startPos.character + 1;
            var epos = outer ? new vscode.Position(currentPos.line, currentPos.character + 1) : currentPos;
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
export function QuoteSelectBody(editor: vscode.TextEditor, outer: boolean) {
    let quoteList: textutil.CharactorPosition[] = [];

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
    if (newSelections.length > 0) {
        SetEditorSelection(editor, newSelections);
    }
}

