"use client";

import { useState } from 'react';
import { Loader2, AlertCircle, FileX, Lock } from 'lucide-react';
import { Document, Page, pdfjs } from 'react-pdf';

import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

// 🚀 FIXED: Pointing to the stable v8 .js worker
pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.js`;

export default function PDFViewer({ url, fileType, title, maxPages = null }) {
  const [numPages, setNumPages] = useState(null);
  const [error, setError] = useState(false);

  const isImage = fileType?.startsWith('image/');

  function onDocumentLoadSuccess({ numPages }) {
    setNumPages(numPages);
  }

  if (!url) return (
    <div className="w-full h-[600px] flex items-center justify-center bg-muted text-muted-foreground">
        <FileX className="w-10 h-10 mb-2" />
        <p>File unavailable</p>
    </div>
  );

  if (isImage) {
    return (
        <div className="w-full h-[600px] bg-secondary/5 relative flex justify-center items-center">
           <img src={url} alt={title} className="max-w-full max-h-full object-contain" />
        </div>
    );
  }

  const pagesToRender = maxPages ? Math.min(numPages || 1, maxPages) : numPages;

  return (
    <div className="w-full h-[700px] overflow-y-auto bg-black/60 custom-scrollbar relative flex flex-col items-center py-6 space-y-6">
        <Document
          file={url}
          onLoadSuccess={onDocumentLoadSuccess}
          onLoadError={(err) => {
            console.error("PDF Load Error:", err);
            setError(true);
          }}
          loading={
            <div className="flex flex-col items-center justify-center text-cyan-400 my-32">
              <Loader2 className="w-10 h-10 animate-spin mb-4" />
              <p className="font-bold tracking-widest uppercase text-xs">Decrypting Document...</p>
            </div>
          }
        >
           {Array.from(new Array(pagesToRender || 0), (el, index) => (
              <div key={`page_${index + 1}`} className="relative mb-6 shadow-[0_0_30px_rgba(0,0,0,0.5)]">
                 <Page 
                   pageNumber={index + 1} 
                   width={800} 
                   renderTextLayer={false} 
                   renderAnnotationLayer={false}
                   className="max-w-[90vw] md:max-w-full bg-white"
                 />
                 
                 {/* 🚀 MARKETPLACE MAGIC: Blur the last allowed preview page */}
                 {maxPages && index + 1 === maxPages && numPages > maxPages && (
                    <div className="absolute inset-0 bg-black/70 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 border-2 border-amber-500/50 rounded-lg">
                       <div className="p-4 bg-amber-500/20 rounded-full mb-4">
                         <Lock className="w-10 h-10 text-amber-400" />
                       </div>
                       <h4 className="text-2xl font-black text-white mb-2">Preview Limit Reached</h4>
                       <p className="text-gray-300 text-sm max-w-sm leading-relaxed">
                         You are viewing page {maxPages} of {numPages}. Purchase the full document to unlock the remaining pages.
                       </p>
                    </div>
                 )}
              </div>
           ))}
        </Document>
        
        {error && (
          <div className="flex flex-col items-center justify-center text-red-400 my-20 bg-red-500/10 p-8 rounded-2xl border border-red-500/20">
             <AlertCircle className="w-10 h-10 mb-3" />
             <p className="font-bold">Failed to load PDF preview.</p>
          </div>
        )}
    </div>
  );
}