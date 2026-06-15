"use client";

import { useRef, useState, type DragEvent, type ChangeEvent } from "react";

interface DropzoneProps {
  file: File | null;
  onFile: (file: File) => void;
}

export default function Dropzone({ file, onFile }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (!f.type.startsWith("video/")) return;
    onFile(f);
  }

  function handleDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    handleFiles(e.dataTransfer.files);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    handleFiles(e.target.files);
  }

  return (
    <div
      className={`dropzone${dragging ? " dragging" : ""}`}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={handleDrop}
      role="button"
      tabIndex={0}
    >
      <div className="dropzone-title">Drop an orbit video here, or click to browse</div>
      <div className="dropzone-sub">MP4 / MOV / WebM &mdash; processed locally in your browser, never uploaded</div>
      <input ref={inputRef} type="file" accept="video/*" onChange={handleChange} />
      {file && (
        <div className="file-pill">
          <span className="dot" />
          {file.name} &middot; {(file.size / (1024 * 1024)).toFixed(1)} MB
        </div>
      )}
    </div>
  );
}
