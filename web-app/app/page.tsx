"use client";

import { useEffect, useMemo, useState } from "react";
import Dropzone from "@/components/Dropzone";
import OrbitCanvas from "@/components/OrbitCanvas";
import { extractSpriteSheetFromVideo } from "@/lib/extractFrames";
import { generateSnippet, type SpriteMeta } from "@/lib/generateSnippet";
import { downloadOrbitPackage } from "@/lib/exportPackage";

const DEMO_META: SpriteMeta = {
  columns: 8,
  rows: 8,
  frameWidth: 400,
  frameHeight: 400,
  frameCount: 60,
  sheetWidth: 3200,
  sheetHeight: 3200,
};

const FRAME_WIDTH_OPTIONS = [480, 640, 800, 960, 1280];

interface Result {
  spriteBlob: Blob;
  spriteUrl: string;
  meta: SpriteMeta;
}

export default function Home() {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [frameCount, setFrameCount] = useState(72);
  const [frameWidth, setFrameWidth] = useState(640);

  const [scrollVh, setScrollVh] = useState(300);
  const [bgColor, setBgColor] = useState("#0b0b0c");
  const [textColor, setTextColor] = useState("#f5f5f5");
  const [title, setTitle] = useState("");
  const [subtitle, setSubtitle] = useState("");

  const [building, setBuilding] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [copied, setCopied] = useState(false);

  const [containerId] = useState(() => `scroll-orbit-${Math.random().toString(36).slice(2, 10)}`);

  useEffect(() => {
    return () => {
      if (result) URL.revokeObjectURL(result.spriteUrl);
    };
  }, [result]);

  const snippet = useMemo(() => {
    if (!result) return null;
    return generateSnippet(result.meta, {
      containerId,
      spriteUrl: "./sprite.jpg",
      scrollVh,
      bgColor,
      textColor,
      title,
      subtitle,
    });
  }, [result, containerId, scrollVh, bgColor, textColor, title, subtitle]);

  async function handleBuild() {
    if (!videoFile) return;
    setBuilding(true);
    setError(null);
    setProgress({ done: 0, total: frameCount });

    try {
      const { spriteBlob, meta } = await extractSpriteSheetFromVideo(videoFile, {
        frameCount,
        frameWidth,
        onProgress: (done, total) => setProgress({ done, total }),
      });
      const spriteUrl = URL.createObjectURL(spriteBlob);
      setResult((prev) => {
        if (prev) URL.revokeObjectURL(prev.spriteUrl);
        return { spriteBlob, spriteUrl, meta };
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBuilding(false);
    }
  }

  async function handleDownload() {
    if (!result || !snippet) return;
    await downloadOrbitPackage({ spriteBlob: result.spriteBlob, snippet, containerId });
  }

  async function handleCopy() {
    if (!snippet) return;
    await navigator.clipboard.writeText(snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  }

  const spriteSizeKb = result ? Math.round(result.spriteBlob.size / 1024) : 0;

  return (
    <main>
      <OrbitCanvas
        spriteUrl="/demo-sprite.jpg"
        meta={DEMO_META}
        scrollVh={200}
        bgColor="#0e0e13"
        textColor="#f4f1ea"
        title="Scroll Orbit Builder"
        subtitle="Scroll to see it in action"
      />

      <div className="container">
        <section className="intro">
          <div className="eyebrow">Orbit video &rarr; scroll-driven rotation</div>
          <h1>Drop in a 360&deg; product video. Walk away with a paste-ready snippet.</h1>
          <p>
            The hero above is the actual output of this tool &mdash; a sprite sheet of frames pulled from a
            short rotation video, drawn to a canvas frame-by-frame as you scroll. Upload your own orbit
            footage below and it generates the same effect, scoped and ready to drop into a WordPress
            Custom HTML block, Elementor widget, or Webflow embed.
          </p>
          <div className="tags">
            <span className="tag">runs entirely in your browser</span>
            <span className="tag">no upload, no server</span>
            <span className="tag">WordPress / Webflow / any HTML</span>
            <span className="tag">respects prefers-reduced-motion</span>
          </div>
        </section>

        <section className="step">
          <div className="step-head">
            <span className="step-number">01</span>
            <h2>Upload your orbit video</h2>
          </div>
          <Dropzone file={videoFile} onFile={setVideoFile} />
        </section>

        <section className="step">
          <div className="step-head">
            <span className="step-number">02</span>
            <h2>Extract frames</h2>
          </div>
          <p className="step-desc">
            More frames = smoother rotation but a larger sprite image. 60&ndash;90 frames is a good
            starting point for a single full rotation.
          </p>
          <div className="settings-grid">
            <div className="field">
              <label>
                <span>Frame count</span>
                <span className="value">{frameCount}</span>
              </label>
              <input
                type="range"
                min={24}
                max={180}
                step={6}
                value={frameCount}
                onChange={(e) => setFrameCount(Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label>
                <span>Frame width</span>
                <span className="value">{frameWidth}px</span>
              </label>
              <select
                value={frameWidth}
                onChange={(e) => setFrameWidth(Number(e.target.value))}
                style={{
                  background: "var(--surface-2)",
                  border: "1px solid var(--line)",
                  borderRadius: 8,
                  padding: "10px 12px",
                  color: "var(--text)",
                  fontFamily: "var(--font-body)",
                  fontSize: 14,
                }}
              >
                {FRAME_WIDTH_OPTIONS.map((w) => (
                  <option key={w} value={w}>
                    {w}px
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={{ marginTop: 24 }}>
            <button className="button button-primary" onClick={handleBuild} disabled={!videoFile || building}>
              {building ? "Extracting frames..." : "Extract frames & build preview"}
            </button>
          </div>

          {progress && building && (
            <div className="build-progress">
              <div className="progress-track">
                <div
                  className="progress-fill"
                  style={{ width: `${(progress.done / progress.total) * 100}%` }}
                />
              </div>
              <div className="progress-label">
                {progress.done} / {progress.total} frames
              </div>
            </div>
          )}

          {error && <div className="error-box">{error}</div>}
        </section>

        <section className="step">
          <div className="step-head">
            <span className="step-number">03</span>
            <h2>Style the section</h2>
          </div>
          <p className="step-desc">
            These affect how the pinned section looks and how much scrolling it takes to complete one
            rotation. Changes apply instantly to the preview below &mdash; no need to re-extract.
          </p>
          <div className="settings-grid">
            <div className="field">
              <label>
                <span>Scroll length</span>
                <span className="value">{scrollVh}vh</span>
              </label>
              <input
                type="range"
                min={150}
                max={500}
                step={10}
                value={scrollVh}
                onChange={(e) => setScrollVh(Number(e.target.value))}
              />
            </div>
            <div className="field" />
            <div className="field">
              <label>
                <span>Background color</span>
              </label>
              <div className="color-field">
                <input type="color" value={bgColor} onChange={(e) => setBgColor(e.target.value)} />
                <input type="text" value={bgColor} onChange={(e) => setBgColor(e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label>
                <span>Text color</span>
              </label>
              <div className="color-field">
                <input type="color" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
                <input type="text" value={textColor} onChange={(e) => setTextColor(e.target.value)} />
              </div>
            </div>
            <div className="field">
              <label>
                <span>Headline (optional)</span>
              </label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Submariner Date" />
            </div>
            <div className="field">
              <label>
                <span>Eyebrow text (optional)</span>
              </label>
              <input
                type="text"
                value={subtitle}
                onChange={(e) => setSubtitle(e.target.value)}
                placeholder="e.g. Scroll to explore"
              />
            </div>
          </div>
        </section>

        <section className="step">
          <div className="step-head">
            <span className="step-number">04</span>
            <h2>Preview &amp; export</h2>
          </div>

          {!result ? (
            <p className="step-desc">Upload a video and run step 02 to see a live preview here.</p>
          ) : (
            <>
              <div className="preview-wrap">
                <OrbitCanvas
                  spriteUrl={result.spriteUrl}
                  meta={result.meta}
                  scrollVh={scrollVh}
                  bgColor={bgColor}
                  textColor={textColor}
                  title={title}
                  subtitle={subtitle}
                />
              </div>

              <div className="preview-meta">
                <span>
                  Frames: <strong>{result.meta.frameCount}</strong>
                </span>
                <span>
                  Grid: <strong>{result.meta.columns} &times; {result.meta.rows}</strong>
                </span>
                <span>
                  Sprite: <strong>{result.meta.sheetWidth} &times; {result.meta.sheetHeight}px</strong>
                </span>
                <span>
                  Size: <strong>{spriteSizeKb} KB</strong>
                </span>
              </div>

              <div style={{ marginTop: 24, display: "flex", flexWrap: "wrap", gap: 12 }}>
                <button className="button button-primary" onClick={handleDownload}>
                  Download package (.zip)
                </button>
                <button className="button button-secondary" onClick={handleCopy}>
                  {copied ? "Copied" : "Copy HTML snippet"}
                </button>
              </div>

              <p className="hint">
                The .zip contains <code>sprite.jpg</code>, <code>snippet.html</code>, a local{" "}
                <code>preview.html</code>, and a README. Upload the sprite to your WordPress media library,
                paste its URL into the <code>spriteUrl</code> line, then drop the snippet into a Custom HTML
                block.
              </p>
            </>
          )}
        </section>
      </div>

      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <span className="logo">Scroll Orbit Builder</span>
            <span>Built with Next.js &middot; processes video locally, nothing leaves the browser</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
