"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, FileText, Image as ImageIcon, FileType, Heart, Eye, Presentation, Table as TableIcon, Loader2, School, Trophy, Lightbulb, BookOpen, Lock, BadgeCheck, CheckCircle2, Crown } from "lucide-react"; 
import { formatDate } from "@/lib/utils";
import StarRating from "@/components/common/StarRating";
import { useSession } from "next-auth/react";
import { useToast } from "@/hooks/use-toast";

import { incrementDownloadCount, getNoteDownloadUrl } from "@/actions/note.actions";
import { toggleSaveNote } from "@/actions/user.actions";

// 🚀 IMPORTED: Planner Button
import AddToPlanButton from "@/components/planner/AddToPlanButton";

const FileIcon = ({ type, className }) => {
  if (type?.includes("pdf")) return <FileText className={className} aria-hidden="true" />;
  if (type?.includes("image")) return <ImageIcon className={className} aria-hidden="true" />;
  if (type?.includes("presentation") || type?.includes("powerpoint")) return <Presentation className={className} aria-hidden="true" />;
  if (type?.includes("spreadsheet") || type?.includes("excel")) return <TableIcon className={className} aria-hidden="true" />;
  return <FileType className={className} aria-hidden="true" />;
};

// 🚀 NEW: Dynamic Category Icon Component
const CategoryIcon = ({ category, className }) => {
  switch (category) {
    case 'School': return <BookOpen aria-hidden="true" className={className} />;
    case 'Competitive Exams': return <Trophy aria-hidden="true" className={className} />;
    case 'Other': return <Lightbulb aria-hidden="true" className={className} />;
    case 'University':
    default: return <School aria-hidden="true" className={className} />;
  }
};

