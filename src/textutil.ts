'use strict';

/** 正規表現のパターンと一致したリストを得る */
export function GetIndex(text: string, pattern: string) {
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
export function MakeBracketRangeList(text: string) {
    var re = new RegExp('\{\}', "g");
    var coordinates = [];

    if (text.length == 0) return coordinates;
    while (true) {
        var match = re.exec(text);
        if (match == null || match[0].length == 0) break;

        let start = match.index;
        let end = start + match[0].length;
        coordinates.push([start, end]);
    }

    return coordinates;
}

/** 選択位置の追加 */
function PushCoordinate(coordinates: Array<Array<number>>, start: number, end: number) {
    // 開始と終了が同じ場合は選択しない
    if (start == end) return;
    coordinates.push([start, end]);
}


/** 正規表現を区切りとした範囲を得る */
export function GetRangeFromSeperator(text: string, seperator: string) {
    var re = new RegExp(seperator, "g");
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