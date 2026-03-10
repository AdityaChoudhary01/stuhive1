"use client";

import { useEffect, useState } from "react";
import { getMyWatchlist } from "@/actions/opportunity.actions"; // Ensure this matches your actions file
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Clock, ExternalLink, BookmarkMinus, Loader2 } from "lucide-react";
import SaveOpportunityButton from "@/components/opportunity/SaveOpportunityButton";

// Helper to find the deadline from the importantDates array
const getDeadlineWarning = (datesArr) => {
  if (!datesArr || datesArr.length === 0) return null;
  
  const deadlineObj = datesArr.find(d => 
    d.event.toLowerCase().includes('last date') || 
    d.event.toLowerCase().includes('deadline') ||
    d.event.toLowerCase().includes('exam date')
  );

  if (!deadlineObj) return null;

  return { text: `${deadlineObj.event}: ${deadlineObj.date}`, isUrgent: true };
};

export default function MyWatchlist() {
  const [opportunities, setOpportunities] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🚀 CHUNKING STATE
  const [currentChunk, setCurrentChunk] = useState(1);
  const [hasMoreChunk, setHasMoreChunk] = useState(false);
  const [isFetchingChunk, setIsFetchingChunk] = useState(false);

  // 🚀 PAGINATION STATE
  const ITEMS_PER_PAGE = 12;
  const [currentPage, setCurrentPage] = useState(1);

  // Initial Load
  useEffect(() => {
    async function fetchList() {
      const res = await getMyWatchlist(1, 120); // Fetch chunk 1
      if (res.success) {
        setOpportunities(res.opportunities);
        setHasMoreChunk(res.opportunities.length === 120);
      }
      setLoading(false);
    }
    fetchList();
  }, []);

  // 🚀 FETCH NEXT CHUNK LOGIC
  const loadMoreChunk = async () => {
    setIsFetchingChunk(true);
    const nextChunk = currentChunk + 1;
    const res = await getMyWatchlist(nextChunk, 120);
    
    if (res && res.success) {
      setOpportunities(prev => [...prev, ...res.opportunities]);
      setCurrentChunk(nextChunk);
      setHasMoreChunk(res.opportunities.length === 120);
    }
    setIsFetchingChunk(false);
  };

  if (loading) return <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-cyan-400" /></div>;

  if (opportunities.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center justify-center text-white/30 bg-white/[0.02] border border-white/5 rounded-3xl">
        <BookmarkMinus size={48} className="mb-4 opacity-50" />
        <h3 className="text-sm font-black uppercase tracking-widest">Watchlist is Empty</h3>
        <p className="text-xs mt-2">Save jobs and updates to track them here.</p>
        <Link href="/updates">
          <button className="mt-4 text-cyan-400 text-xs font-bold hover:underline">Browse Updates</button>
        </Link>
      </div>
    );
  }

  // 🚀 SLICE DATA FOR PAGINATION
  const paginatedOpportunities = opportunities.slice(
    (currentPage - 1) * ITEMS_PER_PAGE, 
    currentPage * ITEMS_PER_PAGE
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {paginatedOpportunities.map(opp => {
          const warning = getDeadlineWarning(opp.importantDates);

          return (
            <div key={opp._id} className="p-5 bg-card/50 border border-white/10 rounded-2xl relative group hover:bg-white/[0.02] transition-colors">
              <div className="absolute top-4 right-4 z-10">
                <SaveOpportunityButton opportunityId={opp._id} initiallySaved={true} />
              </div>
              
              <Badge variant="outline" className="bg-white/5 border-white/10 text-gray-300 text-[10px] mb-3">
                {opp.category}
              </Badge>

              <Link href={`/updates/${opp.slug}`} className="block">
                <h3 className="text-lg font-bold text-white group-hover:text-cyan-400 transition-colors pr-8">
                  {opp.title}
                </h3>
                <p className="text-xs font-bold uppercase tracking-widest text-cyan-500/80 mt-1">
                  {opp.organization}
                </p>
              </Link>

              {warning && (
                <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
                  <Clock className="w-3.5 h-3.5" />
                  {warning.text}
                </div>
              )}
              
              <div className="mt-4 flex justify-end">
                <Link href={`/updates/${opp.slug}`}>
                   <span className="text-[10px] font-black uppercase tracking-widest flex items-center text-gray-400 hover:text-white transition-colors">
                     View Details <ExternalLink className="w-3 h-3 ml-1" />
                   </span>
                </Link>
              </div>
            </div>
          );
        })}
      </div>

      {/* 🚀 UPGRADED PAGINATION CONTROLS */}
      <CustomPagination 
        totalItems={opportunities.length} 
        itemsPerPage={ITEMS_PER_PAGE} 
        currentPage={currentPage} 
        setCurrentPage={setCurrentPage} 
        hasMoreChunk={hasMoreChunk}
        isFetchingChunk={isFetchingChunk}
        onLoadChunk={loadMoreChunk}
      />
    </div>
  );
}

/** 🚀 UPGRADED: Custom Pagination Component with Server-Side Chunk Support */
function CustomPagination({ 
  totalItems, itemsPerPage, currentPage, setCurrentPage, 
  hasMoreChunk = false, onLoadChunk, isFetchingChunk = false 
}) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  
  if (totalPages <= 1 && !hasMoreChunk) return null;

  const handleNext = async () => {
    if (currentPage === totalPages && hasMoreChunk) {
      if (onLoadChunk) await onLoadChunk();
      setCurrentPage(prev => prev + 1);
      window.scrollTo({ top: 350, behavior: "smooth" });
    } else {
      setCurrentPage(prev => prev + 1);
      window.scrollTo({ top: 350, behavior: "smooth" });
    }
  };

  const handlePrev = () => {
    setCurrentPage(prev => prev - 1);
    window.scrollTo({ top: 350, behavior: "smooth" });
  };

  const handlePageSelect = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 350, behavior: "smooth" }); 
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="flex justify-center items-center gap-1.5 sm:gap-2 mt-8 pt-6 border-t border-white/5 pb-4">
      <Button 
        variant="outline" 
        size="sm" 
        disabled={currentPage === 1} 
        onClick={handlePrev}
        className="border-white/10 text-gray-400 hover:text-white disabled:opacity-30 rounded-full h-9 px-4 text-xs font-bold"
      >
        Prev
      </Button>
      
      {getPageNumbers().map(num => (
        <Button
          key={num}
          variant={currentPage === num ? "default" : "outline"}
          size="sm"
          onClick={() => handlePageSelect(num)}
          className={`w-9 h-9 p-0 rounded-full transition-all text-xs ${currentPage === num ? "bg-cyan-500 text-black font-black hover:bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)]" : "border-white/10 text-gray-400 hover:text-white"}`}
        >
          {num}
        </Button>
      ))}

      <Button 
        variant="outline" 
        size="sm" 
        disabled={(currentPage === totalPages && !hasMoreChunk) || isFetchingChunk} 
        onClick={handleNext}
        className="border-white/10 text-gray-400 hover:text-white disabled:opacity-30 rounded-full h-9 px-4 text-xs font-bold"
      >
        {isFetchingChunk ? <Loader2 className="w-4 h-4 animate-spin" /> : "Next"}
      </Button>
    </div>
  );
}