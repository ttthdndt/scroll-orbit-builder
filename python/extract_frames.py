#!/usr/bin/env python3
"""
Scroll Orbit Generator
=======================

Turns a 360-degree "orbit" product video into:
  1. A single sprite-sheet image (a grid of evenly-spaced frames)
  2. A self-contained HTML/CSS/JS snippet that recreates the
     scroll-driven rotation effect seen on rolex.com product pages
     (e.g. https://www.rolex.com/watches/deepsea/m136660-0005)

The output snippet is a single <div> + <style> + <script> block with a
unique, scoped ID -- safe to paste into a WordPress "Custom HTML" block,
Elementor HTML widget, or any other page builder.

Usage:
    python3 extract_frames.py \\
        --video orbit.mp4 \\
        --output-dir output \\
        --frames 90 \\
        --width 800 \\
        --scroll-vh 300 \\
        --bg "#0b0b0c" \\
        --title "Submariner Date" \\
        --subtitle "Cuon de xem toan canh 360 do"

Requirements:
    - ffmpeg / ffprobe available on PATH
    - Pillow (pip install Pillow)
"""

import argparse
import json
import math
import os
import shutil
import subprocess
import sys
import uuid

from PIL import Image


# --------------------------------------------------------------------------
# Video helpers
# --------------------------------------------------------------------------

def get_duration_seconds(video_path: str) -> float:
    """Return the duration of the video in seconds using ffprobe."""
    cmd = [
        "ffprobe", "-v", "error",
        "-show_entries", "format=duration",
        "-of", "default=noprint_wrappers=1:nokey=1",
        video_path,
    ]
    out = subprocess.check_output(cmd, text=True).strip()
    return float(out)


