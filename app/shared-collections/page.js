import { getPublicCollections } from "@/actions/collection.actions";
import Link from "next/link";
import { FolderHeart, Globe, ShieldCheck, Zap, Library } from "lucide-react";
import CollectionGrid from "@/components/collections/CollectionGrid"; 

// 🚀 PERFORMANCE & SEO: Cache this page at the edge for 1 hour. TTFB < 50ms.
export const revalidate = 3600;

const APP_URL = process.env.NEXTAUTH_URL || "https://www.stuhive.in";

// 🚀 ULTRA-DYNAMIC SEO METADATA
export async function generateMetadata() {
  const { totalCount } = await getPublicCollections({ limit: 1 });
  
  return {
    title: `Public Study Bundles (${totalCount}+) | University, School & Competitive Exams | StuHive`,
    description: `Access the largest community archive of ${totalCount}+ curated study bundles. Download handwritten PDF notes, PYQs, and guides for University (B.Tech, BSc), School (CBSE, ICSE), and Competitive Exams (UPSC, SSC, JEE).`,
    keywords: [
      "university note bundles", 
      "school study materials",
      "UPSC SSC competitive exam bundles",
      "PDF study materials", 
      "handwritten notes collection", 
      "shared academic archives", 
      "StuHive study bundles",
      "free college notes",
      "semester study guide",
      "previous year question papers",
      "BTech note bundles",
      "exam preparation collections"
    ],
    alternates: { canonical: `${APP_URL}/shared-collections` },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      title: "StuHive Study Bundles | Community-Curated Note Archives",
      description: `Unlock access to ${totalCount}+ verified student bundles. One link to your entire semester, school year, or competitive exam resources.`,
      url: `${APP_URL}/shared-collections`,
      siteName: "StuHive",
      images: [{ url: `${APP_URL}/og-shared-archives.png`, width: 1200, height: 630, alt: "StuHive Shared Study Bundles" }],
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "StuHive Study Bundles | Community Archives",
      description: `Access ${totalCount}+ verified student note bundles for University, School, and Competitive Exams.`,
      images: [`${APP_URL}/og-shared-archives.png`],
    },
    applicationName: "StuHive"
  };
}

