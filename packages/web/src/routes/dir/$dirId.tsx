import { createFileRoute, Outlet, Link, useNavigate } from '@tanstack/react-router';
import axios from 'axios';
import { useState, useCallback, useMemo, useEffect, ReactNode, CSSProperties, ChangeEventHandler, ClipboardEvent } from 'react';

import { FaFileArchive, FaFileDownload, FaFileAlt, FaFolder, FaSpinner, FaShareAlt, FaRedoAlt } from 'react-icons/fa';
import Clipboard from 'react-clipboard.js';
import { motion, AnimatePresence } from 'framer-motion';

import { colorLink, colorLink2, getDownloadUrl, getThumbUrl, headingBackgroundColor, mightBeImage, mightBeVideo, rootPath, Toast, CurrentDir, Context } from '../../util';
import Uploader from '../../Uploader';


// eslint-disable-next-line import/prefer-default-export
export const Route = createFileRoute('/dir/$dirId')({
  // eslint-disable-next-line no-use-before-define
  component: Browser,
});

const linkStyle: CSSProperties = {
  color: 'rgba(0,0,0,0.9)',
  textDecoration: 'none',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
};

const fileRowStyle = { borderTop: '1px solid #d1cebd', margin: '4px 0', padding: '4px 0 2px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' };

const Section = ({ children, style }: { children: ReactNode, style?: CSSProperties }) => (
  <div style={{ boxSizing: 'border-box', width: '100%', maxWidth: 600, marginLeft: 'auto', marginRight: 'auto', marginBottom: 40, borderRadius: 5, ...style }}>
    {children}
  </div>
);

const FileDownload = ({ url, style }: { url: string, style?: CSSProperties }) => (
  <a style={{ textDecoration: 'none', color: colorLink, ...style }} href={url} title="Download file"><FaFileDownload size={22} style={{ display: 'block' }} /></a>
);

const ZipDownload = ({ url, title = 'Download folder as ZIP', style }: { url: string, title?: string, style?: CSSProperties }) => (
  <a style={{ textDecoration: 'none', color: colorLink2, ...style }} href={url} title={title}><FaFileArchive size={22} style={{ display: 'block' }} /></a>
);

const iconSize = '2em';
const iconStyle = { flexShrink: 0, color: 'rgba(0,0,0,0.5)', marginRight: '.5em', width: iconSize, height: iconSize };

function FileRow({ path, isDir, fileName, onCheckedChange, checked, onFileClick }: {
  path: string,
  isDir: boolean,
  fileName: string,
  onCheckedChange?: ChangeEventHandler<HTMLInputElement>,
  checked?: boolean | undefined,
  onFileClick?: () => void,
}) {
  const mightBeMedia = mightBeVideo({ isDir, fileName }) || mightBeImage({ isDir, fileName });

  function renderIcon() {
    if (mightBeMedia) {
      return (
        <img
          loading="lazy"
          src={getThumbUrl(path)}
          alt=""
          style={{ ...iconStyle, borderRadius: 3, objectFit: 'cover', backgroundColor: 'rgba(0,0,0,0.1)' }}
        />
      );
    }

    const Icon = isDir ? FaFolder : FaFileAlt;
    return (
      <Icon style={iconStyle} />
    );
  }

  return (
    <div style={fileRowStyle}>
      {renderIcon()}
      {isDir ? (
        <>
          {/* eslint-disable-next-line jsx-a11y/anchor-is-valid */}
          <Link from={Route.fullPath} params={{ dirId: path }} style={{ ...linkStyle, cursor: 'pointer' }}>
            {fileName} {fileName === '..' && <span style={{ color: 'rgba(0,0,0,0.3)' }}>(parent dir)</span>}
          </Link>

          <div style={{ flexGrow: 1 }} />

          <ZipDownload url={getDownloadUrl(path, true)} style={{ marginLeft: '.5em' }} />
        </>
      ) : (
        <>
          {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, react/jsx-props-no-spreading */}
          <div style={{ ...linkStyle, cursor: mightBeMedia ? 'pointer' : 'default' }} {...(mightBeMedia && { role: 'button', tabIndex: 0, onClick: () => onFileClick?.() })}>{fileName}</div>

          <div style={{ flexGrow: 1 }} />

          {onCheckedChange != null && (
            <input type="checkbox" checked={checked} onChange={onCheckedChange} style={{ marginLeft: '.5em' }} />
          )}
          <FileDownload url={getDownloadUrl(path, true, true)} style={{ marginLeft: '.5em' }} />
        </>
      )}
    </div>
  );
}

