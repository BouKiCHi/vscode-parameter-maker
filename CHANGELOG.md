# CHANGELOG

### 0.5.2
 - Fixed: "Reselect with Comma Delimiter"

### 0.5.1
- Added: "Paste as quoted parameter(Line Breaks Per N)"
- Added: "Paste with delimiter and count"
  - Added the ability to paste clipboard contents by combining them with a specified delimiter and a specified number of items.
- Added: "Reselect with Comma Delimiter"

### 0.5.0
- Improved: Enhanced MergeNLinesWithDelimiter command to handle escape sequences and null delimiter.
  - Added the ability to use escape sequences (e.g., \t, \n, \r) when specifying the delimiter.
  - MergeNLines can join lines without delimiter by using null
  - Added UnescapeText function to textutil.ts to handle escape sequence conversion.

### 0.4.10
- Added input value restoration for "Replace selected text with a pattern"

### 0.4.9
- Added "Replace selected text with a pattern"

### 0.4.8
- Added menu "Template embedding (comma-separated)"

### 0.4.7
- Changed place of documtents.
- Added menu "Show Help"
- Improved some menu text.

### 0.4.6
- Added "Paste with Commas Separating Each Line"
- Added "Convert space-separated to tab-separated values
- Improved some menu text.


### 0.4.5
 - Added "Reselect lines by RegExp"

### 0.4.4
 - Fixed "Reselect the number(s)" to allow users to reselect numbers from a single character.

### 0.4.3
 - Added "Reselect the comma"
 - Added "Copy as tab-delimited (from comma-delimited)"
 - Improved "Reselect the number(s)" feature to allow underscores and dots to be reselected. 
 - Improved "Reselect multiple choices N times."

### 0.4.2
 - Changed some features title like "Paste as parameter" to "Paste as quoted parameter"
 - Added "Paste as parameter" for comma separation.

 - Added "Reselect the space(s)"
 - Added "Reselect the number(s)"
 - Added "Convert comma-separated values to tab-separated values"
 - Added "to double quote(from single quote)"
 - Added "Show the number of selected lines."
 - Changed the order of menu items and groups.

### 0.4.1
 - Added "Replace double quote to single quote"

### 0.4.0
 - Added "Embed clipboard contents into a template"
 - Added "Reselect with clipboard contents"
 - Added a workaround to fix a temporary issue with the selection feature.

### 0.3.8
 - Fixed a bug that empty lines are selected
 - Added the function "Reselect every N multiple selections"

### 0.3.7
- Adjustment of menu item position.

### 0.3.6
- Added the function "Reselect outer of quotes"
- Improved behavior when cursor of "Merge N lines into one line" and "Copy the selected text N times"
### 0.3.5
- Added some context menus.

### 0.3.4
- Added the function "Reselect {} bracket"
- Added the function "Insert clipboard contents with pattern"

### 0.3.3
- Rename the function "Perform range selection with regular expression delimitation" to "Reselect with input delimiter"
- Added the function "Combine and insert clipboard contents"
- Added the function "Reselect with input delimiter"
- Added the function "Split words and Parameterize"
- Improved the last value of "Parameterize the clipboard contents".

### 0.3.2
- Added the icon.
### 0.3.1
- Added the function "Reselect with delimiter"

### 0.3.0
- Added the function "Select inside of quotes." 
- Added the function "Parameterize the clipboard contents." 
- Added an items to the context menu.

### 0.2.2
- Added the function "Copy selected text as many lines as there are lines in the clipboard."
- Fixed a bug in "Split and Reselect words in the selected text".
- Implemented to select if text has {} in copy functions('Copy the selected text N times' or 'Copy selected text as many lines as there are lines in the clipboard.')

### 0.2.1
- Fixed a bug that prevented launching from the menu.

### 0.2.0
- Changed the text of some menu items.
- Added the following functions.
 "Parameterize selection by settings", "Reselect selected text by regular expression", "Parameterize selection by input string".

### 0.1.6
- Improved "Copy Selection N times" to use the number of lines in the clipboard as the default.

### 0.1.4
- Added command "Select Text By Line"

### 0.1.2
- Added command "Filter Selection by Index In Line"

### 0.1.1
- Added command "Make Selections with RegExp separator"
- Adjusted some messages.

### 0.1.0
- Rebuilded all commands to use easy

### 0.0.4
- Added commmand "Selected Multiline Text to Selections"
- Added command "Copy Selected Text N Times"

### 0.0.3
- Improved command name.
- Changed behavior of join parameters.
- Added join at a line command.
- Added comma to line ends command.

### 0.0.2
- Added MultiLine commands.
- Added fixed seperator commands.

### 0.0.1
- Initial release