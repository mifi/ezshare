#!/bin/bash
mkdir -p pkg/macos pkg/win/ezshare pkg/linux/ezshare
cp node_modules/clipboardy/fallbacks/windows/clipboard_x86_64.exe pkg/win/ezshare/clipboard.exe
cp node_modules/clipboardy/fallbacks/linux/xsel pkg/linux/ezshare/clipboard
#rm -r node_modules/clipboardy/fallbacks
yarn pkg -t node18-win-x64,node18-macos-arm64,node18-linux-x64 .
mv ezshare-win.exe pkg/win/ezshare/ezshare.exe
mv ezshare-linux pkg/linux/ezshare/ezshare
mv ezshare-macos pkg/macos/ezshare
(cd win && zip -r ../ezshare-win.zip ezshare)
(cd macos && zip ../ezshare-macos.zip ezshare)
(cd linux && zip -r ../ezshare-linux.zip ezshare)
