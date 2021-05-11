import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

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
})

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

const linkStyle = {
  color: 'rgba(0,0,0,0.9)',
  minWidth: 50,
  textDecoration: 'none',
  wordBreak: 'break-all',
};

const fileRowStyle = { borderTop: '1px solid #d1cebd', margin: '4px 0', padding: '4px 0 2px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' };

const Section = ({ children, style }) => (
  <div style={{ boxSizing: 'border-box', width: '100%', maxWidth: 600, marginLeft: 'auto', marginRight: 'auto', marginBottom: 50, padding: '20px 15px 25px 15px', borderRadius: 5, ...style }}>
    {children}
  </div>
);

const Uploader = ({ onUploadSuccess }) => {
  const [uploadProgress, setUploadProgress] = useState();
  const [uploadSpeed, setUploadSpeed] = useState();

  const onDrop = useCallback((acceptedFiles, rejectedFiles) => {
    // console.log(acceptedFiles);

    if (rejectedFiles && rejectedFiles.length > 0) {
      Toast.fire({ icon: 'warning', title: 'Some file was not accepted' });
    }

    async function upload() {
      let dataTotal;
      let dataLoaded;
      let startTime;

      try {
        // Toast.fire({ title: `${acceptedFiles.length} ${rejectedFiles.length}` });
        setUploadProgress(0);
        const data = new FormData();
        acceptedFiles.forEach((file) => data.append('files', file));
    
        function onUploadProgress(progressEvent) {
          dataTotal = progressEvent.total;
          dataLoaded = progressEvent.loaded;
          if (!startTime && dataLoaded) startTime = new Date().getTime();
          setUploadProgress(dataLoaded / dataTotal);
          if (dataLoaded && startTime) setUploadSpeed(dataLoaded / ((new Date().getTime() - startTime) / 1000));
        }

        await axios.post('/api/upload', data, { onUploadProgress });

        Toast.fire({ icon: 'success', title: 'File(s) uploaded successfully' });
        onUploadSuccess();
      } catch (err) {
        console.error('Upload failed', err);
        const message = err.response?.data?.error?.message || err.message;
        Toast.fire({ icon: 'error', title: `Upload failed: ${message}` });
      } finally {
        setUploadProgress();
        setUploadSpeed();
      }
    }

    upload();
  }, [onUploadSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  if (uploadProgress != null) {
    const percentage = Math.round(uploadProgress * 100);
    return (
      <div style={{ display: 'flex', alignItems: 'center', flexDirection: 'column' }}>
      <div style={{ width: 100 }}>
        <CircularProgressbar value={percentage} text={`${percentage}%`} />
      </div>
      {uploadSpeed && <div>{(uploadSpeed / 1e6).toFixed(2)}MB/s</div>}
    </div>
    );
  }

  return (
    <div {...getRootProps()} style={{ outline: 'none',  background: boxBackgroundColor, cursor: 'pointer', padding: '30px 0', border: `3px dashed ${isDragActive ? 'rgba(255,0,0,0.4)' : 'rgba(0,0,0,0.1)'}`, borderRadius: 10, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
      <input {...getInputProps()} />

      <FaFileUpload size={50} style={{ color: iconColor }} />

      <div style={{ marginTop: 20, padding: '0 30px' }}>
        {isDragActive ? 'Drop files here to upload' : 'Drag \'n drop some files here, or press to select files to upload'}
      </div>
    </div>
  );
}

const getDownloadUrl = (path, forceDownload) => `/api/download?f=${encodeURIComponent(path)}&forceDownload=${forceDownload ? 'true' : 'false'}&_=${new Date().getTime()}`;

const FileDownload = ({ url }) => <a style={{ textDecoration: 'none', marginLeft: 10, marginBottom: -5, color: colorLink }} href={url} title="Download file"><FaFileDownload size={22} /></a>;
const ZipDownload = ({ url }) => <a style={{ textDecoration: 'none', marginLeft: 10, marginBottom: -5, color: colorLink2 }} href={url} title="Download folder as ZIP"><FaFileArchive size={22} /></a>;

const FileRow = ({ path, isDir, fileName }) => {
  const Icon = isDir ? FaFolder : FaFileAlt;

  return (
    <div key={`${path}_${fileName}`} style={fileRowStyle}>
      <Icon size={16} style={{ color: 'rgba(0,0,0,0.5)', marginRight: 10 }} />
      {isDir ? (
        <>
          <Link to={{ pathname: '/', search: `?p=${encodeURIComponent(path)}`}} style={linkStyle}>{fileName} {fileName === '..' && <span style={{ color: 'rgba(0,0,0,0.3)' }}>(parent dir)</span>}</Link>
          <div style={{ flexGrow: 1 }} />
          <ZipDownload url={getDownloadUrl(path)} />
        </>
      ) : (
        <>
          <a style={linkStyle} target="_blank" rel="noopener noreferrer" href={getDownloadUrl(path)}>{fileName}</a>
          <div style={{ flexGrow: 1 }} />
          <FileDownload url={getDownloadUrl(path, true)} />
        </>
      )}
    </div>
  );
};

const Browser = () => {
  const [currentDirFiles, setCurrentDirFiles] = useState({ files: [] });
  const [clipboardText, setClipboardText] = useState();
  const [saveAsFile, setSaveAsFile] = useState(false);

  const urlSearchParams = useQuery();
  const rootPath = '/'
  const currentPath = urlSearchParams.get('p') || rootPath;

  const isLoadingDir = currentPath !== currentDirFiles.curRelPath;
  const isInRootDir = currentPath === rootPath;

  const loadCurrentPath = useCallback(async () => {
    try {
      const response = await axios.get('/api/browse', { params: { p: currentPath} });
      setCurrentDirFiles(response.data);
    } catch (err) {
      console.error(err);
    }
  }, [currentPath]);

  useEffect(() => {
    loadCurrentPath();
  }, [loadCurrentPath]);

  function handleUploadSuccess() {
    if (isInRootDir) loadCurrentPath();
  }

  function handleRefreshClick() {
    loadCurrentPath();
  }

  const dirs = currentDirFiles.files.filter(f => f.isDir);
  const nonDirs = currentDirFiles.files.filter(f => !f.isDir);

  async function onPaste(e) {
    e.preventDefault();
    e.target.blur();

    try {
      const clipboardData = e.clipboardData.getData('Text');
      const data = new URLSearchParams();
      data.append('clipboard', clipboardData);
      data.append('saveAsFile', saveAsFile);
      await axios.post('/api/paste', data);

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

  function onClipboardCopySuccess() {
    Toast.fire({ icon: 'success', title: 'Text has been copied from the other side\'s clipboard' });
    setClipboardText();
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
                  <Clipboard data-clipboard-text={clipboardText} onSuccess={onClipboardCopySuccess} style={{ padding: 5, flexGrow: 1 }}>
                    Copy to clipboard
                  </Clipboard>
                  <button onClick={() => setClipboardText()} type="button" style={{ padding: 5, flexGrow: 1 }}>Cancel</button>
                </div>
              </motion.div>
            ) : (
              <button onClick={onGetClipboard} type="button" style={{ padding: 10, width: '100%', boxSizing: 'border-box', backgroundColor: colorLink, border: 'none', borderRadius: 6, color: 'white', fontWeight: 'bold', fontSize: 17 }}>Fetch clipboard from other side</button>
            )}
          </AnimatePresence>
        </div>
      </Section>

      <Section>
        <h2>Upload files</h2>
        <Uploader onUploadSuccess={handleUploadSuccess} />
      </Section>

      <Section>
        <h2>Download files</h2>

        <div style={{ wordBreak: 'break-all', padding: '0 5px 8px 5px', fontSize: '.85em', color: 'rgba(0,0,0,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <FaShareAlt size={10} style={{ marginRight: 10 }} />
          {currentDirFiles.sharedPath}
          <div style={{ flexGrow: 1 }} />
          <FaRedoAlt size={12} role="button" style={{ color: colorLink, cursor: 'pointer', padding: '5px 1px 5px 5px' }} onClick={handleRefreshClick} />
        </div>

        <div style={{ ...fileRowStyle }}>
          <div style={{ wordBreak: 'break-all', fontWeight: 500 }}>{currentDirFiles.curRelPath} <span style={{ color: 'rgba(0,0,0,0.3)' }}>(current dir)</span></div>
          <ZipDownload url={getDownloadUrl(currentDirFiles.curRelPath)} />
        </div>

        {dirs.map(FileRow)}
        {nonDirs.map(FileRow)}
      </Section>

      {/* eslint-disable-next-line jsx-a11y/accessible-emoji */}
      <div style={{ textAlign: 'center', marginBottom: 50 }}><a href={'https://mifi.no'} style={{ textDecoration: 'none', fontWeight: '400', color: 'black' }}>More apps by mifi.no ❤️</a></div>
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
