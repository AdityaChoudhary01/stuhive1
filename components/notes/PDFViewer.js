"use client";

import { useState, useRef, useEffect } from 'react';
import { Loader2, AlertCircle, FileX, Lock, ZoomIn, ZoomOut, Maximize } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// 🚀 Pointing to the stable v8 .js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

export default function PDFViewer({ url, fileType, title, maxPages = null }) {
  const [numPages, setNumPages] = useState(null);
  const [error, setError] = useState(false);
  
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(null);
  
  const [scale, setScale] = useState(1.0);

  const isImage = fileType?.startsWith('image/');

  // 1. Measure accurate container width for flush edge-to-edge rendering
  useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        // No padding subtractions = Zero horizontal gaps
        setContainerWidth(containerRef.current.clientWidth); 
      }
    };
    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  // 2. Button Zoom Handlers (Native browser pinch-to-zoom handles the rest automatically)
  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3.0)); 
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5)); 
  const handleResetZoom = () => setScale(1.0);

  if (!url) return (
    <div className="w-full h-[600px] flex items-center justify-center bg-[#050505] text-muted-foreground rounded-2xl border border-white/5">
        <FileX className="w-10 h-10 mb-2" />
        <p>File unavailable</p>
    </div>
  );

  if (isImage) {
    return (
        <div className="w-full h-[60vh] md:h-[750px] bg-[#050505] relative flex justify-center items-center overflow-hidden rounded-2xl border border-white/5">
           <img src={url} alt={title} className="max-w-full max-h-full object-contain" />
        </div>
    );
  }

  const pagesToRender = maxPages ? Math.min(numPages || 1, maxPages) : numPages;

  return (
    // Outer Wrapper: Relative positioning to hold the absolute controls perfectly
    <div 
      ref={containerRef} 
      className="relative w-full h-[65vh] md:h-[800px] bg-[#0a0a0a] rounded-2xl border border-white/10 overflow-hidden"
    >
        {/* Scrollable Document Area - Zero padding, perfectly flush */}
        <div className="absolute inset-0 overflow-auto custom-scrollbar">
          <div className="flex flex-col items-center min-w-max">
            <Document
              file={url}
              onLoadSuccess={onDocumentLoadSuccess}
              onLoadError={(err) => {
                console.error("PDF Load Error:", err);
                setError(true);
              }}
              loading={
                <div className="flex flex-col items-center justify-center text-cyan-400 mt-32">
                  <Loader2 className="w-10 h-10 animate-spin mb-4" />
                  <p className="font-bold tracking-widest uppercase text-xs">Loading Document...</p>
                </div>
              }
            >
               {Array.from(new Array(pagesToRender || 0), (el, index) => (
                  <div 
                    key={`page_${index + 1}`} 
                    // 🚀 FIXED: Removed all margins/padding. Added a tiny 1px bottom border to separate pages visually without gaps.
                    className="relative w-full flex justify-center bg-white border-b border-gray-300"
                  >
                     <Page 
                       pageNumber={index + 1} 
                       width={containerWidth || 800} 
                       scale={scale} // React-PDF native scale correctly resizes layout
                       renderTextLayer={false} 
                       renderAnnotationLayer={false}
                     />
                     
                     {/* MARKETPLACE MAGIC: Paywall Overlay */}
                     {maxPages && index + 1 === maxPages && numPages > maxPages && (
                        <div className="absolute inset-0 bg-black/85 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 border-t-2 border-amber-500 z-10">
                           <div className="p-4 bg-amber-500/20 rounded-full mb-4 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
                             <Lock className="w-8 h-8 text-amber-400" />
                           </div>
                           <h4 className="text-xl md:text-2xl font-black text-white mb-2 tracking-tight">Preview Limit Reached</h4>
                           <p className="text-gray-400 text-xs md:text-sm max-w-xs leading-relaxed font-medium">
                             You are viewing page {maxPages} of {numPages}. Purchase the full document to unlock the remaining content.
                           </p>
                        </div>
                     )}
                  </div>
               ))}
            </Document>
          </div>
        </div>
        
        {/* 🚀 ENHANCED: Hyper-Modern Floating Controls */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className="flex items-center gap-1 md:gap-2 bg-black/60 backdrop-blur-2xl border border-white/10 px-2 py-1.5 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.5)]">
             
             <button 
               onClick={handleZoomOut} 
               disabled={scale <= 0.5}
               className="p-2 md:p-3 text-white hover:text-cyan-400 hover:bg-white/10 rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 group"
               aria-label="Zoom Out"
             >
               <ZoomOut className="w-4 h-4 md:w-5 md:h-5 group-hover:scale-110 transition-transform" />
             </button>
             
             <div className="text-[10px] md:text-xs font-bold text-white w-14 text-center select-none bg-white/5 py-1.5 px-2 rounded-full border border-white/5">
                {Math.round(scale * 100)}%
             </div>

             <button 
               onClick={handleZoomIn} 
               disabled={scale >= 3.0}
               className="p-2 md:p-3 text-white hover:text-cyan-400 hover:bg-white/10 rounded-full transition-all disabled:opacity-30 disabled:cursor-not-allowed active:scale-95 group"
               aria-label="Zoom In"
             >
               <ZoomIn className="w-4 h-4 md:w-5 md:h-5 group-hover:scale-110 transition-transform" />
             </button>

             <div className="w-px h-6 bg-white/10 mx-1" />

             <button 
               onClick={handleResetZoom} 
               className="p-2 md:p-3 text-gray-400 hover:text-white hover:bg-white/10 rounded-full transition-all active:scale-95 group"
               title="Fit to Screen"
             >
               <Maximize className="w-4 h-4 md:w-4 md:h-4 group-hover:scale-110 transition-transform" />
             </button>

          </div>
        </div>

        {error && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center text-red-400 bg-red-500/10 p-6 rounded-2xl border border-red-500/20 w-max z-50">
             <AlertCircle className="w-10 h-10 mb-3" />
             <p className="font-bold text-sm">Failed to load PDF preview.</p>
          </div>
        )}
    </div>
  );
}