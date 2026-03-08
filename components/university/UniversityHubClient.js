"use client";

import { useState } from "react";
import NoteCard from "@/components/notes/NoteCard";
import { Button } from "@/components/ui/button";
import { FileText, HelpCircle, FolderHeart, ArrowRight, BookOpen, Clock, MessageSquare, GraduationCap, ArrowDown, Loader2 } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { loadMoreUniversityData } from "@/actions/university.actions"; 

export default function UniversityHubClient({ data, slug }) {
  const [activeTab, setActiveTab] = useState("notes");

  // 🚀 PAGINATION STATE
  const [items, setItems] = useState({
    notes: data.notes || [],
    collections: data.collections || [],
    requests: data.requests || []
  });

  const [pages, setPages] = useState({
    notes: 1, collections: 1, requests: 1
  });

  const [hasMore, setHasMore] = useState({
    notes: (data.stats?.noteCount || 0) > (data.notes?.length || 0),
    collections: (data.stats?.collectionCount || 0) > (data.collections?.length || 0),
    requests: (data.stats?.requestCount || 0) > (data.requests?.length || 0)
  });

  const [loadingMore, setLoadingMore] = useState(false);

  // 🚀 LOAD MORE HANDLER
  const handleLoadMore = async () => {
    if (loadingMore || !hasMore[activeTab]) return;
    setLoadingMore(true);

    try {
      const nextPage = pages[activeTab] + 1;
      const newItems = await loadMoreUniversityData(slug, activeTab, nextPage, 12);
      
      setItems(prev => ({ ...prev, [activeTab]: [...prev[activeTab], ...newItems] }));
      setPages(prev => ({ ...prev, [activeTab]: nextPage }));
      
      if (newItems.length < 12) {
        setHasMore(prev => ({ ...prev, [activeTab]: false }));
      }
    } catch (error) {
      console.error("Failed to load more:", error);
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <div className="space-y-8 md:space-y-10 min-h-[60vh] pb-20 w-full">
      
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
          <div className="space-y-8" itemProp="mainEntity" itemScope itemType="https://schema.org/ItemList">
            <h2 className="sr-only">Notes for {data.universityName}</h2>
            {items.notes.length > 0 ? (
              // 🚀 FIXED: grid-cols-2 for mobile
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                {items.notes.map((note, index) => (
                  <div key={note._id} itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem" className="h-full">
                    <meta itemProp="position" content={index + 1} />
                    <div itemProp="item" itemScope itemType="https://schema.org/CreativeWork" className="h-full">
                      <NoteCard note={note} priority={index < 3} />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No notes found" desc={`Be the first to upload notes for ${data.universityName}!`} href="/notes/upload" btnText="Upload Notes" />
            )}
          </div>
        )}

        {/* =========================================
            COLLECTIONS / BUNDLES TAB 
        ========================================= */}
        {activeTab === "collections" && (
          <div className="space-y-4">
            {items.collections.length > 0 ? (
              // 🚀 FIXED: grid-cols-2 for mobile
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                {items.collections.map((col) => (
                  <Link key={col._id} href={`/shared-collections/${col.slug}`} className="group outline-none block h-full focus-visible:ring-2 focus-visible:ring-cyan-500 rounded-2xl sm:rounded-3xl">
                    <article className="flex flex-col justify-between h-full p-4 sm:p-8 bg-white/[0.02] border border-white/10 rounded-2xl sm:rounded-3xl transition-all duration-300 hover:bg-white/[0.04] hover:border-cyan-500/30 hover:-translate-y-1 hover:shadow-[0_8px_30px_rgba(34,211,238,0.12)] relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-cyan-500/10 blur-[50px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" aria-hidden="true" />
                      <div className="relative z-10">
                        <header className="flex items-start justify-between mb-3 sm:mb-6">
                          <div className="flex flex-col gap-2 sm:gap-3">
                            <div className="p-2 sm:p-3 bg-white/5 rounded-lg sm:rounded-xl text-cyan-400 group-hover:scale-110 group-hover:bg-cyan-500/10 transition-all duration-300 flex items-center justify-center w-fit">
                              <FolderHeart size={16} className="sm:w-6 sm:h-6" strokeWidth={1.5} aria-hidden="true" />
                            </div>
                            {col.university && (
                              <span className="flex items-center gap-1 text-[7px] sm:text-[9px] font-black uppercase tracking-widest text-purple-400 bg-purple-500/10 border border-purple-500/20 px-1.5 py-0.5 rounded w-fit truncate max-w-[100px] sm:max-w-[150px]">
                                <GraduationCap size={8} aria-hidden="true" className="shrink-0 sm:w-2.5 sm:h-2.5" /> <span className="truncate">{col.university}</span>
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-1 sm:gap-1.5 px-1.5 py-0.5 sm:px-2.5 sm:py-1 bg-white/5 border border-white/10 rounded-full h-fit shrink-0">
                            <span className="w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full bg-green-500 animate-pulse" aria-hidden="true" />
                            <span className="text-[7px] sm:text-[10px] font-bold text-gray-300">{col.notes?.length || 0} <span className="hidden sm:inline">Files</span></span>
                          </div>
                        </header>
                        <h3 className="text-sm sm:text-xl font-bold mb-1.5 sm:mb-3 leading-snug tracking-tight text-white group-hover:text-cyan-400 transition-colors line-clamp-2">
                          {col.name}
                        </h3>
                        <p className="text-[10px] sm:text-sm text-gray-400 line-clamp-2 leading-relaxed mb-4 sm:mb-6">
                           {col.description || `Optimized academic collection for ${col.name}.`}
                        </p>
                      </div>
                      <footer className="pt-3 sm:pt-5 border-t border-white/10 flex items-center justify-between mt-auto relative z-10">
                        <div className="flex items-center gap-2 min-w-0 pr-2">
                           <Avatar className="h-5 w-5 sm:h-8 sm:w-8 border border-white/20 shrink-0">
                              <AvatarImage src={col.user?.avatar} alt={col.user?.name || "User"} />
                              <AvatarFallback className="bg-gray-800 text-gray-300 text-[8px] sm:text-[10px] font-bold">
                                {col.user?.name?.charAt(0) || "U"}
                              </AvatarFallback>
                           </Avatar>
                          <div className="flex flex-col min-w-0">
                            <span className="text-[9px] sm:text-xs font-semibold text-gray-300 truncate max-w-[70px] sm:max-w-[100px] group-hover:text-white transition-colors">
                              {col.user?.name || "Curator"}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-center w-5 h-5 sm:w-8 sm:h-8 rounded-full bg-white/5 text-gray-400 group-hover:bg-cyan-500 group-hover:text-black transition-all shrink-0">
                          <ArrowRight size={10} className="sm:w-4 sm:h-4" aria-hidden="true" />
                        </div>
                      </footer>
                    </article>
                  </Link>
                ))}
              </div>
            ) : (
               <EmptyState title="No bundles found" desc="Organize the syllabus into a study bundle for this university." href="/profile" btnText="Create Bundle" />
            )}
          </div>
        )}

        {/* =========================================
            REQUESTS / Q&A TAB 
        ========================================= */}
        {activeTab === "requests" && (
          <div className="space-y-4">
            {items.requests.length > 0 ? (
               // 🚀 FIXED: grid-cols-2 for mobile
               <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                 {items.requests.map((req) => (
                   <div key={req._id} className="group relative flex flex-col justify-between p-4 sm:p-6 bg-white/[0.02] border border-white/10 rounded-2xl sm:rounded-[1.5rem] hover:bg-orange-500/[0.02] hover:border-orange-500/30 transition-all duration-300 overflow-hidden h-full">
                     <div className="absolute -top-10 -right-10 w-32 h-32 bg-orange-500/10 blur-[50px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
                     <div className="relative z-10 mb-4 sm:mb-6">
                       <div className="flex items-center justify-between mb-3 sm:mb-4">
                         <div className="flex items-center gap-2 sm:gap-3">
                           <Avatar className="h-6 w-6 sm:h-10 sm:w-10 border border-white/10">
                              <AvatarImage src={req.requester?.avatar} alt={req.requester?.name} />
                              <AvatarFallback className="bg-orange-900 text-orange-200 text-[8px] sm:text-xs font-bold">
                                {req.requester?.name?.charAt(0) || "U"}
                              </AvatarFallback>
                           </Avatar>
                           <div>
                             <p className="text-[10px] sm:text-sm font-bold text-white/90 truncate max-w-[80px] sm:max-w-[120px]">{req.requester?.name || "Student"}</p>
                             <p className="text-[7px] sm:text-[10px] text-gray-500 font-medium uppercase tracking-widest mt-0.5 flex items-center gap-0.5 sm:gap-1">
                               <Clock className="w-2 h-2 sm:w-2.5 sm:h-2.5" />
                               {new Date(req.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: '2-digit' })}
                             </p>
                           </div>
                         </div>
                       </div>
                       <h3 className="text-sm sm:text-lg font-bold text-white mb-1.5 sm:mb-2 leading-snug group-hover:text-orange-400 transition-colors line-clamp-2">
                         {req.title}
                       </h3>
                       <p className="text-[10px] sm:text-sm text-gray-400 line-clamp-2 sm:line-clamp-3 leading-relaxed">
                         {req.description}
                       </p>
                     </div>
                     <footer className="pt-3 sm:pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between mt-auto relative z-10 gap-2 sm:gap-0">
                       <div className="flex items-center gap-1.5 text-[9px] sm:text-xs font-medium text-gray-400">
                         <MessageSquare className="w-3 h-3 sm:w-4 sm:h-4" /> 
                         <span className="hidden sm:inline">Q&A Board</span>
                       </div>
                       <Link href={`/requests?search=${encodeURIComponent(req.title)}`} className="w-full sm:w-auto">
                         <Button size="sm" className="w-full sm:w-auto h-7 sm:h-9 text-[9px] sm:text-xs rounded-full bg-orange-500/10 text-orange-400 hover:bg-orange-500 hover:text-black font-bold tracking-wide transition-all border border-orange-500/20">
                           Help <span className="hidden sm:inline ml-1">out</span> <ArrowRight className="w-2.5 h-2.5 sm:w-3.5 sm:h-3.5 ml-1" />
                         </Button>
                       </Link>
                     </footer>
                   </div>
                 ))}
               </div>
            ) : (
               <EmptyState title="No open requests" desc="Need something specific? Ask your university peers." href="/requests" btnText="Post Request" />
            )}
          </div>
        )}

        {/* 🚀 UNIVERSAL LOAD MORE BUTTON */}
        {hasMore[activeTab] && items[activeTab].length > 0 && (
          <div className="flex justify-center pt-10 sm:pt-12 animate-in fade-in duration-500">
            <Button 
              onClick={handleLoadMore} 
              disabled={loadingMore}
              className="rounded-full px-8 py-6 text-xs sm:text-sm font-bold uppercase tracking-widest border border-white/10 bg-transparent hover:bg-white/5 hover:border-cyan-400/50 hover:text-white text-gray-300 transition-all duration-300"
            >
              {loadingMore ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin text-cyan-400" /> Loading...</>
              ) : (
                <>Load More <ArrowDown className="w-4 h-4 ml-2 text-cyan-400" /></>
              )}
            </Button>
          </div>
        )}

      </div>
    </div>
  );
}

// 🚀 REUSABLE TAB BUTTON
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

// 🚀 REUSABLE EMPTY STATE
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