def extract_frames(video_path: str, frames_dir: str, num_frames: int, width: int) -> list:
    """
    Extract approximately `num_frames` evenly-spaced frames from
    `video_path`, scaled to `width` px wide, into `frames_dir`.

    Returns a sorted list of the resulting frame file paths, trimmed
    or padded so that len(result) == num_frames exactly.
    """
    os.makedirs(frames_dir, exist_ok=True)

    duration = get_duration_seconds(video_path)
    if duration <= 0:
        raise ValueError("Could not determine video duration (or duration is 0)")

    target_fps = num_frames / duration

    pattern = os.path.join(frames_dir, "frame_%05d.jpg")
    cmd = [
        "ffmpeg", "-y",
        "-i", video_path,
        "-vf", f"fps={target_fps},scale={width}:-2:flags=lanczos",
        "-q:v", "2",
        pattern,
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        raise RuntimeError(f"ffmpeg failed:\n{result.stderr}")

    frames = sorted(
        os.path.join(frames_dir, f) for f in os.listdir(frames_dir)
        if f.startswith("frame_") and f.endswith(".jpg")
    )

    if not frames:
        raise RuntimeError("ffmpeg produced no frames -- check the input video")

    # Trim or pad so we end up with exactly num_frames images.
    if len(frames) > num_frames:
        frames = frames[:num_frames]
    elif len(frames) < num_frames:
        last = frames[-1]
        while len(frames) < num_frames:
            new_name = os.path.join(frames_dir, f"frame_pad_{len(frames):05d}.jpg")
            shutil.copy(last, new_name)
            frames.append(new_name)
        frames.sort()

    return frames


# --------------------------------------------------------------------------
# Sprite sheet
# --------------------------------------------------------------------------

def build_sprite_sheet(frame_paths: list, sprite_path: str, jpeg_quality: int = 85):
    """
    Combine all frames into a single grid sprite-sheet image.

    Returns a dict with sprite metadata: columns, rows, frame_width,
    frame_height, frame_count, sheet_width, sheet_height.
    """
    first = Image.open(frame_paths[0])
    frame_w, frame_h = first.size

    count = len(frame_paths)
    columns = math.ceil(math.sqrt(count))
    rows = math.ceil(count / columns)

    sheet_w = frame_w * columns
    sheet_h = frame_h * rows

    sheet = Image.new("RGB", (sheet_w, sheet_h), (0, 0, 0))

    for idx, path in enumerate(frame_paths):
        img = Image.open(path)
        if img.size != (frame_w, frame_h):
            img = img.resize((frame_w, frame_h))
        col = idx % columns
        row = idx // columns
        sheet.paste(img, (col * frame_w, row * frame_h))

    sheet.save(sprite_path, "JPEG", quality=jpeg_quality, optimize=True)

    return {
        "columns": columns,
        "rows": rows,
        "frame_width": frame_w,
        "frame_height": frame_h,
        "frame_count": count,
        "sheet_width": sheet_w,
        "sheet_height": sheet_h,
    }


# --------------------------------------------------------------------------
# HTML / CSS / JS snippet
# --------------------------------------------------------------------------

SNIPPET_TEMPLATE = """<!-- ===== Scroll Orbit: {container_id} ===== -->
<div id="{container_id}" class="scroll-orbit">
  <style>
    #{container_id} {{
      position: relative;
      height: {scroll_vh}vh;
      box-sizing: border-box;
    }}
    #{container_id} * {{ box-sizing: border-box; }}
    #{container_id} .so-sticky {{
      position: sticky;
      top: 0;
      height: 100vh;
      overflow: hidden;
      display: flex;
      align-items: center;
      justify-content: center;
      background: {bg_color};
    }}
    #{container_id} canvas {{
      width: 100%;
      height: 100%;
      display: block;
    }}
    #{container_id} .so-caption {{
      position: absolute;
      left: 0;
      right: 0;
      text-align: center;
      color: {text_color};
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      pointer-events: none;
      transition: opacity 0.4s ease;
      padding: 0 24px;
    }}
    #{container_id} .so-caption-top {{
      top: 8%;
    }}
    #{container_id} .so-caption-top h2 {{
      font-size: clamp(22px, 4vw, 42px);
      font-weight: 600;
      letter-spacing: 0.02em;
      margin: 0 0 8px;
    }}
    #{container_id} .so-caption-top p {{
      font-size: clamp(13px, 1.4vw, 17px);
      opacity: 0.75;
      margin: 0;
      letter-spacing: 0.04em;
      text-transform: uppercase;
    }}
    #{container_id} .so-progress {{
      position: absolute;
      bottom: 6%;
      left: 50%;
      transform: translateX(-50%);
      width: min(280px, 60%);
      height: 2px;
      background: rgba(128,128,128,0.3);
      border-radius: 2px;
      overflow: hidden;
    }}
    #{container_id} .so-progress-bar {{
      height: 100%;
      width: 0%;
      background: {text_color};
      border-radius: 2px;
    }}
    @media (prefers-reduced-motion: reduce) {{
      #{container_id} {{ height: auto; }}
      #{container_id} .so-sticky {{ position: relative; height: auto; aspect-ratio: {frame_width} / {frame_height}; }}
    }}
  </style>

  <div class="so-sticky">
    <canvas aria-hidden="true"></canvas>
    <div class="so-caption so-caption-top">
      <h2>{title}</h2>
      <p>{subtitle}</p>
    </div>
    <div class="so-progress"><div class="so-progress-bar"></div></div>
  </div>

  <script>
  (function () {{
    var cfg = {{
      spriteUrl: "{sprite_url}",
      frameCount: {frame_count},
      columns: {columns},
      rows: {rows},
      frameWidth: {frame_width},
      frameHeight: {frame_height}
    }};

    var root = document.getElementById("{container_id}");
    if (!root) return;
    var canvas = root.querySelector("canvas");
    var ctx = canvas.getContext("2d");
    var progressBar = root.querySelector(".so-progress-bar");
    var captionTop = root.querySelector(".so-caption-top");
    var img = new Image();
    var loaded = false;
    var lastProgress = 0;

    img.onload = function () {{
      loaded = true;
      render(lastProgress);
    }};
    img.src = cfg.spriteUrl;

    function resizeCanvas() {{
      var rect = canvas.getBoundingClientRect();
      var dpr = window.devicePixelRatio || 1;
      var w = Math.round(rect.width * dpr);
      var h = Math.round(rect.height * dpr);
      if (canvas.width !== w || canvas.height !== h) {{
        canvas.width = w;
        canvas.height = h;
      }}
    }}

    function render(progress) {{
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
    }}

    var ticking = false;
    function onScroll() {{
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(function () {{
        var rect = root.getBoundingClientRect();
        var scrollable = rect.height - window.innerHeight;
        var progress = scrollable > 0 ? (-rect.top) / scrollable : 0;
        progress = Math.min(1, Math.max(0, progress));
        lastProgress = progress;
        render(progress);
        ticking = false;
      }});
    }}

    window.addEventListener("scroll", onScroll, {{ passive: true }});
    window.addEventListener("resize", function () {{ render(lastProgress); }});
    onScroll();
  }})();
  </script>
</div>
<!-- ===== End Scroll Orbit ===== -->
"""


def generate_snippet(meta: dict, sprite_url: str, scroll_vh: int, bg_color: str,
                      text_color: str, title: str, subtitle: str,
                      container_id: str) -> str:
    return SNIPPET_TEMPLATE.format(
        container_id=container_id,
        sprite_url=sprite_url,
        frame_count=meta["frame_count"],
        columns=meta["columns"],
        rows=meta["rows"],
        frame_width=meta["frame_width"],
        frame_height=meta["frame_height"],
        scroll_vh=scroll_vh,
        bg_color=bg_color,
        text_color=text_color,
        title=title,
        subtitle=subtitle,
    )


# --------------------------------------------------------------------------
# Preview page (so you can test locally before pasting into WordPress)
# --------------------------------------------------------------------------

PREVIEW_TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Scroll Orbit Preview</title>
<style>
  body {{ margin: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; background:#fff; color:#111; }}
  .filler {{ height: 100vh; display:flex; align-items:center; justify-content:center; font-size: 14px; opacity:0.5; letter-spacing: 0.1em; text-transform: uppercase; }}
</style>
</head>
<body>
  <div class="filler">Scroll down &darr;</div>
  {snippet}
  <div class="filler">End of section &mdash; scroll back up &uarr;</div>
</body>
</html>
"""


# --------------------------------------------------------------------------
# Main
# --------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(description="Generate a scroll-driven orbit effect from a video.")
    parser.add_argument("--video", required=True, help="Path to the input orbit video (mp4, mov, etc.)")
    parser.add_argument("--output-dir", default="output", help="Directory to write sprite + HTML output")
    parser.add_argument("--frames", type=int, default=90, help="Number of frames to extract (default: 90)")
    parser.add_argument("--width", type=int, default=800, help="Width in px of each extracted frame (default: 800)")
    parser.add_argument("--scroll-vh", type=int, default=300, help="Total scroll distance in vh for one full rotation (default: 300)")
    parser.add_argument("--bg", default="#0b0b0c", help="Background color of the pinned section (default: #0b0b0c)")
    parser.add_argument("--text-color", default="#f5f5f5", help="Caption/progress bar color (default: #f5f5f5)")
    parser.add_argument("--title", default="", help="Optional headline text shown while scrolling in")
    parser.add_argument("--subtitle", default="", help="Optional subtitle / eyebrow text")
    parser.add_argument("--sprite-url", default=None,
                         help="URL to use for the sprite sheet inside the generated HTML "
                              "(defaults to './sprite.jpg' -- replace with your uploaded media URL)")
    parser.add_argument("--quality", type=int, default=85, help="JPEG quality for the sprite sheet (default: 85)")
    parser.add_argument("--container-id", default=None, help="Override the auto-generated unique container ID")
    parser.add_argument("--keep-frames", action="store_true", help="Keep the individual extracted frame files")

    args = parser.parse_args()

    if not os.path.isfile(args.video):
        sys.exit(f"Input video not found: {args.video}")

    out_dir = args.output_dir
    os.makedirs(out_dir, exist_ok=True)
    frames_dir = os.path.join(out_dir, "_frames")

    print(f"-> Extracting {args.frames} frames @ {args.width}px wide from {args.video} ...")
    frame_paths = extract_frames(args.video, frames_dir, args.frames, args.width)
    print(f"   got {len(frame_paths)} frames")

    sprite_path = os.path.join(out_dir, "sprite.jpg")
    print(f"-> Building sprite sheet -> {sprite_path}")
    meta = build_sprite_sheet(frame_paths, sprite_path, jpeg_quality=args.quality)
    print(f"   grid: {meta['columns']} x {meta['rows']}  "
          f"frame: {meta['frame_width']}x{meta['frame_height']}  "
          f"sheet: {meta['sheet_width']}x{meta['sheet_height']}")

    sprite_size_kb = os.path.getsize(sprite_path) / 1024
    print(f"   sprite size: {sprite_size_kb:.0f} KB")

    container_id = args.container_id or f"scroll-orbit-{uuid.uuid4().hex[:8]}"
    sprite_url = args.sprite_url or "./sprite.jpg"

    snippet = generate_snippet(
        meta, sprite_url, args.scroll_vh, args.bg, args.text_color,
        args.title, args.subtitle, container_id,
    )

    snippet_path = os.path.join(out_dir, "snippet.html")
    with open(snippet_path, "w", encoding="utf-8") as f:
        f.write(snippet)
    print(f"-> Wrote snippet -> {snippet_path}")

    preview_path = os.path.join(out_dir, "preview.html")
    with open(preview_path, "w", encoding="utf-8") as f:
        f.write(PREVIEW_TEMPLATE.format(snippet=snippet.replace(sprite_url, "sprite.jpg")))
    print(f"-> Wrote local preview -> {preview_path}")

    meta_path = os.path.join(out_dir, "meta.json")
    with open(meta_path, "w", encoding="utf-8") as f:
        json.dump({**meta, "container_id": container_id, "sprite_url": sprite_url}, f, indent=2)

    if not args.keep_frames:
        shutil.rmtree(frames_dir, ignore_errors=True)

    print("\nDone!")
    print(f"1. Upload {sprite_path} to your WordPress media library, copy its URL.")
    print(f"2. Open {snippet_path}, replace '{sprite_url}' with that media URL.")
    print(f"3. Paste the whole snippet into a Custom HTML block on your page.")
    print(f"   (Open {preview_path} in a browser first to test the effect locally.)")


if __name__ == "__main__":
    main()
