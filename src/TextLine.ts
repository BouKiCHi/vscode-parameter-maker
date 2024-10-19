
import * as vscode from 'vscode';
import { Cordinate } from './textutil';


export class TextLine {

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

    positionAt(index: number) : vscode.Position {
        let offset = this.editor.document.offsetAt(this.startPos);
        return this.editor.document.positionAt(offset + index);
    }

    charactorAt(index: number): string {
        return this.text[index];
    }


    getRange(co: Cordinate): vscode.Range {
        let startPos = this.positionAt(co.start);
        let endPos = this.positionAt(co.end);
        return new vscode.Range(startPos, endPos);
    }

}
