"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Download, FileText, Image as ImageIcon, FileType, Heart, Eye, Presentation, Table as TableIcon, Loader2, School } from "lucide-react";
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

export default function NoteCard({ note, priority = false }) {
  const { data: session, update: updateSession } = useSession();
  const { toast } = useToast();

  const [isSaved, setIsSaved] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    if (session?.user?.savedNotes?.includes(note._id)) setIsSaved(true);
    else setIsSaved(false);
  }, [session?.user?.savedNotes, note._id]);

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
    educationalLevel: "University",
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

  const handleDownload = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!note.fileKey) return toast({ title: "Error", description: "File missing.", variant: "destructive" });

    setIsDownloading(true);
    try {
      const downloadUrl = await getNoteDownloadUrl(note.fileKey, note.fileName);
      if (!downloadUrl) throw new Error();
      window.open(downloadUrl, "_blank");
      incrementDownloadCount(note._id).catch(() => {});
      toast({ title: "Starting Download" });
    } catch {
      toast({ title: "Error", description: "Failed to get link.", variant: "destructive" });
    } finally {
      setTimeout(() => setIsDownloading(false), 1000);
    }
  };

  return (
    <Card
      // 🚀 FIX: Adding this empty onClick forces iOS/Safari to register touch events outside the popover, automatically closing the planner menu!
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

      {/* Action Buttons Container (Outside the overflow-hidden wrapper) */}
      <div 
        className="absolute top-4 right-4 z-[60] flex flex-col-reverse sm:flex-row items-center gap-2"
        // 🚀 FIX: Stops the popover click from triggering the card's dummy click handler
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
        {/* top accent line */}
        <div className="absolute top-0 inset-x-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 z-50 pointer-events-none" />

        {/* hover glow */}
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none bg-[radial-gradient(900px_circle_at_30%_10%,rgba(34,211,238,0.10),transparent_55%)]" />

        {/* --- TOP SECTION (IMAGE) --- */}
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
                className="object-cover transition-transform transition-duration-[1500ms] ease-out group-hover:scale-[1.08]
                  opacity-85 group-hover:opacity-100 will-change-transform transform-gpu"
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

        {/* --- BOTTOM SECTION (TEXT) --- */}
        <div className="flex flex-col flex-grow p-5 sm:p-6 pt-5 relative z-10 bg-[#050505]">
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
              <School aria-hidden="true" className="w-3.5 h-3.5 text-gray-500 shrink-0" />
              <span className="truncate">{note.course}</span> <span className="text-gray-600">•</span>
              <Link
                href={`/univ/${note.university?.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)+/g, "") || "general"}`}
                className="truncate hover:text-cyan-300 transition-colors pointer-events-auto"
                title={`View all notes for ${note.university}`}
              >
                {note.university}
              </Link>
            </div>
          </div>

          {/* Stats Pills */}
          <div className="flex items-center justify-between text-sm mb-6 flex-wrap gap-2">
            <div
              className="flex items-center gap-1.5 bg-white/[0.03] shadow-inner px-3.5 py-1.5 rounded-full border border-white/5
                hover:border-white/10 transition-colors"
              aria-label={`Rated ${note.rating || 0} stars`}
            >
              <StarRating rating={note.rating} size="sm" />
              <span className="text-[10px] font-bold text-gray-400 ml-1">({note.numReviews})</span>
            </div>

            <div className="flex items-center text-gray-400 text-[10px] gap-3.5 uppercase tracking-widest font-bold bg-white/[0.03] shadow-inner px-3.5 py-1.5 rounded-full border border-white/5 hover:border-white/10 transition-colors">
              <span className="flex items-center gap-1.5" aria-label={`${note.viewCount || 0} views`}>
                <Eye aria-hidden="true" className="h-3.5 w-3.5 text-cyan-400/80" /> {note.viewCount || 0}
              </span>
              <span className="flex items-center gap-1.5" aria-label={`${note.downloadCount || 0} downloads`}>
                <Download aria-hidden="true" className="h-3.5 w-3.5 text-emerald-400/80" /> {note.downloadCount || 0}
              </span>
            </div>
          </div>

          {/* User Info & Get Button */}
          <div className="flex items-center justify-between gap-4 mt-auto pt-2">
            <div className="flex items-center gap-3 overflow-hidden pr-2 flex-1 min-w-0">
              <img
                src={note.user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(note.user?.name || "U")}&background=random&color=fff`}
                alt={`${note.user?.name}'s avatar`}
                width={36}
                height={36}
                decoding="async"
                loading="lazy"
                // 🚀 FIX: Added min-w-[36px] min-h-[36px] and aspect-square to prevent oval squishing
                className="w-9 h-9 min-w-[36px] min-h-[36px] aspect-square rounded-full border border-white/20 shrink-0 object-cover"
              />
              <div className="flex flex-col min-w-0">
                <span className="text-[11px] font-extrabold truncate text-white/90">{note.user?.name || "Unknown"}</span>
                <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-0.5 truncate">{formatDate(note.uploadDate)}</span>
              </div>
            </div>

            <Button
              disabled={isDownloading}
              onClick={handleDownload}
              aria-label={`Download ${note.title}`}
              className="group relative h-10 rounded-full px-5 gap-2 shrink-0
                bg-cyan-500/10 border border-cyan-500/30 text-cyan-300
                font-black uppercase tracking-widest text-[10px]
                transition-all duration-300 transform-gpu will-change-transform
                hover:bg-cyan-400 hover:text-black hover:border-cyan-300
                hover:shadow-[0_22px_60px_-30px_rgba(34,211,238,0.85)]
                active:scale-95 overflow-hidden"
            >
              <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(700px_circle_at_30%_20%,rgba(255,255,255,0.20),transparent_55%)]" />
              <span className="relative z-10 inline-flex items-center gap-2">
                {isDownloading ? (
                  <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Download aria-hidden="true" className="h-4 w-4" /> <span>Get</span>
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