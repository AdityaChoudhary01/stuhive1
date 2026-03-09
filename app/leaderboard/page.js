import Link from "next/link";
import { getGlobalLeaderboard } from "@/actions/leaderboard.actions";
import { Trophy, Flame, Star, ShieldCheck, ArrowRight, Medal, BookOpen, Edit3, Sparkles, BadgeCheck, Crown } from "lucide-react"; // Added Crown
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge"; // Added Badge for the Admin tag

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.stuhive.in";

// 🚀 HYPER-LEVEL SEO METADATA
export const metadata = {
  title: "Global Student Leaderboard | Top Academic Contributors | StuHive",
  description: "Discover the top academic contributors on StuHive. See who is leading the global ranks in sharing premium notes, publishing study blogs, and earning Hive Points.",
  keywords: [
    "student leaderboard", 
    "top academic contributors", 
    "StuHive rankings", 
    "best student notes", 
    "hive points", 
    "global scholars",
    "verified educators",
    "study material creators"
  ],
  alternates: { canonical: `${APP_URL}/leaderboard` },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  openGraph: {
    title: "Global Student Leaderboard | Top Academic Contributors | StuHive",
    description: "Meet the top academic contributors on StuHive. Share your knowledge, earn Hive Points, and climb the global ranks.",
    url: `${APP_URL}/leaderboard`,
    siteName: "StuHive",
    images: [{ url: `${APP_URL}/og-leaderboard.png`, width: 1200, height: 630, alt: "StuHive Global Leaderboard" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Global Student Leaderboard | StuHive",
    description: "Meet the top academic contributors on StuHive. Share your knowledge, earn Hive Points, and climb the global ranks.",
    images: [`${APP_URL}/og-leaderboard.png`],
  }
};

export const revalidate = 60; // Revalidate every 60 seconds to keep ranks fresh for Google

export default async function LeaderboardPage() {
  // Fetch Top 50 Users
  const topContributors = await getGlobalLeaderboard(50);

  // 🚀 HYPER-LEVEL SEO: JSON-LD STRUCTURED DATA (ItemList -> Person)
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "StuHive Global Leaderboard",
    "description": "Top 50 ranking of the most impactful student creators and educators on StuHive.",
    "itemListElement": topContributors.map((user, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "item": {
        "@type": "Person",
        "name": user.name,
        "url": `${APP_URL}/profile/${user._id}`,
        "affiliation": {
          "@type": "Organization",
          "name": user.university || "Global Scholar"
        },
        "interactionStatistic": [
          {
            "@type": "InteractionCounter",
            "interactionType": "https://schema.org/WriteAction",
            "userInteractionCount": user.noteCount || 0
          }
        ]
      }
    }))
  };

  return (
    <main className="min-h-screen bg-background pt-24 pb-20 overflow-hidden relative selection:bg-amber-500/30">
      
      {/* Inject JSON-LD */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      
      {/* --- AMBIENT BACKGROUND GLOW --- */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-amber-500/10 blur-[150px] rounded-full pointer-events-none" aria-hidden="true" />
      <div className="absolute bottom-0 right-0 w-[500px] h-[500px] bg-purple-600/10 blur-[150px] rounded-full pointer-events-none" aria-hidden="true" />
      <div 
        className="absolute inset-0 opacity-[0.02] mix-blend-overlay pointer-events-none" 
        aria-hidden="true"
        style={{ 
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` 
        }} 
      />

      <div className="container max-w-5xl mx-auto px-4 sm:px-6 relative z-10">
        
        {/* --- HEADER --- */}
        <header className="text-center mb-12 sm:mb-16 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="inline-flex items-center justify-center p-3 sm:p-4 bg-amber-500/10 rounded-2xl sm:rounded-3xl border border-amber-500/20 text-amber-500 mb-6 shadow-[0_0_40px_rgba(245,158,11,0.15)] ring-1 ring-white/5">
            <Trophy className="w-8 h-8 sm:w-10 sm:h-10 drop-shadow-[0_0_15px_rgba(249,115,22,0.8)]" aria-hidden="true" />
          </div>
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-black text-white uppercase tracking-tighter drop-shadow-xl mb-4 sm:mb-6">
            Global <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-600">Leaderboard</span>
          </h1>
          <p className="text-gray-400 text-sm sm:text-lg font-medium max-w-2xl mx-auto leading-relaxed px-4">
            The ultimate ranking of the most impactful student creators. Share notes, write insightful blogs, and earn Hive Points to immortalize your legacy.
          </p>
          
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
             <Link href="/hive-points" title="Learn how to earn Hive Points">
                <Button className="rounded-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-black font-black uppercase tracking-widest text-[10px] sm:text-xs h-12 px-8 shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-all hover:scale-105 border-0">
                  <Sparkles className="w-4 h-4 mr-2" aria-hidden="true" /> How to Earn Points
                </Button>
             </Link>
          </div>
        </header>

        {/* --- LEADERBOARD LIST --- */}
        <Card
          className="bg-[#0a0118]/80 backdrop-blur-2xl border-white/10 rounded-[2rem] sm:rounded-[3rem] overflow-hidden relative
            shadow-[0_40px_120px_-70px_rgba(0,0,0,0.95)]
            before:content-[''] before:absolute before:inset-0 before:rounded-[inherit] before:p-[1px]
            before:bg-gradient-to-br before:from-white/14 before:via-white/0 before:to-white/6
            before:opacity-100"
        >
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-transparent via-amber-500 to-transparent opacity-80" />

          <CardContent className="p-3 sm:p-8 space-y-3 sm:space-y-4">
            {topContributors && topContributors.length > 0 ? (
              // 🚀 SEO: Using an Ordered List for semantic ranking understanding
              <ol className="space-y-3 sm:space-y-4 m-0 p-0 list-none">
                {topContributors.map((user, index) => {
                  const isTop3 = index < 3;
                  
                  return (
                    <li key={user._id}>
                      <Link
                        href={`/profile/${user._id}`}
                        title={`View ${user.name}'s profile`}
                        className={`relative flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 sm:p-6 rounded-[1.5rem]
                          overflow-hidden gap-4 sm:gap-0 transition-all duration-300 transform-gpu will-change-transform
                          outline-none focus-visible:ring-2 focus-visible:ring-amber-500/60
                          hover:-translate-y-1 hover:shadow-[0_30px_90px_-65px_rgba(0,0,0,0.9)]
                          ${isTop3 ? 'bg-white/[0.03] border border-white/10' : 'bg-transparent hover:bg-white/[0.02] border border-transparent hover:border-white/5'}
                          before:content-[''] before:absolute before:inset-0 before:rounded-[inherit] before:p-[1px]
                          before:bg-gradient-to-br before:from-white/14 before:via-white/0 before:to-white/6
                          before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500`}
                      >
                        {/* Hover Glow Backgrounds for Top 3 */}
                        <div
                          className={`absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 bg-gradient-to-r
                          ${index === 0 ? "from-yellow-500/40" : index === 1 ? "from-slate-400/40" : index === 2 ? "from-amber-600/40" : "from-cyan-500/10"}
                          via-transparent to-transparent`}
                          aria-hidden="true"
                        />

                        <div className="relative flex items-center gap-4 sm:gap-6 z-10 flex-1 min-w-0 w-full">
                          {/* Rank Number */}
                          <span
                            className={`text-2xl sm:text-4xl font-black w-8 sm:w-12 text-center shrink-0
                            ${
                              index === 0 ? "text-yellow-400 drop-shadow-[0_0_15px_rgba(250,204,21,0.8)]"
                                : index === 1 ? "text-slate-300 drop-shadow-[0_0_15px_rgba(203,213,225,0.8)]"
                                : index === 2 ? "text-amber-600 drop-shadow-[0_0_15px_rgba(217,119,6,0.8)]"
                                : "text-gray-600 group-hover:text-gray-400 transition-colors"
                            }`}
                            aria-label={`Rank ${index + 1}`}
                          >
                            #{index + 1}
                          </span>

                          {/* Avatar */}
                          <Avatar
                            className={`w-14 h-14 sm:w-20 sm:h-20 border-[3px] shrink-0 ${
                              index === 0 ? "border-yellow-400 shadow-[0_0_20px_rgba(250,204,21,0.4)]"
                                : index === 1 ? "border-slate-300 shadow-[0_0_20px_rgba(203,213,225,0.3)]"
                                : index === 2 ? "border-amber-600 shadow-[0_0_20px_rgba(217,119,6,0.3)]"
                                : "border-white/10 group-hover:border-amber-400/50 transition-colors"
                            }`}
                          >
                            <AvatarImage src={user.avatar || user.image} referrerPolicy="no-referrer" alt={`${user.name}'s Avatar`} />
                            <AvatarFallback className="text-xl bg-white/5">{user.name?.charAt(0)}</AvatarFallback>
                          </Avatar>

                          {/* User Info & Badge */}
                          <div className="min-w-0 flex-1 pr-2 flex flex-col justify-center">
                            <div className="flex items-center gap-2 max-w-full">
                              <h2 className={`font-black truncate transition-colors ${isTop3 ? 'text-xl sm:text-3xl text-white group-hover:text-amber-400' : 'text-lg sm:text-xl text-white/90 group-hover:text-white'}`}>
                                {user.name}
                              </h2>
                              
                              {/* 🚀 ADMIN BADGE Logic Added Here */}
                              {user.role === 'admin' ? (
                                 <Badge className="bg-red-500/20 text-red-500 border-red-500/30 text-[8px] uppercase tracking-widest px-1.5 py-0 h-4">
                                    <Crown size={10} className="mr-1" /> Admin
                                 </Badge>
                              ) : (user.badges && user.badges.length > 0 || user.isVerifiedEducator) ? (
                                 <BadgeCheck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400 shrink-0" aria-label="Verified Contributor" />
                              ) : null}

                            </div>
                            <p className="text-[10px] sm:text-sm text-gray-500 uppercase tracking-[0.2em] font-black truncate mt-1">
                              {user.university || "Global Scholar"}
                            </p>
                          </div>
                        </div>

                        {/* Stats Blocks */}
                        <div className="relative z-10 flex items-center gap-2 sm:gap-4 shrink-0 w-full sm:w-auto justify-end sm:justify-center border-t border-white/5 sm:border-t-0 pt-3 sm:pt-0 mt-2 sm:mt-0">
                          
                          <div className="flex flex-col items-center justify-center bg-black/40 px-3 py-2 sm:px-5 sm:py-3 rounded-xl sm:rounded-2xl border border-white/5 hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-colors duration-300 min-w-[4rem] sm:min-w-[5rem]" title={`${user.noteCount || 0} Uploaded Notes`}>
                            <p className="font-black text-white text-base sm:text-xl leading-none flex items-center gap-1.5">
                              {user.noteCount || 0}
                            </p>
                            <span className="text-[8px] sm:text-[10px] text-cyan-400 uppercase tracking-widest font-black mt-1.5 flex items-center gap-1">
                              <BookOpen className="w-2.5 h-2.5 hidden sm:block" aria-hidden="true" /> Notes
                            </span>
                          </div>

                          <div className="flex flex-col items-center justify-center bg-black/40 px-3 py-2 sm:px-5 sm:py-3 rounded-xl sm:rounded-2xl border border-white/5 hover:bg-purple-500/10 hover:border-purple-500/30 transition-colors duration-300 min-w-[4rem] sm:min-w-[5rem]" title={`${user.blogCount || 0} Published Blogs`}>
                            <p className="font-black text-white text-base sm:text-xl leading-none flex items-center gap-1.5">
                              {user.blogCount || 0}
                            </p>
                            <span className="text-[8px] sm:text-[10px] text-purple-400 uppercase tracking-widest font-black mt-1.5 flex items-center gap-1">
                              <Edit3 className="w-2.5 h-2.5 hidden sm:block" aria-hidden="true" /> Blogs
                            </span>
                          </div>

                          <div className={`flex flex-col items-center justify-center px-4 py-2 sm:px-8 sm:py-3 rounded-xl sm:rounded-2xl border transition-colors duration-300 min-w-[5rem] sm:min-w-[7rem]
                            ${isTop3 ? 'bg-amber-500/10 border-amber-500/30 group-hover:bg-amber-500/20 group-hover:border-amber-500/50' : 'bg-black/60 border-white/5 group-hover:border-amber-500/20'}
                          `} title={`${user.hivePoints || 0} Hive Points`}>
                            <p className={`font-black leading-none drop-shadow-md ${isTop3 ? 'text-amber-400 text-xl sm:text-3xl' : 'text-amber-500/80 text-lg sm:text-2xl'}`}>
                              {user.hivePoints || 0}
                            </p>
                            <div className="flex items-center gap-1 mt-1.5">
                              <Star className={`w-3 h-3 ${isTop3 ? 'fill-amber-400 text-amber-400' : 'text-amber-500/50'}`} aria-hidden="true" />
                              <span className={`text-[8px] sm:text-[10px] uppercase tracking-widest font-black ${isTop3 ? 'text-amber-400' : 'text-amber-500/60'}`}>
                                Points
                              </span>
                            </div>
                          </div>

                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 sm:py-32 opacity-50">
                <Medal className="w-16 h-16 text-white/20 mb-6" aria-hidden="true" />
                <p className="text-white/70 text-base uppercase tracking-widest font-black">Calculating Global Ranks...</p>
              </div>
            )}
          </CardContent>
        </Card>

      </div>
    </main>
  );
}