"use client";

import { useCallback, useEffect, useRef, useState, type JSX } from "react";
import { Maximize, Minimize, Pause, Play, RotateCcw, RotateCw, Volume2, VolumeX } from "lucide-react";
import { videoSourceFor } from "@/lib/video-source";

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const SKIP_SECONDS = 10;
const HIDE_CONTROLS_AFTER_MS = 2500;
const SAVE_EVERY_SECONDS = 5;

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const s = Math.floor(seconds % 60).toString().padStart(2, "0");
  const m = Math.floor((seconds / 60) % 60);
  const h = Math.floor(seconds / 3600);
  return h > 0 ? `${h}:${m.toString().padStart(2, "0")}:${s}` : `${m}:${s}`;
}

// Where the student stopped is kept in this browser only. Storage can be blocked or full,
// so every read and write is allowed to fail quietly.
function readPosition(key: string): number {
  try {
    return Number(window.localStorage.getItem(key)) || 0;
  } catch {
    return 0;
  }
}

function writePosition(key: string, seconds: number): void {
  try {
    window.localStorage.setItem(key, String(Math.floor(seconds)));
  } catch {
    // ignore
  }
}

function clearPosition(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

// The controls below drive either a plain <video> element or Vimeo's player through
// this one interface, so both look and behave the same for students.
interface Engine {
  play(): void;
  pause(): void;
  seek(seconds: number): void;
  setVolume(volume: number): void;
  setMuted(muted: boolean): void;
  setRate(rate: number): void;
  isPaused(): boolean;
  currentTime(): number;
  duration(): number;
}

export default function VideoPlayer({
  src,
  title,
  positionKey,
}: {
  src: string;
  title: string;
  positionKey: string;
}): JSX.Element {
  const source = videoSourceFor(src);
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const vimeoHostRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<Engine | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSaved = useRef(0);
  const storageKey = `rvlms:video-position:${positionKey}`;

  const [playing, setPlaying] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [waiting, setWaiting] = useState(false);
  const [failed, setFailed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [resumedFrom, setResumedFrom] = useState<number | null>(null);
  const [failMessage, setFailMessage] = useState<string | null>(null);

  // Show the controls, then hide them again after a pause in mouse movement (only while playing).
  const showControls = useCallback(() => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (engineRef.current && !engineRef.current.isPaused()) setControlsVisible(false);
    }, HIDE_CONTROLS_AFTER_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  useEffect(() => {
    const onChange = (): void => setIsFullscreen(document.fullscreenElement === containerRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // --- Events, shared by both engines.

  function handleLoaded(total: number): void {
    setDuration(total);
    const saved = readPosition(storageKey);
    // Only resume if it's meaningful: not the first few seconds, not the very end.
    if (saved > 5 && saved < total - 10) {
      engineRef.current?.seek(saved);
      setResumedFrom(saved);
    }
  }

  function handleTime(t: number): void {
    setCurrent(t);
    if (Math.abs(t - lastSaved.current) >= SAVE_EVERY_SECONDS) {
      writePosition(storageKey, t);
      lastSaved.current = t;
    }
  }

  function handlePlay(): void {
    setPlaying(true);
    showControls();
  }

  function handlePause(t: number): void {
    setPlaying(false);
    setControlsVisible(true);
    writePosition(storageKey, t);
  }

  function handleEnded(): void {
    setPlaying(false);
    setControlsVisible(true);
    clearPosition(storageKey);
  }

  // Plain file: wrap the <video> element.
  useEffect(() => {
    if (source.kind !== "file") return;
    const v = videoRef.current;
    if (!v) return;
    engineRef.current = {
      play: () => void v.play().catch(() => setPlaying(false)),
      pause: () => v.pause(),
      seek: (t) => {
        v.currentTime = Math.min(Math.max(t, 0), v.duration || 0);
      },
      setVolume: (vol) => {
        v.volume = vol;
        v.muted = vol === 0;
      },
      setMuted: (m) => {
        v.muted = m;
      },
      setRate: (r) => {
        v.playbackRate = r;
      },
      isPaused: () => v.paused,
      currentTime: () => v.currentTime,
      duration: () => v.duration || 0,
    };
    return () => {
      engineRef.current = null;
    };
  }, [source.kind]);

  // Vimeo: load Vimeo's player with its own controls hidden, and mirror its events.
  // The SDK is loaded only when a lesson actually uses Vimeo.
  const vimeoUrl = source.kind === "vimeo" ? source.url : null;
  useEffect(() => {
    if (!vimeoUrl || !vimeoHostRef.current) return;
    let cancelled = false;
    let player: import("@vimeo/player").default | null = null;
    const state = { paused: true, time: 0, duration: 0 };

    void import("@vimeo/player").then(({ default: VimeoPlayer }) => {
      if (cancelled || !vimeoHostRef.current) return;
      player = new VimeoPlayer(vimeoHostRef.current, {
        url: vimeoUrl as `https://player.vimeo.com/video/${string}`,
        controls: false,
        dnt: true,
        playsinline: true,
        responsive: false,
        title: false,
        byline: false,
        portrait: false,
        keyboard: false,
      });
      const p = player;
      engineRef.current = {
        play: () => void p.play().catch(() => setPlaying(false)),
        pause: () => void p.pause().catch(() => undefined),
        seek: (t) => void p.setCurrentTime(Math.min(Math.max(t, 0), state.duration || t)).catch(() => undefined),
        setVolume: (vol) => {
          void p.setVolume(vol).catch(() => undefined);
          void p.setMuted(vol === 0).catch(() => undefined);
        },
        setMuted: (m) => void p.setMuted(m).catch(() => undefined),
        // Some Vimeo plans don't allow speed changes; if refused, the speed simply stays at 1x.
        setRate: (r) => void p.setPlaybackRate(r).catch(() => setSpeed(1)),
        isPaused: () => state.paused,
        currentTime: () => state.time,
        duration: () => state.duration,
      };

      p.on("loaded", () => {
        void p.getDuration().then((d) => {
          state.duration = d;
          handleLoaded(d);
        });
      });
      p.on("timeupdate", (e) => {
        state.time = e.seconds;
        handleTime(e.seconds);
      });
      p.on("play", () => {
        state.paused = false;
        handlePlay();
      });
      p.on("pause", (e) => {
        state.paused = true;
        handlePause(e.seconds);
      });
      p.on("ended", () => {
        state.paused = true;
        handleEnded();
      });
      p.on("bufferstart", () => setWaiting(true));
      p.on("bufferend", () => setWaiting(false));
      p.on("volumechange", (e) => {
        setVolume(e.volume);
        setMuted(e.muted);
      });
      p.on("playbackratechange", (e) => setSpeed(e.playbackRate));
      p.on("error", (e) => {
        // A privacy error means Vimeo refused this site: the domain isn't in the video's
        // "Specific domains" list (true for localhost, which Vimeo won't accept).
        setFailMessage(
          e.name === "PrivacyError"
            ? "This video can only be played on the live site. Its Vimeo privacy settings don't allow this address."
            : null
        );
        setFailed(true);
      });
      p.ready().catch((err: { name?: string }) => {
        setFailMessage(
          err?.name === "PrivacyError"
            ? "This video can only be played on the live site. Its Vimeo privacy settings don't allow this address."
            : null
        );
        setFailed(true);
      });
    });

    return () => {
      cancelled = true;
      engineRef.current = null;
      void player?.destroy().catch(() => undefined);
    };
  }, [vimeoUrl]);

  // --- Actions: each one tells the <video> element what to do. The element then fires an
  // event (play, pause, volumechange...) and the handlers below update what's on screen.

  function togglePlay(): void {
    const e = engineRef.current;
    if (!e) return;
    if (e.isPaused()) e.play();
    else e.pause();
  }

  function seekTo(seconds: number): void {
    engineRef.current?.seek(seconds);
    // Vimeo reports the new time a moment later; show it straight away.
    if (source.kind === "vimeo") setCurrent(Math.min(Math.max(seconds, 0), duration || seconds));
  }

  function skip(by: number): void {
    seekTo((engineRef.current?.currentTime() ?? 0) + by);
  }

  function changeVolume(next: number): void {
    engineRef.current?.setVolume(Math.min(Math.max(next, 0), 1));
  }

  function toggleMute(): void {
    engineRef.current?.setMuted(!muted);
  }

  function changeSpeed(next: number): void {
    engineRef.current?.setRate(next);
  }

  function toggleFullscreen(): void {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void containerRef.current?.requestFullscreen();
    }
  }

  function startOver(): void {
    seekTo(0);
    clearPosition(storageKey);
    setResumedFrom(null);
  }

  function onKeyDown(e: React.KeyboardEvent): void {
    // Let the seek bar, volume slider and speed menu handle their own keys.
    const tag = (e.target as HTMLElement).tagName;
    if (tag === "INPUT" || tag === "SELECT") return;

    switch (e.key) {
      case " ":
      case "k":
        togglePlay();
        break;
      case "ArrowRight":
      case "l":
        skip(SKIP_SECONDS);
        break;
      case "ArrowLeft":
      case "j":
        skip(-SKIP_SECONDS);
        break;
      case "ArrowUp":
        changeVolume(volume + 0.1);
        break;
      case "ArrowDown":
        changeVolume(volume - 0.1);
        break;
      case "m":
        toggleMute();
        break;
      case "f":
        toggleFullscreen();
        break;
      default:
        return;
    }
    e.preventDefault();
    showControls();
  }

  if (failed) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-neutral-500">
        {failMessage ??
          "This video couldn't be played. The file may have moved, or its format isn't supported by this browser."}
      </div>
    );
  }

  const iconButton = "rounded p-1.5 text-white hover:bg-white/15";

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      onMouseMove={showControls}
      onMouseLeave={() => playing && setControlsVisible(false)}
      aria-label={`Video: ${title}`}
      className={`relative h-full w-full bg-black outline-none ${controlsVisible ? "" : "cursor-none"}`}
    >
      {source.kind === "file" ? (
        <video
          ref={videoRef}
          src={source.url}
          className="h-full w-full"
          playsInline
          preload="metadata"
          controlsList="nodownload"
          disablePictureInPicture
          onContextMenu={(e) => e.preventDefault()}
          onClick={togglePlay}
          onDoubleClick={toggleFullscreen}
          onLoadedMetadata={(e) => handleLoaded(e.currentTarget.duration)}
          onTimeUpdate={(e) => handleTime(e.currentTarget.currentTime)}
          onPlay={handlePlay}
          onPause={(e) => handlePause(e.currentTarget.currentTime)}
          onEnded={handleEnded}
          onWaiting={() => setWaiting(true)}
          onPlaying={() => setWaiting(false)}
          onCanPlay={() => setWaiting(false)}
          onVolumeChange={(e) => {
            setVolume(e.currentTarget.volume);
            setMuted(e.currentTarget.muted);
          }}
          onRateChange={(e) => setSpeed(e.currentTarget.playbackRate)}
          onError={() => setFailed(true)}
        />
      ) : (
        <>
          {/* Vimeo puts its iframe in here. The layer on top takes clicks, so students use our
              controls and can't reach Vimeo's own menus or its link to vimeo.com. */}
          <div ref={vimeoHostRef} className="h-full w-full [&>iframe]:h-full [&>iframe]:w-full" />
          <div
            className="absolute inset-0"
            onClick={togglePlay}
            onDoubleClick={toggleFullscreen}
            onContextMenu={(e) => e.preventDefault()}
          />
        </>
      )}

      {waiting && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/30 border-t-white" />
        </div>
      )}

      {!playing && !waiting && (
        <button
          onClick={togglePlay}
          aria-label="Play"
          className="absolute left-1/2 top-1/2 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
        >
          <Play size={28} />
        </button>
      )}

      {resumedFrom !== null && current < resumedFrom + 5 && (
        <div className="absolute left-3 top-3 flex items-center gap-2 rounded bg-black/70 px-3 py-1.5 text-xs text-white">
          Resumed from {formatTime(resumedFrom)}
          <button onClick={startOver} className="underline">
            Start over
          </button>
        </div>
      )}

      <div
        className={`absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-2 pt-8 transition-opacity ${
          controlsVisible ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <input
          type="range"
          aria-label="Seek"
          min={0}
          max={duration || 0}
          step={0.1}
          value={current}
          onChange={(e) => seekTo(Number(e.target.value))}
          className="w-full accent-primary-500"
        />

        <div className="mt-1 flex items-center gap-1">
          <button className={iconButton} onClick={togglePlay} aria-label={playing ? "Pause" : "Play"}>
            {playing ? <Pause size={18} /> : <Play size={18} />}
          </button>
          <button className={iconButton} onClick={() => skip(-SKIP_SECONDS)} aria-label="Back 10 seconds">
            <RotateCcw size={18} />
          </button>
          <button className={iconButton} onClick={() => skip(SKIP_SECONDS)} aria-label="Forward 10 seconds">
            <RotateCw size={18} />
          </button>

          <span className="ml-1 text-xs tabular-nums text-white">
            {formatTime(current)} / {formatTime(duration)}
          </span>

          <button className={`${iconButton} ml-2`} onClick={toggleMute} aria-label={muted ? "Unmute" : "Mute"}>
            {muted || volume === 0 ? <VolumeX size={18} /> : <Volume2 size={18} />}
          </button>
          <input
            type="range"
            aria-label="Volume"
            min={0}
            max={1}
            step={0.05}
            value={muted ? 0 : volume}
            onChange={(e) => changeVolume(Number(e.target.value))}
            className="w-20 accent-primary-500"
          />

          <div className="ml-auto flex items-center gap-1">
            <select
              aria-label="Playback speed"
              value={speed}
              onChange={(e) => changeSpeed(Number(e.target.value))}
              className="rounded bg-transparent px-1 py-1 text-xs text-white hover:bg-white/15"
            >
              {SPEEDS.map((s) => (
                <option key={s} value={s} className="text-neutral-900">
                  {s}×
                </option>
              ))}
            </select>
            <button
              className={iconButton}
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit full screen" : "Full screen"}
            >
              {isFullscreen ? <Minimize size={18} /> : <Maximize size={18} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}