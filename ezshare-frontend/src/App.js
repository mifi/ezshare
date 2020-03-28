import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';

import { Route } from 'react-router';
import { Switch, useLocation, Link } from 'react-router-dom';
import { FaFileArchive, FaFileAlt, FaFolder, FaFileUpload, FaSpinner, FaShareAlt, FaRedoAlt } from 'react-icons/fa';
import { useDropzone } from 'react-dropzone';
import Swal from 'sweetalert2';
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

const colorLink = '#d63447';

const linkStyle = {
  color: 'rgba(0,0,0,0.9)',
  minWidth: 50,
  textDecoration: 'none',
  wordBreak: 'break-all',
};

const fileRowStyle = { borderTop: '1px solid #d1cebd', margin: '4px 0', padding: '4px 0 2px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' };

const Uploader = ({ onUploadSuccess }) => {
  const [uploadProgress, setUploadProgress] = useState();

  const onDrop = useCallback((acceptedFiles) => {
    // console.log(acceptedFiles);
    const data = new FormData();
    acceptedFiles.forEach(file => data.append('files', file));

    function onUploadProgress(progressEvent) {
      setUploadProgress(progressEvent.loaded / progressEvent.total);
    }

    async function upload() {
      try {
        await axios.post('/api/upload', data, { onUploadProgress });

        Toast.fire({ icon: 'success', title: 'File(s) uploaded successfully' });
        onUploadSuccess();
      } catch (err) {
        console.error('Upload failed', err);
        Toast.fire({ icon: 'error', title: 'Upload failed, please try again' });
      } finally {
        setUploadProgress();
      }
    }

    upload();
  }, [onUploadSuccess]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  if (uploadProgress != null) {
    const percentage = Math.round(uploadProgress * 100);
    return (
      <div style={{ display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: 100 }}>
        <CircularProgressbar value={percentage} text={`${percentage}%`} />
      </div>
    </div>
    );
  }

  return (
    <div {...getRootProps()} style={{ outline: 'none', cursor: 'pointer', padding: '30px 0', border: `3px dashed ${isDragActive ? 'rgba(255,0,0,0.4)' : 'rgba(0,0,0,0.1)'}`, display: 'flex', justifyContent: 'center', alignItems: 'center', flexDirection: 'column' }}>
      <input {...getInputProps()} />

      <FaFileUpload size={50} style={{ color: 'rgba(0,0,0,0.2)' }} />

      <div style={{ marginTop: 20, padding: '0 30px' }}>
        {isDragActive ? 'Drop files here to upload' : 'Drag \' drop some files here, or click to select files to upload'}
      </div>
    </div>
  );
}

const getDownloadUrl = (path) => `/api/download?f=${encodeURIComponent(path)}&_=${new Date().getTime()}`;

const ZipDownload = ({ url }) => <a style={{ textDecoration: 'none', marginLeft: 10, marginBottom: -5, color: colorLink }} href={url} title="Download folder as ZIP"><FaFileArchive size={22} /></a>;

const FileRow = ({ path, isDir, fileName }) => {
  const Icon = isDir ? FaFolder : FaFileAlt;

  return (
    <div key={`${path}_${fileName}`} style={fileRowStyle}>
      <Icon size={16} style={{ color: 'rgba(0,0,0,0.5)', marginRight: 10 }} />
      {isDir ? (
        <Link to={{ pathname: '/', search: `?p=${encodeURIComponent(path)}`}} style={linkStyle}>{fileName}</Link>
      ) : (
        <a style={linkStyle} href={getDownloadUrl(path)}>{fileName}</a>
      )}

      <div style={{ flexGrow: 1 }} />

      {isDir && <ZipDownload url={getDownloadUrl(path)} />}
    </div>
  );
};

const Browser = () => {
  const [currentDirFiles, setCurrentDirFiles] = useState({ files: [] });

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

  return (
    <>
      <div style={{ position: 'fixed', top: 0, right: 0, left: 0, textAlign: 'center', backgroundColor: '#f57b51', borderBottom: '2px solid rgba(0,0,0,0.2)', color: 'white', fontSize: 36, padding: '10px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <FaSpinner className="icon-spin" style={{ visibility: !isLoadingDir ? 'hidden' : undefined, marginRight: 10 }} size={20} />

        {/* eslint-disable-next-line jsx-a11y/accessible-emoji */}
        <div>EzShare 🤝</div>
      </div>

      <div style={{ width: '100%', maxWidth: 600, margin: '100px auto 30px auto', boxSizing: 'border-box', padding: '10px 15px 15px 15px', background: 'white', boxShadow: 'rgba(0,0,0,0.03) 0 0 12px 10px', borderRadius: 5 }}>
        <h2>Upload files</h2>
        <Uploader onUploadSuccess={handleUploadSuccess} />

        <div>
          <h2>Download files</h2>

          <div style={{ wordBreak: 'break-all', padding: '0 5px 8px 5px', fontSize: '.85em', color: 'rgba(0,0,0,0.3)', display: 'flex', justifyContent: 'space-between' }}>
            <FaShareAlt size={10} style={{ marginRight: 10 }} />
            {currentDirFiles.sharedPath}
            <div style={{ flexGrow: 1 }} />
            <FaRedoAlt size={12} role="button" style={{ color: colorLink, cursor: 'pointer', padding: '5px 1px 5px 5px' }} onClick={handleRefreshClick} />
          </div>

          <div style={{ ...fileRowStyle }}>
            <div style={{ wordBreak: 'break-all', fontWeight: 500 }}>{currentDirFiles.curRelPath}</div>
            <ZipDownload url={getDownloadUrl(currentDirFiles.curRelPath)} />
          </div>

          {dirs.map(FileRow)}
          {nonDirs.map(FileRow)}
        </div>
      </div>

      {/* eslint-disable-next-line jsx-a11y/accessible-emoji */}
      <div style={{ textAlign: 'center', marginBottom: 10 }}><a href={'https://mifi.no'} style={{ textDecoration: 'none', fontWeight: 'bold', color: 'black' }}>More apps by mifi.no ❤️</a></div>
    </>
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
