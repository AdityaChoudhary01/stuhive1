import { getPublicStudyPlans } from "@/actions/planner.actions";
import Link from "next/link";
import { Globe, Search, User, Layers, Share2, Trophy, School, BookOpen, Lightbulb } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

// 🚀 Directory Category Icons Helper
const getCategoryDetails = (category) => {
  switch (category) {
    case 'School': return { icon: <BookOpen size={12} />, color: "text-pink-400 bg-pink-400/10 border-pink-400/20" };
    case 'Competitive Exams': return { icon: <Trophy size={12} />, color: "text-amber-400 bg-amber-400/10 border-amber-400/20" };
    case 'Other': return { icon: <Lightbulb size={12} />, color: "text-blue-400 bg-blue-400/10 border-blue-400/20" };
    case 'University':
    default: return { icon: <School size={12} />, color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20" };
  }
};

export const metadata = {
  title: "Community Roadmaps | StuHive",
  description: "Discover and clone study roadmaps created by top students.",
};

export default async function RoadmapsDirectoryPage({ searchParams }) {
  const query = (await searchParams)?.q || "";
  const { plans } = await getPublicStudyPlans(query);

  return (
    <main className="min-h-screen pt-28 pb-20 px-4">
      {/* Background Theme - PRESERVED */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[500px] bg-gradient-to-b from-purple-500/10 to-transparent pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Header & Search */}
        <header className="mb-12 text-center max-w-2xl mx-auto">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-400 mb-6">
            <Globe size={14} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Global Directory</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight mb-4 leading-tight">
            Community <span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-cyan-400">Roadmaps</span>
          </h1>
          <p className="text-gray-400 font-medium mb-8">Discover study paths curated by peers. Clone them to your personal planner and follow their exact study strategy.</p>

          <form action="/roadmaps" method="GET" className="relative w-full max-w-lg mx-auto group">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500 w-5 h-5 group-focus-within:text-purple-400 transition-colors" />
            <input 
              type="text" 
              name="q"
              defaultValue={query}
              placeholder="Search by exam, subject, or course..." 
              className="w-full bg-white/5 border border-white/10 rounded-full py-4 pl-12 pr-4 text-white focus:outline-none focus:border-purple-500 transition-all shadow-xl"
            />
          </form>
        </header>

        {/* Grid of Roadmaps */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {plans.length === 0 ? (
            <div className="col-span-full py-20 text-center text-gray-500 border border-dashed border-white/10 rounded-[32px] bg-white/[0.01]">
              No public roadmaps found matching your search.
            </div>
          ) : (
            plans.map(plan => {
              const cat = getCategoryDetails(plan.category);

              return (
                <Link key={plan._id} href={`/roadmaps/${plan.slug}`} className="group block h-full">
                  <div className="p-7 rounded-[32px] bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-purple-500/30 transition-all duration-500 h-full flex flex-col relative overflow-hidden">
                    
                    <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-2.5">
                        <Avatar className="w-9 h-9 border border-white/10">
                          <AvatarImage src={plan.user?.avatar} />
                          <AvatarFallback className="bg-purple-900 text-xs font-bold text-white">{plan.user?.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                           <span className="text-xs font-bold text-gray-200 group-hover:text-white transition-colors">{plan.user?.name}</span>
                           <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wider">Curator</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full border border-purple-500/20">
                        <Share2 size={12} /> {plan.clones || 0}
                      </div>
                    </div>

                    <Badge className={`w-fit mb-4 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border flex items-center gap-1.5 ${cat.color}`}>
                      {cat.icon} {plan.category}
                    </Badge>

                    <h3 className="text-xl font-black text-white mb-4 leading-snug group-hover:text-purple-300 transition-colors line-clamp-2">
                      {plan.title}
                    </h3>
                    
                    <div className="mt-auto pt-6 flex items-center justify-between border-t border-white/5">
                      <div className="flex items-center gap-4 text-gray-500 text-[10px] font-black uppercase tracking-widest">
                        <span className="flex items-center gap-1.5"><Layers size={14} className="text-cyan-400" /> {plan.resources?.length || 0} Modules</span>
                      </div>
                      
                      <div className="text-[10px] font-black text-cyan-400 opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all">
                        View Path →
                      </div>
                    </div>

                    {/* Subtle Gradient Accent */}
                    <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 blur-[50px] -z-10 group-hover:bg-purple-500/10 transition-all" />
                  </div>
                </Link>
              );
            })
          )}
        </div>

      </div>
    </main>
  );
}