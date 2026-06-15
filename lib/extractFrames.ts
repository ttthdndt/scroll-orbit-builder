import type { SpriteMeta } from "./generateSnippet";

export interface ExtractOptions {
  frameCount: number;
  frameWidth: number;
  jpegQuality?: number;
  onProgress?: (done: number, total: number) => void;
}

export interface ExtractResult {
  spriteBlob: Blob;
  meta: SpriteMeta;
}

/**
 * Extracts `frameCount` evenly-spaced frames from a video File using a
 * hidden <video> element + <canvas>, then assembles them into a single
 * grid sprite-sheet image. Runs entirely in the browser -- no upload,
 * no ffmpeg/wasm required.
 */
export async function extractSpriteSheetFromVideo(
  file: File,
  opts: ExtractOptions
): Promise<ExtractResult> {
  const { frameCount, frameWidth, jpegQuality = 0.85, onProgress } = opts;

  if (frameCount < 2) {
    throw new Error("frameCount must be at least 2");
  }

  const video = document.createElement("video");
  video.muted = true;
  video.playsInline = true;
  video.preload = "auto";
  const url = URL.createObjectURL(file);
  video.src = url;

  try {
    await waitForEvent(video, "loadedmetadata");

    const duration = video.duration;
    if (!isFinite(duration) || duration <= 0) {
      throw new Error("Could not read video duration. Try a different file or browser.");
    }

    const sourceAspect = video.videoWidth / video.videoHeight;
    const frameHeight = Math.max(1, Math.round(frameWidth / sourceAspect));

    const columns = Math.ceil(Math.sqrt(frameCount));
    const rows = Math.ceil(frameCount / columns);

    const sheetCanvas = document.createElement("canvas");
    sheetCanvas.width = columns * frameWidth;
    sheetCanvas.height = rows * frameHeight;
    const sheetCtx = sheetCanvas.getContext("2d");
    if (!sheetCtx) throw new Error("Canvas 2D context unavailable");

    // Fill with black so any unused trailing cells aren't transparent.
    sheetCtx.fillStyle = "#000";
    sheetCtx.fillRect(0, 0, sheetCanvas.width, sheetCanvas.height);

    for (let i = 0; i < frameCount; i++) {
      // Small epsilon offsets avoid edge-case seeks to currentTime===0
      // (which some browsers don't emit a 'seeked' event for) and to
      // the exact end of the clip.
      const fraction = frameCount === 1 ? 0 : i / (frameCount - 1);
      const t = Math.min(
        Math.max(0.001, fraction * duration),
        Math.max(0.001, duration - 0.05)
      );

      await seekTo(video, t);
      // Give the compositor a frame to ensure the seeked frame is painted.
      await nextAnimationFrame();

      const col = i % columns;
      const row = Math.floor(i / columns);
      sheetCtx.drawImage(
        video,
        0, 0, video.videoWidth, video.videoHeight,
        col * frameWidth, row * frameHeight, frameWidth, frameHeight
      );

      onProgress?.(i + 1, frameCount);
    }

    const spriteBlob = await new Promise<Blob>((resolve, reject) => {
      sheetCanvas.toBlob(
        (blob) => (blob ? resolve(blob) : reject(new Error("toBlob failed"))),
        "image/jpeg",
        jpegQuality
      );
    });

    const meta: SpriteMeta = {
      columns,
      rows,
      frameWidth,
      frameHeight,
      frameCount,
      sheetWidth: sheetCanvas.width,
      sheetHeight: sheetCanvas.height,
    };

    return { spriteBlob, meta };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function waitForEvent(el: HTMLElement, event: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const onLoad = () => {
      el.removeEventListener(event, onLoad);
      el.removeEventListener("error", onError);
      resolve();
    };
    const onError = () => {
      el.removeEventListener(event, onLoad);
      el.removeEventListener("error", onError);
      reject(new Error(`Failed waiting for "${event}" (video load error)`));
    };
    el.addEventListener(event, onLoad);
    el.addEventListener("error", onError);
  });
}

function seekTo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      resolve();
    };
    const onError = () => {
      video.removeEventListener("seeked", onSeeked);
      video.removeEventListener("error", onError);
      reject(new Error("Video seek failed"));
    };
    video.addEventListener("seeked", onSeeked);
    video.addEventListener("error", onError);
    video.currentTime = time;
  });
}

function nextAnimationFrame(): Promise<void> {
  return new Promise((resolve) => requestAnimationFrame(() => resolve()));
}
