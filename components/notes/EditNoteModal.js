"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast"; 
import { updateNote } from "@/actions/note.actions"; 
import { getUploadUrl } from "@/actions/upload.actions"; 
import { generatePdfThumbnail } from "@/utils/generateThumbnail"; 
import { 
  Loader2, Save, UploadCloud, FileText, BookOpen, 
  School, GraduationCap, CalendarDays, Trophy, Lightbulb, Lock, AlertCircle, ShieldCheck
} from "lucide-react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation"; 
import { PDFDocument } from 'pdf-lib'; 

const CATEGORY_CONFIG = {
  "University": {
    instLabel: "University / College", instIcon: <School className="w-4 h-4 text-blue-400" />, instPlace: "e.g. Mumbai University",
    courseLabel: "Course / Degree", courseIcon: <GraduationCap className="w-4 h-4 text-purple-400" />, coursePlace: "e.g. B.Tech CSE",
    subjectLabel: "Subject", subjectPlace: "e.g. Data Structures",
    yearLabel: "Year / Semester", yearPlace: "e.g. 2nd Year"
  },
  "School": {
    instLabel: "Board / School", instIcon: <School className="w-4 h-4 text-blue-400" />, instPlace: "e.g. CBSE / DPS",
    courseLabel: "Class / Standard", courseIcon: <BookOpen className="w-4 h-4 text-purple-400" />, coursePlace: "e.g. Class 12th",
    subjectLabel: "Subject", subjectPlace: "e.g. Physics",
    yearLabel: "Academic Year", yearPlace: "e.g. 2024"
  },
  "Competitive Exams": {
    instLabel: "Exam Body / Category", instIcon: <Trophy className="w-4 h-4 text-amber-400" />, instPlace: "e.g. UPSC / SSC / JEE",
    courseLabel: "Specific Exam Name", courseIcon: <FileText className="w-4 h-4 text-purple-400" />, coursePlace: "e.g. Civil Services / CGL",
    subjectLabel: "Paper / Subject", subjectPlace: "e.g. GS Paper 1 / Quant",
    yearLabel: "Target Year", yearPlace: "e.g. 2025"
  },
  "Other": {
    instLabel: "Organization / Context", instIcon: <Lightbulb className="w-4 h-4 text-blue-400" />, instPlace: "e.g. Google Cloud / General",
    courseLabel: "Program / Certification", courseIcon: <GraduationCap className="w-4 h-4 text-purple-400" />, coursePlace: "e.g. AWS Architect",
    subjectLabel: "Topic", subjectPlace: "e.g. Networking",
    yearLabel: "Year", yearPlace: "e.g. 2024"
  }
};

