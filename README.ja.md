# Parameter Maker README

## 説明

この拡張は次の機能を追加します。

### 編集

| 日本語                  | English                                               |
|-------------------------------|----------------------------------------------------------------------|
| 選択範囲にテキストを追加                  | Add text to selections                                               |
| すべての選択を入力文字で囲む                | Enclose all selections with input characters                         |
| N行を結合                         | Join(Merge) N lines into one line                                    |
| N行を入力した区切り文字で結合             | Join(Merge) N lines with input delimiter                |
| N回コピー                         | Copy the selected text N times                                       |
| 選択範囲を設定でパラメータ化する              | Parameterize the selection with settings                             |
| 選択範囲を入力文字列でパラメータ化する           | Parameterize the selection with an input string                      |
| 選択をクリップボード内容の行数分コピー           | Copy selected text as many lines as there are lines in the clipboard |
| クリップボード内容を結合して挿入              | Combine and insert clipboard contents                                |
| クリップボード内容をパターン挿入              | Insert clipboard contents with pattern                               |
| パラメータとしてペースト                  | Paste as parameter                                                   |
| クオートしたパラメータとしてペースト            | Paste as quoted parameter                                            |
| 選択を分割してパラメータにする               | Split selection into parameters                                      |
| 選択を分割してクオートしたパラメータにする         | Split selection into quoted params                                   |
| クリップボード内容をテンプレート埋め込み          | Embed clipboard contents into a template                             |
| タブ区切りとしてクリップボードにコピー(カンマ区切りから) | Copy to clipboard as tab-delimited (from comma-separated)            |
| 選択行数を表示する                     | Show the number of selected lines.                                   |
| 行ごとにカンマ区切りでペースト               | Paste with Commas Separating Each Line                               |


### 変換

| 日本語                  | English                                               |
|-------------------------|--------------------------------------------------------|
| シングルクオートに置換する(他のクオートから) | To single quote(from other quote)                      |
| ダブルクオートに置換する(他のクオートから)  | To double quote(from other quote)                      |
| カンマ区切りをタブ区切りに変換         | Convert comma-separated values to tab-separated values |
| スペース区切りをタブ区切りに変換        | Convert space-separated to tab-separated values        |

### 再選択

| 日本語                  | English                                               |
|-------------------------|--------------------------------------------------------|
| インデックス番号で行内を再選択 | Filter selection by index number               |
| 正規表現で再選択        | Reselect selected text with regular expression |
| 1行を分割して再選択      | Split a line of selected text and Reselect it  |
| 単語を分割して再選択      | Split the word and reselect                    |
| 引用符の中身を再選択      | Reselect inside of quotes                      |
| 引用符の外側を再選択      | Reselect outer of quotes                       |
| 区切り文字で再選択       | Reselect with delimiter                        |
| 入力区切り文字で再選択     | Reselect with input delimiter                  |
| {}を再選択          | Reselect {} bracket                            |
| N個飛ばしで再選択       | Reselect with Every Nth Skip                   |
| クリップボード内容で再選択   | Reselect with clipboard contents               |
| スペース(空白)を再選択    | Reselect the space(s)                          |
| 数字を再選択          | Reselect the number(s)                         |
| カンマを再選択         | Reselect the comma                             |
| 正規表現で1行を再選択     | Reselect lines by RegExp                       |

[いくつかの機能説明](FUNCTION.ja.md)


