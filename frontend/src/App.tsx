import { useState, useEffect, useCallback, ReactNode, CSSProperties, ChangeEventHandler, ClipboardEvent } from 'react';
import axios, { AxiosError } from 'axios';

import { Route } from 'react-router';
import { Switch, useLocation, Link } from 'react-router-dom';
import { FaFileArchive, FaFileDownload, FaFileAlt, FaFolder, FaFileUpload, FaSpinner, FaShareAlt, FaRedoAlt } from 'react-icons/fa';
import { useDropzone } from 'react-dropzone';
import Swal from 'sweetalert2';
import Clipboard from 'react-clipboard.js';
import { motion, AnimatePresence } from 'framer-motion';

import { CircularProgressbar } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';

const Toast = Swal.mixin({
  toast: true,
  showConfirmButton: false,
  timer: 3000,
  position: 'top',
});

// A custom hook that builds on useLocation to parse
// the query string for you.
function useQuery() {
  return new URLSearchParams(useLocation().search);
}

const colorLink = '#db6400';
const colorLink2 = '#ffa62b';

const boxBackgroundColor = '#fff';
const headingBackgroundColor = '#16697a';
const iconColor = '#ffa62b'; // 'rgba(0,0,0,0.3)'

const linkStyle: CSSProperties = {
  color: 'rgba(0,0,0,0.9)',
  minWidth: 50,
  textDecoration: 'none',
  wordBreak: 'break-all',
};

const fileRowStyle = { borderTop: '1px solid #d1cebd', margin: '4px 0', padding: '4px 0 2px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' };

const Section = ({ children, style }: { children: ReactNode, style?: CSSProperties }) => (
  <div style={{ boxSizing: 'border-box', width: '100%', maxWidth: 600, marginLeft: 'auto', marginRight: 'auto', marginBottom: 40, borderRadius: 5, ...style }}>
    {children}
  </div>
);

