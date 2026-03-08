"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Download, Loader2 } from "lucide-react";
import { incrementDownloadCount } from "@/actions/note.actions";
import { useToast } from "@/hooks/use-toast";

export default function DownloadButton({ signedUrl, fileName, noteId }) {
  const [isDownloading, setIsDownloading] = useState(false);
  const { toast } = useToast();

  const handleDownload = async () => {
    if (isDownloading) return;
    setIsDownloading(true);
    
    try {
      toast({
        title: "Starting Download",
        description: `Fetching ${fileName || 'document'}...`,
      });

      // 1. Fetch the file as a Blob (Forces download, bypasses new tab)
      const response = await fetch(signedUrl);
      if (!response.ok) throw new Error("Failed to fetch file");
      
      const blob = await response.blob();
      
      // 2. Create a temporary local URL for the blob
      const localUrl = window.URL.createObjectURL(blob);
      
      // 3. Trigger the download using the local URL
      const link = document.createElement("a");
      link.href = localUrl;
      link.setAttribute("download", fileName || "document");
      document.body.appendChild(link);
      link.click();
      
      // 4. Cleanup to prevent memory leaks
      document.body.removeChild(link);
      window.URL.revokeObjectURL(localUrl);

      // 5. Increment count in Database (Fire and forget)
      incrementDownloadCount(noteId).catch(err => 
        console.error("Failed to increment stats:", err)
      );
      
    } catch (error) {
      console.error("Download execution failed:", error);
      toast({
        title: "Download Error",
        description: "Could not initiate download. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Button 
      size="lg" 
      onClick={handleDownload} 
      disabled={isDownloading}
      className="bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-500 hover:to-blue-600 border-0 text-white font-black uppercase tracking-widest text-[10px] shadow-lg shadow-cyan-500/20 px-8 h-10 rounded-xl transition-all active:scale-95"
    >
      {isDownloading ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Downloading...
        </>
      ) : (
        <>
          <Download className="w-4 h-4 mr-2" />
          Download Note
        </>
      )}
    </Button>
  );
}