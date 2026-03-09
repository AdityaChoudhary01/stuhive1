import { getPurchasedBundleSnapshot } from "@/actions/collection.actions";
import NoteCard from "@/components/notes/NoteCard";
import { Badge } from "@/components/ui/badge";
import { History, ShieldCheck, ArrowLeft, Ghost } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function BundleSnapshotPage({ params }) {
  // 🚀 Best practice for dynamic routes in Next.js 14/15
  const resolvedParams = await params;
  const { id } = resolvedParams;

  const data = await getPurchasedBundleSnapshot(id);

  if (!data || !data.success) {
    // Failsafe redirect if they try to access a bundle they didn't buy
    redirect("/library");
  }

  const { bundle, notes, purchasedAt } = data;

  return (
    <main className="container max-w-6xl py-24 mx-auto px-4 min-h-screen">
      <Link href="/library" className="inline-flex items-center gap-2 text-sm text-gray-400 hover:text-white mb-8 transition-colors bg-white/5 px-4 py-2 rounded-full">
        <ArrowLeft size={16} /> Back to Vault
      </Link>

      <header className="mb-12 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 px-3 py-1 gap-1.5 font-black uppercase text-[10px] tracking-widest">
            <History size={12} /> Permanent Snapshot
          </Badge>
          {bundle.isArchived && (
            <Badge variant="destructive" className="px-3 py-1 gap-1.5 font-black uppercase text-[10px] tracking-widest">
              <Ghost size={12} /> Author Removed Collection
            </Badge>
          )}
        </div>
        
        <h1 className="text-4xl md:text-6xl font-black text-white">{bundle.name}</h1>
        <p className="text-gray-400 max-w-2xl text-lg leading-relaxed">{bundle.description}</p>
        
        <div className="flex flex-wrap items-center gap-4 pt-6 border-t border-white/5">
          <div className="flex items-center gap-2 text-sm text-gray-500 font-medium">
            <ShieldCheck size={18} className="text-emerald-500" />
            Purchased on {purchasedAt ? new Date(purchasedAt).toLocaleDateString() : 'Unknown Date'}
          </div>
          <span className="text-gray-700 hidden sm:block">|</span>
          <div className="text-sm font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/10 px-3 py-1 rounded-lg border border-indigo-500/20">
            {notes.length} Files Protected
          </div>
        </div>
      </header>

      {notes.length === 0 ? (
        <div className="text-center py-20 bg-white/[0.02] border border-dashed border-white/10 rounded-3xl">
           <p className="text-gray-500 font-bold uppercase tracking-widest">No files were found in this snapshot.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notes.map((note) => (
            <div key={note._id} className="relative group h-full">
               <NoteCard note={note} />
            </div>
          ))}
        </div>
      )}
    </main>
  );
}