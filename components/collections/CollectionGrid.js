"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import Link from "next/link";
import { FolderHeart, ArrowRight, BookOpen, Loader2, ArrowDown, Globe, User, Lock, GraduationCap, Trophy, School, Lightbulb } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { getPublicCollections, getUserCollections } from "@/actions/collection.actions";

// 🚀 Dynamic Config Helper for Categories
const getCategoryDetails = (cat) => {
  switch (cat) {
    case 'School': 
      return { label: "School", icon: <BookOpen size={10} className="text-pink-400" /> };
    case 'Competitive Exams': 
      return { label: "Exam", icon: <Trophy size={10} className="text-amber-400" /> };
    case 'Other': 
      return { label: "Context", icon: <Lightbulb size={10} className="text-blue-400" /> };
    case 'University':
    default: 
      return { label: "Univ", icon: <School size={10} className="text-cyan-400" /> };
  }
};

export default function CollectionGrid({ initialCollections, totalCount, initialPage = 1 }) {
  const { data: session } = useSession();

  const [activeTab, setActiveTab] = useState("community");

  const [collections, setCollections] = useState(initialCollections);
  const [page, setPage] = useState(initialPage);
  const [loading, setLoading] = useState(false);
  const hasMore = collections.length < totalCount;

  const [myCollections, setMyCollections] = useState([]);
  const [myLoading, setMyLoading] = useState(false);
  const [myLoaded, setMyLoaded] = useState(false);

  useEffect(() => {
    if (activeTab === "my" && session?.user?.id && !myLoaded) {
      setMyLoading(true);
      getUserCollections(session.user.id)
        .then((res) => {
          setMyCollections(res || []);
          setMyLoaded(true);
        })
        .catch((err) => console.error("Failed to fetch my collections", err))
        .finally(() => setMyLoading(false));
    }
  }, [activeTab, session, myLoaded]);

  const handleLoadMore = async (e) => {
    e.preventDefault();
    if (loading || !hasMore) return;

    setLoading(true);
    try {
      const nextPage = page + 1;
      const res = await getPublicCollections({ page: nextPage, limit: 12 });

      if (res?.collections) {
        setCollections((prev) => [...prev, ...res.collections]);
        setPage(nextPage);
        window.history.replaceState(null, "", `?page=${nextPage}`);
      }
    } catch (error) {
      console.error("Failed to load more collections", error);
    } finally {
      setLoading(false);
    }
  };

  const tabBase =
    "group rounded-full px-5 sm:px-6 h-11 sm:h-12 text-xs sm:text-sm font-black tracking-wide " +
    "transition-all duration-300 transform-gpu will-change-transform " +
    "outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60 overflow-hidden";

  return (
    <div className="space-y-8 md:space-y-12">
      {/* TABS */}
      <div className="flex justify-center gap-3 animate-in fade-in slide-in-from-bottom-4 duration-700">
        <Button
          onClick={() => setActiveTab("community")}
          className={`${tabBase} ${
            activeTab === "community"
              ? "bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_24px_70px_-45px_rgba(34,211,238,0.6)]"
              : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10"
          }`}
        >
          <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(900px_circle_at_30%_20%,rgba(34,211,238,0.14),transparent_45%)]" />
          <span className="relative z-10 inline-flex items-center">
            <Globe size={16} className="mr-2 sm:w-[18px] sm:h-[18px]" aria-hidden="true" /> Community
          </span>
        </Button>

        <Button
          onClick={() => setActiveTab("my")}
          className={`${tabBase} ${
            activeTab === "my"
              ? "bg-cyan-500 text-black hover:bg-cyan-400 shadow-[0_24px_70px_-45px_rgba(34,211,238,0.6)]"
              : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10"
          }`}
        >
          <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(900px_circle_at_30%_20%,rgba(34,211,238,0.14),transparent_45%)]" />
          <span className="relative z-10 inline-flex items-center">
            <User size={16} className="mr-2 sm:w-[18px] sm:h-[18px]" aria-hidden="true" /> My Archives
          </span>
        </Button>
      </div>

      {/* COMMUNITY */}
      {activeTab === "community" && (
        <div className="space-y-12">
          {collections.length === 0 ? (
            <EmptyState msg="No public archives found at the moment. Check back soon." />
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6 animate-in fade-in duration-700 delay-150" itemScope itemType="https://schema.org/ItemList">
                {collections.map((col, index) => (
                  <CollectionCard key={col._id} col={col} index={index} isPersonal={false} />
                ))}
              </div>

              {hasMore && (
                <div className="mt-12 sm:mt-16 flex justify-center animate-in fade-in duration-500">
                  <Link
                    href={`?page=${page + 1}`}
                    onClick={handleLoadMore}
                    className="group relative inline-flex items-center justify-center rounded-full px-8 py-4 sm:py-6 text-xs sm:text-sm
                      font-black uppercase tracking-[0.22em]
                      border border-white/10 hover:bg-white/5 hover:border-cyan-400/40 hover:text-white text-gray-300
                      transition-all duration-300 transform-gpu will-change-transform hover:-translate-y-0.5
                      shadow-[0_28px_90px_-70px_rgba(34,211,238,0.65)]
                      outline-none focus-visible:ring-2 focus-visible:ring-cyan-500/60 overflow-hidden"
                  >
                    <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 bg-[radial-gradient(900px_circle_at_30%_20%,rgba(34,211,238,0.14),transparent_45%)]" />
                    <span className="absolute inset-0 -translate-x-full motion-safe:group-hover:animate-[shimmer_1.6s_infinite] bg-gradient-to-r from-transparent via-white/10 to-transparent skew-x-12" />

                    <span className="relative z-10 inline-flex items-center">
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin text-cyan-400" aria-hidden="true" /> Fetching Archives...
                        </>
                      ) : (
                        <>
                          Load More Bundles <ArrowDown className="w-4 h-4 ml-2 text-cyan-400 group-hover:translate-y-1 transition-transform" aria-hidden="true" />
                        </>
                      )}
                    </span>
                  </Link>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* MY */}
      {activeTab === "my" && (
        <div className="animate-in fade-in duration-500">
          {!session ? (
            <EmptyState
              msg="You must be logged in to view your personal archives."
              action={
                <Link href="/login">
                  <Button className="mt-4 rounded-full bg-cyan-500 text-black hover:bg-cyan-400 font-black px-8">Login</Button>
                </Link>
              }
            />
          ) : myLoading ? (
            <div className="flex justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400" aria-hidden="true" />
            </div>
          ) : myCollections.length === 0 ? (
            <EmptyState
              msg="You haven't created any collections yet."
              action={
                <Link href="/profile">
                  <Button className="mt-4 rounded-full bg-cyan-500 text-black hover:bg-cyan-400 font-black px-8">Go to Dashboard</Button>
                </Link>
              }
            />
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
              {myCollections.map((col, index) => (
                <CollectionCard key={col._id} col={col} index={index} isPersonal={true} sessionUser={session.user} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function CollectionCard({ col, index, isPersonal, sessionUser }) {
  const targetUrl = isPersonal ? `/collections/${col._id}` : `/shared-collections/${col.slug}`;
  const catDetails = getCategoryDetails(col.category);

  // 🚀 FIX: For personal collections, user data might not be populated in the fetch, 
  // so we fallback to the sessionUser passed from the parent.
  const authorName = col.user?.name || sessionUser?.name || "Curator";
  const authorAvatar = col.user?.avatar || sessionUser?.avatar || sessionUser?.image;

  return (
    <div itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem" className="h-full">
      <meta itemProp="position" content={index + 1} />

      <Link
        href={targetUrl}
        className="group outline-none block h-full focus-visible:ring-2 focus-visible:ring-cyan-500/60 rounded-[1.2rem] sm:rounded-3xl"
        title={isPersonal ? `Manage ${col.name}` : `Access ${col.name}`}
      >
        <article
          className="flex flex-col justify-between h-full p-4 sm:p-8 bg-white/[0.02] border border-white/10 backdrop-blur-xl
            rounded-[1.2rem] sm:rounded-3xl relative overflow-hidden
            transition-all duration-500 transform-gpu will-change-transform
            hover:bg-white/[0.04] hover:border-white/20 hover:-translate-y-1
            hover:shadow-[0_30px_90px_-70px_rgba(34,211,238,0.55)]
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
          <div className="absolute top-0 right-0 w-40 h-40 bg-cyan-500/10 blur-[55px] opacity-0 group-hover:opacity-100 transition-opacity duration-500" aria-hidden="true" />

          <div className="relative z-10">
            <header className="flex items-start justify-between mb-4 sm:mb-6">
              <div className="flex flex-col gap-3">
                <div className="p-2 sm:p-3 bg-white/5 rounded-xl text-cyan-300 ring-1 ring-white/10 group-hover:scale-110 group-hover:bg-cyan-500/10 transition-all duration-300 flex items-center justify-center w-fit">
                  <FolderHeart size={20} className="sm:w-6 sm:h-6" strokeWidth={1.5} aria-hidden="true" />
                </div>

                {/* 🚀 DYNAMIC CATEGORY BADGE */}
                <span className={`flex items-center gap-1 text-[8px] sm:text-[9px] font-black uppercase tracking-widest bg-white/5 border border-white/10 px-2 py-0.5 rounded-md w-fit truncate max-w-[120px] sm:max-w-[150px]`}>
                   {catDetails.icon} <span className="truncate">{col.university || catDetails.label}</span>
                </span>
              </div>

              <div className="flex items-center gap-1.5 px-2 py-1 sm:px-2.5 bg-white/5 border border-white/10 rounded-full h-fit shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-green-500 motion-safe:animate-pulse" aria-hidden="true" />
                <span className="text-[8px] sm:text-[10px] font-black text-gray-300">
                  {col.notes?.length || 0} <span className="hidden sm:inline">Files</span>
                </span>
              </div>
            </header>

            <h3 className="text-sm sm:text-xl font-black mb-2 sm:mb-3 leading-snug tracking-tight text-white group-hover:text-cyan-300 transition-colors line-clamp-2" itemProp="name">
              {col.name}
            </h3>

            <p className="text-[10px] sm:text-sm text-gray-400 line-clamp-2 sm:line-clamp-3 leading-relaxed mb-4 sm:mb-8" itemProp="description">
              {col.description || `Optimized academic collection for ${col.name}. Expertly organized for your exam readiness.`}
            </p>
          </div>

          <footer className="pt-3 sm:pt-5 border-t border-white/10 flex items-center justify-between mt-auto relative z-10">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 pr-2">
              <Avatar className="h-6 w-6 sm:h-8 sm:w-8 border border-white/20 shrink-0">
                <AvatarImage src={authorAvatar} alt={authorName} />
                <AvatarFallback className="bg-gray-800 text-gray-300 text-[8px] sm:text-xs font-black">{authorName.charAt(0)}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col min-w-0">
                <span className="text-[10px] sm:text-xs font-black text-gray-300 truncate max-w-[80px] sm:max-w-[100px] group-hover:text-white transition-colors">
                  {isPersonal ? "Me" : authorName}
                </span>

                {isPersonal && col.visibility === "private" ? (
                  <span className="text-[7px] sm:text-[9px] font-black uppercase tracking-widest text-red-400 flex items-center gap-0.5 mt-0.5">
                    <Lock size={8} aria-hidden="true" /> Private
                  </span>
                ) : (
                  <span className="text-[7px] sm:text-[9px] font-black uppercase tracking-widest text-gray-500 mt-0.5">Curator</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-center w-7 h-7 sm:w-9 sm:h-9 rounded-full bg-white/5 text-gray-400 group-hover:bg-cyan-500 group-hover:text-black transition-all shrink-0 ring-1 ring-white/10">
              <ArrowRight size={12} className="sm:w-3.5 sm:h-3.5" aria-hidden="true" />
            </div>
          </footer>
        </article>
      </Link>
    </div>
  );
}

function EmptyState({ msg, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 sm:py-32 bg-white/[0.01] rounded-[2rem] border border-dashed border-white/10 text-center px-4">
      <div className="p-6 bg-white/5 rounded-full mb-6 ring-1 ring-white/10">
        <BookOpen size={40} className="text-gray-500" strokeWidth={1.5} aria-hidden="true" />
      </div>
      <h3 className="text-xl sm:text-2xl font-black tracking-tight text-white mb-2">It&apos;s quiet here.</h3>
      <p className="text-gray-400 text-sm sm:text-base max-w-sm leading-relaxed mb-4">{msg}</p>
      {action}
    </div>
  );
}