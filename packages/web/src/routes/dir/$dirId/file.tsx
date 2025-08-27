import { createFileRoute, useNavigate, useRouter, useSearch } from '@tanstack/react-router';
import z from 'zod';
import { useState, useEffect, useCallback, CSSProperties, useRef, KeyboardEventHandler, WheelEventHandler, MouseEventHandler, ReactEventHandler, useMemo } from 'react';
import { FaList, FaTimes, FaVolumeMute, FaVolumeUp } from 'react-icons/fa';

import { getDownloadUrl, mightBeImage, mightBeVideo, useContext } from '../../../util';
import styles from './file.module.css';

// eslint-disable-next-line import/prefer-default-export
export const Route = createFileRoute('/dir/$dirId/file')({
  // eslint-disable-next-line no-use-before-define
  component: ViewingFile,
  validateSearch: z.object({
    p: z.string(),
  }).parse,
});

const buttonStyle: CSSProperties = { all: 'unset', padding: '.1em .3em', cursor: 'pointer', fontSize: '2em' };

function ViewingFile() {
  const { currentDir } = useContext();
  const playableFiles = useMemo(() => currentDir.files.filter((f) => !f.isDir && (mightBeVideo(f) || mightBeImage(f))), [currentDir.files]);
  const { p: path } = useSearch({ from: Route.fullPath });
  const navigate = useNavigate({ from: Route.fullPath });

  const viewingFile = useMemo(() => (currentDir.files.find((f) => f.path === path) ?? currentDir.files[0]), [path, currentDir.files]);

  const dialogRef = useRef<HTMLDialogElement>(null);
  const pointerStartX = useRef<number>();
  const lastWheel = useRef(0);
  const [showControls, setShowControls] = useState(false);
  const [playlistMode, setPlaylistMode] = useState(false);
  const [muted, setMuted] = useState(true);
  const [progress, setProgress] = useState(0);
  const [canPlayVideo, setCanPlayVideo] = useState(false);
  const [videoError, setVideoError] = useState<MediaError | null>(null);

  const setRelViewingFile = useCallback((rel: number) => {
    const navigatePath = (f: { path: string } | undefined) => {
      if (f == null) return;
      navigate({ search: { p: f.path }, replace: true });
    };

    if (viewingFile == null) {
      navigatePath(playableFiles[0]);
    } else {
      const currentIndex = playableFiles.findIndex((f) => f.path === viewingFile?.path);
      const nextIndex = (currentIndex + rel + playableFiles.length) % playableFiles.length;
      navigatePath(playableFiles[nextIndex]);
    }
  }, [navigate, playableFiles, viewingFile]);

  const { history } = useRouter();

  const handleClose = useCallback(() => history.go(-1), [history]);
  const handleNext = useCallback(() => setRelViewingFile(1), [setRelViewingFile]);
  const handlePrev = useCallback(() => setRelViewingFile(-1), [setRelViewingFile]);

  const mediaRef = useRef<HTMLVideoElement & HTMLImageElement>(null);

  const isVideo = useMemo(() => viewingFile != null && mightBeVideo(viewingFile), [viewingFile]);
  const isImage = useMemo(() => viewingFile != null && mightBeImage(viewingFile), [viewingFile]);

  useEffect(() => {
    if (mediaRef.current) {
      mediaRef.current.focus({ preventScroll: true });
    }
    setShowControls(false);
    setCanPlayVideo(false);
    setProgress(0);
    setVideoError(null);

    if (isImage && playlistMode) {
      const slideTime = 5000;
      const startTime = Date.now();

      let t: number | undefined;

      // ken burns zoom
      const animation = mediaRef.current?.animate([
        { transform: 'scale(1)', offset: 0 },
        { transform: 'scale(1.05)', offset: 1 },
      ], {
        duration: slideTime,
        fill: 'none',
      });

      const tick = () => {
        t = setTimeout(() => {
          const now = Date.now();

          const p = Math.max(0, Math.min(1, (now - startTime) / slideTime));
          setProgress(p);

          if (now - startTime >= slideTime) {
            handleNext();
            return;
          }
          tick();
        }, 40);
      };

      tick();

      return () => {
        if (t != null) clearTimeout(t);
        animation?.cancel();
      };
    }

    return undefined;
  }, [handleNext, isImage, playlistMode, viewingFile]);

  const handleKeyDown = useCallback<KeyboardEventHandler<HTMLElement>>((e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;

    // eslint-disable-next-line unicorn/prefer-switch
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      e.stopPropagation();
      handlePrev();
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      e.stopPropagation();
      handleNext();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      handleClose();
    }
  }, [handleClose, handleNext, handlePrev]);

  const handlePointerDown = useCallback<React.PointerEventHandler<HTMLElement>>((e) => {
    pointerStartX.current = e.clientX;
  }, []);

  const handlePointerUp = useCallback<React.PointerEventHandler<HTMLElement>>((e) => {
    if (pointerStartX.current == null) return;

    const diff = pointerStartX.current - e.clientX;
    if (Math.abs(diff) > 50) {
      if (diff > 0) handleNext();
      else handlePrev();
    }

    pointerStartX.current = undefined;
  }, [handleNext, handlePrev]);

  const handleWheel = useCallback<WheelEventHandler<HTMLElement>>((e) => {
    // Trackpad horizontal swipes come as wheel events
    if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
      if (Date.now() - lastWheel.current < 500) return; // ignore if too fast
      lastWheel.current = Date.now();
      e.preventDefault();

      if (e.deltaX > 0) handleNext();
      else handlePrev();
    }
  }, [handleNext, handlePrev]);

  const handleClick = useCallback<MouseEventHandler<HTMLElement>>((e) => {
    e.stopPropagation();
    if (mediaRef.current != null && 'play' in mediaRef.current) {
      if (mediaRef.current.paused) {
        mediaRef.current.play();
      } else {
        mediaRef.current.pause();
      }
    }
  }, []);

  const handlePrevClick = useCallback<MouseEventHandler<HTMLElement>>((e) => {
    e.preventDefault();
    e.stopPropagation();
    handlePrev();
  }, [handlePrev]);

  const handleNextClick = useCallback<MouseEventHandler<HTMLElement>>((e) => {
    e.preventDefault();
    e.stopPropagation();
    handleNext();
  }, [handleNext]);

  const handlePlaylistModeClick = useCallback<MouseEventHandler<HTMLElement>>((e) => {
    e.stopPropagation();
    setPlaylistMode((v) => !v);
  }, []);

  const handleMuteClick = useCallback<MouseEventHandler<HTMLElement>>((e) => {
    e.stopPropagation();
    setMuted((v) => !v);
  }, []);

  const handleVideoEnded = useCallback<ReactEventHandler<HTMLVideoElement>>(() => {
    if (playlistMode) {
      handleNext();
    }
  }, [handleNext, playlistMode]);

  const scrubbingRef = useRef(false);
  const handleScrubDown = useCallback<React.PointerEventHandler<HTMLElement>>((e) => {
    e.preventDefault();
    e.stopPropagation();
    scrubbingRef.current = true;
  }, []);
  const handleScrubUp = useCallback<React.PointerEventHandler<HTMLElement>>((e) => {
    e.preventDefault();
    e.stopPropagation();
    scrubbingRef.current = false;
  }, []);
  const handleScrub = useCallback<React.PointerEventHandler<HTMLDivElement>>((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!scrubbingRef.current) return;
    const target = e.target as HTMLDivElement;
    const p = e.clientX / target.clientWidth;
    if (mediaRef.current && mediaRef.current instanceof HTMLVideoElement) {
      mediaRef.current.currentTime = mediaRef.current.duration * p;
    }
  }, []);

  const handleVideoTimeUpdate = useCallback<ReactEventHandler<HTMLVideoElement>>((e) => {
    if (e.currentTarget instanceof HTMLVideoElement) {
      setProgress(e.currentTarget.currentTime / e.currentTarget.duration);
    }
  }, []);

  const handleVideoError = useCallback<ReactEventHandler<HTMLVideoElement | HTMLImageElement>>((e) => {
    if (e.target instanceof HTMLVideoElement) {
      setVideoError(e.target.error);
    }

    if (playlistMode) {
      setTimeout(() => {
        handleNext();
      }, 300);
    }
  }, [handleNext, playlistMode]);

  function renderPreview() {
    if (viewingFile == null) {
      return null;
    }

    if (isVideo) {
      return (
        <>
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <video
            src={getDownloadUrl(viewingFile.path)}
            controls={showControls}
            style={{ width: '100%', height: '100%', objectFit: 'contain' }}
            autoPlay
            playsInline
            loop={!playlistMode}
            muted={muted}
            onKeyDown={handleKeyDown}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onWheel={handleWheel}
            onClick={handleClick}
            onEnded={handleVideoEnded}
            onTimeUpdate={handleVideoTimeUpdate}
            tabIndex={0}
            ref={mediaRef}
            onError={handleVideoError}
            onCanPlay={() => setCanPlayVideo(true)}
          />
          {!canPlayVideo && videoError && (
            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ff7676', fontSize: '1.5em' }}>
              Unable to play video
            </div>
          )}
        </>
      );
    }

    if (isImage) {
      return (
        // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
        <img
          src={getDownloadUrl(viewingFile.path)}
          alt={`Preview: ${viewingFile.fileName}`}
          style={{ width: '100%', height: '100%', objectFit: 'contain', pointerEvents: 'none' }}
          // eslint-disable-next-line jsx-a11y/no-noninteractive-tabindex
          tabIndex={0}
          onKeyDown={handleKeyDown}
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onWheel={handleWheel}
          onClick={handleClick}
          ref={mediaRef}
        />
      );
    }

    return (
      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
        <div style={{ fontSize: '2em' }}>No preview</div>
      </div>
    );
  }

  return (
    // eslint-disable-next-line jsx-a11y/no-noninteractive-element-interactions
    <dialog
      className={styles['dialog']}
      ref={dialogRef}
      onClose={handleClose}
      open
      style={{ margin: 0, padding: 0, position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, width: '100dvw', height: '100dvh', background: 'black', color: 'white', overflow: 'hidden' }}
      onKeyDown={handleKeyDown}
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onWheel={handleWheel}
      onClick={handleClick}
    >
      {renderPreview()}

      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, fontWeight: 'bold', display: 'flex', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.3)' }}>
        <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', flexShrink: 1, flexGrow: 1, textAlign: 'center' }}>{viewingFile?.fileName}</div>

        {isVideo && (
          <button type="button" style={{ ...buttonStyle, flexShrink: 0, opacity: showControls ? 1 : 0.5 }} onClick={handleMuteClick} tabIndex={-1}>
            {muted ? <FaVolumeMute /> : <FaVolumeUp />}
          </button>
        )}

        <button type="button" style={{ ...buttonStyle, flexShrink: 0, opacity: playlistMode ? 1 : 0.5 }} title="Playlist mode" onClick={handlePlaylistModeClick} tabIndex={-1}>
          <FaList style={{ fontSize: '.8em' }} />
        </button>

        <form method="dialog">
          <button type="submit" style={{ all: 'unset', padding: '.3em', cursor: 'pointer', fontSize: '2em', flexShrink: 0 }} tabIndex={-1}>
            <FaTimes />
          </button>
        </form>
      </div>

      <button type="button" style={{ all: 'unset', position: 'absolute', bottom: 0, left: 0, width: '15%', height: '80%' }} onClick={handlePrevClick} tabIndex={-1} />
      <button type="button" style={{ all: 'unset', position: 'absolute', bottom: 0, right: 0, width: '15%', height: '80%' }} onClick={handleNextClick} tabIndex={-1} />

      <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '15%' }} onPointerDown={handleScrubDown} onPointerUp={handleScrubUp} onPointerMove={handleScrub}>
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: '.5dvw', width: `${(progress * 100).toFixed(2)}%`, backgroundColor: 'red' }} />
      </div>
    </dialog>
  );
}
