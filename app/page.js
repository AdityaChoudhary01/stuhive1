import Link from "next/link";
import { getNotes } from "@/actions/note.actions";
import { getHomeData } from "@/actions/home.actions";
import { getPublicCollections } from "@/actions/collection.actions";
import { getGlobalLeaderboard } from "@/actions/leaderboard.actions";

// Components
import HeroSection from "@/components/home/HeroSection";
import PaginatedNotesFeed from "@/components/home/PaginatedNotesFeed";
import NoteCard from "@/components/notes/NoteCard";
import BlogCard from "@/components/blog/BlogCard";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"; // 🚀 FIXED: Imported Badge

// Icons
import { ArrowRight, Users, FileText, Download, Trophy, Sparkles, Flame, FolderHeart, Library, Star, ShieldCheck, BadgeCheck, Crown } from "lucide-react"; 

export const revalidate = 30;

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.stuhive.in";

export const metadata = {
  title: { absolute: "StuHive | Free Academic Notes, Study Materials & Peer Collections" },
  description:
    "Join a global network of top-tier students. Download free handwritten notes, access curated academic collections, read peer blogs, and ace your university exams.",
  keywords: [
    "academic notes",
    "StuHive",
    "peer notez",
    "university study tips",
    "free PDF notes",
    "student collaboration",
    "study material bundles",
    "exam preparation",
    "college resources",
    "handwritten lecture notes",
    "download study guides",
    "academic community",
  ],
  authors: [{ name: "StuHive Organization", url: process.env.NEXT_PUBLIC_APP_URL || "https://www.stuhive.in" }],
  creator: "StuHive",
  publisher: "StuHive Academic Network",
  category: "Education",
  formatDetection: { email: false, address: false, telephone: false },
  alternates: { canonical: APP_URL },
  robots: {
    index: true,
    follow: true,
    nocache: false,
    googleBot: { index: true, follow: true, "max-video-preview": -1, "max-image-preview": "large", "max-snippet": -1 },
  },
  openGraph: {
    title: "StuHive | The Global Academic Knowledge Hub",
    description: "Access high-quality study materials, curated note collections, and academic blogs for free.",
    url: "/",
    siteName: "StuHive",
    type: "website",
    locale: "en_US",
    images: [{ url: "/logo512.png", width: 1200, height: 630, alt: "StuHive - Learn Better Together", type: "image/png" }],
  },
  twitter: { card: "summary_large_image", title: "StuHive | Free Study Materials & Notes", description: "Join thousands of students sharing handwritten notes and academic blogs.", images: ["/logo512.png"] },
};

