import { getCategorizedOpportunities } from "@/actions/opportunity.actions";
import Link from "next/link";
import { Briefcase, FileCheck, Trophy, BellRing, GraduationCap, Book, Key } from "lucide-react";

// 🚀 HYPER SEO: Targeted Dynamic Metadata
export const metadata = {
  title: "Latest Jobs, Results, Admit Cards & Answer Keys 2026 | StuHive",
  description: "One-stop dashboard for SSC, UPSC, Railway, Bank, and State Level Govt Jobs. Get real-time updates on Latest Online Forms, Exam Dates, Admit Cards, and Results 2026.",
  keywords: [
    "Sarkari Result 2026", "Latest Govt Jobs", "Online Form 2026", 
    "Admit Card download", "Exam Results", "Admission Notifications",
    "Syllabus PDF", "Answer Keys", "StuHive Updates"
  ],
  alternates: {
    canonical: "https://stuhive.com/updates", // Replace with your actual domain
  },
  openGraph: {
    title: "Live Exam & Career Board 2026 | StuHive",
    description: "Instant updates on Govt Jobs, Admit Cards, and Results.",
    url: "https://stuhive.com/updates",
    type: "website",
  }
};

export default async function UpdatesDashboardPage() {
  const { data } = await getCategorizedOpportunities();

  // 🚀 HYPER SEO: CollectionPage & DataFeed Schema
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Live Exam & Career Update Board",
    "description": "Daily updates on government recruitment, admit cards, and results.",
    "publisher": {
      "@type": "Organization",
      "name": "StuHive",
      "logo": {
        "@type": "ImageObject",
        "url": "https://stuhive.com/logo.png"
      }
    },
    "mainEntity": {
      "@type": "ItemList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Latest Govt Jobs" },
        { "@type": "ListItem", "position": 2, "name": "Exam Results" },
        { "@type": "ListItem", "position": 3, "name": "Admit Cards" }
      ]
    }
  };

  return (
    <main className="min-h-screen pt-28 pb-20 px-2 sm:px-4">
      {/* 🚀 SEO Injection */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-7xl mx-auto">
        <header className="text-center mb-8 md:mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 mb-4 animate-pulse">
            <BellRing size={14} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Real-Time Updates</span>
          </div>
          
          <h1 className="text-3xl md:text-5xl lg:text-6xl font-black text-white tracking-tight mb-4 leading-tight">
            Latest Jobs & Exams <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Board 2026</span>
          </h1>
          
          {/* 🚀 SEO Hidden Content (For Bots) */}
          <h2 className="sr-only">Information about Latest Sarkari Results, Admit Cards, and Online Forms</h2>
          <p className="text-gray-400 max-w-2xl mx-auto text-sm md:text-base font-medium px-4">
            Track upcoming government examinations, download syllabus PDFs, and check your merit list status across India.
          </p>
        </header>

        {/* 🚀 RESPONSIVE GRID: 2 columns on mobile, 3 on desktop */}
        <nav className="grid grid-cols-2 lg:grid-cols-3 gap-3 md:gap-6" aria-label="Career board categories">
          
          <SectionColumn 
            title="Results" 
            icon={<Trophy className="w-4 h-4 md:w-5 md:h-5 text-pink-400" />} 
            items={data?.results} 
            theme="bg-pink-500/10 text-pink-500 border-pink-500/20"
            hoverTheme="hover:text-pink-400 hover:bg-pink-500/5"
            headerStyle="bg-pink-500 text-white"
          />

          <SectionColumn 
            title="Admit Cards" 
            icon={<FileCheck className="w-4 h-4 md:w-5 md:h-5 text-cyan-400" />} 
            items={data?.admitCards} 
            theme="bg-cyan-500/10 text-cyan-500 border-cyan-500/20"
            hoverTheme="hover:text-cyan-400 hover:bg-cyan-500/5"
            headerStyle="bg-cyan-500 text-black"
          />

          <SectionColumn 
            title="Latest Jobs" 
            icon={<Briefcase className="w-4 h-4 md:w-5 md:h-5 text-emerald-400" />} 
            items={data?.latestJobs} 
            theme="bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
            hoverTheme="hover:text-emerald-400 hover:bg-emerald-500/5"
            headerStyle="bg-emerald-500 text-black"
          />

          <SectionColumn 
            title="Admission" 
            icon={<GraduationCap className="w-4 h-4 md:w-5 md:h-5 text-purple-400" />} 
            items={data?.admissions} 
            theme="bg-purple-500/10 text-purple-500 border-purple-500/20"
            hoverTheme="hover:text-purple-400 hover:bg-purple-500/5"
            headerStyle="bg-purple-500 text-white"
          />

          <SectionColumn 
            title="Syllabus" 
            icon={<Book className="w-4 h-4 md:w-5 md:h-5 text-amber-400" />} 
            items={data?.syllabuses} 
            theme="bg-amber-500/10 text-amber-500 border-amber-500/20"
            hoverTheme="hover:text-amber-400 hover:bg-amber-500/5"
            headerStyle="bg-amber-500 text-black"
          />

          <SectionColumn 
            title="Answer Key" 
            icon={<Key className="w-4 h-4 md:w-5 md:h-5 text-blue-400" />} 
            items={data?.answerKeys} 
            theme="bg-blue-500/10 text-blue-500 border-blue-500/20"
            hoverTheme="hover:text-blue-400 hover:bg-blue-500/5"
            headerStyle="bg-blue-500 text-white"
          />

        </nav>

        {/* 🚀 SEO Footer Paragraph */}
        <footer className="mt-16 text-center text-xs text-gray-500 leading-relaxed border-t border-white/5 pt-8">
          <p className="max-w-4xl mx-auto px-4">
            StuHive provides timely information on SSC CGL, UPSC Civil Services, RRB NTPC, IBPS PO, and State PCS exams. 
            We aggregate official data for student convenience. Always verify details on the official department websites.
          </p>
        </footer>
      </div>
    </main>
  );
}