function Browser() {
  const [currentDir, setCurrentDir] = useState<CurrentDir>({ files: [], cwd: '/' });

  const params = Route.useParams();
  const currentPath = params.dirId;

  const loadDir = useCallback(async () => {
    try {
      const response = await axios.get('/api/browse', { params: { p: currentPath } });
      setCurrentDir(response.data);
    } catch (err) {
      console.error(err);
    }
  }, [currentPath]);

  const context = useMemo(() => ({
    currentPath,
    currentDir,
    loadDir,
  }), [currentDir, currentPath, loadDir]);

  const [clipboardText, setClipboardText] = useState();
  const [saveAsFile, setSaveAsFile] = useState(false);
  const [selectedFilesMap, setSelectedFilesMap] = useState<Record<string, boolean>>({});
  const navigate = useNavigate({ from: Route.fullPath });

  const isLoadingDir = currentPath !== currentDir.cwd;
  const isInRootDir = currentPath === rootPath;

  const loadCurrentPath = useCallback(async () => loadDir(), [loadDir]);

  useEffect(() => {
    loadCurrentPath();
  }, [loadCurrentPath]);

  const handleUploadSuccess = useCallback(() => {
    if (isInRootDir) loadCurrentPath();
  }, [isInRootDir, loadCurrentPath]);

  const handleRefreshClick = useCallback(() => {
    loadCurrentPath();
  }, [loadCurrentPath]);

  const dirs = useMemo(() => currentDir.files.filter((f) => f.isDir), [currentDir.files]);
  const nonDirs = useMemo(() => currentDir.files.filter((f) => !f.isDir), [currentDir.files]);

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
    <Context.Provider value={context}>
      <div style={{ width: '100dvw', height: '100dvh', overflow: 'auto' }}>
        <div style={{ textAlign: 'center', backgroundColor: headingBackgroundColor, borderBottom: '2px solid rgba(0,0,0,0.2)', color: 'white', fontSize: 36, padding: '10px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
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

          <Uploader cwd={currentDir.cwd} onUploadSuccess={handleUploadSuccess} />

          <div style={{ wordBreak: 'break-all', padding: '0 5px 8px 5px', fontSize: '.85em', color: 'rgba(0,0,0,0.3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <FaShareAlt size={10} style={{ marginRight: 5, marginLeft: 5 }} />
            <span title="Shared folder">{currentDir.sharedPath}</span>
            <div style={{ flexGrow: 1 }} />
            <FaRedoAlt size={12} role="button" title="Refresh" style={{ color: colorLink, cursor: 'pointer', padding: '5px 1px 5px 5px' }} onClick={handleRefreshClick} />
          </div>

          <div style={{ ...fileRowStyle }}>
            <FaFolder style={iconStyle} />
            <div style={{ wordBreak: 'break-all', fontWeight: 500, marginRight: '.5em' }}>{currentDir.cwd} <span style={{ color: 'rgba(0,0,0,0.3)' }}>(current dir)</span></div>

            <div style={{ flexGrow: 1 }} />

            {selectedFiles.length > 0 ? (
              <>
                <span style={{ marginRight: '.5em', whiteSpace: 'nowrap' }}>{selectedFiles.length} selected</span>
                <input type="checkbox" checked onChange={() => setSelectedFilesMap({})} style={{ marginRight: '1em' }} />
                <ZipDownload url={`/api/zip-files?files=${encodeURIComponent(JSON.stringify(selectedFiles))}&_=${Date.now()}`} title="Download selected as ZIP" />
              </>
            ) : (
              <ZipDownload url={getDownloadUrl(currentDir.cwd, true)} />
            )}
          </div>

          {/* eslint-disable-next-line react/jsx-props-no-spreading */}
          {dirs.map((props) => <FileRow key={props.path} {...props} />)}
          {nonDirs.map((props) => {
            const { path } = props;
            // eslint-disable-next-line react/jsx-props-no-spreading
            return <FileRow key={path} {...props} checked={selectedFilesMap[path]} onCheckedChange={(e) => handleFileSelect(path, e.target.checked)} onFileClick={() => navigate({ to: './file', search: { p: path } })} />;
          })}
        </Section>

        {/* eslint-disable-next-line jsx-a11y/accessible-emoji */}
        <div style={{ textAlign: 'center', marginBottom: 50 }}><a href="https://mifi.no" style={{ textDecoration: 'none', fontWeight: '400', color: 'black' }}>More apps by mifi.no ❤️</a></div>
      </div>

      <Outlet />
    </Context.Provider>
  );
}
