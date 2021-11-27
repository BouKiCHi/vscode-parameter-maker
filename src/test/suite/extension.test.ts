import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from 'vscode';

import * as pm from '../../extension';

suite('Extension Test Suite', () => {
	vscode.window.showInformationMessage('Start all tests.');

	test('pm test', async () => {
		const content =  "ABC\nDEF\nGHI";
		let doc= await vscode.workspace.openTextDocument({content: content});
		var editor = await vscode.window.showTextDocument(doc);

		let start = doc.positionAt(0);
		let end = doc.positionAt(content.length);
		editor.selection = new vscode.Selection(start, end);
		// assert.notStrictEqual(content);

		pm.QuoteSelectBody(editor);
	});


	test('Sample test', () => {
		assert.strictEqual(-1, [1, 2, 3].indexOf(5));
		assert.strictEqual(-1, [1, 2, 3].indexOf(0));
	});
});
