# ezshare 🤝

A simple **file server** that lets you easily share many big files like photos and videos with friends (or between your devices) over a local network without requiring an internet connection. It starts an HTTP server that lists all files and directories in the directory where it is started from. Then anyone can then connect to the server and download files or automatically generated ZIP of whole directories (kind of like Google Drive.) The client can also upload files to the server via their browser. A QR code is generated for ease of use.

![Demo](https://github.com/mifi/ezshare/raw/master/screenshot.png)

## Features
- Local two-way transfers without going through the internet
- Send full quality photos and videos to others without needing a fast internet connection
- Handles really big files and directories
- Handles a LOT of files
- Auto ZIPs directories on-the-fly
- Two-way sharing of clipboard
- The web client works on all major platforms, including iOS and Android (server must run on a Mac/Windows/Linux computer)

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

## See also:
- https://github.com/claudiodangelis/qr-filetransfer
- https://github.com/shivensinha4/qr-fileshare

---

Made with ❤️ in 🇳🇴

[More apps by mifi.no](https://mifi.no/)

Follow me on [GitHub](https://github.com/mifi/), [YouTube](https://www.youtube.com/channel/UC6XlvVH63g0H54HSJubURQA), [IG](https://www.instagram.com/mifi.no/), [Twitter](https://twitter.com/mifi_no) for more awesome content!
