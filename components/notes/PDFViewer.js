"use client";

import { useState, useRef, useEffect } from 'react';
import { Loader2, AlertCircle, FileX, Lock, ZoomIn, ZoomOut, Maximize, FileText } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// 🚀 Pointing to the stable v8 .js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

export default function PDFViewer({ url, fileType, title, maxPages = null }) {
  const [numPages, setNumPages] = useState(null);
  const [error, setError] = useState(false);
  const [iframeLoading, setIframeLoading] = useState(true);
  
  const containerRef = useRef(null);
  const [containerWidth, setContainerWidth] = useState(null);
  const [scale, setScale] = useState(1.0);

  const isImage = fileType?.startsWith('image/');
  const isPDF = fileType === 'application/pdf' || url?.toLowerCase().includes('.pdf');

  // 1. Measure container width for PDF rendering
  useEffect(() => {
    if (!isPDF) return;
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth - 24); 
      }
    };
    updateWidth();
    setTimeout(updateWidth, 100); 
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, [isPDF]);

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.25, 3.0)); 
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.25, 0.5)); 
  const handleResetZoom = () => setScale(1.0);

  if (!url) return (
    <div className="w-full h-[600px] flex items-center justify-center bg-secondary/10 text-muted-foreground rounded-xl border border-border">
        <FileX className="w-10 h-10 mb-2" />
        <p>File unavailable</p>
    </div>
  );

  // Strategy A: Image Viewer
  if (isImage) {
    return (
        <div className="w-full h-[60vh] md:h-[750px] bg-[#0a0a0a] relative flex justify-center items-center overflow-hidden rounded-xl border border-white/10">
           <img src={url} alt={title} className="max-w-full max-h-full object-contain" />
        </div>
    );
  }

  // 🚀 Strategy B: Word / PPT / Excel / Text Viewer
  // Now completely clean. If maxPages exists, the backend provides the restricted file.
  if (!isPDF && !isImage) {
    const googleViewerUrl = `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
    
    return (
      <div className="w-full h-[70vh] md:h-[800px] bg-[#0a0a0a] relative rounded-xl border border-white/10 overflow-hidden flex flex-col">
        {iframeLoading && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-background/80 backdrop-blur-md">
            <Loader2 className="h-10 w-10 animate-spin text-cyan-400 mb-4" />
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Loading Document Preview...</p>
          </div>
        )}
        
        <div className="flex-1 w-full overflow-auto">
          <iframe
            src={googleViewerUrl}
            className="w-full h-full border-none bg-white"
            title={title || "Document Viewer"}
            onLoad={() => setIframeLoading(false)}
            onError={() => { setIframeLoading(false); setError(true); }}
          />

          {/* 💰 PREMIUM LOCK FOR OFFICE: If user hasn't paid, show lock at bottom of viewer */}
          {maxPages && (
            <div className="bg-gradient-to-b from-transparent to-[#0a0a0a] p-8 flex flex-col items-center text-center">
               <div className="p-4 bg-amber-500/10 rounded-full mb-4 border border-amber-500/20">
                 <Lock className="w-8 h-8 text-amber-400" />
               </div>
               <h4 className="text-xl font-bold text-white mb-2">Preview Limit Reached</h4>
               <p className="text-muted-foreground text-xs max-w-xs mb-4">
                 Purchase the full document to unlock the remaining content of this {fileType?.split('/')[1]?.toUpperCase() || 'Office'} file.
               </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // Strategy C: PDF Viewer
  const pagesToRender = maxPages ? Math.min(numPages || 1, maxPages) : numPages;

  return (
    <div 
      ref={containerRef} 
      className="relative w-full h-[70vh] md:h-[800px] bg-[#0a0a0a] rounded-xl border border-white/10 overflow-hidden flex flex-col"
    >
        <div 
          className="absolute inset-0 overflow-auto custom-scrollbar"
          style={{ touchAction: 'pan-x pan-y pinch-zoom' }}
        >
          <div className="flex flex-col items-center min-w-max pb-24 pt-4">
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
                    className="relative mb-4 shadow-xl w-max flex justify-center bg-white rounded-sm overflow-hidden"
                  >
                     <Page 
                       pageNumber={index + 1} 
                       width={containerWidth || 800} 
                       scale={scale} 
                       renderTextLayer={false} 
                       renderAnnotationLayer={false}
                     />
                     
                     {/* 💰 PREMIUM LOCK FOR PDF: Show after reaching the end of the preview file */}
                     {maxPages && index + 1 === maxPages && (
                        <div className="absolute inset-0 bg-black/85 backdrop-blur-sm flex flex-col items-center justify-center text-center p-6 border-t-2 border-amber-500 z-10">
                           <div className="p-4 bg-amber-500/20 rounded-full mb-4 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
                             <Lock className="w-8 h-8 text-amber-400" />
                           </div>
                           <h4 className="text-xl md:text-2xl font-black text-white mb-2 tracking-tight">Preview Limit Reached</h4>
                           <p className="text-gray-400 text-xs md:text-sm max-w-xs leading-relaxed font-medium">
                             You are viewing a limited preview ({maxPages} pages). Purchase the full document to unlock the remaining content.
                           </p>
                        </div>
                     )}
                  </div>
               ))}
            </Document>
          </div>
        </div>
        
        {/* PDF Floating Controls */}
        <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 z-50">
          <div className="flex items-center gap-1 bg-background/95 backdrop-blur-xl border border-border px-2 py-1.5 rounded-full shadow-2xl">
             <button 
               onClick={handleZoomOut} 
               disabled={scale <= 0.5}
               className="p-2 text-foreground hover:bg-secondary rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
             >
               <ZoomOut className="w-4 h-4 md:w-5 md:h-5" />
             </button>
             
             <div className="text-[11px] md:text-xs font-bold text-foreground w-12 text-center">
                {Math.round(scale * 100)}%
             </div>

             <button 
               onClick={handleZoomIn} 
               disabled={scale >= 3.0}
               className="p-2 text-foreground hover:bg-secondary rounded-full transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
             >
               <ZoomIn className="w-4 h-4 md:w-5 md:h-5" />
             </button>

             <div className="w-px h-5 bg-border mx-1" />

             <button 
               onClick={handleResetZoom} 
               className="p-2 text-muted-foreground hover:text-foreground hover:bg-secondary rounded-full transition-colors"
             >
               <Maximize className="w-4 h-4 md:w-5 md:h-5" />
             </button>
          </div>
        </div>

        {error && (
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center justify-center text-red-400 bg-red-500/10 p-6 rounded-2xl border border-red-500/20 w-max z-50">
             <AlertCircle className="w-10 h-10 mb-3" />
             <p className="font-bold text-sm">Failed to load preview.</p>
          </div>
        )}
    </div>
  );
}