export default function EditNoteModal({ note, onClose }) {
  const { data: session } = useSession();
  const { toast } = useToast();
  const router = useRouter(); 
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  
  const [newFile, setNewFile] = useState(null); 
  const [formData, setFormData] = useState({
    title: note?.title || "",
    description: note?.description || "",
    category: note?.category || "University", 
    university: note?.university || "",
    course: note?.course || "",
    subject: note?.subject || "",
    year: note?.year || "",
    isPaid: note?.isPaid || false,
    price: note?.price || 0,
    previewPages: note?.previewPages || 3,
  });

  const labels = CATEGORY_CONFIG[formData.category];

  // 🛡️ FRAUD PROTECTION: Check if file editing should be locked
  const isAdmin = session?.user?.role === "admin";
  const hasBuyers = note?.salesCount > 0;
  const isFileLocked = hasBuyers && !isAdmin;

  const generatePreviewPdf = async (originalFile, pagesToKeep) => {
    try {
      const arrayBuffer = await originalFile.arrayBuffer();
      const pdfDoc = await PDFDocument.load(arrayBuffer);
      const previewPdf = await PDFDocument.create();
      const totalPages = pdfDoc.getPageCount();
      const pagesToCopyCount = Math.min(pagesToKeep, totalPages);
      if (pagesToCopyCount === 0) return null;
      const pageIndices = Array.from({ length: pagesToCopyCount }, (_, i) => i);
      const copiedPages = await previewPdf.copyPages(pdfDoc, pageIndices);
      copiedPages.forEach((page) => previewPdf.addPage(page));
      const pdfBytes = await previewPdf.save();
      return new File([new Blob([pdfBytes])], `preview_${originalFile.name}`, { type: 'application/pdf' });
    } catch (error) {
      console.error("Preview generation failed:", error);
      return null;
    }
  };

  const handleFileChange = (e) => {
    if (isFileLocked) return; // Safeguard

    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const allowedTypes = [
        "application/pdf", "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword", "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.ms-powerpoint", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel", "text/plain"
      ];

      if (!allowedTypes.includes(file.type)) {
        toast({ title: "Unsupported Format", description: "Please upload PDF, Word, PPT, or Excel.", variant: "destructive" });
        return;
      }
      if (file.size > 25 * 1024 * 1024) {
        toast({ title: "File too large", description: "Limit is 25MB", variant: "destructive" });
        return;
      }
      setNewFile(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    if (formData.isPaid && (formData.price < 10 || formData.price > 1000)) {
      return toast({ title: "Invalid Price", description: "Price must be between ₹10 and ₹1000.", variant: "destructive" });
    }

    setLoading(true);

    try {
        let fileData = null;

        if (newFile && !isFileLocked) {
            setUploadStatus("Processing File...");
            let thumbnailFile = null;
            let previewFile = null;

            if (newFile.type === "application/pdf") {
                thumbnailFile = await generatePdfThumbnail(newFile);
                if (formData.isPaid) {
                    setUploadStatus("Generating Secure Preview...");
                    previewFile = await generatePreviewPdf(newFile, formData.previewPages);
                }
            }

            setUploadStatus("Requesting Storage slots...");
            const { success, uploadUrl, fileKey, thumbUrl, thumbKey, previewUploadUrl, previewKey, error: urlError } = 
                await getUploadUrl(newFile.name, newFile.type, !!thumbnailFile, !!previewFile);
            
            if (!success) throw new Error(urlError);

            setUploadStatus("Uploading to R2...");
            await fetch(uploadUrl, { method: "PUT", headers: { "Content-Type": newFile.type }, body: newFile });

            if (thumbnailFile && thumbUrl) {
                await fetch(thumbUrl, { method: "PUT", headers: { "Content-Type": "image/webp" }, body: thumbnailFile });
            }

            if (previewFile && previewUploadUrl) {
                await fetch(previewUploadUrl, { method: "PUT", headers: { "Content-Type": "application/pdf" }, body: previewFile });
            }

            fileData = {
                fileName: newFile.name,
                fileType: newFile.type,
                fileSize: newFile.size,
                fileKey: fileKey,
                thumbnailKey: thumbKey || null,
                previewKey: previewKey || null,
            };
        }

        setUploadStatus("Saving Changes...");
        const dataToSubmit = {
            ...formData,
            price: formData.isPaid ? Number(formData.price) : 0,
            previewPages: Number(formData.previewPages),
            ...(fileData && { fileData }) 
        };

        const res = await updateNote(note._id, dataToSubmit, session?.user?.id);
        
        if (res.success) {
            toast({ title: "Note Updated", description: "All changes are now live." });
            onClose(); 
            router.refresh(); 
        } else {
            toast({ title: "Update Failed", description: res.error, variant: "destructive" });
        }
    } catch (error) {
        console.error(error);
        toast({ title: "Error", description: error.message || "Something went wrong.", variant: "destructive" });
    } finally {
        setLoading(false);
        setUploadStatus("");
    }
  };

  return (
    <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[700px] bg-background/95 backdrop-blur-xl border border-border shadow-2xl max-h-[90vh] overflow-y-auto hide-scrollbar rounded-2xl md:rounded-[2rem] p-0">
        <div className="p-6 md:p-8">
          <DialogHeader className="mb-6">
            <DialogTitle className="text-2xl md:text-3xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-cyan-400">
              Edit Material
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              Update your note details, pricing, or replace the attached document.
            </DialogDescription>
          </DialogHeader>
          
          {/* 🛡️ PROTECTION BANNER */}
          {isFileLocked && (
            <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-start gap-3">
              <Lock className="w-5 h-5 text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-bold text-amber-500 uppercase tracking-tight">Content Integrity Protection</p>
                <p className="text-xs text-amber-500/80 leading-relaxed">
                  This note has <b>{note.salesCount} active buyer(s)</b>. To protect customers, you cannot replace the document or change the price type. Metadata updates are still allowed.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
              
              <div className="space-y-3">
                <Label className="text-xs font-bold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">Material Type</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {Object.keys(CATEGORY_CONFIG).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat })}
                      className={`p-2 rounded-xl border transition-all text-[10px] font-bold flex flex-col items-center gap-1 ${
                        formData.category === cat 
                        ? "bg-amber-500/10 border-amber-500/50 text-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.2)]" 
                        : "bg-secondary/20 border-white/5 text-muted-foreground hover:bg-secondary/40 hover:text-white"
                      }`}
                    >
                      {CATEGORY_CONFIG[cat].instIcon}
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                  <div className="space-y-1.5">
                      <Label className="text-sm font-semibold text-foreground/90">Title</Label>
                      <Input className="h-11 rounded-xl bg-secondary/30 border-secondary focus-visible:ring-blue-500/30 transition-all font-bold" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required />
                  </div>
                  <div className="space-y-1.5">
                      <Label className="text-sm font-semibold text-foreground/90">Description</Label>
                      <Textarea className="min-h-[100px] rounded-xl bg-secondary/30 border-secondary focus-visible:ring-blue-500/30 transition-all resize-y leading-relaxed" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} required />
                  </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-2 text-sm font-semibold text-foreground/90">{labels.instIcon} {labels.instLabel}</Label>
                    <Input className="h-11 rounded-xl bg-secondary/30 border-secondary focus-visible:ring-blue-500/30 transition-all" placeholder={labels.instPlace} value={formData.university} onChange={(e) => setFormData({...formData, university: e.target.value})} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-2 text-sm font-semibold text-foreground/90">{labels.courseIcon} {labels.courseLabel}</Label>
                    <Input className="h-11 rounded-xl bg-secondary/30 border-secondary focus-visible:ring-purple-500/30 transition-all" placeholder={labels.coursePlace} value={formData.course} onChange={(e) => setFormData({...formData, course: e.target.value})} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-2 text-sm font-semibold text-foreground/90"><BookOpen className="w-4 h-4 text-pink-400"/> {labels.subjectLabel}</Label>
                    <Input className="h-11 rounded-xl bg-secondary/30 border-secondary focus-visible:ring-pink-500/30 transition-all" placeholder={labels.subjectPlace} value={formData.subject} onChange={(e) => setFormData({...formData, subject: e.target.value})} required />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="flex items-center gap-2 text-sm font-semibold text-foreground/90"><CalendarDays className="w-4 h-4 text-orange-400"/> {labels.yearLabel}</Label>
                    <Input className="h-11 rounded-xl bg-secondary/30 border-secondary focus-visible:ring-orange-500/30 transition-all" placeholder={labels.yearPlace} value={formData.year} onChange={(e) => setFormData({...formData, year: e.target.value})} required />
                  </div>
              </div>

              <div className={`p-4 md:p-5 border rounded-2xl space-y-4 transition-colors ${isFileLocked ? 'border-amber-500/20 bg-amber-500/5 opacity-80' : 'border-emerald-500/20 bg-emerald-500/5'}`}>
                <Label className={`text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${isFileLocked ? 'text-amber-500' : 'text-emerald-500'}`}>
                  {isFileLocked ? <ShieldCheck className="w-4 h-4" /> : 'Monetization Settings'}
                  {isFileLocked && 'Locked Pricing'}
                </Label>
                
                <div className="flex items-center gap-3">
                  <Button type="button" disabled={isFileLocked} variant={!formData.isPaid ? "default" : "outline"} onClick={() => setFormData({...formData, isPaid: false, price: 0})} className={`flex-1 h-10 text-xs md:text-sm ${!formData.isPaid ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"}`}>Free Resource</Button>
                  <Button type="button" disabled={isFileLocked} variant={formData.isPaid ? "default" : "outline"} onClick={() => setFormData({...formData, isPaid: true, price: formData.price || 49})} className={`flex-1 h-10 text-xs md:text-sm ${formData.isPaid ? "bg-emerald-500 hover:bg-emerald-600 text-white" : "border-emerald-500/30 text-emerald-500 hover:bg-emerald-500/10"}`}>Premium Note</Button>
                </div>

                {formData.isPaid && (
                  <div className="grid grid-cols-2 gap-4 animate-in fade-in slide-in-from-top-2 pt-2">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Price (INR)</Label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-muted-foreground">₹</span>
                        <Input type="number" disabled={isFileLocked} min="10" max="1000" value={formData.price} onChange={e => setFormData({...formData, price: Number(e.target.value)})} className="pl-7 h-10 bg-black/50 border-emerald-500/30 focus-visible:ring-emerald-500 rounded-xl" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] uppercase font-bold text-muted-foreground">Preview Pages</Label>
                      <Input type="number" disabled={isFileLocked} min="1" max="10" value={formData.previewPages} onChange={e => setFormData({...formData, previewPages: Number(e.target.value)})} className="h-10 bg-black/50 border-emerald-500/30 focus-visible:ring-emerald-500 rounded-xl" />
                    </div>
                  </div>
                )}
              </div>

              <div className={`pt-2 transition-opacity ${isFileLocked ? 'opacity-50 grayscale' : 'opacity-100'}`}>
                  <Label className="text-xs font-bold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400 mb-3 block flex items-center gap-2">
                    Replace Document {isFileLocked && <Lock className="w-3 h-3 text-amber-500" />}
                  </Label>
                  <div className={`relative group border-2 border-dashed rounded-[1.5rem] p-6 transition-all bg-secondary/20 text-center overflow-hidden ${isFileLocked ? 'border-amber-500/20 cursor-not-allowed' : 'border-border hover:border-indigo-500/50 hover:bg-indigo-500/5 cursor-pointer'}`}>
                      <input type="file" disabled={isFileLocked} accept=".pdf,.docx,.pptx,.xlsx,.txt" onChange={handleFileChange} className={`absolute inset-0 w-full h-full opacity-0 z-10 ${isFileLocked ? 'cursor-not-allowed' : 'cursor-pointer'}`} />
                      {newFile ? (
                          <div className="flex flex-col items-center justify-center gap-2 animate-in fade-in zoom-in duration-300">
                              <div className="p-2 bg-indigo-500/20 rounded-full"><FileText className="w-6 h-6 text-indigo-400" /></div>
                              <span className="text-indigo-400 text-sm font-bold truncate max-w-[250px]">{newFile.name}</span>
                          </div>
                      ) : (
                          <div className="flex flex-col items-center gap-2 transform transition-transform group-hover:-translate-y-1">
                              <div className="p-3 bg-secondary/50 rounded-full group-hover:bg-indigo-500/10 transition-colors">
                                {isFileLocked ? <Lock className="w-6 h-6 text-amber-500" /> : <UploadCloud className="w-6 h-6 text-muted-foreground group-hover:text-indigo-400" />}
                              </div>
                              <span className="text-sm font-medium text-foreground/80">{isFileLocked ? 'Replacement Disabled' : 'Tap to upload a new version'}</span>
                              <span className="text-[10px] text-muted-foreground">Current: {note.fileName}</span>
                          </div>
                      )}
                  </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-3 pt-4 border-t border-white/5">
                  <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl h-12 hover:bg-secondary/50">Cancel</Button>
                  <Button type="submit" disabled={loading} className="rounded-xl h-12 px-8 bg-gradient-to-r from-blue-500 to-cyan-600 hover:from-blue-600 hover:to-cyan-700 shadow-lg shadow-blue-500/25 transition-all font-bold">
                      {loading ? <><Loader2 className="animate-spin mr-2 w-4 h-4" /> {uploadStatus}</> : <><Save className="mr-2 w-4 h-4" /> Save Changes</>}
                  </Button>
              </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}