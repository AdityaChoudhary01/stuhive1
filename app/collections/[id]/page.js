import { notFound, redirect } from "next/navigation";
import { getCollectionById } from "@/actions/collection.actions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import NoteCard from "@/components/notes/NoteCard";
import CollectionActions from "@/components/notes/CollectionActions"; 
import { FolderOpen, Calendar, Globe, Lock, GraduationCap, ExternalLink, Trophy, BookOpen, School, Lightbulb, Crown } from "lucide-react";
import { formatDate } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { removeNoteFromCollection } from "@/actions/collection.actions"; 
import Link from "next/link";

// 🚀 Dynamic Config Helper for Private View
const getCategoryDetails = (cat) => {
  switch (cat) {
    case 'School': 
      return { label: "Board / School", icon: <BookOpen className="w-3.5 h-3.5" />, color: "bg-pink-500/10 text-pink-400 border-pink-500/20" };
    case 'Competitive Exams': 
      return { label: "Exam Body", icon: <Trophy className="w-3.5 h-3.5" />, color: "bg-amber-500/10 text-amber-400 border-amber-500/20" };
    case 'Other': 
      return { label: "Context", icon: <Lightbulb className="w-3.5 h-3.5" />, color: "bg-blue-500/10 text-blue-400 border-blue-500/20" };
    case 'University':
    default: 
      return { label: "University", icon: <School className="w-3.5 h-3.5" />, color: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20" };
  }
};

export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const collection = await getCollectionById(resolvedParams.id);
  return {
    title: collection ? `${collection.name} | Manage Archive` : "Archive Not Found",
    robots: { index: false, follow: false }
  };
}

export default async function ViewCollectionPage({ params }) {
  const resolvedParams = await params;

  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const collection = await getCollectionById(resolvedParams.id);
  
  if (!collection) {
    return notFound();
  }

  // 🛡️ SECURITY CHECK: Ensure only the owner can access this management page
  const collectionOwnerId = collection.user?._id?.toString() || collection.user?.toString();
  if (collectionOwnerId !== session.user.id) {
    return notFound();
  }

  const catDetails = getCategoryDetails(collection.category);
  
  // 🚀 SERIALIZATION SAFETY: Ensures all MongoDB Objects are converted for Client Components
  const serializedCollection = JSON.parse(JSON.stringify(collection));

  return (
    // 🚀 CHANGED: Added px-2 sm:px-6 md:px-8 to reduce horizontal padding on smaller devices
    <div className="container max-w-6xl px-2 sm:px-6 md:px-8 py-12 min-h-[80vh] pt-28">
      
      {/* 🚀 HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-start gap-6 mb-10 pb-8 border-b border-white/10 px-2 sm:px-0">
        <div className="flex-1 pr-4">
            <div className="flex flex-wrap items-center gap-2 sm:gap-3 mb-4">
              
              {/* PREMIUM BADGE */}
              {collection.isPremium && (
                <Badge variant="outline" className="flex items-center gap-1.5 bg-gradient-to-r from-yellow-500/20 to-amber-600/20 text-yellow-400 border-yellow-500/30 px-3 py-1 shadow-[0_0_15px_rgba(234,179,8,0.2)] font-bold">
                  <Crown className="w-3.5 h-3.5" aria-hidden="true" /> Premium Bundle (₹{collection.price})
                </Badge>
              )}

              <Badge variant="outline" className={`flex items-center gap-1.5 px-3 py-1 ${catDetails.color}`}>
                  {catDetails.icon} {catDetails.label}
              </Badge>
              
              <Badge variant="outline" className={`flex items-center gap-1.5 px-3 py-1 ${collection.visibility === 'public' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                  {collection.visibility === 'public' ? <Globe className="w-3.5 h-3.5" aria-hidden="true" /> : <Lock className="w-3.5 h-3.5" aria-hidden="true" />}
                  <span className="capitalize">{collection.visibility || 'Private'}</span>
              </Badge>

              {collection.university && (
                <Badge variant="outline" className="flex items-center gap-1.5 bg-white/5 text-gray-300 border-white/10 px-3 py-1">
                    <GraduationCap className="w-3.5 h-3.5" aria-hidden="true" /> {collection.university}
                </Badge>
              )}
            </div>

            <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white mb-3 leading-tight">
              {collection.name}
            </h1>

            {collection.description && (
              <p className="text-gray-400 text-sm sm:text-base max-w-2xl mb-6 leading-relaxed">
                {collection.description}
              </p>
            )}
            
            <div className="flex flex-wrap items-center gap-3 sm:gap-4 text-[10px] sm:text-xs font-bold uppercase tracking-widest text-gray-500">
               <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" aria-hidden="true" /> Created {formatDate(collection.createdAt)}</span>
               <span className="w-1.5 h-1.5 rounded-full bg-gray-700 hidden sm:block" aria-hidden="true" /> 
               <span>{collection.notes?.length || 0} Notes</span>
               
               {collection.visibility === 'public' && collection.slug && (
                 <>
                   <span className="w-1.5 h-1.5 rounded-full bg-gray-700 hidden sm:block" aria-hidden="true" /> 
                   <Link href={`/shared-collections/${collection.slug}`} className="flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 transition-colors bg-cyan-400/10 px-3 py-1.5 rounded-md">
                     <ExternalLink className="w-3.5 h-3.5" aria-hidden="true" /> View Public Page
                   </Link>
                 </>
               )}
            </div>
        </div>

        <div className="shrink-0 w-full md:w-auto">
          <CollectionActions collection={serializedCollection} />
        </div>
      </div>

      {/* Notes Grid */}
      {collection.notes && collection.notes.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
          {collection.notes.map((note, index) => {
            // 🚀 BINDING ACTION: Correctly binds parameters to the Server Action
            const removeNoteAction = removeNoteFromCollection.bind(null, collection._id.toString(), note._id.toString(), session.user.id);

            return (
              <div key={note._id} className="relative group h-full">
                  <NoteCard note={JSON.parse(JSON.stringify(note))} priority={index < 3} />
                  
                  <form action={removeNoteAction}>
                     <Button 
                       type="submit"
                       variant="destructive" 
                       size="sm" 
                       className="absolute top-2 right-2 sm:top-3 sm:right-3 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-all duration-300 z-50 h-7 sm:h-8 px-2 sm:px-3 text-[9px] sm:text-[10px] font-black uppercase tracking-widest shadow-lg active:scale-95"
                     >
                       Remove
                     </Button>
                  </form>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 bg-white/[0.01] rounded-3xl border border-dashed border-white/10 text-center px-4 mx-2 sm:mx-0">
            <div className="p-5 bg-white/5 rounded-full mb-5">
              <FolderOpen className="h-10 w-10 text-gray-500" aria-hidden="true" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2 tracking-tight">This archive is empty</h3>
            <p className="text-sm text-gray-400 mb-8 max-w-sm leading-relaxed">Start browsing the repository to add study materials and notes to this bundle.</p>
            <Button asChild className="rounded-full bg-cyan-500 text-black hover:bg-cyan-400 font-bold px-8 h-12">
                <Link href="/search">Explore Notes</Link>
            </Button>
        </div>
      )}
    </div>
  );
}