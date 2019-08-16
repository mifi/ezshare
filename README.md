# ezshare 🤝

A simple static file server that lets you easily share many big files like photos and videos with friends over a local network without requiring an internet connection. It starts a HTTP server that lists all files and directories in the directory where it is started from. Then anyone can then connect to the server and download files or automatically generated ZIP of whole directories (kind of like Google Drive.) The client can also upload files to the server via their browser.

## Install

```
npm install -g ezshare
```

## Usage

- Open a terminal and run:
- `cd /path/to/your/files`
- `ezshare`
- Find your local IP address (Use `ifconfig` or `ipconfig` or open your Network Settings)
- Open this URL on the other computer or phone: http://YOUR.LOCAL.IP:8080/
- Start to upload or download files!

## Supported platforms
Works with all operating systems that have a modern browser. iOS, Android, Mac, Windows, ++

## See also:
- https://github.com/http-party/http-server