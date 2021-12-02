import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';

import * as textutil from '../../textutil';

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start all tests.');

    async function getTestEditor(text:string) : Promise<vscode.TextEditor> {
        let doc= await vscode.workspace.openTextDocument({content: text});
        var editor = await vscode.window.showTextDocument(doc);
        return editor;
    }

    // テキスト分離
    test('SplitText', async () => {
        let va = textutil.SplitText("aaa\nbbb\n");
        assert.strictEqual(va.length, 2);
    });


    // テキストを正規表現パターンでの分割再選択をテスト
    test('ReselectTextWithPattern test', async () => {
        const content =  "A,B,C\nD,EF";
        const exp =  ["A","B","C","D","EF"];

        let editor = await getTestEditor(content);
        let doc = editor.document; 
        editor.selection = textutil.GetDocumentSelect(doc);

        textutil.ReselectTextWithPattern(editor, ",");
        let selections = editor.selections;

        assert.strictEqual(selections.length, 5);
        for(let i = 0; i < exp.length; i++) {
            let text = doc.getText(selections[i]);
            assert.strictEqual(text, exp[i]);
        }
        editor.hide();
    });

    // {}を再選択する
    test('SelectBracket test', async () => {
        const content =  "AB{}C\nD{}EF\nGHI";
        let editor = await getTestEditor(content);
        let doc = editor.document; 
        editor.selection = textutil.GetDocumentSelect(doc);

        textutil.SelectBracket(editor);
        let selections = editor.selections;

        assert.strictEqual(selections.length, 2);
        assert.strictEqual(selections[0].start.character, 2);
        assert.strictEqual(selections[1].start.character, 1);
        assert.strictEqual(doc.getText(selections[0]), "{}");
        assert.strictEqual(doc.getText(selections[1]), "{}");

        editor.hide();
    });

    // 
    test('pm test', async () => {
        const content =  "ABC\nDEF\nGHI";
        let editor = await getTestEditor(content);
        let doc = editor.document;

        let startPos = doc.positionAt(0);
        let endPos = doc.positionAt(content.length);
        editor.selection = new vscode.Selection(startPos, endPos);

        editor.hide();
        // assert.notStrictEqual(content);
    });

});
