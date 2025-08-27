import React from 'react';
import Swal from 'sweetalert2';
import invariant from 'tiny-invariant';

export interface EzshareFile {
  path: string,
  fileName: string
  isDir: boolean,
}

export interface CurrentDir {
  sharedPath?: string, cwd: string, files: EzshareFile[]
}

export const Toast = Swal.mixin({
  toast: true,
  showConfirmButton: false,
  timer: 3000,
  position: 'top',
});

export const rootPath = '/';

export const colorLink = '#db6400';
export const colorLink2 = '#ffa62b';

export const boxBackgroundColor = '#fff';
export const headingBackgroundColor = '#16697a';
export const iconColor = '#ffa62b'; // 'rgba(0,0,0,0.3)'

export const mightBeVideo = ({ isDir, fileName }: { isDir?: boolean, fileName: string }) => !isDir && /\.(mp4|m4v|mov|qt|webm|mkv|avi|flv|vob|ogg|ogv|mpe?g|m2v|mp2|mpv)$/i.test(fileName);
export const mightBeImage = ({ isDir, fileName }: { isDir?: boolean, fileName: string }) => !isDir && /\.(jpe?g|png|gif|webp)$/i.test(fileName);

export const getDownloadUrl = (path: string, cacheBuster?: boolean, forceDownload?: boolean) => `/api/download?f=${encodeURIComponent(path)}&forceDownload=${forceDownload ? 'true' : 'false'}&_=${cacheBuster ? Date.now() : 0}`;
export const getThumbUrl = (path: string) => `/api/thumbnail?f=${encodeURIComponent(path)}`;

export interface MainContext {
  currentPath: string,
  currentDir: CurrentDir,
  loadDir: (path: string) => Promise<void>,
}

export const Context = React.createContext<MainContext | undefined>(undefined);

export function useContext() {
  const context = React.useContext(Context);
  invariant(context);
  return context;
}