// 🚀 ENHANCED RESPONSIVE COLUMN COMPONENT
function SectionColumn({ title, icon, items, theme, hoverTheme, headerStyle }) {
  return (
    <article className={`flex flex-col bg-white/[0.02] border border-white/10 rounded-xl md:rounded-2xl overflow-hidden transition-all hover:border-white/20 shadow-lg`}>
      {/* 🚀 Semantic Header for SEO */}
      <h3 className={`p-3 md:p-4 font-black uppercase tracking-wider md:tracking-widest text-[11px] md:text-sm flex items-center justify-center gap-1.5 md:gap-2 text-center leading-tight ${headerStyle}`}>
        {icon} {title}
      </h3>
      
      <div className="p-1 md:p-2 flex flex-col">
        {items && items.length > 0 ? items.map((item) => (
          <Link 
            key={item._id} 
            href={`/updates/${item.slug}`}
            title={`Check details for ${item.title}`}
            className={`px-3 py-3 text-[11px] md:text-sm font-semibold text-gray-300 transition-all rounded-lg flex items-start gap-1.5 md:gap-2 border-b border-white/5 last:border-0 ${hoverTheme}`}
          >
            <span className="text-[8px] md:text-[10px] mt-1 opacity-50 shrink-0">▶</span>
            <span className="line-clamp-2 md:line-clamp-none leading-snug">{item.title}</span>
          </Link>
        )) : (
          <div className="py-10 flex flex-col items-center justify-center opacity-30">
            <p className="text-[10px] uppercase font-black tracking-tighter">No Current Updates</p>
          </div>
        )}
      </div>

      {/* 🚀 View All Link (Internal SEO Linking) */}
      {items && items.length > 4 && (
        <div className="p-3 border-t border-white/5 text-center">
            <span className="text-[9px] font-black uppercase text-gray-500 cursor-default">Scroll for more</span>
        </div>
      )}
    </article>
  );
}