const Uploader = ({ onUploadSuccess, cwd }: {
  onUploadSuccess: () => void,
  cwd: string,
}) => {
  const [uploadProgress, setUploadProgress] = useState<number>();
  const [uploadSpeed, setUploadSpeed] = useState<number>();

  const onDrop = useCallback((acceptedFiles: File[], rejectedFiles: File[]) => {
    // console.log(acceptedFiles);

    if (rejectedFiles && rejectedFiles.length > 0) {
      Toast.fire({ icon: 'warning', title: 'Some file was not accepted' });
    }

    async function upload() {
      let dataTotal: number;
      let dataLoaded: number;
      let startTime: number;

      try {
        // Toast.fire({ title: `${acceptedFiles.length} ${rejectedFiles.length}` });
        setUploadProgress(0);
        const data = new FormData();
        acceptedFiles.forEach((file) => data.append('files', file));

        const onUploadProgress = (progressEvent: ProgressEvent) => {
          dataTotal = progressEvent.total;
          dataLoaded = progressEvent.loaded;
          if (!startTime && dataLoaded) startTime = Date.now();
          setUploadProgress(dataLoaded / dataTotal);
          if (dataLoaded && startTime) setUploadSpeed(dataLoaded / ((Date.now() - startTime) / 1000));
        };

        await axios.post(`/api/upload?path=${encodeURIComponent(cwd)}`, data, { onUploadProgress });

        Toast.fire({ icon: 'success', title: 'File(s) uploaded successfully' });
        onUploadSuccess();
      } catch (err) {
        console.error('Upload failed', err);
        const message = (err instanceof AxiosError && err.response?.data.error.message) || (err as Error).message;
        Toast.fire({ icon: 'error', title: `Upload failed: ${message}` });
      } finally {
        setUploadProgress(undefined);
        setUploadSpeed(undefined);
      }
    }

    upload();
  }, [cwd, onUploadSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  if (uploadProgress != null) {
    const percentage = Math.round(uploadProgress * 100);
    return (
      <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
        <div style={{ width: 100 }}>
          {/* @ts-expect-error todo */}
          <CircularProgressbar value={percentage} text={`${percentage}%`} />
        </div>
        {uploadSpeed && <div>{(uploadSpeed / 1e6).toFixed(2)}MB/s</div>}
      </div>
    );
  }

  return (
    // eslint-disable-next-line react/jsx-props-no-spreading
    <div {...getRootProps()} style={{ outline: 'none', background: boxBackgroundColor, cursor: 'pointer', padding: '30px 0', border: `3px dashed ${isDragActive ? 'rgba(255,0,0,0.4)' : 'rgba(0,0,0,0.1)'}`, borderRadius: 10, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', marginBottom: '.5em' }}>
      {/* eslint-disable-next-line react/jsx-props-no-spreading */}
      <input {...getInputProps()} />

      <FaFileUpload size={50} style={{ color: iconColor }} />

      <div style={{ marginTop: 20, padding: '0 30px' }}>
        {isDragActive ? 'Drop files here to upload' : 'Drag \'n drop some files here, or press to select files to upload'}
      </div>
    </div>
  );
};

const getDownloadUrl = (path: string, forceDownload?: boolean) => `/api/download?f=${encodeURIComponent(path)}&forceDownload=${forceDownload ? 'true' : 'false'}&_=${Date.now()}`;

const FileDownload = ({ url }: { url: string }) => <a style={{ textDecoration: 'none', marginLeft: 10, marginBottom: -5, color: colorLink }} href={url} title="Download file"><FaFileDownload size={22} /></a>;
const ZipDownload = ({ url, title = 'Download folder as ZIP', style }: { url: string, title?: string, style?: CSSProperties }) => <a style={{ textDecoration: 'none', color: colorLink2, verticalAlign: 'middle', ...style }} href={url} title={title}><FaFileArchive size={22} /></a>;

let sizeCounter: number = 0;

const sizeMeter: { [key: number]: string } = {
  0: 'KB',
  1: 'MB',
  2: 'GB',
  3: 'TB'
};

// Format the byte
const manageByte = (num: number): string | number => {
  if (!num) return 0;
  let res: number = num / 1024;

  if (res > 1000) {
    sizeCounter++;
    return manageByte(res);
  } else {
    const value: number = sizeCounter;
    sizeCounter = 0;
    return res.toFixed(2) + sizeMeter[value];
  }
}


const FileRow = ({ path, isDir, fileName, onCheckedChange, checked }: {
  path: string,
  isDir: boolean,
  fileName: string,
  onCheckedChange?: ChangeEventHandler<HTMLInputElement>,
  checked?: boolean | undefined,
  size?: number | undefined,
}) => {
  const Icon = isDir ? FaFolder : FaFileAlt;

  return (
    <div style={fileRowStyle}>
      <Icon size={16} style={{ color: 'rgba(0,0,0,0.5)', marginRight: 10 }} />
      {isDir ? (
        <>
          <Link to={{ pathname: '/', search: `?p=${encodeURIComponent(path)}` }} style={linkStyle}>{fileName} {fileName === '..' && <span style={{ color: 'rgba(0,0,0,0.3)' }}>(parent dir)</span>}</Link>
          <div style={{ flexGrow: 1 }} />
          <span style={{ marginRight: '.2em' }} > {size && manageByte(size)} </span>
          <ZipDownload url={getDownloadUrl(path)} style={{ marginLeft: 10, marginBottom: -5 }} />
        </>
      ) : (
        <>
          <a style={linkStyle} target="_blank" rel="noopener noreferrer" href={getDownloadUrl(path)}>{fileName}</a>
          <div style={{ flexGrow: 1 }} />
          <span style={{ marginRight: '.2em' }} > {size && manageByte(size)} </span>
          {onCheckedChange != null && <input type="checkbox" className="inputcheckbox" checked={checked} onChange={onCheckedChange} />}
          <FileDownload url={getDownloadUrl(path, true)} />
        </>
      )}
    </div>
  );
};

const Browser = () => {
  const [currentDirFiles, setCurrentDirFiles] = useState<{ sharedPath?: string, files: { path: string, isDir: boolean, fileName: string }[], cwd: string }>({ files: [], cwd: '/' });
  const [clipboardText, setClipboardText] = useState();
  const [saveAsFile, setSaveAsFile] = useState(false);
  const [selectedFilesMap, setSelectedFilesMap] = useState<Record<string, boolean>>({});

  const urlSearchParams = useQuery();
  const rootPath = '/';
  const currentPath = urlSearchParams.get('p') || rootPath;

  const isLoadingDir = currentPath !== currentDirFiles.cwd;
  const isInRootDir = currentPath === rootPath;

  const loadCurrentPath = useCallback(async () => {
    try {
      const response = await axios.get('/api/browse', { params: { p: currentPath } });
      setCurrentDirFiles(response.data);
      let responseWithSize = await axios.get('/api/browse-withsize', { params: { p: currentPath } });
      setCurrentDirFiles(responseWithSize.data);
    } catch (err) {
      console.error(err);
    }
  }, [currentPath]);

  useEffect(() => {
    loadCurrentPath();
  }, [loadCurrentPath]);

  const handleUploadSuccess = useCallback(() => {
    if (isInRootDir) loadCurrentPath();
  }, [isInRootDir, loadCurrentPath]);

  const handleRefreshClick = useCallback(() => {
    loadCurrentPath();
  }, [loadCurrentPath]);

  const dirs = currentDirFiles.files.filter((f) => f.isDir);
  const nonDirs = currentDirFiles.files.filter((f) => !f.isDir);

  const selectedFiles = Object.entries(selectedFilesMap).flatMap(([key, value]) => (value ? [key] : []));

  async function onPaste(e: ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    // @ts-expect-error todo
    e.target.blur();

    try {
      const clipboardData = e.clipboardData.getData('Text');
      const data = new URLSearchParams();
      data.append('clipboard', clipboardData);
      data.append('saveAsFile', String(saveAsFile));
      await axios.post('/api/paste', data);
      loadCurrentPath();

      Toast.fire({ icon: 'success', title: saveAsFile ? 'Pasted text has been saved to a file on other side' : 'Pasted text has been sent to the clipboard on other side' });
    } catch (err) {
      console.error(err);
      Toast.fire({ icon: 'error', title: 'Paste clipboard failed' });
    }
  }

  async function onGetClipboard() {
    try {
      const response = await axios.post('/api/copy');

      setClipboardText(response.data);
    } catch (err) {
      console.error(err);
      Toast.fire({ icon: 'error', title: 'Copy clipboard failed' });
    }
  }

  const onClipboardCopySuccess = useCallback(() => {
    Toast.fire({ icon: 'success', title: 'Text has been copied from the other side\'s clipboard' });
    setClipboardText(undefined);
  }, []);

  function handleFileSelect(path: string, checked: boolean) {
    if (checked) {
      setSelectedFilesMap((existing) => ({
        ...existing,
        [path]: true,
      }));
    } else {
      setSelectedFilesMap((existing) => {
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { [path]: _removed, ...newSelectedFilesMap } = existing;
        return newSelectedFilesMap;
      });
    }
  }


  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
      <div style={{ position: 'fixed', top: 0, right: 0, left: 0, textAlign: 'center', backgroundColor: headingBackgroundColor, borderBottom: '2px solid rgba(0,0,0,0.2)', color: 'white', fontSize: 36, padding: '10px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FaSpinner className="icon-spin" style={{ visibility: !isLoadingDir ? 'hidden' : undefined, marginRight: 10 }} size={20} />

        {/* eslint-disable-next-line jsx-a11y/accessible-emoji */}
        <div>EzShare 🤝</div>
      </div>

      <Section style={{ marginTop: 100 }}>
        <h2>Clipboard</h2>

        <div style={{ margin: 'auto', maxWidth: 350, width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column', flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%', marginBottom: 10 }}>
            <input type="text" onPaste={onPaste} placeholder="Paste here to send clipboard" style={{ display: 'block', width: '100%', boxSizing: 'border-box', textAlign: 'center', padding: '10px 0', border: '1px solid rgba(0,0,0,0.3)', fontFamily: 'inherit', fontSize: 15, borderRadius: 6 }} />
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control */}
            <div style={{ whiteSpace: 'nowrap' }}><input id="saveAsFile" type="checkbox" onChange={(e) => setSaveAsFile(e.target.checked)} checked={saveAsFile} style={{ marginLeft: 10, verticalAlign: 'middle' }} /> <label htmlFor="saveAsFile" style={{ verticalAlign: 'middle' }}>Save as file</label></div>
          </div>

          <AnimatePresence>
            {clipboardText ? (
              <motion.div
                key="div"
                style={{ width: '100%', originY: 0, padding: 10, boxSizing: 'border-box' }}
                initial={{ scaleY: 0, opacity: 0 }}
                animate={{ scaleY: 1, opacity: 1 }}
                exit={{ scaleY: 0, opacity: 0 }}
              >
                <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', alignSelf: 'stretch', background: 'rgba(0,0,0,0.04)', borderRadius: 5, padding: 5, margin: '10px 0', textAlign: 'center', boxSizing: 'border-box' }}>{clipboardText}</div>

                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', width: '100%' }}>
                  {/* @ts-expect-error todo */}
                  <Clipboard data-clipboard-text={clipboardText} onSuccess={onClipboardCopySuccess} style={{ padding: 5, flexGrow: 1 }}>
                    Copy to clipboard
                  </Clipboard>
                  <button onClick={() => setClipboardText(undefined)} type="button" style={{ padding: 5, flexGrow: 1 }}>Cancel</button>
                </div>
              </motion.div>
            ) : (
              <button onClick={onGetClipboard} type="button" style={{ padding: 10, width: '100%', boxSizing: 'border-box', backgroundColor: colorLink, border: 'none', borderRadius: 6, color: 'white', fontWeight: 'bold', fontSize: 17 }}>Fetch clipboard from other side</button>
            )}
          </AnimatePresence>
        </div>
      </Section>

      <Section>
        <h2>Files</h2>

        <Uploader cwd={currentDirFiles.cwd} onUploadSuccess={handleUploadSuccess} />

        <div style={{ wordBreak: 'break-all', padding: '0 5px 8px 5px', fontSize: '.85em', color: 'rgba(0,0,0,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <FaShareAlt size={10} style={{ marginRight: 5, marginLeft: 5 }} />
          <span title="Shared folder">{currentDirFiles.sharedPath}</span>
          <div style={{ flexGrow: 1 }} />
          <FaRedoAlt size={12} role="button" title="Refresh" style={{ color: colorLink, cursor: 'pointer', padding: '5px 1px 5px 5px' }} onClick={handleRefreshClick} />
        </div>

        <div style={{ ...fileRowStyle }}>
          <div style={{ wordBreak: 'break-all', fontWeight: 500 }}>{currentDirFiles.cwd} <span style={{ color: 'rgba(0,0,0,0.3)' }}>(current dir)</span></div>

          {selectedFiles.length > 0 ? (
            <span>
              <span style={{ marginRight: '.2em' }}>{selectedFiles.length} selected</span>
              <input type="checkbox" checked onChange={() => setSelectedFilesMap({})} style={{ marginRight: '1em' }} />
              <ZipDownload url={`/api/zip-files?files=${encodeURIComponent(JSON.stringify(selectedFiles))}&_=${Date.now()}`} title="Download selected as ZIP" style={{ marginBottom: -5 }} />
            </span>
          ) : (
            <ZipDownload url={getDownloadUrl(currentDirFiles.cwd)} style={{ marginLeft: 10, marginBottom: -5 }} />
          )}
        </div>

        {/* eslint-disable-next-line react/jsx-props-no-spreading */}
        {dirs.map((props) => <FileRow key={props.path} {...props} />)}
        {nonDirs.map((props) => {
          const { path } = props;
          // eslint-disable-next-line react/jsx-props-no-spreading
          return <FileRow key={path} {...props} checked={selectedFilesMap[path]} onCheckedChange={(e) => handleFileSelect(path, e.target.checked)} />;
        })}
      </Section>

      {/* eslint-disable-next-line jsx-a11y/accessible-emoji */}
      <div style={{ textAlign: 'center', marginBottom: 50 }}><a href="https://mifi.no" style={{ textDecoration: 'none', fontWeight: '400', color: 'black' }}>More apps by mifi.no ❤️</a></div>
    </div>
  );
};

function App() {
  return (
    <div>
      <Switch>
        <Route path="/">
          <Browser />
        </Route>
      </Switch>
    </div>
  );
}

export default App;
