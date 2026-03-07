import { getPurchasedNotes } from "@/actions/user.actions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import NoteCard from "@/components/notes/NoteCard";
import { Button } from "@/components/ui/button";
import { Library, Search, LockKeyhole } from "lucide-react";

export const metadata = {
  title: "My Library | StuHive",
  description: "Access your purchased premium study materials.",
};

export default async function LibraryPage() {
  const session = await getServerSession(authOptions);
  
  // Protect the route
  if (!session) {
    redirect("/login?callbackUrl=/library");
  }

  // Fetch the user's purchased notes
  const res = await getPurchasedNotes();
  const purchasedNotes = res.notes || [];

  return (
    <div className="container max-w-7xl py-24 sm:py-32 min-h-screen">
      
      {/* Header */}
      <header className="mb-10 sm:mb-16 border-b border-white/10 pb-8">
        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight flex items-center gap-3 md:gap-4">
          <div className="p-3 bg-indigo-500/20 rounded-2xl border border-indigo-500/30">
            <Library className="w-8 h-8 md:w-10 md:h-10 text-indigo-400" />
          </div>
          My Library
        </h1>
        <p className="text-muted-foreground mt-4 text-sm md:text-base font-medium max-w-2xl">
          Welcome to your personal vault. Here you have lifetime access to all the premium study materials and notes you have purchased on StuHive.
        </p>
      </header>

      {/* Content Grid */}
      {purchasedNotes.length === 0 ? (
        <div className="text-center py-24 bg-secondary/10 rounded-[2.5rem] border-2 border-dashed border-white/10 px-4 flex flex-col items-center">
          <div className="bg-black/50 p-6 rounded-full mb-6 border border-white/5">
              <LockKeyhole className="w-12 h-12 text-muted-foreground opacity-50" />
          </div>
          <h2 className="text-2xl text-white font-bold mb-3">Your library is empty</h2>
          <p className="text-muted-foreground mb-8 max-w-md mx-auto">
            {/* 🚀 FIXED: Escaped the apostrophe using &apos; */}
            You haven&apos;t purchased any premium notes yet. Invest in top-tier materials to boost your grades!
          </p>
          <Link href="/search">
            <Button size="lg" className="rounded-2xl font-bold bg-indigo-500 hover:bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 h-12 px-8">
              <Search className="mr-2 w-5 h-5" /> Browse Marketplace
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {purchasedNotes.map((note) => (
            <div key={note._id} className="h-full">
              <NoteCard note={note} />
            </div>
          ))}
        </div>
      )}

    </div>
  );
}