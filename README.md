# Scroll Orbit Builder

Turn a 360&deg; "orbit" product video into the scroll-driven rotation
effect used on pages like
[rolex.com/watches/deepsea](https://www.rolex.com/watches/deepsea/m136660-0005)
&mdash; output as a self-contained HTML/CSS/JS snippet you can paste
into WordPress, Webflow, or any HTML page.

This repo contains **two ways to generate the snippet**:

## 1. `python/` &mdash; command-line tool

Run locally with Python + ffmpeg. Good if you're comfortable with the
command line and want to batch-process several videos.

```bash
cd python
pip install -r requirements.txt
python3 extract_frames.py --video orbit.mp4 --output-dir output \
  --frames 90 --width 800 --title "Submariner Date"
```

See [`python/README.md`](python/README.md) for full usage.

## 2. `web-app/` &mdash; browser app (deploy to Vercel)

A Next.js app with the same logic, but everything runs **client-side in
the browser** &mdash; you drag in a video, it extracts frames using
`<video>` + `<canvas>` (no upload, no server, no ffmpeg needed), shows a
live preview of the effect, and lets you download a ready-to-use `.zip`
or copy the HTML snippet directly.

### Run it locally

```bash
cd web-app
npm install
npm run dev
```

Then open http://localhost:3000

### Deploy to Vercel

1. **Create a GitHub repo** and push the contents of this project
   (or just the `web-app/` folder) to it:

   ```bash
   cd web-app
   git init
   git add .
   git commit -m "Scroll orbit builder"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```

2. Go to [vercel.com](https://vercel.com), click **Add New &rarr;
   Project**, and import the GitHub repo you just created.
3. Vercel auto-detects it as a **Next.js** project &mdash; no
   environment variables or special config needed. Click **Deploy**.
4. Once deployed, open the live URL, drop in your orbit video, tune the
   settings, and click **Download package (.zip)** or **Copy HTML
   snippet**.

> If you pushed the whole repo (not just `web-app/`), set the Vercel
> project's **Root Directory** to `web-app` in the project settings so
> it builds the right folder.

## Using the output snippet

Whichever tool you use, you'll end up with:

- **sprite.jpg** &mdash; a grid image containing all the extracted
  frames
- **snippet.html** &mdash; a self-contained, uniquely-scoped
  `<div>` + `<style>` + `<script>` block

To publish:

1. Upload `sprite.jpg` to your WordPress media library (or Webflow
   assets) and copy its URL.
2. In `snippet.html`, find the line `spriteUrl: "./sprite.jpg"` inside
   the `<script>` block and replace it with the URL from step 1.
3. Paste the entire `snippet.html` contents into a **Custom HTML**
   block (WordPress/Gutenberg), an **HTML** widget (Elementor), or an
   **Embed** element (Webflow).
4. Publish and scroll through the section.

### Tuning

- **Frame count** (60-90 is a good range): more frames = smoother spin,
  larger sprite file.
- **Scroll length (`scroll-vh`)**: how many viewport-heights of
  scrolling it takes to complete the rotation. Bigger = slower/longer.
- **Background / text color, title, subtitle**: cosmetic options baked
  into the snippet.
- The effect respects `prefers-reduced-motion` (shows a static frame
  instead of animating) and is responsive on mobile.

## Project structure

```
.
├── python/                 CLI tool (ffmpeg + Pillow)
│   ├── extract_frames.py
│   ├── requirements.txt
│   └── README.md
└── web-app/                Next.js app (deploy to Vercel)
    ├── app/                pages, layout, global styles
    ├── components/         OrbitCanvas (live preview), Dropzone
    ├── lib/                 frame extraction, snippet generation, zip export
    └── public/              demo sprite used in the hero section
```
