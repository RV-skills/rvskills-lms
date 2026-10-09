"use client";

import { useEffect, useRef, useState, type JSX } from "react";
import { Document, Page, pdfjs } from "react-pdf";

// pdf.js reads the PDF in a background worker. react-pdf's README says this must be set
// in the same file that renders <Document>/<Page>, or its default can overwrite it.
pdfjs.GlobalWorkerOptions.workerSrc = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url).toString();

const ZOOM_LEVELS = [0.75, 1, 1.25, 1.5, 2];

export default function PdfViewer({ url, title }: { url: string; title: string }): JSX.Element {
  const viewerRef = useRef<HTMLDivElement>(null);
  const pageAreaRef = useRef<HTMLDivElement>(null);
  const [areaWidth, setAreaWidth] = useState(0);
  const [numPages, setNumPages] = useState(0);
  const [page, setPage] = useState(1);
  const [zoomIndex, setZoomIndex] = useState(1);
  const [failed, setFailed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Fit the page to the available width, and re-fit whenever that changes
  // (window resized, sidebar collapsed, fullscreen entered or left).
  useEffect(() => {
    const area = pageAreaRef.current;
    if (!area) return;
    const observer = new ResizeObserver(([entry]) => setAreaWidth(entry.contentRect.width));
    observer.observe(area);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onChange = (): void => setIsFullscreen(document.fullscreenElement === viewerRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  function goTo(target: number): void {
    setPage(Math.min(Math.max(target, 1), Math.max(numPages, 1)));
  }

  function toggleFullscreen(): void {
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void viewerRef.current?.requestFullscreen();
    }
  }

  function onKeyDown(e: React.KeyboardEvent): void {
    if (e.key === "ArrowRight" || e.key === "PageDown") goTo(page + 1);
    if (e.key === "ArrowLeft" || e.key === "PageUp") goTo(page - 1);
  }

  if (failed) {
    return (
      <div className="flex h-full items-center justify-center p-6 text-center text-sm text-neutral-500">
        This document couldn&apos;t be loaded. The file may have moved, or its host may not allow it to be shown here.
      </div>
    );
  }

  const zoom = ZOOM_LEVELS[zoomIndex];
  const button = "rounded px-2 py-1 text-xs text-neutral-100 hover:bg-white/10 disabled:opacity-40";

  return (
    <div
      ref={viewerRef}
      tabIndex={0}
      onKeyDown={onKeyDown}
      aria-label={`Document: ${title}`}
      className="flex h-full flex-col bg-neutral-900 outline-none"
    >
      <div className="flex items-center gap-2 border-b border-white/10 px-3 py-2">
        <button className={button} onClick={() => goTo(page - 1)} disabled={page <= 1} aria-label="Previous page">
          ‹ Prev
        </button>
        <span className="text-xs text-neutral-100">
          {numPages > 0 ? `${page} / ${numPages}` : "…"}
        </span>
        <button className={button} onClick={() => goTo(page + 1)} disabled={page >= numPages} aria-label="Next page">
          Next ›
        </button>

        <div className="ml-auto flex items-center gap-1">
          <button className={button} onClick={() => setZoomIndex((i) => i - 1)} disabled={zoomIndex === 0} aria-label="Zoom out">
            −
          </button>
          <span className="w-12 text-center text-xs text-neutral-100">{Math.round(zoom * 100)}%</span>
          <button
            className={button}
            onClick={() => setZoomIndex((i) => i + 1)}
            disabled={zoomIndex === ZOOM_LEVELS.length - 1}
            aria-label="Zoom in"
          >
            +
          </button>
          <button className={button} onClick={toggleFullscreen} aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}>
            {isFullscreen ? "Exit full screen" : "Full screen"}
          </button>
        </div>
      </div>

      {/* Right-click is blocked on the page to discourage "Save image as". This is a deterrent,
          not protection: anything shown in a browser can be captured by a determined user. */}
      <div ref={pageAreaRef} className="flex-1 overflow-auto p-4" onContextMenu={(e) => e.preventDefault()}>
        <Document
          file={url}
          onLoadSuccess={({ numPages: total }) => setNumPages(total)}
          onLoadError={() => setFailed(true)}
          loading={<p className="text-center text-sm text-neutral-500">Loading document…</p>}
        >
          {areaWidth > 0 && (
            <Page
              pageNumber={page}
              width={areaWidth * zoom}
              renderTextLayer={false}
              renderAnnotationLayer={false}
              className="mx-auto w-fit shadow-lg"
            />
          )}
        </Document>
      </div>
    </div>
  );
}