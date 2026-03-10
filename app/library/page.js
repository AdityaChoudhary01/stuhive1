import { getPurchasedItems } from "@/actions/user.actions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import NoteCard from "@/components/notes/NoteCard";
import { Button } from "@/components/ui/button";
import { Library, Search, LockKeyhole, FolderHeart, FileText, Crown, AlertCircle, ShieldCheck, History } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import ReportNoteModal from "@/components/notes/ReportNoteModal";
import { Crown as CrownIcon } from "lucide-react";

export const metadata = {
  title: "My Library | StuHive",
  description: "Access your purchased premium study materials and bundles.",
};

export default async function LibraryPage() {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/login?callbackUrl=/library");
  }

  const { notes: purchasedNotes, bundles: purchasedBundles } = await getPurchasedItems();

  const isEmpty = purchasedNotes.length === 0 && purchasedBundles.length === 0;

  return (
    // 🚀 CHANGED: Reduced mobile horizontal padding to px-2
    <div className="container max-w-7xl py-24 sm:py-32 min-h-screen mx-auto px-2 sm:px-6">
      
      {/* Header */}
      <header className="mb-10 sm:mb-16 border-b border-white/10 pb-8 px-2 sm:px-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight flex items-center gap-3 md:gap-4">
              <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-500/30">
                <Library className="w-8 h-8 md:w-10 md:h-10 text-indigo-400" />
              </div>
              My Library
            </h1>
            <p className="text-muted-foreground mt-4 text-sm md:text-base font-medium max-w-2xl flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
              Your personal vault. All purchased content is snapshot-protected and accessible regardless of store updates.
            </p>
          </div>
          
          {!isEmpty && (
            <Link href="/search">
              <Button variant="outline" className="rounded-xl border-white/10 hover:bg-white/5">
                <Search className="w-4 h-4 mr-2" /> Explore More
              </Button>
            </Link>
          )}
        </div>
      </header>

      {isEmpty ? (
        <div className="text-center py-24 bg-secondary/10 rounded-[2.5rem] border-2 border-dashed border-white/10 px-4 flex flex-col items-center mx-2 sm:mx-0">
          <div className="bg-black/50 p-6 rounded-full mb-6 border border-white/5">
              <LockKeyhole className="w-12 h-12 text-muted-foreground opacity-50" />
          </div>
          <h2 className="text-2xl text-white font-bold mb-3">Your knowledge vault is empty</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            You haven&apos;t purchased any premium notes or bundles yet. Invest in top-tier materials to boost your grades!
          </p>
          <Link href="/shared-collections">
            <Button size="lg" className="rounded-2xl font-bold bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 h-12 px-8">
              <CrownIcon className="mr-2 w-5 h-5" /> Browse Premium Bundles
            </Button>
          </Link>
        </div>
      ) : (
        <Tabs defaultValue="bundles" className="space-y-8 sm:space-y-10 px-1 sm:px-0">
          <TabsList className="bg-white/5 border border-white/10 p-1 rounded-xl h-auto flex-wrap sm:flex-nowrap">
            <TabsTrigger value="bundles" className="flex-1 sm:flex-none rounded-lg px-4 sm:px-6 py-2.5 data-[state=active]:bg-indigo-500 data-[state=active]:text-white text-xs sm:text-sm font-bold transition-all">
              <FolderHeart className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" /> Bundles 
              <Badge className="ml-1.5 sm:ml-2 bg-white/10 text-white border-0">{purchasedBundles.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="notes" className="flex-1 sm:flex-none rounded-lg px-4 sm:px-6 py-2.5 data-[state=active]:bg-indigo-500 data-[state=active]:text-white text-xs sm:text-sm font-bold transition-all">
              <FileText className="w-3 h-3 sm:w-4 sm:h-4 mr-1.5 sm:mr-2" /> Individual
              <Badge className="ml-1.5 sm:ml-2 bg-white/10 text-white border-0">{purchasedNotes.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="bundles" className="mt-0">
            {purchasedBundles.length === 0 ? (
               <div className="py-20 text-center border border-dashed border-white/10 rounded-3xl">
                  <p className="text-muted-foreground font-medium">No bundles purchased yet.</p>
               </div>
            ) : (
              // 🚀 CHANGED: grid-cols-2 for mobile, gap-3 for mobile
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                {purchasedBundles.map((bundle) => (
                  <div key={bundle._id} className="flex flex-col gap-2">
                    <Link href={`/library/bundle/${bundle._id}`} className="flex-grow">
                      {/* 🚀 CHANGED: p-3 on mobile to save space */}
                      <div className="group p-3 sm:p-6 bg-white/[0.02] border border-white/10 rounded-[20px] sm:rounded-3xl hover:bg-white/[0.04] transition-all relative overflow-hidden h-full flex flex-col">
                        <div className="absolute top-0 right-0 p-3 sm:p-4 opacity-20 group-hover:opacity-100 transition-opacity">
                          <CrownIcon className="text-yellow-500 w-4 h-4 sm:w-6 sm:h-6" />
                        </div>
                        
                        {/* 🚀 CHANGED: flex-wrap so badges stack nicely on small screens */}
                        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 mb-3 sm:mb-4 pr-6 sm:pr-8">
                            <Badge className="bg-yellow-500/10 text-yellow-400 border-yellow-500/20 uppercase text-[7px] sm:text-[10px] font-black tracking-widest w-fit px-1.5 sm:px-2.5">Premium</Badge>
                            {/* 🚀 SNAPSHOT INDICATOR */}
                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 uppercase text-[7px] sm:text-[9px] font-black flex items-center gap-1 px-1.5 sm:px-2.5">
                                <History size={8} className="sm:w-[10px] sm:h-[10px]" /> Snapshot
                            </Badge>
                        </div>
                        
                        {/* 🚀 CHANGED: Smaller text on mobile */}
                        <h3 className="text-sm sm:text-xl font-bold text-white mb-1.5 sm:mb-2 group-hover:text-indigo-400 transition-colors line-clamp-2">{bundle.name}</h3>
                        <p className="text-muted-foreground text-[10px] sm:text-sm line-clamp-2 mb-4 sm:mb-6">{bundle.description || "Premium curated study collection."}</p>
                        
                        <div className="mt-auto flex flex-col gap-3 sm:gap-4">
                          {bundle.isArchived && (
                            <div className="flex items-center gap-1.5 text-[8px] sm:text-[10px] font-bold text-amber-500 bg-amber-500/10 p-1.5 sm:p-2 rounded-lg border border-amber-500/20 leading-tight">
                              <AlertCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5 shrink-0" /> AUTHOR REMOVED FROM STORE
                            </div>
                          )}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between pt-3 sm:pt-4 border-t border-white/5 gap-1">
                            <span className="text-[9px] sm:text-xs font-bold text-indigo-400 uppercase tracking-tighter">
                                {bundle.notes?.length || 0} Files
                            </span>
                            <div className="text-[8px] sm:text-[10px] text-muted-foreground font-bold truncate">BY {bundle.user?.name?.toUpperCase() || "CREATOR"}</div>
                          </div>
                        </div>
                      </div>
                    </Link>
                    <div className="px-1 sm:px-2">
                      <ReportNoteModal bundleId={bundle._id} title={bundle.name} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="notes" className="mt-0">
            {purchasedNotes.length === 0 ? (
               <div className="py-20 text-center border border-dashed border-white/10 rounded-3xl">
                  <p className="text-muted-foreground font-medium">No individual notes purchased yet.</p>
               </div>
            ) : (
              // 🚀 CHANGED: grid-cols-2 for mobile, gap-3 for mobile
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                {purchasedNotes.map((note) => (
                  <div key={note._id} className="h-full flex flex-col gap-2 relative group">
                    <div className="relative h-full">
                      {note.isArchived && (
                        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-[60] pointer-events-none">
                          <Badge className="bg-amber-500 text-black font-black text-[7px] sm:text-[8px] uppercase tracking-tighter shadow-lg shadow-black">
                            Archived
                          </Badge>
                        </div>
                      )}
                      <NoteCard note={note} />
                    </div>
                    <div className="px-1 sm:px-2">
                      <ReportNoteModal noteId={note._id} title={note.title} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}