"use client";

import { useState } from "react";
import NoteCard from "@/components/notes/NoteCard";
import CollectionGrid from "@/components/collections/CollectionGrid"; // 🚀 Imported
import RequestBoard from "@/components/requests/RequestBoard"; // 🚀 Imported
import { Button } from "@/components/ui/button";
import { 
  FileText, HelpCircle, FolderHeart, BookOpen, Loader2, ArrowDown 
} from "lucide-react";
import Link from "next/link";
import { loadMoreUniversityData } from "@/actions/university.actions"; 

export default function UniversityHubClient({ data, slug, currentUser }) {
  const [activeTab, setActiveTab] = useState("notes");

  // 🚀 STATE FOR NOTES (Managed locally as Notes are simple grid items)
  const [notes, setNotes] = useState(data.notes || []);
  const [notesPage, setNotesPage] = useState(1);
  const [hasMoreNotes, setHasMoreNotes] = useState(
    (data.stats?.noteCount || 0) > (data.notes?.length || 0)
  );
  const [loadingMore, setLoadingMore] = useState(false);

  const handleLoadMoreNotes = async () => {
    if (loadingMore || !hasMoreNotes) return;
    setLoadingMore(true);

    try {
      const nextPage = notesPage + 1;
      const newItems = await loadMoreUniversityData(slug, "notes", nextPage, 12);
      
      setNotes(prev => [...prev, ...newItems]);
      setNotesPage(nextPage);
      
      if (newItems.length < 12) {
        setHasMoreNotes(false);
      }
    } catch (error) {
      console.error("Failed to load more notes:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="space-y-8 md:space-y-10 min-h-[60vh] pb-20 w-full">
      
      {/* TAB NAVIGATION */}
      <div className="flex items-center justify-start sm:justify-center gap-2 sm:gap-3 overflow-x-auto pb-4 pt-4 w-full hide-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
        <TabButton active={activeTab === "notes"} onClick={() => setActiveTab("notes")} icon={<FileText size={16} />} label="Top Notes" count={data.stats.noteCount} />
        <TabButton active={activeTab === "collections"} onClick={() => setActiveTab("collections")} icon={<FolderHeart size={16} />} label="Bundles" count={data.stats.collectionCount} />
        <TabButton active={activeTab === "requests"} onClick={() => setActiveTab("requests")} icon={<HelpCircle size={16} />} label="Q&A / Requests" count={data.stats.requestCount} />
      </div>

      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 min-h-[400px]">
        
        {/* =========================================
            NOTES TAB 
        ========================================= */}
        {activeTab === "notes" && (
          <div className="space-y-8">
            {notes.length > 0 ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                  {notes.map((note, index) => (
                    <NoteCard key={note._id} note={note} priority={index < 3} />
                  ))}
                </div>
                {hasMoreNotes && (
                    <div className="flex justify-center pt-10">
                         <Button 
                            onClick={handleLoadMoreNotes} 
                            disabled={loadingMore}
                            className="rounded-full px-8 py-6 text-xs sm:text-sm font-bold uppercase tracking-widest border border-white/10 bg-transparent hover:bg-white/5 hover:border-cyan-400/50 hover:text-white text-gray-300 transition-all duration-300"
                            >
                            {loadingMore ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin text-cyan-400" /> Loading...</>
                            ) : (
                                <>Load More Notes <ArrowDown className="w-4 h-4 ml-2 text-cyan-400" /></>
                            )}
                        </Button>
                    </div>
                )}
              </>
            ) : (
              <EmptyState title="No notes found" desc={`Be the first to upload notes for ${data.universityName}!`} href="/notes/upload" btnText="Upload Notes" />
            )}
          </div>
        )}

        {/* =========================================
            COLLECTIONS / BUNDLES TAB 
        ========================================= */}
        {activeTab === "collections" && (
          <div className="animate-in fade-in duration-500">
            {data.collections?.length > 0 ? (
                /* 🚀 Uses standard CollectionGrid: Blue ticks and categories work automatically */
                <CollectionGrid 
                    initialCollections={data.collections} 
                    totalCount={data.stats.collectionCount} 
                    hideTabs={true} 
                />
            ) : (
                <EmptyState title="No bundles found" desc="Organize the syllabus into a study bundle for this university." href="/profile" btnText="Create Bundle" />
            )}
          </div>
        )}

        {/* =========================================
            REQUESTS / Q&A TAB 
        ========================================= */}
        {activeTab === "requests" && (
          <div className="animate-in fade-in duration-500">
            {/* 🚀 Uses standard RequestBoard: Full functional board with user context */}
            <RequestBoard 
                initialRequests={data.requests} 
                currentUser={currentUser} 
                totalPages={Math.ceil(data.stats.requestCount / 12)} 
            />
          </div>
        )}

      </div>
    </div>
  );
}

// 🚀 TAB BUTTON SUB-COMPONENT
function TabButton({ active, onClick, icon, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-full text-xs sm:text-sm font-bold tracking-wide transition-all whitespace-nowrap shrink-0 ${
        active 
          ? "bg-cyan-500 text-black shadow-[0_0_20px_rgba(34,211,238,0.3)]" 
          : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/5"
      }`}
    >
      {icon} {label}
      <span className={`px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] ${active ? "bg-black/20 text-black" : "bg-white/10 text-gray-300"}`}>
        {count}
      </span>
    </button>
  );
}

// 🚀 EMPTY STATE SUB-COMPONENT
function EmptyState({ title, desc, href, btnText }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 border border-dashed border-white/10 rounded-[2rem] bg-white/[0.01] px-4 text-center mx-auto max-w-2xl">
      <div className="p-5 bg-white/5 rounded-full mb-5" aria-hidden="true">
        <BookOpen size={32} className="text-gray-500" strokeWidth={1.5} />
      </div>
      <h3 className="text-xl sm:text-2xl font-bold text-white mb-2 tracking-tight">{title}</h3>
      <p className="text-sm text-gray-400 mb-8 max-w-sm leading-relaxed">{desc}</p>
      <Link href={href}>
        <Button className="rounded-full h-12 px-8 bg-cyan-500 text-black hover:bg-cyan-400 font-bold shadow-[0_0_20px_rgba(34,211,238,0.2)]">
          {btnText}
        </Button>
      </Link>
    </div>
  );
}