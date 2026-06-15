export interface SpriteMeta {
  columns: number;
  rows: number;
  frameWidth: number;
  frameHeight: number;
  frameCount: number;
  sheetWidth: number;
  sheetHeight: number;
}

export interface SnippetOptions {
  containerId: string;
  spriteUrl: string;
  scrollVh: number;
  bgColor: string;
  textColor: string;
  title: string;
  subtitle: string;
}

/**
 * Generates a self-contained scroll-driven "orbit" snippet (style + markup + script)
 * that recreates the rotation effect on rolex.com product pages.
 *
 * The output is a single block that can be pasted into a WordPress
 * "Custom HTML" block, Elementor HTML widget, Webflow embed, etc.
 */
export function generateSnippet(meta: SpriteMeta, opts: SnippetOptions): string {
  const {
    containerId,
    spriteUrl,
    scrollVh,
    bgColor,
    textColor,
    title,
    subtitle,
  } = opts;

  const { frameCount, columns, rows, frameWidth, frameHeight } = meta;

  const titleBlock = title
    ? `\n      <h2>${escapeHtml(title)}</h2>`
    : "";
  const subtitleBlock = subtitle
    ? `\n      <p>${escapeHtml(subtitle)}</p>`
    : "";
  const captionBlock =
    title || subtitle
      ? `
    <div class="so-caption so-caption-top">${titleBlock}${subtitleBlock}
    </div>`
      : "";

  return `<!-- ===== Scroll Orbit: ${containerId} ===== -->
<div id="${containerId}" class="scroll-orbit">
  <style>
    #${containerId} {
      position: relative;
      height: ${scrollVh}vh;
      box-sizing: border-box;
    }
    #${containerId} * { box-sizing: border-box; }
    #${containerId} .so-sticky {
      position: sticky;
      top: 0;
      height: 100vh;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: ${bgColor};
    }
    #${containerId} canvas {
      width: 100%;
      height: 100%;
      display: block;
    }
    #${containerId} .so-caption {
      position: absolute;
      left: 0;
      right: 0;
      text-align: center;
      color: ${textColor};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      pointer-events: none;
      transition: opacity 0.4s ease;
      padding: 0 24px;
    }
    #${containerId} .so-caption-top {
      top: 8%;
    }
    #${containerId} .so-caption-top h2 {
      font-size: clamp(22px, 4vw, 42px);
      font-weight: 600;
      letter-spacing: 0.02em;
      margin: 0 0 8px;
    }
    #${containerId} .so-caption-top p {
      font-size: clamp(13px, 1.4vw, 17px);
      opacity: 0.75;
      margin: 0;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }
    #${containerId} .so-progress {
      position: absolute;
      bottom: 6%;
      left: 50%;
      transform: translateX(-50%);
      width: min(280px, 60%);
      height: 2px;
      background: rgba(128,128,128,0.3);
      border-radius: 2px;
      overflow: hidden;
    }
    #${containerId} .so-progress-bar {
      height: 100%;
      width: 0%;
      background: ${textColor};
      border-radius: 2px;
    }
    @media (prefers-reduced-motion: reduce) {
      #${containerId} { height: auto; }
      #${containerId} .so-sticky { position: relative; height: auto; aspect-ratio: ${frameWidth} / ${frameHeight}; }
    }
  </style>

  <div class="so-sticky">
    <canvas aria-hidden="true"></canvas>${captionBlock}
    <div class="so-progress"><div class="so-progress-bar"></div></div>
  </div>

  <script>
  (function () {
    var cfg = {
      spriteUrl: "${spriteUrl}",
      frameCount: ${frameCount},
      columns: ${columns},
      rows: ${rows},
      frameWidth: ${frameWidth},
      frameHeight: ${frameHeight}
    };

    var root = document.getElementById("${containerId}");
    if (!root) return;
    var canvas = root.querySelector("canvas");
    var ctx = canvas.getContext("2d");
    var progressBar = root.querySelector(".so-progress-bar");
    var captionTop = root.querySelector(".so-caption-top");
    var img = new Image();
    var loaded = false;
    var lastProgress = 0;

    img.onload = function () {
      loaded = true;
      render(lastProgress);
    };
    img.src = cfg.spriteUrl;

    function resizeCanvas() {
      var rect = canvas.getBoundingClientRect();
      var dpr = window.devicePixelRatio || 1;
      var w = Math.round(rect.width * dpr);
      var h = Math.round(rect.height * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }

    function render(progress) {
      if (!loaded) return;
      resizeCanvas();

      var frameIndex = Math.min(
        cfg.frameCount - 1,
        Math.max(0, Math.round(progress * (cfg.frameCount - 1)))
      );
      var col = frameIndex % cfg.columns;
      var row = Math.floor(frameIndex / cfg.columns);

      var cw = canvas.width;
      var ch = canvas.height;
      var scale = Math.min(cw / cfg.frameWidth, ch / cfg.frameHeight);
      var dw = cfg.frameWidth * scale;
      var dh = cfg.frameHeight * scale;
      var dx = (cw - dw) / 2;
      var dy = (ch - dh) / 2;

      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(
        img,
        col * cfg.frameWidth, row * cfg.frameHeight, cfg.frameWidth, cfg.frameHeight,
        dx, dy, dw, dh
      );

      if (progressBar) progressBar.style.width = (progress * 100).toFixed(1) + "%";
      if (captionTop) captionTop.style.opacity = String(Math.max(0, 1 - progress * 4));
    }

    var ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {
        var rect = root.getBoundingClientRect();
        var scrollable = rect.height - window.innerHeight;
        var progress = scrollable > 0 ? (-rect.top) / scrollable : 0;
        progress = Math.min(1, Math.max(0, progress));
        lastProgress = progress;
        render(progress);
        ticking = false;
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", function () { render(lastProgress); });
    onScroll();
  })();
  </script>
</div>
<!-- ===== End Scroll Orbit ===== -->
`;
}

export function buildPreviewDocument(snippet: string): string {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Scroll Orbit Preview</title>
<style>
  body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; background:#fff; color:#111; }
  .filler { height: 100vh; display:flex; align-items:center; justify-content:center; font-size: 14px; opacity:0.5; letter-spacing: 0.1em; text-transform: uppercase; }
</style>
</head>
<body>
  <div class="filler">Scroll down &darr;</div>
  ${snippet}
  <div class="filler">End of section &mdash; scroll back up &uarr;</div>
</body>
</html>
`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
