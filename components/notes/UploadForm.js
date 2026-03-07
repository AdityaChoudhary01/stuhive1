"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UploadCloud, FileText, BookOpen, School, GraduationCap, CalendarDays, Trophy, Lightbulb } from "lucide-react";
import { getUploadUrl } from "@/actions/upload.actions"; 
import { createNote } from "@/actions/note.actions";
import { generatePdfThumbnail } from "@/utils/generateThumbnail"; 

// 🚀 DYNAMIC LABEL CONFIGURATION
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

export default function UploadForm() {
  const { data: session } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(""); 
  const [file, setFile] = useState(null);
  
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    category: "University", // 🚀 Default Category Added
    university: "",
    course: "",
    subject: "",
    year: "",
  });

  // Get current labels based on selected category
  const labels = CATEGORY_CONFIG[formData.category];

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      const allowedTypes = [
        "application/pdf",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "application/vnd.ms-powerpoint",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/vnd.ms-excel",
        "text/plain"
      ];

      if (!allowedTypes.includes(selectedFile.type)) {
        toast({ title: "Unsupported Format", description: "Please upload PDF, Word, PPT, or Excel.", variant: "destructive" });
        return;
      }
      if (selectedFile.size > 15 * 1024 * 1024) {
        toast({ title: "File Too Large", description: "Max limit is 15MB.", variant: "destructive" });
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // ✅ FIX 1: Instantly block fast double-clicks before React even re-renders
    if (loading) return; 
    if (!file) return toast({ title: "File Required", description: "Please select a document to upload.", variant: "destructive" });

    setLoading(true);
    try {
      let thumbnailFile = null;
      if (file.type === "application/pdf") {
          setUploadStatus("Processing...");
          thumbnailFile = await generatePdfThumbnail(file);
      }

      setUploadStatus("Preparing...");
      const { success, uploadUrl, fileKey, thumbUrl, thumbKey, error } = 
        await getUploadUrl(file.name, file.type, !!thumbnailFile);
      
      if (!success) throw new Error(error);

      setUploadStatus("Uploading...");
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      });

      if (!uploadRes.ok) throw new Error("Upload failed.");

      if (thumbnailFile && thumbUrl) {
          await fetch(thumbUrl, { method: "PUT", headers: { "Content-Type": "image/webp" }, body: thumbnailFile });
      }

      setUploadStatus("Finalizing...");
      const fileData = {
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileKey: fileKey,
        thumbnailKey: thumbKey || null,
      };

      const res = await createNote({ ...formData, fileData, userId: session.user.id });

      if (res.success) {
        setUploadStatus("Redirecting...");
        toast({ title: "Success!" });
        // 🚀 FIXED: Redirect using the new SEO Slug instead of the DB ID!
        router.push(`/notes/${res.noteSlug || res.noteId}`);
      } else {
        throw new Error(res.error);
      }

    } catch (err) {
      toast({ title: "Error", description: err.message, variant: "destructive" });
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto p-4 sm:p-6 md:p-10 rounded-2xl md:rounded-[2rem] bg-gradient-to-br from-background to-secondary/10 border shadow-2xl backdrop-blur-xl">
      
      {/* Header */}
      <div className="mb-6 md:mb-8 text-center md:text-left">
        <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight mb-2">Upload Material</h1>
        <p className="text-muted-foreground text-xs md:text-base">Share your knowledge and help others ace their exams.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 md:space-y-8">
        
        {/* --- 🚀 NEW: Section 1: Category Selection --- */}
        <div className="space-y-4">
          <h2 className="text-xs md:text-sm font-bold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">
            1. Material Type
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.keys(CATEGORY_CONFIG).map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setFormData({ ...formData, category: cat })}
                className={`p-3 rounded-xl border transition-all text-xs font-bold flex flex-col items-center gap-2 ${
                  formData.category === cat 
                  ? "bg-amber-500/10 border-amber-500/50 text-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.2)]" 
                  : "bg-secondary/20 border-white/5 text-muted-foreground hover:bg-secondary/40 hover:text-white"
                }`}
              >
                {CATEGORY_CONFIG[cat].instIcon}
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* --- Section 2: Note Details --- */}
        <div className="space-y-4">
          <h2 className="text-xs md:text-sm font-bold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-pink-500 to-purple-500">
            2. Note Details
          </h2>
          
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-foreground/90">Title</Label>
              <Input 
                required
                placeholder="e.g. Computer Networks Chapter 1" 
                className="h-11 md:h-12 rounded-xl bg-secondary/30 border-secondary focus-visible:ring-pink-500/30 transition-all"
                value={formData.title}
                onChange={e => setFormData({...formData, title: e.target.value})}
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-semibold text-foreground/90">Description</Label>
              <Textarea 
                required
                placeholder="Briefly summarize the key topics..." 
                className="min-h-[100px] md:min-h-[120px] rounded-xl bg-secondary/30 border-secondary focus-visible:ring-pink-500/30 transition-all resize-y"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>
          </div>
        </div>

        {/* --- 🚀 DYNAMIC Section 3: Academic Info --- */}
        <div className="space-y-4">
          <h2 className="text-xs md:text-sm font-bold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
            3. Academic Context
          </h2>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-5">
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-sm font-semibold text-foreground/90">
                {labels.instIcon} {labels.instLabel}
              </Label>
              <Input required placeholder={labels.instPlace} className="h-11 md:h-12 rounded-xl bg-secondary/30 border-secondary focus-visible:ring-blue-500/30 transition-all" value={formData.university} onChange={e => setFormData({...formData, university: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-sm font-semibold text-foreground/90">
                {labels.courseIcon} {labels.courseLabel}
              </Label>
              <Input required placeholder={labels.coursePlace} className="h-11 md:h-12 rounded-xl bg-secondary/30 border-secondary focus-visible:ring-purple-500/30 transition-all" value={formData.course} onChange={e => setFormData({...formData, course: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-sm font-semibold text-foreground/90">
                <BookOpen className="w-4 h-4 text-pink-400" /> {labels.subjectLabel}
              </Label>
              <Input required placeholder={labels.subjectPlace} className="h-11 md:h-12 rounded-xl bg-secondary/30 border-secondary focus-visible:ring-pink-500/30 transition-all" value={formData.subject} onChange={e => setFormData({...formData, subject: e.target.value})} />
            </div>
            <div className="space-y-1.5">
              <Label className="flex items-center gap-2 text-sm font-semibold text-foreground/90">
                <CalendarDays className="w-4 h-4 text-orange-400" /> {labels.yearLabel}
              </Label>
              <Input required placeholder={labels.yearPlace} className="h-11 md:h-12 rounded-xl bg-secondary/30 border-secondary focus-visible:ring-orange-500/30 transition-all" value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} />
            </div>
          </div>
        </div>

        {/* --- Section 4: File Upload --- */}
        <div className="space-y-4">
          <h2 className="text-xs md:text-sm font-bold uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400">
            4. Document
          </h2>
          
          <div className="group relative border-2 border-dashed border-border rounded-2xl md:rounded-3xl p-6 md:p-12 transition-all hover:border-emerald-500/50 hover:bg-emerald-500/5 cursor-pointer overflow-hidden bg-secondary/20">
            <input 
              type="file" 
              required
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-30" 
              onChange={handleFileChange} 
            />
            <div className="flex flex-col items-center justify-center text-center">
              {file ? (
                <div className="flex flex-col items-center gap-3 animate-in fade-in zoom-in duration-300">
                  <div className="p-3 md:p-4 bg-emerald-500/20 rounded-full">
                    <FileText className="w-8 h-8 md:w-10 md:h-10 text-emerald-400" />
                  </div>
                  <div className="space-y-1">
                      <p className="font-bold text-sm md:text-base text-foreground truncate max-w-[200px] md:max-w-[350px]">{file.name}</p>
                      <p className="text-[10px] md:text-xs font-medium text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full inline-block">
                        {(file.size / (1024 * 1024)).toFixed(2)} MB Ready
                      </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center transform transition-transform group-hover:-translate-y-1">
                  <div className="p-3 md:p-4 bg-secondary/50 rounded-full mb-3 md:mb-4 group-hover:bg-emerald-500/10 transition-colors">
                    <UploadCloud className="w-8 h-8 md:w-10 md:h-10 text-muted-foreground group-hover:text-emerald-400 transition-colors" />
                  </div>
                  <p className="font-bold text-base md:text-lg text-foreground/90">Tap to browse</p>
                  <p className="text-[11px] md:text-xs text-muted-foreground mt-1.5 md:mt-2 max-w-[200px] md:max-w-[250px] leading-relaxed">
                      PDF, DOCX, PPTX, XLSX, TXT (Max 15MB)
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* --- Submit Button --- */}
        <Button 
          type="submit" 
          disabled={loading} 
          className="w-full h-12 md:h-14 rounded-xl md:rounded-2xl text-sm md:text-base font-bold text-white border-0 bg-gradient-to-r from-pink-500 to-purple-600 hover:from-pink-600 hover:to-purple-700 shadow-[0_0_30px_-10px_rgba(236,72,153,0.4)] transition-all"
        >
          {loading ? (
            <div className="flex items-center gap-2 md:gap-3">
              <Loader2 className="w-4 h-4 md:w-5 md:h-5 animate-spin" />
              <span className="tracking-wide">{uploadStatus}</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 tracking-wide">
              <UploadCloud className="w-4 h-4 md:w-5 md:h-5" />
              <span>Publish Material</span>
            </div>
          )}
        </Button>
      </form>
    </div>
  );
}