export default function NoteCard({ note, priority = false }) {
  const { data: session, update: updateSession } = useSession();
  const { toast } = useToast();

  const [isSaved, setIsSaved] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  
  // 🚀 RESPONSIVE OBSERVER STATE
  const cardRef = useRef(null);
  const [isCompact, setIsCompact] = useState(false);

  useEffect(() => {
    if (session?.user?.savedNotes?.includes(note._id)) setIsSaved(true);
    else setIsSaved(false);
  }, [session?.user?.savedNotes, note._id]);

  // 🚀 COMPACT MODE LISTENER (Detects 2-column mobile squeezing)
  useEffect(() => {
    if (!cardRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (let entry of entries) {
        // If card width is less than 240px, it activates compact mode
        setIsCompact(entry.contentRect.width < 240);
      }
    });
    observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
  const thumbnailUrl = note.thumbnailKey
    ? `${r2PublicUrl}/${note.thumbnailKey}`
    : note.fileType?.startsWith("image/")
      ? `${r2PublicUrl}/${note.fileKey}`
      : null;

  const noteSchema = {
    "@context": "https://schema.org",
    "@type": ["LearningResource", "Course", "CreativeWork"],
    name: note.title,
    description: note.description || `Academic notes and study material for ${note.course}.`,
    educationalLevel: note.category || "University", 
    teaches: note.course,
    author: { "@type": "Person", name: note.user?.name || "StuHive Contributor" },
    datePublished: note.uploadDate,
    educationalUse: "Study Material",
    image: thumbnailUrl,
    provider: { "@type": "Organization", name: note.university || "StuHive" },
    interactionStatistic: [
      { "@type": "InteractionCounter", interactionType: "https://schema.org/ViewAction", userInteractionCount: note.viewCount || 0 },
      { "@type": "InteractionCounter", interactionType: "https://schema.org/DownloadAction", userInteractionCount: note.downloadCount || 0 },
    ],
  };

  // 🚀 BULLETPROOF ACCESS LOGIC FOR THE CARD
  const isOwner = session?.user?.id && (session.user.id === note.user?._id?.toString() || session.user.id === note.user?.toString());
  const isAdmin = session?.user?.role === 'admin';
  const hasPurchased = session?.user?.purchasedNotes?.some(id => id.toString() === note._id.toString());
  const hasAccess = !note.isPaid || note.price === 0 || hasPurchased || isOwner || isAdmin;

  const handleSave = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!session) return toast({ title: "Login required", description: "Please sign in to save notes.", variant: "destructive" });

    const previousState = isSaved;
    setIsSaved(!isSaved);
    const res = await toggleSaveNote(session.user.id, note._id);

    if (res.success) {
      toast({ title: res.isSaved ? "Saved to Collection" : "Removed from Collection" });
      const currentSavedNotes = session.user.savedNotes || [];
      const updatedSavedNotes = res.isSaved ? [...currentSavedNotes, note._id] : currentSavedNotes.filter((id) => id !== note._id);
      await updateSession({ ...session, user: { ...session.user, savedNotes: updatedSavedNotes } });
    } else {
      setIsSaved(previousState);
      toast({ title: "Error", variant: "destructive" });
    }
  };

  // 🚀 UPDATED DOWNLOAD HANDLER
  const handleDownload = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!hasAccess) {
      return toast({ title: "Premium Note", description: "Click to open the note and purchase access." });
    }

    if (isDownloading) return;
    setIsDownloading(true);
    
    try {
      toast({ title: "Starting Download", description: "Fetching secure file..." });
      
      const signedUrl = await getNoteDownloadUrl(note._id);
      if (!signedUrl) throw new Error("Could not fetch secure link.");

      const response = await fetch(signedUrl);
      if (!response.ok) throw new Error("File retrieval failed.");
      const blob = await response.blob();
      
      const localUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = localUrl;
      link.setAttribute("download", note.fileName || "document");
      document.body.appendChild(link);
      link.click();
      
      document.body.removeChild(link);
      window.URL.revokeObjectURL(localUrl);

      incrementDownloadCount(note._id).catch(() => {});
    } catch (error) {
      toast({ title: "Access Denied", description: error.message || "Failed to get link.", variant: "destructive" });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <Card
      ref={cardRef} // 🚀 Attached Observer Ref
      onClick={() => {}} 
      className="w-full max-w-[400px] mx-auto h-full flex flex-col group relative bg-[#050505]
        border border-white/10 rounded-[28px] overflow-visible
        transition-all duration-500 transform-gpu will-change-transform
        hover:translate-y-[-6px] hover:border-cyan-500/40
        hover:shadow-[0_34px_95px_-65px_rgba(34,211,238,0.75)]
        before:content-[''] before:absolute before:inset-0 before:rounded-[inherit] before:p-[1px]
        before:bg-gradient-to-br before:from-white/16 before:via-white/0 before:to-white/8
        before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500
        after:content-[''] after:absolute after:inset-0 after:rounded-[inherit] after:opacity-[0.06] after:pointer-events-none
        after:[background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.14)_1px,transparent_0)]
        after:[background-size:20px_20px]"
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(noteSchema) }} />

      <div 
        className="absolute top-4 right-4 z-[60] flex flex-col-reverse sm:flex-row items-center gap-2"
        onClick={(e) => e.stopPropagation()} 
      >
        <div className="bg-black/40 backdrop-blur-xl rounded-full border border-white/10 hover:border-cyan-500/50 transition-colors">
          <AddToPlanButton resourceId={note._id} resourceType="Note" />
        </div>

        <button
          onClick={handleSave}
          aria-label={isSaved ? "Remove from saved collection" : "Save note to collection"}
          className="p-2.5 rounded-full bg-black/80 backdrop-blur-xl
            border border-white/20 hover:bg-white/10
            transition-all duration-300 transform-gpu hover:scale-110
            shadow-[0_18px_45px_-25px_rgba(0,0,0,0.9)]
            outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60"
        >
          <Heart
            aria-hidden="true"
            className={`h-4 w-4 transition-colors duration-300 ${
              isSaved ? "fill-pink-500 text-pink-500 drop-shadow-[0_0_10px_rgba(236,72,153,0.9)]" : "text-gray-300"
            }`}
          />
        </button>
      </div>

      <div className="flex flex-col h-full bg-[#050505] relative z-10 rounded-[28px] overflow-hidden">
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 z-50 pointer-events-none" />

        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none bg-[radial-gradient(900px_circle_at_30%_10%,rgba(34,211,238,0.10),transparent_55%)]" />

        <div className="relative h-48 sm:h-56 w-full shrink-0 transform-gpu overflow-hidden -mb-[1px] z-0">
          
          <div className="absolute top-4 left-4 z-40 flex flex-col items-start gap-2.5 max-w-[70%]">
            {note.isFeatured && (
              <Badge className="relative overflow-hidden bg-gradient-to-r from-amber-500 to-orange-600 border-0 text-[9px] font-black uppercase tracking-widest text-white px-3 py-1 shadow-lg">
                <span className="relative z-10">Featured</span>
                <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent z-0 skew-x-12 motion-safe:animate-[shimmer_2.5s_infinite]" />
              </Badge>
            )}
            <Badge className="bg-black/80 backdrop-blur-xl border border-white/20 text-cyan-300 text-[9px] font-black uppercase tracking-widest px-3 py-1 shadow-xl truncate max-w-full">
              {note.subject}
            </Badge>
          </div>

          {/* 🚀 SMART PRICE/PURCHASE BADGE SECTION */}
          <div className="absolute bottom-4 right-4 z-40">
            {note.isPaid && note.price > 0 && (
              <>
                {hasPurchased ? (
                  <Badge className="bg-white/10 backdrop-blur-xl text-emerald-400 font-black text-[10px] px-3 py-1.5 shadow-xl border border-emerald-500/30 flex items-center gap-1.5 uppercase tracking-tighter">
                    <CheckCircle2 size={12} className="fill-emerald-500/20" /> Purchased
                  </Badge>
                ) : (isAdmin || isOwner) ? (
                  <Badge className="bg-white/10 backdrop-blur-xl text-yellow-400 font-black text-[10px] px-3 py-1.5 shadow-xl border border-yellow-500/30 flex items-center gap-1.5 uppercase tracking-tighter">
                    <Crown size={12} className="fill-yellow-500/20" /> Premium Asset
                  </Badge>
                ) : (
                  <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white font-black text-sm px-3 py-1 shadow-xl border border-emerald-400/50 backdrop-blur-md">
                    ₹{note.price}
                  </Badge>
                )}
              </>
            )}
          </div>

          <Link href={`/notes/${note.slug || note._id}`} tabIndex={-1} aria-hidden="true" className="block w-full h-full relative z-10">
            {thumbnailUrl ? (
              <Image
                src={thumbnailUrl}
                alt={`Preview of ${note.title}`}
                fill
                sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                priority={priority}
                fetchPriority={priority ? "high" : "auto"}
                unoptimized={true}
                className={`object-cover transition-all duration-[1500ms] ease-out group-hover:scale-[1.08] opacity-85 group-hover:opacity-100 will-change-transform transform-gpu ${!hasAccess ? 'blur-[5px] group-hover:blur-sm' : 'blur-0'}`}
              />
            ) : (
              <div className="flex flex-col items-center justify-center h-full gap-3 text-white/30 group-hover:text-cyan-300 transition-all duration-700 bg-white/[0.02]">
                <FileIcon type={note.fileType} className="h-16 w-16 group-hover:drop-shadow-[0_0_24px_rgba(34,211,238,0.45)]" />
                <span className="text-[10px] font-black uppercase tracking-[0.2em] bg-black/50 px-4 py-1.5 rounded-full border border-white/5">
                  {note.fileType?.split("/")[1]?.split(".").pop() || "DOC"}
                </span>
              </div>
            )}
          </Link>

          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-[#050505] via-[#050505]/60 to-transparent z-30 pointer-events-none" />
        </div>

        <div className="flex flex-col flex-grow p-4 sm:p-6 pt-4 relative z-10 bg-[#050505]">
          <div className="flex-grow space-y-3 block mb-6">
            <Link href={`/notes/${note.slug || note._id}`} title={`Download notes for ${note.course}`} className="outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60 rounded-lg block">
              <h3
                className="font-extrabold text-lg sm:text-xl tracking-tight leading-tight line-clamp-2 text-white/95
                  group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-cyan-300 group-hover:to-blue-500
                  transition-all duration-500"
              >
                {note.title}
              </h3>
            </Link>

            <div className="text-xs text-gray-400 font-semibold flex items-center gap-2 truncate uppercase tracking-wider relative z-20">
              <CategoryIcon category={note.category} className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <span className="truncate">{note.course}</span> <span className="text-gray-600 shrink-0">•</span>
              <Link
                href={`/univ/${note.university?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "") || "general"}`}
                className="truncate hover:text-cyan-300 transition-colors pointer-events-auto shrink-0 max-w-[40%]"
                title={`View all notes for ${note.university}`}
              >
                {note.university}
              </Link>
            </div>
          </div>

          <div className="flex items-center justify-between text-sm mb-5 flex-wrap gap-2">
            <div
              className="flex items-center gap-1.5 bg-white/[0.03] shadow-inner px-3 py-1.5 rounded-full border border-white/5
                hover:border-white/10 transition-colors"
              aria-label={`Rated ${note.rating || 0} stars`}
            >
              <StarRating rating={note.rating} size="sm" />
              <span className="text-[10px] font-bold text-gray-400 ml-0.5">({note.numReviews})</span>
            </div>

            <div className="flex items-center text-gray-400 text-[10px] gap-2.5 uppercase tracking-widest font-bold bg-white/[0.03] shadow-inner px-3 py-1.5 rounded-full border border-white/5 hover:border-white/10 transition-colors">
              <span className="flex items-center gap-1" aria-label={`${note.viewCount || 0} views`}>
                <Eye aria-hidden="true" className="h-3.5 w-3.5 text-cyan-400/80 shrink-0" /> {note.viewCount || 0}
              </span>
              <span className="flex items-center gap-1" aria-label={`${note.downloadCount || 0} downloads`}>
                <Download aria-hidden="true" className="h-3.5 w-3.5 text-emerald-400/80 shrink-0" /> {note.downloadCount || 0}
              </span>
            </div>
          </div>

          {/* 🚀 RESPONSIVE USER INFO FOOTER */}
          <div className="flex items-center justify-between gap-2 mt-auto">
            
            <div className="flex items-center gap-2.5 overflow-hidden flex-1 min-w-0">
              <div className="shrink-0 relative">
                <img
                  src={note.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(note.user?.name || "U")}&background=random&color=fff`}
                  alt={`${note.user?.name}'s avatar`}
                  width={34}
                  height={34}
                  decoding="async"
                  loading="lazy"
                  className="w-[34px] h-[34px] min-w-[34px] min-h-[34px] rounded-full border border-white/20 object-cover"
                />
                {/* 🚀 Move Badge over Avatar when Compact */}
                {isCompact && note.user?.isVerifiedEducator && (
                  <div className="absolute -bottom-1 -right-1 bg-[#050505] rounded-full p-[1px] z-10">
                    <BadgeCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" title="Verified Expert Educator" />
                  </div>
                )}
              </div>
              
              {/* 🚀 Show Name & Date ALWAYS, but shrink text heavily if compact */}
              <div className="flex flex-col min-w-0 pr-1">
                <div className="flex items-center gap-1.5">
                   <span className={`${isCompact ? 'text-[10px]' : 'text-[11px]'} font-extrabold truncate text-white/90 transition-all`}>
                     {note.user?.name || "Unknown"}
                   </span>
                   {!isCompact && note.user?.isVerifiedEducator && (
                       <BadgeCheck className="w-3 h-3 text-blue-400 shrink-0" title="Verified Expert Educator" />
                   )}
                </div>
                <span className={`${isCompact ? 'text-[8px]' : 'text-[9px]'} text-gray-400 font-black uppercase tracking-widest mt-[1px] truncate block w-full transition-all`}>
                  {formatDate(note.uploadDate)}
                </span>
              </div>
            </div>

            <Button
              disabled={isDownloading}
              onClick={handleDownload}
              aria-label={hasAccess ? `Download ${note.title}` : `Unlock ${note.title}`}
              className={`group relative h-9 rounded-full shrink-0
                bg-cyan-500/10 border border-cyan-500/30 text-cyan-300
                font-black uppercase tracking-widest text-[10px]
                transition-all duration-300 transform-gpu will-change-transform
                hover:bg-cyan-400 hover:text-black hover:border-cyan-300
                hover:shadow-[0_22px_60px_-30px_rgba(34,211,238,0.85)]
                active:scale-95 overflow-hidden
                ${isCompact ? 'w-9 px-0 flex items-center justify-center' : 'px-4 flex items-center gap-1.5'}`}
            >
              <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(700px_circle_at_30%_20%,rgba(255,255,255,0.20),transparent_55%)]" />
              <span className="relative z-10 flex items-center justify-center">
                {isDownloading ? (
                  <Loader2 aria-hidden="true" className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <>
                    {hasAccess ? (
                      <>
                        <Download aria-hidden="true" className="h-3.5 w-3.5" /> 
                        {!isCompact && <span className="ml-1.5">Get</span>}
                      </>
                    ) : (
                      <>
                        <Lock aria-hidden="true" className="h-3.5 w-3.5 text-emerald-400 group-hover:text-black" /> 
                        {!isCompact && <span className="ml-1.5">Unlock</span>}
                      </>
                    )}
                  </>
                )}
              </span>
            </Button>
          </div>

        </div>
      </div>
    </Card>
  );
}