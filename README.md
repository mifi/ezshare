# ezshare 🤝

A simple static file server that lets you easily share many big files like photos and videos with friends over a local network without requiring an internet connection. It starts an HTTP server that lists all files and directories in the directory where it is started from. Then anyone can then connect to the server and download files or automatically generated ZIP of whole directories (kind of like Google Drive.) The client can also upload files to the server via their browser.

## Features
- Local transfers without going through internet
- Handles really big files and directories
- Auto ZIP directories super fast
- The web client works on all major platforms, including iOS/Android.
- Allows both uploading and downloading of files

## Install

- Install [Node.js](https://nodejs.org) and open a terminal:

```bash
npm install -g ezshare
```

## Alterantive install
If you don't want to install Node.js, you can download a prebuilt zip of `ezshare`:

- [Mac OS X](https://github.com/mifi/ezshare/releases/latest/download/ezshare-macos.zip)
- [Windows](https://github.com/mifi/ezshare/releases/latest/download/ezshare-win.zip)
- [Linux](https://github.com/mifi/ezshare/releases/latest/download/ezshare-linux.zip)

Then extract the executable and put it in a directory where you can run it from the command line.

## Usage

- Open a terminal and run:
- `cd /path/to/your/shared/folder`
- `ezshare`
- Open the browser in the other end to the printed URL
- Start to upload or download files to/from this directory!

## Supported platforms
- The web client with all operating systems that have a modern browser. iOS, Android, Mac, Windows, ++
- The command line application works on all major desktop OS (Mac, Windows, Linux)

## TODO
- Make it look better, especially on mobile

## See also:
- https://github.com/http-party/http-server
