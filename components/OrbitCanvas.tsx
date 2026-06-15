"use client";

import { useEffect, useRef } from "react";
import type { SpriteMeta } from "@/lib/generateSnippet";

export interface OrbitCanvasProps {
  spriteUrl: string;
  meta: SpriteMeta;
  scrollVh?: number;
  bgColor?: string;
  textColor?: string;
  title?: string;
  subtitle?: string;
  className?: string;
}

/**
 * In-app preview of the scroll-orbit effect. Mirrors the behaviour of the
 * vanilla-JS snippet produced by `generateSnippet`, but as a React
 * component so it can be dropped straight into this page for live previews
 * (including the hero demo).
 */
export default function OrbitCanvas({
  spriteUrl,
  meta,
  scrollVh = 300,
  bgColor = "#0b0b0c",
  textColor = "#f5f5f5",
  title,
  subtitle,
  className,
}: OrbitCanvasProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const captionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let loaded = false;
    let lastProgress = 0;
    let ticking = false;

    const img = new Image();
    img.onload = () => {
      loaded = true;
      render(lastProgress);
    };
    img.src = spriteUrl;

    function resizeCanvas() {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.height * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }

    function render(progress: number) {
      if (!loaded || !canvas || !ctx) return;
      resizeCanvas();

      const frameIndex = Math.min(
        meta.frameCount - 1,
        Math.max(0, Math.round(progress * (meta.frameCount - 1)))
      );
      const col = frameIndex % meta.columns;
      const row = Math.floor(frameIndex / meta.columns);

      const cw = canvas.width;
      const ch = canvas.height;
      const scale = Math.min(cw / meta.frameWidth, ch / meta.frameHeight);
      const dw = meta.frameWidth * scale;
      const dh = meta.frameHeight * scale;
      const dx = (cw - dw) / 2;
      const dy = (ch - dh) / 2;

      ctx.clearRect(0, 0, cw, ch);
      ctx.drawImage(
        img,
        col * meta.frameWidth,
        row * meta.frameHeight,
        meta.frameWidth,
        meta.frameHeight,
        dx,
        dy,
        dw,
        dh
      );

      if (progressRef.current) {
        progressRef.current.style.width = `${(progress * 100).toFixed(1)}%`;
      }
      if (captionRef.current) {
        captionRef.current.style.opacity = String(Math.max(0, 1 - progress * 4));
      }
    }

    function onScroll() {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        if (!root) return;
        const rect = root.getBoundingClientRect();
        const scrollable = rect.height - window.innerHeight;
        let progress = scrollable > 0 ? -rect.top / scrollable : 0;
        progress = Math.min(1, Math.max(0, progress));
        lastProgress = progress;
        render(progress);
        ticking = false;
      });
    }

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();

    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [spriteUrl, meta, scrollVh]);

  return (
    <div ref={rootRef} className={className} style={{ position: "relative", height: `${scrollVh}vh` }}>
      <div
        style={{
          position: "sticky",
          top: 0,
          height: "100vh",
          overflow: "hidden",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: bgColor,
        }}
      >
        <canvas aria-hidden style={{ width: "100%", height: "100%", display: "block" }} ref={canvasRef} />
        {(title || subtitle) && (
          <div
            ref={captionRef}
            style={{
              position: "absolute",
              top: "8%",
              left: 0,
              right: 0,
              textAlign: "center",
              color: textColor,
              transition: "opacity 0.4s ease",
              pointerEvents: "none",
              padding: "0 24px",
            }}
          >
            {title && (
              <h2
                style={{
                  fontSize: "clamp(22px, 4vw, 42px)",
                  fontWeight: 600,
                  letterSpacing: "0.02em",
                  margin: "0 0 8px",
                }}
              >
                {title}
              </h2>
            )}
            {subtitle && (
              <p
                style={{
                  fontSize: "clamp(13px, 1.4vw, 17px)",
                  opacity: 0.75,
                  margin: 0,
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                }}
              >
                {subtitle}
              </p>
            )}
          </div>
        )}
        <div
          style={{
            position: "absolute",
            bottom: "6%",
            left: "50%",
            transform: "translateX(-50%)",
            width: "min(280px, 60%)",
            height: 2,
            background: "rgba(128,128,128,0.3)",
            borderRadius: 2,
            overflow: "hidden",
          }}
        >
          <div ref={progressRef} style={{ height: "100%", width: "0%", background: textColor, borderRadius: 2 }} />
        </div>
      </div>
    </div>
  );
}
