import { useState, useCallback } from 'react';
import axios, { AxiosError } from 'axios';

import { FaFileUpload } from 'react-icons/fa';
import { useDropzone } from 'react-dropzone';

import { CircularProgressbar } from 'react-circular-progressbar';
import 'react-circular-progressbar/dist/styles.css';
import { boxBackgroundColor, iconColor, Toast } from './util';


export default function Uploader({ onUploadSuccess, cwd }: {
  onUploadSuccess: () => void,
  cwd: string,
}) {
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
}
