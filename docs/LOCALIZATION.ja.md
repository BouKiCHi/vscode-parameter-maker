# VS Code 拡張の日本語翻訳の仕組み (このリポジトリ方式)

このプロジェクトは、VS Code 拡張の標準的な `package.nls*.json` 方式で翻訳しています。
拡張寄与情報（コマンド名、設定説明、サブメニュー名）だけでなく、コード内メッセージも同じ翻訳ファイルを参照します。

## 0. 導入に必要なもの

- 必須パッケージ: `vscode-nls`
- 開発依存: `@types/vscode` (通常の拡張開発で使用)

インストール例:

```bash
npm install vscode-nls
```

`package.json` の例:

```json
{
  "dependencies": {
    "vscode-nls": "^5.2.0"
  }
}
```

## 1. 仕組みの全体像

- `package.json` には翻訳キーを `%...%` 形式で書く
- 既定言語(英語など)は `package.nls.json` に書く
- 日本語は `package.nls.ja.json` に同じキーで書く
- VS Code が UI 言語に応じて自動で切り替える

例:

```json
// package.json
{
  "contributes": {
    "commands": [
      {
        "command": "sample.hello",
        "title": "%sample.hello.title%"
      }
    ]
  }
}
```

```json
// package.nls.json
{
  "sample.hello.title": "Hello"
}
```

```json
// package.nls.ja.json
{
  "sample.hello.title": "こんにちは"
}
```

## 1.1 `package.nls*.json` の書式ルール

- JSON オブジェクト 1 つで定義する (`{ "key": "message" }`)
- キーは完全一致で管理する (`package.nls.json` と `package.nls.ja.json` で同一キー)
- キーは用途ごとに接頭辞を分ける
- 例:
  - `your-extension.command.hello.title`
  - `your-extension.config.delimiter.description`
  - `prompt.joinLines`
  - `error.invalidCount`

最小テンプレート:

```json
// package.nls.json
{
  "your-extension.command.hello.title": "Hello",
  "prompt.inputName": "Input name",
  "message.done": "Done: {0}"
}
```

```json
// package.nls.ja.json
{
  "your-extension.command.hello.title": "こんにちは",
  "prompt.inputName": "名前を入力",
  "message.done": "完了: {0}"
}
```

## 2. このリポジトリで実際に使っている場所

- 翻訳キー参照: `package.json:32` など (`description` / `title` / `label`)
- 既定メッセージ: `package.nls.json:2`
- 日本語メッセージ: `package.nls.ja.json:2`
- コード内ローカライズ関数: `src/localize.ts`

翻訳漏れしやすい `package.json` 項目:

- `displayName`
- `description`
- `contributes.configuration[].title`
- `contributes.commands[].category`

## 3. 他プロジェクトに移植する手順

1. `package.json` のユーザー向け文字列を `%your-extension.someKey%` に置換
2. ルートに `package.nls.json` を作成して既定文言を定義
3. `package.nls.ja.json` を作成して同じキーの日本語を定義
4. 追加したキーが 3 ファイルで対応していることを確認

運用ルール:

- キー名は `拡張ID.用途.項目` 形式に統一する
- `package.nls.json` をキーの正本として、翻訳ファイル側は追従する
- コマンド追加時は `package.json` / `package.nls.json` / `package.nls.ja.json` を同時更新する

`package.json` 側の最小例:

```json
{
  "name": "your-extension",
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "your-extension.hello",
        "title": "%your-extension.command.hello.title%"
      }
    ]
  }
}
```

## 4. コード内メッセージを翻訳する場合

このリポジトリでは `src/localize.ts` で `package.nls.json` / `package.nls.<lang>.json` を直接読み込み、`localize(...)` を共通化しています。

最小 `localize.ts` 例:

```ts
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

const root = path.resolve(__dirname, '..');
const base = JSON.parse(fs.readFileSync(path.join(root, 'package.nls.json'), 'utf8'));
const lang = (vscode.env.language || 'en').split('-')[0];
const localePath = path.join(root, `package.nls.${lang}.json`);
const locale = fs.existsSync(localePath) ? JSON.parse(fs.readFileSync(localePath, 'utf8')) : {};

export function localize(key: string, fallback: string, ...args: unknown[]): string {
  const template = locale[key] ?? base[key] ?? fallback;
  return template.replace(/\{(\d+)\}/g, (_, i) => String(args[Number(i)] ?? ''));
}
```

利用例:

```ts
import { localize } from './localize';

vscode.window.showInputBox({
  prompt: localize('prompt.mergeNLines', 'N lines')
});
```

最小 `extension.ts` 例:

```ts
import * as vscode from 'vscode';
import { localize } from './localize';

export function activate(context: vscode.ExtensionContext) {
  const disposable = vscode.commands.registerCommand('your-extension.hello', async () => {
    const name = await vscode.window.showInputBox({
      prompt: localize('prompt.inputName', 'Input name')
    });
    if (!name) { return; }

    await vscode.window.showInformationMessage(
      localize('message.done', 'Done: {0}', name)
    );
  });

  context.subscriptions.push(disposable);
}

export function deactivate() {}
```

注意:

- コード側文言も同じ `package.nls*.json` にキー追加して運用する
- プレースホルダ (`{0}`, `{1}` など) を使う場合は、`localize` 側で置換処理を実装する
- `vscode-nls` の実行時バンドル生成を使わない構成では、`package.nls*.json` を直接読む方式が安定しやすい

## 4.1 翻訳反映の確認手順

1. `package.json` の `%key%` と `package.nls*.json` のキー一致を確認
2. コード側は `localize('key', 'Default')` で呼び出しているか確認
3. `npm run compile` / `npm run lint` を実行
4. VS Code で `Developer: Reload Window` 後に表示を確認

## 5. チェックリスト

- 新しい `%key%` を `package.json` に追加した
- `package.nls.json` に同キーを追加した
- `package.nls.ja.json` に同キーを追加した
- コード内文字列を `localize('key', 'Default message')` に置換した
- `displayName` / `description` / `configuration.title` / `command.category` の翻訳漏れがない
- `showInputBox` の `undefined` (Escape/Cancel) を中止として処理している
- UI 表示が日本語環境で期待どおりに切り替わることを確認した
