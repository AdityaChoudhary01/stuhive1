"use client";

import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { createRequest, fulfillRequest, getRequests, deleteRequest } from "@/actions/request.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; 
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"; 
import { Badge } from "@/components/ui/badge"; 
import { CheckCircle2, Clock, Plus, ArrowRight, Link as LinkIcon, Loader2, ChevronDown, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";

export default function RequestBoard({ initialRequests, currentUser, initialPage = 1, totalPages = 1 }) {
  const [requests, setRequests] = useState(initialRequests || []);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("all"); 
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();

  const filteredRequests = requests.filter(req => {
    if (filter === "all") return true;
    return req.status === filter;
  });

  const hasMore = page < totalPages;

  // 🚀 HYBRID LOAD MORE FOR SEO & UX
  const loadMore = async (e) => {
    e.preventDefault(); // Stop normal link navigation for humans
    if (loading || !hasMore) return;
    setLoading(true);
    
    try {
      const nextPage = page + 1;
      const res = await getRequests({ page: nextPage, limit: 20 });
      
      setRequests((prev) => [...prev, ...res.requests]);
      setPage(nextPage);
      
      // Update the URL without reloading the page so sharing works
      window.history.replaceState(null, "", `${pathname}?page=${nextPage}`);
    } catch (error) {
      toast({ title: "Error", description: "Failed to load older requests.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if(!currentUser) return toast({title: "Login Required", variant: "destructive"});

    const formData = new FormData(e.target);
    const data = {
        title: formData.get("title"),
        subject: formData.get("subject"),
        university: formData.get("university"),
        description: formData.get("description"),
    };

    const res = await createRequest(data, currentUser.id);
    if(res.success) {
        setRequests([res.request, ...requests]);
        toast({ title: "Request Posted!", description: "The community has been notified." });
        router.refresh();
        setIsCreateOpen(false); 
    } else {
        toast({ title: "Error", description: res.error, variant: "destructive" });
    }
  };

  const handleFulfillSubmit = async (requestId, noteUrl) => {
    if(!currentUser) return toast({title: "Login Required", variant: "destructive"});
    
    const res = await fulfillRequest(requestId, noteUrl, currentUser.id);
    if(res.success) {
        setRequests(prev => prev.map(req => req._id === requestId ? { ...req, status: "fulfilled", fulfillmentNote: { _id: "new", title: "Just Added" } } : req));
        toast({ title: "Hero! 🏆", description: "You just helped a student out." });
        router.refresh();
        return true; 
    } else {
        toast({ title: "Failed", description: res.error, variant: "destructive" });
        return false;
    }
  };

  // 🚀 DELETE HANDLER
  const handleDeleteRequest = async (requestId) => {
    if (!confirm("Are you sure you want to delete this request?")) return;
    
    try {
      const res = await deleteRequest(requestId, currentUser.id);
      if (res.success) {
        setRequests(prev => prev.filter(r => r._id !== requestId));
        toast({ title: "Request Deleted" });
        router.refresh();
      } else {
        toast({ title: "Error", description: res.error, variant: "destructive" });
      }
    } catch (error) {
      toast({ title: "Error", description: "Something went wrong.", variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6 md:space-y-8">
        {/* Controls */}
        <nav className="flex flex-col md:flex-row justify-between items-center gap-4 bg-secondary/5 p-2 rounded-2xl border border-white/5 shadow-inner" aria-label="Request filters">
            <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-2 md:pb-0 scrollbar-none">
                {['all', 'pending', 'fulfilled'].map(tab => (
                    <Button 
                        key={tab}
                        variant={filter === tab ? "default" : "ghost"}
                        onClick={() => setFilter(tab)}
                        aria-pressed={filter === tab}
                        className={`rounded-xl capitalize font-bold tracking-wide shrink-0 ${filter === tab ? "bg-orange-500 text-black hover:bg-orange-600 shadow-[0_0_15px_rgba(249,115,22,0.4)]" : "text-muted-foreground hover:text-white"}`}
                    >
                        {tab}
                    </Button>
                ))}
            </div>

            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
  <Button className="rounded-xl font-bold bg-orange-500 text-black hover:bg-orange-600 transition-all shadow-[0_0_20px_rgba(249,115,22,0.4)] w-full md:w-auto border-0">
    <Plus size={18} className="mr-2" aria-hidden="true" /> Post a Request
  </Button>
</DialogTrigger>
                <DialogContent className="sm:max-w-lg bg-[#0c0c10] border-white/10 text-white">
                    <DialogHeader>
                        <DialogTitle className="text-xl font-black text-orange-400">Post a Request</DialogTitle>
                    </DialogHeader>
                    <form onSubmit={handleCreateSubmit} className="space-y-5 mt-2">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label htmlFor="subject" className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Subject</label>
                                <Input id="subject" name="subject" placeholder="e.g. Discrete Math" className="bg-black/40 border-white/10 focus-visible:ring-orange-500" required />
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="university" className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">University</label>
                                <Input id="university" name="university" placeholder="e.g. Mumbai Univ" className="bg-black/40 border-white/10 focus-visible:ring-orange-500" required />
                            </div>
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="title" className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Title</label>
                            <Input id="title" name="title" placeholder="Looking for semester 4 PYQs..." className="bg-black/40 border-white/10 focus-visible:ring-orange-500" required />
                        </div>
                        <div className="space-y-1.5">
                            <label htmlFor="description" className="text-[10px] uppercase font-black tracking-widest text-muted-foreground">Description</label>
                            <Textarea id="description" name="description" placeholder="Add specific details about what you need..." required className="min-h-[100px] resize-none bg-black/40 border-white/10 focus-visible:ring-orange-500" />
                        </div>
                        <Button type="submit" className="w-full h-12 rounded-xl bg-gradient-to-r from-orange-500 to-red-600 hover:from-orange-400 hover:to-red-500 text-white font-black uppercase tracking-widest text-xs border-0">
                            Broadcast Request
                        </Button>
                    </form>
                </DialogContent>
            </Dialog>
        </nav>

        {/* 🚀 SEO: ItemList Schema & 2-Col Mobile Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6" itemScope itemType="https://schema.org/ItemList">
            {filteredRequests.map((req, index) => (
                <RequestCard 
                    key={req._id} 
                    req={req} 
                    index={index}
                    currentUser={currentUser} 
                    onFulfill={handleFulfillSubmit} 
                    onDelete={handleDeleteRequest}
                />
            ))}
        </div>
        
        {filteredRequests.length === 0 && (
             <div className="text-center py-20 bg-white/[0.01] rounded-[2rem] border border-dashed border-white/5">
                 <p className="text-muted-foreground font-medium">No requests found in this category.</p>
             </div>
        )}

        {/* 🚀 SEO Routable Load More Button */}
        {hasMore && filter === "all" && (
          <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-8 relative">
            <Button 
              variant="outline" 
              size="lg" 
              onClick={loadMore} 
              disabled={loading}
              className="w-full sm:w-auto h-12 rounded-full px-8 bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] hover:border-orange-500/50 text-white font-black uppercase tracking-widest text-[11px] transition-all hover:shadow-[0_0_20px_rgba(249,115,22,0.15)] group"
            >
              {loading ? (
                <Loader2 aria-hidden="true" className="w-4 h-4 mr-2 animate-spin text-orange-400" />
              ) : (
                <ChevronDown aria-hidden="true" className="w-4 h-4 mr-2 text-orange-400 group-hover:translate-y-1 transition-transform" />
              )}
              {loading ? "Loading..." : "Load Older Requests"}
            </Button>

            {/* 🚀 SEO BOT TRAP: Hidden anchor tag ensures Googlebot crawls pagination */}
            <noscript>
              <Link 
                href={`?page=${page + 1}`} 
                title="Next page of requests"
                className="text-[10px] text-orange-400 underline"
              >
                Browse page {page + 1}
              </Link>
            </noscript>
          </div>
        )}
    </div>
  );
}

// Sub-Component
function RequestCard({ req, currentUser, onFulfill, onDelete, index }) {
    const isPending = req.status === 'pending';
    const [link, setLink] = useState("");
    const [isFulfillOpen, setIsFulfillOpen] = useState(false);

    // 🚀 Check if currentUser is the owner
    const isOwner = currentUser?.id === req.requester?._id || currentUser?.id === req.requester;

    const handleFulfillClick = async () => {
        const success = await onFulfill(req._id, link);
        if (success) {
            setIsFulfillOpen(false); 
            setLink(""); 
        }
    }

    return (
        // 🚀 SEO: ListItem & Question Schema Mapping
        <article 
            itemProp="itemListElement" 
            itemScope 
            itemType="https://schema.org/ListItem"
            className={`relative p-[1px] rounded-[1.2rem] sm:rounded-[1.5rem] bg-gradient-to-br ${isPending ? 'from-orange-500/30 to-transparent' : 'from-green-500/30 to-transparent'} hover:from-white/20 transition-all duration-500 group shadow-lg flex flex-col`}
        >
            <meta itemProp="position" content={index + 1} />
            
            <div 
                itemProp="item" 
                itemScope 
                itemType="https://schema.org/Question"
                className="bg-[#0a0118]/90 backdrop-blur-md rounded-[1.15rem] sm:rounded-[1.45rem] p-4 sm:p-6 h-full flex flex-col justify-between relative overflow-hidden"
            >
                <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-2 mb-4">
                    <div className="flex flex-wrap gap-1.5 pr-1">
                        <Badge variant="outline" className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-white/60 bg-white/5 border-white/10 px-1.5 py-0.5">{req.university}</Badge>
                        <Badge variant="outline" className="text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-white/60 bg-white/5 border-white/10 px-1.5 py-0.5">{req.subject}</Badge>
                    </div>
                    
                    <div className="flex items-center gap-2 shrink-0">
                        {/* 🚀 Delete Button - only for Owner */}
                        {isOwner && (
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => onDelete(req._id)}
                                className="h-6 w-6 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-full"
                            >
                                <Trash2 size={12} />
                            </Button>
                        )}

                        {isPending ? (
                            <span className="flex items-center w-fit gap-1 text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-orange-400 bg-orange-500/10 border border-orange-500/20 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full shrink-0">
                                <Clock size={8} className="sm:w-2.5 sm:h-2.5" aria-hidden="true" /> Pending
                            </span>
                        ) : (
                            <span className="flex items-center w-fit gap-1 text-[8px] sm:text-[9px] font-black uppercase tracking-widest text-green-400 bg-green-500/10 border border-green-500/20 px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full shrink-0" itemProp="answerCount" content="1">
                                <CheckCircle2 size={8} className="sm:w-2.5 sm:h-2.5" aria-hidden="true" /> Fulfilled
                            </span>
                        )}
                    </div>
                </div>

                <div className="space-y-2 mb-6 flex-grow">
                    <h3 className="text-sm sm:text-lg font-bold leading-snug sm:leading-tight text-white/95 group-hover:text-orange-400 transition-colors line-clamp-2" itemProp="name">
                        {req.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-400 line-clamp-2 sm:line-clamp-3 leading-relaxed" itemProp="text">
                        {req.description}
                    </p>
                </div>

                <footer className="mt-auto border-t border-white/5 pt-3 sm:pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                     <div className="flex items-center gap-2 min-w-0" itemProp="author" itemScope itemType="https://schema.org/Person">
                        <Avatar className="h-5 w-5 sm:h-7 sm:w-7 border border-white/10 shrink-0">
                            <AvatarImage src={req.requester?.avatar} itemProp="image"/>
                            <AvatarFallback className="bg-white/10 text-[8px] sm:text-xs">{req.requester?.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-[10px] sm:text-xs font-bold text-gray-300 truncate" itemProp="name">{isOwner ? "You" : (req.requester?.name || "Student")}</span>
                     </div>

                     {isPending ? (
                         <Dialog open={isFulfillOpen} onOpenChange={setIsFulfillOpen}>
                             <DialogTrigger asChild>
                                 <Button size="sm" variant="ghost" className="h-7 sm:h-8 px-2 sm:px-3 text-[9px] sm:text-[11px] font-black uppercase tracking-wider text-orange-400 hover:text-orange-300 hover:bg-orange-400/10 shrink-0 w-full sm:w-auto">
                                     Help Out <ArrowRight size={12} className="ml-1 sm:ml-1.5" aria-hidden="true" />
                                 </Button>
                             </DialogTrigger>
                             <DialogContent className="bg-[#0c0c10] border-white/10 text-white w-[90%] sm:w-full max-w-md rounded-2xl">
                                 <DialogHeader><DialogTitle className="text-orange-400 font-bold">Fulfill Request</DialogTitle></DialogHeader>
                                 <div className="space-y-4 py-4">
                                     <p className="text-sm text-gray-400">
                                         Have this material? Paste the StuHive link to your uploaded note below.
                                     </p>
                                     <Input 
                                         placeholder="https://stuhive.in/notes/..." 
                                         value={link}
                                         onChange={(e) => setLink(e.target.value)}
                                         className="bg-black/40 border-white/10 focus-visible:ring-orange-500"
                                     />
                                     <Button 
                                         onClick={handleFulfillClick} 
                                         disabled={!link.trim()}
                                         className="w-full bg-green-600 hover:bg-green-500 text-white font-bold"
                                     >
                                         <CheckCircle2 className="mr-2" size={16} aria-hidden="true" /> Mark as Fulfilled
                                     </Button>
                                 </div>
                             </DialogContent>
                         </Dialog>
                     ) : (
                         <Link href={`/notes/${req.fulfillmentNote?.slug || req.fulfillmentNote?._id || '#'}`} title="View fulfilling document" className="shrink-0 outline-none focus-visible:ring-2 focus-visible:ring-green-500 rounded-md w-full sm:w-auto">
                             <Button size="sm" variant="secondary" className="h-7 sm:h-8 w-full sm:w-auto px-2 sm:px-3 text-[8px] sm:text-[10px] font-black uppercase tracking-widest bg-green-500/10 text-green-400 hover:bg-green-500/20 border border-green-500/20">
                                 View Note <LinkIcon size={10} className="ml-1 sm:ml-1.5" aria-hidden="true" />
                             </Button>
                         </Link>
                     )}
                </footer>
            </div>
        </article>
    );
}