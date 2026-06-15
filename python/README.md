# Scroll Orbit Generator (Python CLI)

Turn a 360&deg; "orbit" product video into the scroll-driven rotation
effect used on pages like
[rolex.com/watches/deepsea](https://www.rolex.com/watches/deepsea/m136660-0005).

It does two things:

1. Extracts evenly-spaced frames from your video and assembles them into
   a single **sprite-sheet image** (a grid of frames).
2. Generates a self-contained **HTML/CSS/JS snippet** that draws the
   sprite frame-by-frame on a `<canvas>` as the user scrolls, recreating
   the "spin as you scroll" effect.

The snippet is scoped to a unique container ID, so it's safe to paste
into a WordPress "Custom HTML" block, an Elementor HTML widget, a
Webflow embed, or any other page.

## Requirements

- Python 3.8+
- [ffmpeg / ffprobe](https://ffmpeg.org/) available on your `PATH`
- Pillow

```bash
pip install -r requirements.txt
```

On macOS: `brew install ffmpeg`
On Ubuntu/Debian: `sudo apt install ffmpeg`
On Windows: download from ffmpeg.org and add the `bin/` folder to PATH.

## Usage

```bash
python3 extract_frames.py \
    --video orbit.mp4 \
    --output-dir output \
    --frames 90 \
    --width 800 \
    --scroll-vh 300 \
    --bg "#0b0b0c" \
    --title "Submariner Date" \
    --subtitle "Scroll to rotate"
```

This creates an `output/` folder containing:

- **sprite.jpg** &mdash; the frame grid (sprite sheet)
- **snippet.html** &mdash; the HTML/CSS/JS block to paste into your page
- **preview.html** &mdash; a standalone page to test the effect locally
  (open it directly in a browser)
- **meta.json** &mdash; sprite metadata (frame count, grid size, etc.)

### Options

| Flag | Default | Description |
| --- | --- | --- |
| `--video` | (required) | Path to the input orbit video (mp4, mov, webm, ...) |
| `--output-dir` | `output` | Where to write the sprite + HTML output |
| `--frames` | `90` | Number of frames to extract. 60-90 gives a smooth single rotation |
| `--width` | `800` | Width in px of each extracted frame |
| `--scroll-vh` | `300` | Total scroll distance (in viewport heights) for one full rotation. Larger = slower/longer |
| `--bg` | `#0b0b0c` | Background color behind the product while pinned |
| `--text-color` | `#f5f5f5` | Caption / progress-bar color |
| `--title` | (none) | Optional headline shown while scrolling in |
| `--subtitle` | (none) | Optional eyebrow / subtitle text |
| `--sprite-url` | `./sprite.jpg` | URL to use for the sprite in the generated snippet (set this after uploading the sprite to your media library) |
| `--quality` | `85` | JPEG quality (1-100) for the sprite sheet |
| `--container-id` | auto | Override the auto-generated unique container ID |
| `--keep-frames` | off | Keep the individual extracted frame PNGs |

## Publishing to WordPress / Webflow

1. Run the script to generate `sprite.jpg` and `snippet.html`.
2. Open `preview.html` locally to confirm the effect looks right.
3. Upload `sprite.jpg` to your media library and copy its public URL.
4. Open `snippet.html` and replace `./sprite.jpg` in the `spriteUrl`
   line with that URL (or just re-run the script with `--sprite-url`
   pointing at the final URL).
5. Paste the full contents of `snippet.html` into a Custom HTML
   block (WordPress/Gutenberg), an HTML widget (Elementor), or an
   Embed element (Webflow).

## Tuning the effect

- **More frames** = smoother rotation, larger sprite file. 60-90 is a
  good range for one full 360&deg; turn.
- **`--scroll-vh`** controls how much the user has to scroll to see the
  full rotation. Increase it to slow the effect down, decrease it to
  speed it up.
- The snippet respects `prefers-reduced-motion`: users with that
  setting enabled see a single static frame instead of the scroll
  animation.

## Example output

The `example-output/` folder shows what the script produces (generated
from a 3-second test clip): `sprite.jpg` (a 8&times;8 grid of 60
frames), `snippet.html`, `preview.html`, and `meta.json`. Open
`example-output/preview.html` in a browser to see the effect in action.

## Notes

- Frame extraction uses ffmpeg's `fps` filter on evenly-spaced
  timestamps, then trims/pads to the exact frame count you asked for.
- The sprite grid is `ceil(sqrt(frames))` columns by however many rows
  are needed, so e.g. 90 frames &rarr; a 10&times;9 grid.
- Want to do this without installing Python/ffmpeg locally? See the
  `web-app/` folder for a browser-based version that runs entirely in
  the browser (no upload, no server) and can be deployed to Vercel.
