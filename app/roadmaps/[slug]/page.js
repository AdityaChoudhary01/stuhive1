import { getStudyPlanBySlug } from "@/actions/planner.actions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { notFound } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Calendar, User, BookOpen, Share2, Layers, Trophy, School, Lightbulb, CheckCircle2, BadgeCheck } from "lucide-react"; // 🚀 Added BadgeCheck
import { format } from "date-fns";
import Link from "next/link";
import ClonePlanButton from "@/components/planner/ClonePlanButton";

// 🚀 DATABASE MODELS
import connectDB from "@/lib/db";
import Blog from "@/lib/models/Blog";
import Note from "@/lib/models/Note";

// Category UI Configuration
const CATEGORY_STYLES = {
  "University": { icon: <School size={12} />, color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20" },
  "School": { icon: <BookOpen size={12} />, color: "text-pink-400 bg-pink-400/10 border-pink-400/20" },
  "Competitive Exams": { icon: <Trophy size={12} />, color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  "General": { icon: <Lightbulb size={12} />, color: "text-blue-400 bg-blue-400/10 border-blue-400/20" }
};

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { plan } = await getStudyPlanBySlug(slug);
  if (!plan) return { title: "Roadmap Not Found | StuHive" };
  return {
    title: `${plan.title} | Study Roadmaps`,
    description: `Follow this ${plan.category} roadmap by ${plan.user?.name}. Includes ${plan.resources?.length} curated resources.`,
  };
}

export default async function RoadmapPage({ params }) {
  const { slug } = await params;
  const session = await getServerSession(authOptions);
  const { plan } = await getStudyPlanBySlug(slug);

  if (!plan) notFound();

  await connectDB();

  // Enrich resources with titles and SEO slugs
  const enrichedResources = await Promise.all(
    plan.resources.map(async (res) => {
      let displayTitle = "Resource Preview";
      let resourceLink = "#";
      try {
        if (res.resourceType === 'Note') {
          const note = await Note.findById(res.resourceId).select('title slug').lean();
          if (note) {
            displayTitle = note.title;
            resourceLink = `/notes/${note.slug || res.resourceId}`;
          }
        } else if (res.resourceType === 'Blog') {
          const blog = await Blog.findById(res.resourceId).select('title slug').lean();
          if (blog) {
            displayTitle = blog.title;
            resourceLink = `/blogs/${blog.slug}`; 
          }
        }
      } catch (error) {
        console.error("Hydration Error:", error);
      }
      return { ...res, displayTitle, resourceLink };
    })
  );

  const catStyle = CATEGORY_STYLES[plan.category] || CATEGORY_STYLES["General"];

  return (
    <main className="min-h-screen pt-32 pb-20 px-4">
      <div className="max-w-4xl mx-auto relative">
        {/* Background Glow - MAINTAINED */}
        <div className="absolute top-[-100px] left-1/2 -translate-x-1/2 w-full h-[400px] bg-cyan-500/10 blur-[120px] pointer-events-none" />

        {/* 🚀 HEADER SECTION */}
        <div className="relative z-10 text-center mb-16">
          <Badge className={`${catStyle.color} mb-6 uppercase tracking-[0.2em] px-4 py-1 border flex items-center gap-2 w-fit mx-auto`}>
            {catStyle.icon} {plan.category} Roadmap
          </Badge>
          
          <h1 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight tracking-tight">
            {plan.title}
          </h1>
          
          <div className="flex flex-wrap items-center justify-center gap-4">
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full backdrop-blur-md">
              <User size={14} className="text-purple-400" />
              {/* 🚀 VERIFIED CREATOR BADGE */}
              <span className="flex items-center gap-1.5 text-sm font-bold text-gray-300">
                By {plan.user?.name || "Anonymous"}
                {plan.user?.isVerifiedEducator && (
                    <BadgeCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" title="Verified Expert Educator" />
                )}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-white/5 border border-white/10 px-4 py-2 rounded-full backdrop-blur-md">
              <Calendar size={14} className="text-cyan-400" />
              <span className="text-sm font-bold text-gray-300">
                Target: {plan.examDate ? format(new Date(plan.examDate), "MMM dd, yyyy") : "TBD"}
              </span>
            </div>
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 px-4 py-2 rounded-full text-emerald-400 backdrop-blur-md">
              <Share2 size={14} />
              <span className="text-sm font-black">{plan.clones || 0} Clones</span>
            </div>
          </div>

          <div className="mt-10">
            <ClonePlanButton planId={plan._id.toString()} userId={session?.user?.id} />
          </div>
        </div>

        {/* 🚀 INTERACTIVE TIMELINE SECTION */}
        <div className="relative max-w-2xl mx-auto mt-12">
          {/* Vertical Line Container */}
          {enrichedResources.length > 0 && (
            <div className="absolute left-4 md:left-1/2 top-0 bottom-0 w-0.5 bg-gradient-to-b from-cyan-500 via-purple-500/50 to-transparent" />
          )}

          <div className="space-y-12 relative z-10">
            {enrichedResources.length === 0 ? (
              <div className="text-center bg-white/[0.02] border border-dashed border-white/10 rounded-[32px] py-16">
                <Layers size={48} className="mx-auto mb-4 text-white/10" />
                <p className="text-gray-500 font-bold uppercase tracking-widest text-sm">Empty Roadmap</p>
              </div>
            ) : (
              enrichedResources.map((res, index) => (
                <div key={index} className="relative flex items-start md:items-center">
                  
                  {/* Timeline Node - Glowing Point */}
                  <div className="absolute left-[9px] md:left-[calc(50%-7px)] w-4 h-4 rounded-full bg-black border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.8)] z-20" />

                  {/* Card Container - Alternating Sides */}
                  <div className={`ml-12 md:ml-0 w-full md:w-[45%] ${index % 2 === 0 ? 'md:mr-auto md:text-right md:pr-12' : 'md:ml-auto md:text-left md:pl-12'}`}>
                    <div className="p-6 rounded-[32px] bg-white/[0.03] border border-white/10 hover:border-cyan-500/30 transition-all group backdrop-blur-md shadow-2xl relative overflow-hidden">
                      
                      {/* Subtle Step Counter Watermark */}
                      <span className="absolute -top-2 -right-2 text-6xl font-black text-white/[0.02] pointer-events-none group-hover:text-cyan-500/[0.03] transition-colors">
                        {index + 1}
                      </span>

                      <div className={`flex items-center gap-2 mb-3 text-[10px] font-black uppercase tracking-widest text-cyan-500 ${index % 2 === 0 ? 'md:justify-end' : ''}`}>
                         <CheckCircle2 size={12} className="opacity-50" /> Step {index + 1}
                      </div>
                      
                      <h3 className="text-lg font-bold text-white mb-6 group-hover:text-cyan-300 transition-colors line-clamp-2 leading-snug">
                        {res.displayTitle}
                      </h3>
                      
                      <Link href={res.resourceLink}>
                        <button className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-white text-black px-6 py-3 rounded-xl hover:bg-cyan-400 hover:scale-105 transition-all active:scale-95 shadow-xl shadow-white/5">
                          Study {res.resourceType} <BookOpen size={14} />
                        </button>
                      </Link>
                      
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Community Footer */}
        <div className="mt-24 text-center">
          <p className="text-gray-500 text-xs font-bold uppercase tracking-[0.3em]">End of Roadmap</p>
          <div className="mt-4 flex justify-center gap-4">
            <Link href="/roadmaps" className="text-cyan-400 text-xs font-black uppercase tracking-widest hover:text-white transition-colors">
              Browse More Paths
            </Link>
          </div>
        </div>
        
      </div>
    </main>
  );
}