export default async function BrowseCollectionsPage({ searchParams }) {
  // 🚀 Await searchParams to allow crawlers to visit ?page=2 directly
  const sp = await searchParams;
  const currentPage = parseInt(sp?.page) || 1;

  // 🚀 Fetch items for the requested page
  const { collections, totalCount } = await getPublicCollections({ page: currentPage, limit: 12 });

  // 🚀 HYPER-ADVANCED JSON-LD FOR SERP DOMINANCE
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": APP_URL },
        { "@type": "ListItem", "position": 2, "name": "Shared Collections", "item": `${APP_URL}/shared-collections` }
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "CollectionPage",
      "name": `StuHive Community Study Bundles - Page ${currentPage}`,
      "description": `A directory of ${totalCount} curated academic archives created by students for school, college, and competitive exams. Showing page ${currentPage}.`,
      "url": `${APP_URL}/shared-collections?page=${currentPage}`,
      "mainEntity": {
        "@type": "ItemList",
        "numberOfItems": collections.length,
        "itemListElement": collections.map((col, index) => ({
          "@type": "ListItem",
          "position": index + 1,
          "url": `${APP_URL}/shared-collections/${col.slug}`,
          "name": col.name
        }))
      }
    }
  ];

  return (
    // 🚀 MICRODATA: Identifying the whole page as a semantic WebPage / CollectionPage directory
    <main className="min-h-screen bg-background text-foreground overflow-hidden selection:bg-cyan-500/30" itemScope itemType="https://schema.org/CollectionPage">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* 🚀 PREMIUM AMBIENT BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className="absolute top-[-10%] left-[-5%] w-[40vw] h-[40vw] bg-cyan-900/10 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] right-[-10%] w-[30vw] h-[30vw] bg-purple-900/10 blur-[100px] rounded-full" />
        
        {/* SVG Noise avoids 404 network errors */}
        <div 
          className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none" 
          style={{ 
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` 
          }} 
        />
      </div>

      <div className="container relative z-10 max-w-6xl py-16 md:py-24 px-4 sm:px-6 mx-auto">
        
        {/* 🚀 REFINED PROFESSIONAL HEADER */}
        <header className="mb-12 md:mb-20 max-w-3xl animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-cyan-400 mb-6 shadow-sm">
            <Library size={14} aria-hidden="true" />
            <span className="text-xs font-bold tracking-wide">Community Archives</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-extrabold tracking-tight leading-[1.1] mb-6 text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400" itemProp="headline">
            Discover Curated <br className="hidden sm:block" />
            Study Bundles.
          </h1>
          
          <p className="text-gray-400 text-lg md:text-xl font-medium leading-relaxed mb-10 max-w-2xl" itemProp="description">
            Access the hive mind of high-quality resources organized by top students. From university semesters to school boards and competitive exam prep—all in one link.
          </p>

          {/* Sleek Data Metrics */}
          <div className="flex flex-wrap items-center gap-8">
             <div className="flex flex-col">
                <div className="flex items-center gap-2 text-white">
                    <Zap size={18} className="text-yellow-500" aria-hidden="true" />
                    <span className="text-3xl font-black tracking-tight">{totalCount}+</span>
                </div>
                <span className="text-xs font-semibold uppercase tracking-widest text-gray-500 mt-1">Active Bundles</span>
             </div>
             <div className="w-px h-10 bg-white/10 hidden sm:block" aria-hidden="true" />
             <div className="flex flex-col">
                <div className="flex items-center gap-2 text-white">
                    <Globe size={18} className="text-blue-500" aria-hidden="true" />
                    <span className="text-3xl font-black tracking-tight">Global</span>
                </div>
                <span className="text-xs font-semibold uppercase tracking-widest text-gray-500 mt-1">Student Reach</span>
             </div>
          </div>
        </header>

        <section aria-labelledby="collections-heading">
          <h2 id="collections-heading" className="sr-only">Verified Community Note Bundles Grid</h2>
          
          {/* 🚀 CLIENT COMPONENT: Handles the Tabs & Grid */}
          <CollectionGrid 
            initialCollections={collections} 
            totalCount={totalCount} 
            initialPage={currentPage} 
          />
          
        </section>

        {/* 🚀 DYNAMIC SEO CLUSTER (Hidden - For Search Engines Only) */}
        <div className="sr-only">
          <h2>Popular Study Folders, Course Bundles & Exam Categories</h2>
          <ul>
            {collections.slice(0, 5).map(c => <li key={c._id}>{c.name} ({c.category || 'Academic'}) handwritten notes collection</li>)}
            <li>B.Tech Computer Science All Semesters Materials</li>
            <li>UPSC Civil Services General Studies Paper Bundles</li>
            <li>Class 10th and 12th Board Exam Question Bank</li>
            <li>JEE Mains and Advanced Physics Chemistry Math Notes</li>
            <li>SSC CGL and Bank PO Preparation Folders</li>
            <li>University Semester PDF Note Bundles</li>
          </ul>
        </div>

        {/* 🚀 MODERN PROFESSIONAL CTA SECTION */}
        <section className="mt-32 md:mt-40 relative group" aria-label="Call to Action">
          <div className="relative p-10 md:p-16 rounded-[2rem] bg-gradient-to-br from-white/[0.05] to-transparent border border-white/10 text-center flex flex-col items-center shadow-xl overflow-hidden">
            
            <h2 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4 text-white">
                Shape the <span className="text-cyan-400 italic">Hive.</span>
            </h2>
            <p className="text-gray-400 text-base md:text-lg max-w-xl mb-10 leading-relaxed">
              Don&apos;t just study. Build a legacy. Organize your semester, board, or competitive exam notes into public bundles and help thousands ace their exams.
            </p>
            
            <Link 
                href="/profile"
                title="Create your own study bundle"
                className="inline-flex items-center justify-center gap-3 bg-cyan-500 text-black font-bold text-sm md:text-base px-8 py-4 rounded-full hover:bg-cyan-400 transition-all hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(6,182,212,0.3)]"
            >
                Create a Bundle <FolderHeart size={18} aria-hidden="true" />
            </Link>

            <div className="flex flex-wrap justify-center gap-6 md:gap-10 mt-12 text-[10px] md:text-xs font-bold uppercase tracking-widest text-gray-500">
                <span className="flex items-center gap-2"><Zap size={14} className="text-yellow-500/70" aria-hidden="true" /> Fast Sync</span>
                <span className="flex items-center gap-2"><Globe size={14} className="text-blue-500/70" aria-hidden="true" /> Public Reach</span>
                <span className="flex items-center gap-2"><ShieldCheck size={14} className="text-green-500/70" aria-hidden="true" /> Secure Hosting</span>
            </div>
          </div>
        </section>

      </div>
    </main>
  );
}