export default async function HomePage() {
  const [featuredNotesRes, allNotesRes, homeData, collectionsRes, topContributors] = await Promise.all([
    getNotes({ limit: 3, sort: "highestRated" }),
    getNotes({ page: 1, limit: 12 }),
    getHomeData(),
    getPublicCollections({ page: 1, limit: 3 }),
    getGlobalLeaderboard(5),
  ]);

  const { stats, blogs } = homeData;
  const collections = collectionsRes?.collections || [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${APP_URL}/#organization`,
        name: "StuHive",
        url: APP_URL,
        logo: { "@type": "ImageObject", url: `${APP_URL}/logo512.png` },
        description: "A collaborative ecosystem for academic success and free study materials.",
      },
      {
        "@type": "WebSite",
        "@id": `${APP_URL}/#website`,
        url: APP_URL,
        name: "StuHive",
        publisher: { "@id": `${APP_URL}/#organization` },
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: `${APP_URL}/global-search?q={search_term_string}` },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "WebPage",
        "@id": `${APP_URL}/#webpage`,
        url: APP_URL,
        inLanguage: "en-US",
        name: "StuHive | Free Academic Notes & Study Materials",
        isPartOf: { "@id": `${APP_URL}/#website` },
        about: { "@id": `${APP_URL}/#organization` },
      },
    ],
  };

  const statCardClass =
    "group relative flex flex-col items-center justify-center overflow-hidden h-full " +
    "p-3 sm:p-10 rounded-[1.5rem] sm:rounded-[2rem] " +
    "bg-white/[0.02] border border-white/5 backdrop-blur-xl " +
    "transition-all duration-500 transform-gpu will-change-transform " +
    "hover:bg-white/[0.04] hover:border-white/12 hover:-translate-y-1 " +
    "hover:shadow-[0_30px_75px_-45px_rgba(0,0,0,0.75)] " +
    "before:content-[''] before:absolute before:inset-0 before:rounded-[inherit] before:p-[1px] " +
    "before:bg-gradient-to-br before:from-white/14 before:via-white/0 before:to-white/6 " +
    "before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500 " +
    "after:content-[''] after:absolute after:inset-0 after:rounded-[inherit] after:opacity-[0.06] after:pointer-events-none " +
    "after:[background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.14)_1px,transparent_0)] after:[background-size:20px_20px]";

  return (
    <main className="relative isolate flex flex-col w-full overflow-hidden bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <HeroSection />

      {/* --- PLATFORM STATS --- */}
      <section className="relative z-20 -mt-16 sm:-mt-24 container max-w-7xl px-2 sm:px-6 pt-10" aria-label="StuHive Platform Statistics">
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-6">
          <div className={statCardClass}>
            <div className="absolute inset-0 bg-gradient-to-b from-cyan-500/6 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="p-3 sm:p-5 bg-cyan-500/10 rounded-xl sm:rounded-2xl text-cyan-300 mb-2 sm:mb-6 ring-1 ring-white/10 shadow-[0_0_30px_rgba(34,211,238,0.14)] group-hover:-translate-y-1 group-hover:scale-[1.02] transition-transform">
              <FileText className="w-5 h-5 sm:w-8 sm:h-8" aria-hidden="true" />
            </div>
            <div className="text-2xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/55 drop-shadow-lg">
              {stats?.totalNotes?.toLocaleString() || 0}
            </div>
            <h2 className="text-[9px] sm:text-[13px] font-black text-cyan-300 uppercase tracking-[0.1em] sm:tracking-[0.2em] mt-1 sm:mt-2 text-center">
              Total Notes
            </h2>
          </div>

          <div className={statCardClass}>
            <div className="absolute inset-0 bg-gradient-to-b from-purple-500/6 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="p-3 sm:p-5 bg-purple-500/10 rounded-xl sm:rounded-2xl text-purple-300 mb-2 sm:mb-6 ring-1 ring-white/10 shadow-[0_0_30px_rgba(168,85,247,0.14)] group-hover:-translate-y-1 group-hover:scale-[1.02] transition-transform">
              <Users className="w-5 h-5 sm:w-8 sm:h-8" aria-hidden="true" />
            </div>
            <div className="text-2xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/55 drop-shadow-lg">
              {stats?.totalUsers?.toLocaleString() || 0}
            </div>
            <h2 className="text-[9px] sm:text-[13px] font-black text-purple-300 uppercase tracking-[0.1em] sm:tracking-[0.2em] mt-1 sm:mt-2 text-center">
              Active Students
            </h2>
          </div>

          <div className={`${statCardClass} col-span-2 lg:col-span-1 py-4 sm:py-10`}>
            <div className="absolute inset-0 bg-gradient-to-b from-green-500/6 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="p-3 sm:p-5 bg-green-500/10 rounded-xl sm:rounded-2xl text-green-300 mb-2 sm:mb-6 ring-1 ring-white/10 shadow-[0_0_30px_rgba(34,197,94,0.14)] group-hover:-translate-y-1 group-hover:scale-[1.02] transition-transform">
              <Download className="w-5 h-5 sm:w-8 sm:h-8" aria-hidden="true" />
            </div>
            <div className="text-2xl sm:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/55 drop-shadow-lg">
              {stats?.totalDownloads?.toLocaleString() || 0}
            </div>
            <h2 className="text-[9px] sm:text-[13px] font-black text-green-300 uppercase tracking-[0.1em] sm:tracking-[0.2em] mt-1 sm:mt-2 text-center">
              Resources Saved
            </h2>
          </div>
        </div>
      </section>

      {/* --- FEATURED COLLECTIONS --- */}
      {collections.length > 0 && (
        <section className="relative container max-w-7xl py-12 sm:py-20 px-2 sm:px-6" aria-label="Curated Study Collections">
          <div className="absolute top-[20%] right-0 w-[400px] h-[400px] bg-cyan-500/5 blur-[150px] rounded-full pointer-events-none" />

          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 sm:mb-14 gap-5 px-1 relative z-10 after:content-[''] after:absolute after:left-0 after:-bottom-5 after:h-px after:w-full after:bg-gradient-to-r after:from-white/0 after:via-white/10 after:to-white/0">
            <div className="flex items-center gap-3 sm:gap-5">
              <div className="relative w-10 h-10 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-cyan-400/20 to-blue-600/20 flex items-center justify-center text-cyan-300 border border-cyan-500/30 shrink-0 shadow-[0_0_30px_rgba(34,211,238,0.2)] ring-1 ring-white/10">
                <FolderHeart className="w-5 h-5 sm:w-8 sm:h-8 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]" aria-hidden="true" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-5xl font-black text-white uppercase tracking-tight drop-shadow-xl">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">Curated</span> Archives
                </h2>
                <p className="text-muted-foreground text-[10px] sm:text-sm font-black uppercase tracking-widest mt-1">Premium note bundles for specific courses</p>
              </div>
            </div>

            <Link
              href="/shared-collections"
              title="Browse all collections"
              aria-label="Explore all curated academic collections"
              className="group relative flex items-center justify-center gap-2 sm:gap-3 h-10 sm:h-14 px-6 sm:px-10 rounded-full font-black text-xs sm:text-sm uppercase tracking-wider w-full sm:w-auto overflow-hidden transition-all duration-300 transform-gpu will-change-transform
                bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/25
                hover:-translate-y-0.5 hover:shadow-[0_24px_60px_-35px_rgba(34,211,238,0.55)]
                outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60"
            >
              <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(900px_circle_at_30%_20%,rgba(34,211,238,0.16),transparent_45%)]" />
              <span className="absolute inset-0 -translate-x-full motion-safe:group-hover:animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12" />
              <span className="relative z-10 inline-flex items-center">
                Browse Archives <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </span>
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-6 relative z-10" itemScope itemType="https://schema.org/ItemList">
            {collections.map((col, index) => (
              <div key={col._id} itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem" className="h-full">
                <meta itemProp="position" content={index + 1} />
                <Link
                  href={`/shared-collections/${col.slug}`}
                  className="block h-full group outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60 rounded-[1.2rem] sm:rounded-[2rem]"
                >
                  <article
                    className="relative flex flex-col justify-between h-full p-4 sm:p-8 rounded-[1.2rem] sm:rounded-[2rem]
                      bg-white/[0.02] border border-white/5 backdrop-blur-xl overflow-hidden
                      transition-all duration-500 transform-gpu will-change-transform
                      hover:bg-white/[0.04] hover:border-cyan-500/35 hover:-translate-y-1
                      hover:shadow-[0_30px_80px_-55px_rgba(34,211,238,0.55)]
                      before:content-[''] before:absolute before:inset-0 before:rounded-[inherit] before:p-[1px]
                      before:bg-gradient-to-br before:from-white/14 before:via-white/0 before:to-white/6
                      before:opacity-0 group-hover:before:opacity-100 before:transition-opacity before:duration-500
                      after:content-[''] after:absolute after:inset-0 after:rounded-[inherit] after:opacity-[0.06] after:pointer-events-none
                      after:[background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.14)_1px,transparent_0)]
                      after:[background-size:20px_20px]"
                    itemProp="item"
                    itemScope
                    itemType="https://schema.org/CollectionPage"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />

                    <div className="relative z-10">
                      <h3 className="text-sm sm:text-2xl font-black text-white/95 mb-2 sm:mb-3 group-hover:text-cyan-300 transition-colors line-clamp-2 leading-snug sm:leading-tight tracking-tight" itemProp="name">
                        {col.name}
                      </h3>
                      <p className="text-[10px] sm:text-sm text-gray-400 line-clamp-2 sm:line-clamp-3 mb-4 sm:mb-8 leading-relaxed font-medium" itemProp="description">
                        {col.description || "Access this premium curated bundle of academic resources tailored for specific coursework."}
                      </p>
                    </div>

                    <div className="relative z-10 flex flex-wrap items-center justify-between gap-2 mt-auto pt-3 sm:pt-5 border-t border-white/10">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-2">
                        <Avatar className="w-5 h-5 sm:w-8 sm:h-8 border border-white/20 shrink-0">
                          <AvatarImage src={col.user?.avatar} alt={col.user?.name} />
                          <AvatarFallback className="bg-cyan-900 text-cyan-300 font-black text-[8px] sm:text-xs">{col.user?.name?.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="text-[9px] sm:text-xs font-black text-gray-300 truncate group-hover:text-white transition-colors">{col.user?.name}</span>
                      </div>

                      <div className="flex items-center gap-1 sm:gap-1.5 text-[8px] sm:text-xs font-black text-cyan-300 bg-cyan-500/10 px-2 py-1 sm:px-3 sm:py-1.5 rounded-full border border-cyan-500/20 shrink-0">
                        <Library size={10} className="sm:w-3 sm:h-3" aria-hidden="true" />
                        <span>
                          {col.notes?.length || 0} <span className="hidden sm:inline">Docs</span>
                        </span>
                      </div>
                    </div>
                  </article>
                </Link>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* --- HIGHEST RATED --- */}
      <section className="relative container max-w-7xl py-12 sm:py-24 px-2 sm:px-6" aria-label="Featured highest rated materials">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-yellow-500/5 blur-[120px] rounded-full pointer-events-none" />

        <div className="relative flex items-center gap-3 sm:gap-5 mb-8 sm:mb-14 pl-1 after:content-[''] after:absolute after:left-1 after:-bottom-5 after:h-px after:w-[calc(100%-0.5rem)] after:bg-gradient-to-r after:from-white/0 after:via-white/10 after:to-white/0">
          <div className="relative w-10 h-10 sm:w-16 sm:h-16 rounded-xl sm:rounded-2xl bg-gradient-to-br from-yellow-400/20 to-orange-500/20 flex items-center justify-center text-yellow-400 border border-yellow-500/30 shrink-0 shadow-[0_0_30px_rgba(250,204,21,0.2)] ring-1 ring-white/10">
            <Trophy className="w-5 h-5 sm:w-8 sm:h-8 drop-shadow-[0_0_10px_rgba(250,204,21,0.8)]" aria-hidden="true" />
            <div className="absolute inset-0 rounded-xl sm:rounded-2xl bg-yellow-400/20 motion-safe:animate-ping opacity-20" />
          </div>
          <div>
            <h2 className="text-2xl sm:text-5xl font-black text-white uppercase tracking-tight drop-shadow-xl">
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500">Highest Rated</span> Notes
            </h2>
            <p className="text-muted-foreground text-[10px] sm:text-sm font-black uppercase tracking-widest mt-1">Curated work from top-performing students</p>
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-8 relative z-10" itemScope itemType="https://schema.org/ItemList">
          {featuredNotesRes?.notes?.map((note, idx) => (
            <article
              key={note._id}
              itemProp="itemListElement"
              itemScope
              itemType="https://schema.org/ListItem"
              className="w-full rounded-[28px] transition-transform duration-300 hover:-translate-y-2 hover:shadow-[0_30px_90px_-70px_rgba(250,204,21,0.55)]"
            >
              <meta itemProp="position" content={idx + 1} />
              <NoteCard note={note} priority={idx === 0} />
            </article>
          ))}
        </div>
      </section>

      {/* --- LIVE REPOSITORY --- */}
      <section className="relative bg-white/[0.01] py-12 sm:py-24 border-t border-white/5 shadow-[inset_0_1px_0_0_rgba(255,255,255,0.05)]" aria-label="Recent uploaded notes repository">
        <div className="container max-w-7xl px-2 sm:px-6 relative z-10">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 sm:mb-16 gap-4 px-1 after:content-[''] after:absolute after:left-3 after:mt-16 sm:after:mt-20 after:h-px after:w-[calc(100%-1.5rem)] after:bg-gradient-to-r after:from-white/0 after:via-white/10 after:to-white/0 relative">
            <div className="space-y-1 sm:space-y-2 relative">
              <div className="flex items-center gap-2 text-cyan-300 font-black text-[10px] sm:text-xs uppercase tracking-[0.2em]">
                <Sparkles size={14} className="motion-safe:animate-pulse" aria-hidden="true" /> Live Repository
              </div>
              <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight drop-shadow-lg">Recent Materials</h2>
            </div>

            <Link
              href="/search"
              title="Browse all materials"
              aria-label="Explore all recent academic materials"
              className="group relative flex items-center justify-center gap-2 sm:gap-3 bg-white hover:bg-gray-100 text-black h-10 sm:h-14 px-6 sm:px-10 rounded-full font-black text-xs sm:text-sm uppercase tracking-wider w-full sm:w-auto overflow-hidden transition-all duration-300 transform-gpu will-change-transform hover:scale-[1.02] active:scale-[0.98] shadow-[0_0_30px_rgba(255,255,255,0.2)]
                outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60"
            >
              <div className="absolute inset-0 -translate-x-full motion-safe:group-hover:animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-black/5 to-transparent skew-x-12" />
              <span className="relative z-10 inline-flex items-center">
                Explore All <ArrowRight size={16} className="ml-2 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
              </span>
            </Link>
          </div>

          <PaginatedNotesFeed initialNotes={allNotesRes?.notes || []} initialTotalPages={allNotesRes?.totalPages || 1} />
        </div>
      </section>

      {/* --- PEER STORIES --- */}
      <section className="relative container max-w-7xl py-12 sm:py-24 px-2 sm:px-6" aria-label="Student peer stories and blogs">
        <div className="flex justify-between items-center px-1 border-b border-white/5 pb-4 sm:pb-6 mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-4xl font-black text-white uppercase italic flex items-center gap-3 drop-shadow-md">
            <FileText className="text-purple-400 w-6 h-6 sm:w-10 sm:h-10 drop-shadow-[0_0_15px_rgba(192,132,252,0.8)]" aria-hidden="true" /> Peer Stories
          </h2>
          <Link
            href="/blogs"
            title="Read all student blogs"
            className="group relative text-[10px] sm:text-sm font-black uppercase tracking-widest text-purple-300 hover:text-white flex items-center gap-2 transition-colors bg-purple-500/10 hover:bg-purple-500/20 px-4 py-2 sm:px-6 sm:py-3 rounded-full border border-purple-500/20 overflow-hidden
              outline-none focus-visible:ring-2 focus-visible:ring-purple-500/60"
          >
            <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(900px_circle_at_30%_20%,rgba(168,85,247,0.16),transparent_45%)]" />
            <span className="relative z-10 inline-flex items-center">
              Read All <ArrowRight size={14} className="ml-2 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
            </span>
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8" itemScope itemType="https://schema.org/ItemList">
          {blogs && blogs.length > 0 ? (
            blogs.slice(0, 3).map((blog, idx) => (
              <article
                key={blog._id}
                itemProp="itemListElement"
                itemScope
                itemType="https://schema.org/ListItem"
                className="rounded-[1.5rem] transition-transform duration-300 hover:-translate-y-2 hover:shadow-[0_30px_90px_-70px_rgba(168,85,247,0.55)]"
              >
                <meta itemProp="position" content={idx + 1} />
                <BlogCard blog={blog} />
              </article>
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center p-12 sm:p-24 border border-dashed border-white/10 rounded-[2rem] bg-white/[0.01]">
              <FileText className="w-10 h-10 sm:w-14 sm:h-14 text-white/10 mb-4" aria-hidden="true" />
              <p className="text-white/60 text-xs sm:text-base font-black uppercase tracking-widest text-center">Student stories are being drafted...</p>
            </div>
          )}
        </div>
      </section>

      {/* --- HALL OF FAME --- */}
      <section className="relative py-16 sm:py-32 border-t border-white/5" aria-label="Hall of fame leaderboard">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-amber-500/5 blur-[150px] rounded-full pointer-events-none" />

        <div className="container max-w-7xl px-2 sm:px-6 relative z-10">
          <div className="text-center mb-12 sm:mb-20">
            <div className="inline-flex items-center justify-center p-4 bg-amber-500/10 rounded-3xl border border-amber-500/20 text-amber-500 mb-6 shadow-[0_0_40px_rgba(245,158,11,0.15)] ring-1 ring-white/10">
              <Flame className="w-10 h-10 sm:w-14 sm:h-14 drop-shadow-[0_0_15px_rgba(249,115,22,0.8)]" aria-hidden="true" />
            </div>
            <h2 className="text-4xl sm:text-6xl font-black text-white uppercase tracking-tighter drop-shadow-xl mb-4">
              Hall of <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-600">Fame</span>
            </h2>
            <p className="text-gray-400 text-sm sm:text-lg font-medium max-w-2xl mx-auto">The most elite contributors on the StuHive network, ranked by total impact.</p>
          </div>

          <div className="max-w-5xl mx-auto">
            <Card
              className="bg-[#0a0118]/60 backdrop-blur-2xl border-white/10 rounded-[2rem] sm:rounded-[3rem] overflow-hidden relative
                shadow-[0_40px_120px_-70px_rgba(0,0,0,0.95)]
                before:content-[''] before:absolute before:inset-0 before:rounded-[inherit] before:p-[1px]
                before:bg-gradient-to-br before:from-white/14 before:via-white/0 before:to-white/6
                before:opacity-100"
            >
              <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-amber-500 to-transparent" />

              <CardContent className="p-4 sm:p-8 space-y-3 sm:space-y-4">
                {topContributors && topContributors.length > 0 ? (
                  topContributors.map((user, index) => (
                    <Link
                      key={user._id}
                      href={`/profile/${user._id}`}
                      title={`View ${user.name}'s verified profile`}
                      className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 rounded-[1.5rem]
                        bg-white/[0.02] border border-white/5 overflow-hidden gap-4 sm:gap-0
                        transition-all duration-300 transform-gpu will-change-transform
                        hover:border-white/20 hover:-translate-y-1
                        hover:shadow-[0_30px_90px_-65px_rgba(0,0,0,0.9)]
                        outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60
                        before:content-[''] before:absolute before:inset-0 before:rounded-[inherit] before:p-[1px]
                        before:bg-gradient-to-br before:from-white/14 before:via-white/0 before:to-white/6
                        before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500"
                    >
                      <div
                        className={`absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-gradient-to-r
                        ${index === 0 ? "from-yellow-500/40" : index === 1 ? "from-slate-400/40" : index === 2 ? "from-amber-600/40" : "from-cyan-500/20"}
                        via-transparent to-transparent`}
                      />

                      <div className="relative flex items-center gap-4 sm:gap-6 z-10 flex-1 min-w-0 w-full">
                        <span
                          className={`text-2xl sm:text-4xl font-black w-8 sm:w-12 text-center shrink-0
                          ${
                            index === 0
                              ? "text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]"
                              : index === 1
                                ? "text-slate-300 drop-shadow-[0_0_15px_rgba(203,213,225,0.8)]"
                                : index === 2
                                  ? "text-amber-600 drop-shadow-[0_0_15px_rgba(217,119,6,0.8)]"
                                  : "text-gray-600 group-hover:text-gray-400 transition-colors"
                          }`}
                        >
                          #{index + 1}
                        </span>

                        <Avatar
                          className={`w-14 h-14 sm:w-20 sm:h-20 border-[3px] shrink-0 ${
                            index === 0
                              ? "border-yellow-400"
                              : index === 1
                                ? "border-slate-300"
                                : index === 2
                                  ? "border-amber-600"
                                  : "border-white/20 group-hover:border-amber-400/50 transition-colors"
                          }`}
                        >
                          <AvatarImage src={user.avatar || user.image} referrerPolicy="no-referrer" alt={`${user.name}'s Avatar`} />
                          <AvatarFallback className="text-xl bg-white/10">{user.name?.charAt(0)}</AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1 pr-2 flex flex-col justify-center">
                          <div className="flex items-center gap-2 max-w-full">
                            <span className="font-black text-lg sm:text-2xl text-white truncate group-hover:text-amber-400 transition-colors">
                              {user.name}
                            </span>
                            
                            {/* 🚀 ADMIN BADGE Logic Added Here */}
                            {user.role === 'admin' ? (
                               <Badge className="bg-red-500/20 text-red-500 border-red-500/30 text-[8px] uppercase tracking-widest px-1.5 py-0 h-4">
                                  <Crown size={10} className="mr-1" /> Admin
                               </Badge>
                            ) : (user.badges && user.badges.length > 0 || user.isVerifiedEducator) ? (
                               <BadgeCheck className="w-5 h-5 text-blue-400 shrink-0 mb-0.5" aria-label="Verified Contributor" />
                            ) : null}

                          </div>
                          <p className="text-xs sm:text-sm text-gray-400 uppercase tracking-[0.2em] font-black truncate mt-1">{user.university || "Global Scholar"}</p>
                        </div>
                      </div>

                      <div className="relative z-10 flex items-center gap-2 sm:gap-4 shrink-0 w-full sm:w-auto justify-end sm:justify-center border-t border-white/10 sm:border-t-0 pt-3 sm:pt-0 mt-2 sm:mt-0">
                        <div className="flex flex-col items-center justify-center bg-black/40 px-4 py-2 sm:px-5 sm:py-3 rounded-xl sm:rounded-2xl border border-white/5 group-hover:bg-cyan-500/10 group-hover:border-cyan-500/30 transition-colors duration-300 min-w-[4rem] sm:min-w-[5rem]" title="Uploaded Notes">
                          <p className="font-black text-white text-base sm:text-xl leading-none">{user.noteCount || 0}</p>
                          <span className="text-[8px] sm:text-[10px] text-cyan-300 uppercase tracking-widest font-black mt-1.5">Notes</span>
                        </div>

                        <div className="flex flex-col items-center justify-center bg-black/40 px-4 py-2 sm:px-5 sm:py-3 rounded-xl sm:rounded-2xl border border-white/5 group-hover:bg-purple-500/10 group-hover:border-purple-500/30 transition-colors duration-300 min-w-[4rem] sm:min-w-[5rem]" title="Published Blogs">
                          <p className="font-black text-white text-base sm:text-xl leading-none">{user.blogCount || 0}</p>
                          <span className="text-[8px] sm:text-[10px] text-purple-300 uppercase tracking-widest font-black mt-1.5">Blogs</span>
                        </div>

                        <div className="flex flex-col items-center justify-center bg-amber-500/10 px-5 py-2 sm:px-8 sm:py-3 rounded-xl sm:rounded-2xl border border-amber-500/30 group-hover:bg-amber-500/20 group-hover:border-amber-500/50 transition-colors duration-300 min-w-[5rem] sm:min-w-[7rem]" title="Hive Points">
                          <p className="font-black text-amber-400 text-lg sm:text-3xl leading-none drop-shadow-md">{user.hivePoints || 0}</p>
                          <div className="flex items-center gap-1 mt-1.5">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" aria-hidden="true" />
                            <span className="text-[8px] sm:text-[10px] text-amber-400 uppercase tracking-widest font-black">Points</span>
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 sm:py-24 opacity-50">
                    <Trophy className="w-12 h-12 text-white/20 mb-4" aria-hidden="true" />
                    <p className="text-white/70 text-sm uppercase tracking-widest font-black">Calculating Global Ranks...</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-10">
              <Link href="/hive-points">
                <Button
                  variant="outline"
                  className="group relative rounded-full bg-white/[0.02] border-white/10 hover:bg-white/10 text-gray-300 hover:text-white font-black px-8 h-12 overflow-hidden
                    outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60
                    hover:shadow-[0_24px_70px_-50px_rgba(245,158,11,0.55)] w-full sm:w-auto"
                >
                  <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(900px_circle_at_30%_20%,rgba(245,158,11,0.14),transparent_45%)]" />
                  <span className="relative z-10 inline-flex items-center">
                    Learn How to Earn Points <ArrowRight className="w-4 h-4 ml-2" />
                  </span>
                </Button>
              </Link>

              {/* 🚀 NEW: Link to full leaderboard page */}
              <Link href="/leaderboard">
                <Button
                  variant="ghost"
                  className="group rounded-full text-amber-400 hover:bg-amber-400/10 hover:text-amber-300 font-black px-8 h-12 w-full sm:w-auto border border-transparent hover:border-amber-400/30 transition-all uppercase tracking-widest text-[10px]"
                >
                  View Global Leaderboard <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>
            </div>
            
          </div>
        </div>
      </section>
    </main>
  );
}