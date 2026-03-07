// ✅ utils/generateThumbnail.js

export const generatePdfThumbnail = async (file) => {
  // 1. Safety check: Only run in the browser
  if (typeof window === "undefined" || !file || file.type !== "application/pdf") {
    return null;
  }

  try {
    // 2. DYNAMIC IMPORT: Use the standard package instead of the broken .mjs legacy build
    const pdfjs = await import("pdfjs-dist");
    
    // 3. VERSION MATCHING: 
    // Point to the stable .js worker that matches the installed version
    const PDFJS_VERSION = pdfjs.version || '3.11.174'; 
    pdfjs.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

    const arrayBuffer = await file.arrayBuffer();
    
    // 4. Load the document
    // We use Uint8Array as it is more stable across different PDF.js versions
    const loadingTask = pdfjs.getDocument({ 
      data: new Uint8Array(arrayBuffer),
      useWorkerFetch: false,
      isEvalSupported: false 
    });
    
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);
    
    // Set scale (0.5 to 0.8 is usually perfect for thumbnails)
    const viewport = page.getViewport({ scale: 0.6 });
    const canvas = document.createElement("canvas");
    const context = canvas.getContext("2d");
    
    if (!context) throw new Error("Canvas context failed");

    canvas.height = viewport.height;
    canvas.width = viewport.width;

    // 5. Render PDF Page to Canvas
    await page.render({ canvasContext: context, viewport }).promise;

    // 6. Convert Canvas to WebP Blob
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (blob) {
          // Create a File object so the R2 upload logic treats it as a standard file
          const thumbFile = new File([blob], "thumbnail.webp", { type: "image/webp" });
          resolve(thumbFile);
        } else {
          resolve(null);
        }
      }, "image/webp", 0.8); // 80% quality is plenty for a small thumb
    });
  } catch (error) {
    console.error("Thumbnail generation error:", error);
    return null;
  }
};