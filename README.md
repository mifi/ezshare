# ezshare 🤝

A simple static file server that lets you easily share many big files like photos and videos with friends over a local network without requiring an internet connection. It starts a HTTP server that lists all files and directories in the directory where it is started from. Then anyone can then connect to the server and download files or automatically generated ZIP of whole directories (kind of like Google Drive.) The client can also upload files to the server via their browser.

## Install

- Install [Node.js](https://nodejs.org) and open a terminal:

```
npm install -g ezshare
```

## Usage

- Open a terminal and run:
- `cd /path/to/your/shared/files`
- `ezshare`
- Open the browser in the other end to the printed URL
- Start to upload or download files!

## Supported platforms
Works with all operating systems that have a modern browser. iOS, Android, Mac, Windows, ++

## TODO
- Make it look better, esp on phones
- Package to exe files that build automatically on Travis using [pkg](https://www.npmjs.com/package/pkg)/[nexe](https://www.npmjs.com/package/nexe)

## See also:
- https://github.com/http-party/http-server
