# ezshare 🤝

A simple static file server that lets you easily share many big files like photos and videos with friends over a local network without requiring an internet connection. It starts an HTTP server that lists all files and directories in the directory where it is started from. Then anyone can then connect to the server and download files or automatically generated ZIP of whole directories (kind of like Google Drive.) The client can also upload files to the server via their browser.

![Demo](https://github.com/mifi/ezshare/raw/master/screenshot.png)

## Features
- Local transfers without going through internet
- Send full quality photos and videos to others without needing a fast internet connection
- Handles really big files and directories
- Handles a LOT of files
- Auto ZIP directories super fast
- The web client works on all major platforms, including iOS/Android.
- Allows both uploading and downloading of files

## Install (with Node.js / npm)

- Install [Node.js](https://nodejs.org) and open a terminal:

```bash
npm install -g ezshare
```

## Install (standalone)
If you don't want to install Node.js, you can download a zipped executable of `ezshare`:

- [Mac OS X](https://github.com/mifi/ezshare/releases/latest/download/ezshare-macos.zip)
- [Windows](https://github.com/mifi/ezshare/releases/latest/download/ezshare-win.zip)
- [Linux](https://github.com/mifi/ezshare/releases/latest/download/ezshare-linux.zip)

Then extract the executable and put it in a folder where you can run it from the command line. You may have to right click the icon and then press "Open" first (on Mac.)

## Usage

- Open a terminal and run:
- `cd /path/to/your/shared/folder`
- `ezshare`
- Open the browser in the other end to the printed URL
- Start to upload or download files to/from this folder!
- **Note** that the two devices need to be on the same WiFi (or possibly personal hotspot)

**Alternatively** you can pass it the path you want to share:
```
ezshare /your/shared/folder
```

For more info run `ezshare --help`

## Supported platforms
- The web client with all operating systems that have a modern browser. iOS, Android, Mac, Windows, ++
- The command line application works on all major desktop OS (Mac, Windows, Linux)

## TODO
- Improve name of uploaded file (include parts of original name)
- Allow select multiple files to download as zip

## See also:
- https://github.com/claudiodangelis/qr-filetransfer
- https://github.com/shivensinha4/qr-fileshare