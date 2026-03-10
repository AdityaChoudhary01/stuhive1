"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image"; 
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { 
  FaMapMarkerAlt, 
  FaCalendarAlt, 
  FaBook, 
  FaRss, 
  FaStar, 
  FaUserPlus, 
  FaUserCheck, 
  FaUniversity, 
  FaEnvelope, 
  FaFire
} from 'react-icons/fa';
import { ChevronDown, BadgeCheck, FolderHeart, Map, MapPin, Crown, ArrowRight, BookOpen, Trophy, Lightbulb, School } from "lucide-react"; 
import { Button } from "@/components/ui/button";
import NoteCard from "@/components/notes/NoteCard";
import BlogCard from "@/components/blog/BlogCard"; 
import RoleBadge from "@/components/common/RoleBadge";
import { toggleFollow } from "@/actions/user.actions";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { checkConsistentBadge } from "@/lib/utils"; 

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";

// 🚀 Dynamic Config Helper for Categories (For Exact Bundle UI)
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

const UserList = ({ users, emptyMessage }) => {
    if (!users || users.length === 0) {
        return <p className="text-center text-muted-foreground py-8">{emptyMessage}</p>;
    }
    return (
        <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-4">
                {users.map((user) => (
                    <Link href={`/profile/${user._id}`} key={user._id}>
                        <div className="flex items-center gap-3 p-3 rounded-lg hover:bg-secondary/20 transition-colors cursor-pointer border border-transparent hover:border-border group">
                            <Avatar className="h-10 w-10 border shadow-sm">
                                <AvatarImage src={user.avatar} referrerPolicy="no-referrer" />
                                <AvatarFallback className="font-black text-xs uppercase">{user.name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col min-w-0">
                                <div className="flex items-center gap-1.5">
                                    <span className="font-semibold text-sm leading-tight text-foreground truncate">{user.name}</span>
                                    {/* 🚀 VERIFIED BADGE IN FOLLOWER LISTS */}
                                    {user.isVerifiedEducator && (
                                        <BadgeCheck className="w-3.5 h-3.5 text-blue-400 shrink-0" title="Verified Educator" />
                                    )}
                                </div>
                                {user.role === 'admin' && <span className="text-[10px] text-primary font-bold uppercase mt-0.5">Admin</span>}
                            </div>
                        </div>
                    </Link>
                ))}
            </div>
        </ScrollArea>
    );
};

// 🚀 DEFAULTED collections and roadmaps to [] to prevent breaking if old server page is cached
export default function PublicProfileView({ profile, notes, blogs, collections = [], roadmaps = [], currentUser, isOwnProfile, initialIsFollowing }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const { toast } = useToast();
  
  const ITEMS_PER_PAGE = 6;
  const initialTab = ['blogs', 'collections', 'roadmaps'].includes(searchParams.get('tab')) ? searchParams.get('tab') : 'notes';
  
  const [activeTab, setActiveTab] = useState(initialTab);
  const [notesPage, setNotesPage] = useState(Number(searchParams.get('nPage')) || 1);
  const [blogsPage, setBlogsPage] = useState(Number(searchParams.get('bPage')) || 1);
  const [collectionsPage, setCollectionsPage] = useState(Number(searchParams.get('cPage')) || 1);
  const [roadmapsPage, setRoadmapsPage] = useState(Number(searchParams.get('rPage')) || 1);

  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followLoading, setFollowLoading] = useState(false);
  const [followerCount, setFollowerCount] = useState(profile.followers.length);

  const isConsistent = checkConsistentBadge(profile);

  const currentNotes = notes.slice(0, notesPage * ITEMS_PER_PAGE);
  const hasMoreNotes = notes.length > currentNotes.length;

  const currentBlogs = blogs.slice(0, blogsPage * ITEMS_PER_PAGE);
  const hasMoreBlogs = blogs.length > currentBlogs.length;

  const currentCollections = collections.slice(0, collectionsPage * ITEMS_PER_PAGE);
  const hasMoreCollections = collections.length > currentCollections.length;

  const currentRoadmaps = roadmaps.slice(0, roadmapsPage * ITEMS_PER_PAGE);
  const hasMoreRoadmaps = roadmaps.length > currentRoadmaps.length;

  const loadMoreNotes = () => {
      const next = notesPage + 1;
      setNotesPage(next);
      window.history.replaceState(null, '', `${pathname}?tab=notes&nPage=${next}`);
  };

  const loadMoreBlogs = () => {
      const next = blogsPage + 1;
      setBlogsPage(next);
      window.history.replaceState(null, '', `${pathname}?tab=blogs&bPage=${next}`);
  };

  const loadMoreCollections = () => {
      const next = collectionsPage + 1;
      setCollectionsPage(next);
      window.history.replaceState(null, '', `${pathname}?tab=collections&cPage=${next}`);
  };

  const loadMoreRoadmaps = () => {
      const next = roadmapsPage + 1;
      setRoadmapsPage(next);
      window.history.replaceState(null, '', `${pathname}?tab=roadmaps&rPage=${next}`);
  };

  const handleTabChange = (tab) => {
      setActiveTab(tab);
      window.history.replaceState(null, '', `${pathname}?tab=${tab}`);
  };

  const handleFollow = async () => {
    if (!currentUser) {
        toast({ title: "Login Required", description: "Please login to follow users." });
        return;
    }
    setFollowLoading(true);
    const res = await toggleFollow(currentUser.id, profile._id);
    
    if (res.success) {
        setIsFollowing(res.isFollowing);
        setFollowerCount(prev => res.isFollowing ? prev + 1 : prev - 1);
        toast({ title: res.isFollowing ? "Following" : "Unfollowed", description: res.isFollowing ? `You are now following ${profile.name}` : `You unfollowed ${profile.name}` });
    } else {
        toast({ title: "Error", description: res.error, variant: "destructive" });
    }
    setFollowLoading(false);
  };

  const handleMessage = () => {
    if (!currentUser) {
        router.push("/login");
        return;
    }
    router.push(`/chat/${profile._id}`);
  };

  return (
    // 🚀 CHANGED: Inner container now has px-0 on mobile to let the server component's px-2 handle the edges
    <div className="animate-in fade-in duration-700 px-0" itemProp="mainEntity" itemScope itemType="https://schema.org/Person">
        {/* 🚀 CHANGED: Reduced p-5 to p-4 on mobile so the content isn't overly squeezed inside the profile card */}
        <div className="bg-secondary/10 border border-white/5 rounded-[2rem] sm:rounded-[2.5rem] p-4 sm:p-8 mb-8 sm:mb-12 relative overflow-hidden shadow-2xl backdrop-blur-md">
            <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600"></div>
            
            <div className="flex flex-col md:flex-row gap-6 sm:gap-10 items-center md:items-start relative z-10">
                <div className="flex-shrink-0 group mt-2 sm:mt-0">
                    <div className="relative w-32 h-32 sm:w-44 sm:h-44">
                        <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-purple-600 rounded-full blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                        {profile.avatar ? (
                          <Image 
                              src={profile.avatar} 
                              alt={profile.name} 
                              fill
                              unoptimized 
                              className="rounded-full border-[4px] sm:border-[6px] border-background shadow-2xl object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                              itemProp="image"
                          />
                        ) : (
                          <img 
                              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(profile.name)}&background=random&color=fff&size=256`} 
                              alt={profile.name} 
                              className="relative w-full h-full rounded-full border-[4px] sm:border-[6px] border-background shadow-2xl object-cover"
                              itemProp="image"
                          />
                        )}
                    </div>
                </div>

                <div className="flex-grow text-center md:text-left space-y-5 sm:space-y-6 w-full">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-4 sm:gap-6">
                        <div className="space-y-1">
                            <div className="flex flex-wrap items-center gap-3 justify-center md:justify-start">
                                <div className="flex items-center gap-2">
                                    <h2 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tighter text-white" itemProp="name">{profile.name}</h2>
                                    {/* 🚀 VERIFIED EDUCATOR BADGE */}
                                    {profile.isVerifiedEducator && (
                                        <BadgeCheck className="w-8 h-8 md:w-10 md:h-10 text-blue-400 drop-shadow-[0_0_10px_rgba(96,165,250,0.8)]" title="Verified Expert Educator" />
                                    )}
                                </div>
                                <RoleBadge role={profile.role} />
                            </div>
                            
                            {/* 🚀 UPDATE JOB TITLE IF VERIFIED */}
                            <p className={`${profile.isVerifiedEducator ? 'text-blue-400' : 'text-cyan-400'} text-xs sm:text-sm font-black uppercase tracking-[0.2em]`} itemProp="jobTitle">
                                {profile.isVerifiedEducator ? "Verified Expert Educator" : "Academic Contributor"}
                            </p>
                        </div>

                        {!isOwnProfile && (
                            <div className="flex flex-wrap justify-center gap-3 w-full md:w-auto">
                                <Button onClick={handleMessage} variant="outline" className="rounded-full gap-2 px-6 border-white/10 hover:bg-white/5 font-bold flex-1 md:flex-auto">
                                    <FaEnvelope className="text-cyan-400" /> Message
                                </Button>
                                <Button 
                                    onClick={handleFollow} 
                                    disabled={followLoading}
                                    className={`rounded-full gap-2 px-8 font-black uppercase tracking-wider transition-all flex-1 md:flex-auto ${isFollowing ? 'bg-white/10 hover:bg-white/20 border-transparent text-white' : 'bg-gradient-to-r from-cyan-500 to-purple-600 border-0 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)]'}`}
                                >
                                    {isFollowing ? <><FaUserCheck /> Following</> : <><FaUserPlus /> Follow</>}
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-wrap gap-3 justify-center md:justify-start">
                        {profile.noteCount > 5 && (
                              <Badge variant="outline" className="gap-2 border-yellow-500/30 text-yellow-500 bg-yellow-500/5 px-4 py-1 font-bold">
                                <FaStar className="animate-pulse" /> StuHive Star
                              </Badge>
                        )}
                        {isConsistent && (
                          <Badge variant="outline" className="gap-2 border-orange-500/40 text-orange-400 bg-orange-500/10 px-4 py-1 font-black uppercase tracking-tighter shadow-[0_0_15px_rgba(249,115,22,0.2)] animate-pulse">
                              <FaFire className="text-orange-500" /> Consistent Learner
                          </Badge>
                        )}
                    </div>

                    {profile.bio && (
                        <p className="text-white/60 text-base sm:text-lg max-w-2xl mx-auto md:mx-0 leading-relaxed font-medium italic" itemProp="description">
                            &quot;{profile.bio}&quot;
                        </p>
                    )}

                    <div className="flex flex-wrap gap-4 sm:gap-6 text-xs sm:text-sm font-bold uppercase tracking-widest text-gray-300 justify-center md:justify-start">
                        {profile.university && (
                           <span className="flex items-center gap-2" itemProp="alumniOf" itemScope itemType="https://schema.org/CollegeOrUniversity">
                              <FaUniversity className="text-cyan-400" /> <span itemProp="name">{profile.university}</span>
                           </span>
                        )}
                        {profile.location && (
                           <span className="flex items-center gap-2" itemProp="homeLocation" itemScope itemType="https://schema.org/Place">
                              <FaMapMarkerAlt className="text-purple-400" /> <span itemProp="name">{profile.location}</span>
                           </span>
                        )}
                        <span className="flex items-center gap-2"><FaCalendarAlt /> Joined {new Date(profile.createdAt).toLocaleDateString(undefined, { year: 'numeric', month: 'long' })}</span>
                    </div>
                    
                    <div className="flex flex-wrap justify-center md:justify-start gap-8 sm:gap-12 pt-6 border-t border-white/5">
                        <div className="text-center">
                            <span className="block text-2xl sm:text-3xl font-black text-white">{notes.length}</span>
                            <span className="text-[9px] sm:text-[10px] uppercase font-black tracking-widest text-gray-300">Notes</span>
                        </div>
                        <div className="text-center">
                            <span className="block text-2xl sm:text-3xl font-black text-white">{blogs.length}</span>
                            <span className="text-[9px] sm:text-[10px] uppercase font-black tracking-widest text-gray-300">Blogs</span>
                        </div>

                        <Dialog>
                            <DialogTrigger asChild>
                                <button className="text-center cursor-pointer group appearance-none bg-transparent border-none p-0 m-0">
                                    <span className="block text-2xl sm:text-3xl font-black text-white group-hover:text-cyan-400 transition-colors">{followerCount}</span>
                                    <span className="text-[9px] sm:text-[10px] uppercase font-black tracking-widest text-gray-300 group-hover:text-cyan-400 transition-colors">Followers</span>
                                </button>
                            </DialogTrigger>
                            <DialogContent className="bg-[#0d0d0d] border-white/10 text-white sm:max-w-md w-[95vw] rounded-2xl p-4 sm:p-6">
                                <DialogHeader>
                                    <DialogTitle className="text-xl font-bold">Followers</DialogTitle>
                                </DialogHeader>
                                <UserList users={profile.followers} emptyMessage="No followers yet." />
                            </DialogContent>
                        </Dialog>

                        <Dialog>
                            <DialogTrigger asChild>
                                <button className="text-center cursor-pointer group appearance-none bg-transparent border-none p-0 m-0">
                                    <span className="block text-2xl sm:text-3xl font-black text-white group-hover:text-purple-400 transition-colors">{profile.following.length}</span>
                                    <span className="text-[9px] sm:text-[10px] uppercase font-black tracking-widest text-gray-300 group-hover:text-purple-400 transition-colors">Following</span>
                                </button>
                            </DialogTrigger>
                            <DialogContent className="bg-[#0d0d0d] border-white/10 text-white sm:max-w-md w-[95vw] rounded-2xl p-4 sm:p-6">
                                <DialogHeader>
                                    <DialogTitle className="text-xl font-bold">Following</DialogTitle>
                                </DialogHeader>
                                <UserList users={profile.following} emptyMessage="Not following anyone yet." />
                            </DialogContent>
                        </Dialog>

                        <Link href="/hive-points" className="text-center cursor-pointer group appearance-none bg-transparent border-none p-0 m-0">
                            <span className="block text-2xl sm:text-3xl font-black text-amber-400 group-hover:text-amber-300 transition-colors drop-shadow-md">
                                {profile.hivePoints || 0}
                            </span>
                            <span className="text-[9px] sm:text-[10px] uppercase font-black tracking-widest text-amber-500/70 group-hover:text-amber-400 transition-colors flex items-center justify-center gap-1">
                                <FaStar className="w-2.5 h-2.5" /> Points
                            </span>
                        </Link>
                    </div>
                </div>
            </div>
        </div>

        {/* 🚀 UPGRADED TAB NAVIGATION WITH HORIZONTAL SCROLL FOR MOBILE */}
        <div className="flex gap-6 sm:gap-8 mb-8 sm:mb-10 border-b border-white/5 overflow-x-auto hide-scrollbar px-1">
            <button 
                onClick={() => handleTabChange('notes')} 
                className={`pb-4 px-2 shrink-0 text-xs sm:text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2 sm:gap-3 transition-all relative ${activeTab === 'notes' ? 'text-cyan-400' : 'text-gray-400 hover:text-white'}`}
            >
                <FaBook /> Notes
                {activeTab === 'notes' && <div className="absolute bottom-0 left-0 w-full h-1 bg-cyan-400 rounded-t-full shadow-[0_0_10px_#22d3ee]"></div>}
            </button>

            <button 
                onClick={() => handleTabChange('collections')} 
                className={`pb-4 px-2 shrink-0 text-xs sm:text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2 sm:gap-3 transition-all relative ${activeTab === 'collections' ? 'text-blue-400' : 'text-gray-400 hover:text-white'}`}
            >
                <FolderHeart className="w-4 h-4" /> Bundles
                {activeTab === 'collections' && <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-400 rounded-t-full shadow-[0_0_10px_#60a5fa]"></div>}
            </button>

            <button 
                onClick={() => handleTabChange('roadmaps')} 
                className={`pb-4 px-2 shrink-0 text-xs sm:text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2 sm:gap-3 transition-all relative ${activeTab === 'roadmaps' ? 'text-green-400' : 'text-gray-400 hover:text-white'}`}
            >
                <Map className="w-4 h-4" /> Roadmaps
                {activeTab === 'roadmaps' && <div className="absolute bottom-0 left-0 w-full h-1 bg-green-400 rounded-t-full shadow-[0_0_10px_#4ade80]"></div>}
            </button>

            <button 
                onClick={() => handleTabChange('blogs')} 
                className={`pb-4 px-2 shrink-0 text-xs sm:text-sm font-black uppercase tracking-[0.2em] flex items-center gap-2 sm:gap-3 transition-all relative ${activeTab === 'blogs' ? 'text-purple-400' : 'text-gray-400 hover:text-white'}`}
            >
                <FaRss /> Blogs
                {activeTab === 'blogs' && <div className="absolute bottom-0 left-0 w-full h-1 bg-purple-500 rounded-t-full shadow-[0_0_10px_#a855f7]"></div>}
            </button>
        </div>

        <section aria-labelledby="portfolio-heading" className="min-h-[400px] animate-in slide-in-from-bottom-4 duration-500 pb-12">
            <h2 id="portfolio-heading" className="sr-only">Portfolio Content</h2>
            
            {/* NOTES TAB */}
            {activeTab === 'notes' && (
                notes.length > 0 ? (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 md:gap-8" itemScope itemType="https://schema.org/ItemList">
                          {currentNotes.map((note, idx) => (
                              <div key={note._id} itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem" className="h-full">
                                  <meta itemProp="position" content={idx + 1} />
                                  <div itemProp="item" itemScope itemType="https://schema.org/LearningResource" className="h-full">
                                     <NoteCard note={{...note, user: profile}} />
                                  </div>
                              </div>
                          ))}
                      </div>
                      
                      {hasMoreNotes && (
                         <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-12 relative">
                             <Button onClick={loadMoreNotes} size="lg" className="w-full sm:w-auto h-12 rounded-full px-8 bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] hover:border-cyan-500/50 text-white font-black uppercase tracking-widest text-[11px] transition-all hover:shadow-[0_0_20px_rgba(34,211,238,0.15)] group">
                                 <ChevronDown aria-hidden="true" className="w-4 h-4 mr-2 text-cyan-400 group-hover:translate-y-1 transition-transform" />
                                 Load More Notes
                             </Button>
                             <noscript>
                                 <Link href={`?tab=notes&nPage=${notesPage + 1}`} title="Next page of notes" className="text-[10px] text-cyan-400 underline">
                                     Browse page {notesPage + 1} of notes
                                 </Link>
                             </noscript>
                         </div>
                      )}
                    </>
                ) : (
                    <EmptyState msg="No notes shared yet." />
                )
            )}

            {/* COLLECTIONS TAB - EXACT UI AS SHARED COLLECTIONS */}
            {activeTab === 'collections' && (
                collections.length > 0 ? (
                    <>
                        {/* 🚀 CHANGED: grid-cols-2 and gap-3 for mobile to show 2 bundles side-by-side */}
                        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 md:gap-8" itemScope itemType="https://schema.org/ItemList">
                            {currentCollections.map((col, idx) => {
                                const catDetails = getCategoryDetails(col.category);
                                return (
                                  <div key={col._id} itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem" className="h-full relative">
                                      <meta itemProp="position" content={idx + 1} />
                                      
                                      {/* Premium Crown Badge */}
                                      {col.isPremium && (
                                        <div className="absolute top-2 right-2 sm:top-3 sm:right-3 z-20 flex items-center gap-1 bg-gradient-to-r from-yellow-400 to-amber-500 text-black px-1.5 py-0.5 sm:px-2.5 sm:py-1 rounded-full text-[7px] sm:text-[9px] font-black uppercase tracking-widest shadow-lg shadow-yellow-500/20">
                                            <Crown size={8} className="drop-shadow-sm sm:w-2.5 sm:h-2.5" aria-hidden="true" /> ₹{col.price}
                                        </div>
                                      )}

                                      <Link href={`/shared-collections/${col.slug}`} className="group outline-none block h-full focus-visible:ring-2 focus-visible:ring-cyan-500/60 rounded-[1.2rem] sm:rounded-3xl" itemProp="url">
                                          <article className={`flex flex-col justify-between h-full p-4 sm:p-8 bg-white/[0.02] backdrop-blur-xl rounded-[1.2rem] sm:rounded-3xl relative overflow-hidden transition-all duration-500 transform-gpu will-change-transform hover:bg-white/[0.04] hover:-translate-y-1 ${col.isPremium ? 'border border-yellow-500/30 hover:border-yellow-400/50 hover:shadow-[0_30px_90px_-50px_rgba(234,179,8,0.25)]' : 'border border-white/10 hover:border-white/20 hover:shadow-[0_30px_90px_-70px_rgba(34,211,238,0.55)]'} before:content-[''] before:absolute before:inset-0 before:rounded-[inherit] before:p-[1px] before:bg-gradient-to-br before:from-white/14 before:via-white/0 before:to-white/6 before:opacity-0 group-hover:before:opacity-100 before:transition-opacity before:duration-500 after:content-[''] after:absolute after:inset-0 after:rounded-[inherit] after:opacity-[0.06] after:pointer-events-none after:[background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.14)_1px,transparent_0)] after:[background-size:20px_20px]`}>
                                              <div className={`absolute top-0 right-0 w-40 h-40 blur-[55px] opacity-0 group-hover:opacity-100 transition-opacity duration-500 ${col.isPremium ? 'bg-yellow-500/20' : 'bg-cyan-500/10'}`} aria-hidden="true" />

                                              <div className="relative z-10 flex flex-col h-full">
                                                  <header className="flex items-start justify-between mb-3 sm:mb-6">
                                                      <div className="flex flex-col gap-2 sm:gap-3">
                                                          <div className={`p-2 sm:p-3 bg-white/5 rounded-xl ring-1 ring-white/10 group-hover:scale-110 transition-all duration-300 flex items-center justify-center w-fit ${col.isPremium ? 'text-yellow-400 group-hover:bg-yellow-500/10' : 'text-cyan-300 group-hover:bg-cyan-500/10'}`}>
                                                              <FolderHeart size={16} className="sm:w-6 sm:h-6" strokeWidth={1.5} aria-hidden="true" />
                                                          </div>
                                                          <span className={`flex items-center gap-1 text-[7px] sm:text-[9px] font-black uppercase tracking-widest bg-white/5 border border-white/10 px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-md w-fit truncate max-w-[100px] sm:max-w-[150px]`}>
                                                              {catDetails.icon} <span className="truncate">{col.university || catDetails.label}</span>
                                                          </span>
                                                      </div>
                                                  </header>

                                                  <h3 className={`text-[13px] sm:text-xl font-black mb-1.5 sm:mb-3 leading-tight sm:leading-snug tracking-tight text-white transition-colors line-clamp-2 ${col.isPremium ? 'group-hover:text-yellow-400' : 'group-hover:text-cyan-300'}`} itemProp="name">
                                                      {col.name}
                                                  </h3>

                                                  <p className="text-[9px] sm:text-sm text-gray-400 line-clamp-2 sm:line-clamp-3 leading-relaxed mb-4 sm:mb-8 flex-grow" itemProp="description">
                                                      {col.description || `Optimized academic collection for ${col.name}.`}
                                                  </p>

                                                  <footer className="pt-3 sm:pt-5 border-t border-white/10 flex items-center justify-between mt-auto relative z-10">
                                                      <div className="flex items-center gap-1.5 sm:gap-3 min-w-0 pr-2">
                                                          <Avatar className="h-5 w-5 sm:h-8 sm:w-8 border border-white/20 shrink-0">
                                                              <AvatarImage src={profile.avatar} alt={profile.name} />
                                                              <AvatarFallback className="bg-gray-800 text-gray-300 text-[6px] sm:text-xs font-black">{profile.name?.charAt(0)}</AvatarFallback>
                                                          </Avatar>
                                                          <div className="flex flex-col min-w-0">
                                                              <div className="flex items-center gap-0.5 sm:gap-1">
                                                                  <span className="text-[8px] sm:text-xs font-black text-gray-300 truncate max-w-[60px] sm:max-w-[100px] group-hover:text-white transition-colors">{profile.name}</span>
                                                                  {profile.isVerifiedEducator && (
                                                                      <BadgeCheck className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-blue-400 shrink-0" title="Verified Expert Educator" />
                                                                  )}
                                                              </div>
                                                              <span className="text-[6px] sm:text-[9px] font-black uppercase tracking-widest text-gray-500 mt-0.5">Curator</span>
                                                          </div>
                                                      </div>
                                                      <div className={`flex items-center justify-center w-5 h-5 sm:w-9 sm:h-9 rounded-full bg-white/5 text-gray-400 transition-all shrink-0 ring-1 ring-white/10 ${col.isPremium ? 'group-hover:bg-yellow-500 group-hover:text-black' : 'group-hover:bg-cyan-500 group-hover:text-black'}`}>
                                                          <ArrowRight size={10} className="sm:w-3.5 sm:h-3.5" aria-hidden="true" />
                                                      </div>
                                                  </footer>
                                              </div>
                                          </article>
                                      </Link>
                                  </div>
                                );
                            })}
                        </div>

                        {hasMoreCollections && (
                           <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-12 relative">
                               <Button onClick={loadMoreCollections} size="lg" className="w-full sm:w-auto h-12 rounded-full px-8 bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] hover:border-blue-500/50 text-white font-black uppercase tracking-widest text-[11px] transition-all hover:shadow-[0_0_20px_rgba(96,165,250,0.15)] group">
                                   <ChevronDown aria-hidden="true" className="w-4 h-4 mr-2 text-blue-400 group-hover:translate-y-1 transition-transform" />
                                   Load More Bundles
                               </Button>
                           </div>
                        )}
                    </>
                ) : (
                    <EmptyState msg="No public bundles shared yet." />
                )
            )}

            {/* ROADMAPS TAB - MOBILE SCALED */}
            {activeTab === 'roadmaps' && (
                roadmaps.length > 0 ? (
                    <>
                        {/* 🚀 CHANGED: grid-cols-2 and gap-3 for mobile to show 2 roadmaps side-by-side */}
                        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 md:gap-8" itemScope itemType="https://schema.org/ItemList">
                            {currentRoadmaps.map((roadmap, idx) => (
                                <div key={roadmap._id} itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem" className="h-full">
                                    <meta itemProp="position" content={idx + 1} />
                                    <Link href={`/roadmaps/${roadmap.slug || roadmap._id}`} className="block h-full group" itemProp="url">
                                        <div className="flex flex-col h-full p-4 sm:p-6 rounded-[1.2rem] sm:rounded-[2rem] bg-white/[0.02] border border-white/10 hover:bg-white/[0.04] hover:border-green-500/40 transition-all duration-300 hover:-translate-y-1 relative overflow-hidden backdrop-blur-xl shadow-sm hover:shadow-[0_30px_80px_-55px_rgba(74,222,128,0.25)]">
                                            <div className="absolute top-0 right-0 w-24 h-24 sm:w-32 sm:h-32 bg-green-500/10 blur-[50px] rounded-full pointer-events-none" />
                                            <div className="flex flex-col h-full relative z-10">
                                                <div className="flex items-center gap-3 mb-3 sm:mb-4">
                                                    <div className="p-2 sm:p-3 bg-green-500/10 text-green-400 rounded-xl group-hover:scale-110 transition-transform">
                                                        <Map size={16} className="sm:w-5 sm:h-5" />
                                                    </div>
                                                </div>
                                                <h3 className="text-[13px] sm:text-xl font-black text-white mb-1.5 sm:mb-2 group-hover:text-green-300 transition-colors line-clamp-2 leading-tight sm:leading-snug" itemProp="name">{roadmap.title || roadmap.name}</h3>
                                                <p className="text-[9px] sm:text-sm text-gray-400 line-clamp-2 mb-4 flex-grow" itemProp="description">{roadmap.category || "Study Plan"}</p>
                                                <div className="mt-auto text-[8px] sm:text-xs font-bold text-gray-500 uppercase tracking-widest flex items-center justify-between border-t border-white/10 pt-3 sm:pt-4">
                                                    <span className="flex items-center gap-1 sm:gap-1.5">
                                                        <MapPin size={10} className="sm:w-3 sm:h-3" /> {roadmap.resources?.length || 0} Milestones
                                                    </span>
                                                    <div className="flex items-center justify-center w-5 h-5 sm:w-7 sm:h-7 rounded-full bg-white/5 text-gray-400 transition-all group-hover:bg-green-500 group-hover:text-black">
                                                        <ArrowRight size={10} className="sm:w-3 sm:h-3" />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </div>
                            ))}
                        </div>

                        {hasMoreRoadmaps && (
                           <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-12 relative">
                               <Button onClick={loadMoreRoadmaps} size="lg" className="w-full sm:w-auto h-12 rounded-full px-8 bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] hover:border-green-500/50 text-white font-black uppercase tracking-widest text-[11px] transition-all hover:shadow-[0_0_20px_rgba(74,222,128,0.15)] group">
                                   <ChevronDown aria-hidden="true" className="w-4 h-4 mr-2 text-green-400 group-hover:translate-y-1 transition-transform" />
                                   Load More Roadmaps
                               </Button>
                           </div>
                        )}
                    </>
                ) : (
                    <EmptyState msg="No public roadmaps created yet." />
                )
            )}

            {/* BLOGS TAB */}
            {activeTab === 'blogs' && (
                blogs.length > 0 ? (
                    <>
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8" itemScope itemType="https://schema.org/ItemList">
                          {currentBlogs.map((blog, idx) => (
                              <div key={blog._id} itemProp="itemListElement" itemScope itemType="https://schema.org/ListItem" className="h-full">
                                  <meta itemProp="position" content={idx + 1} />
                                  <div itemProp="item" itemScope itemType="https://schema.org/BlogPosting" className="h-full">
                                     <BlogCard blog={{...blog, author: profile}} />
                                  </div>
                              </div>
                          ))}
                      </div>
                      
                      {hasMoreBlogs && (
                         <div className="flex flex-col sm:flex-row justify-center items-center gap-4 pt-12 relative">
                             <Button onClick={loadMoreBlogs} size="lg" className="w-full sm:w-auto h-12 rounded-full px-8 bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] hover:border-purple-500/50 text-white font-black uppercase tracking-widest text-[11px] transition-all hover:shadow-[0_0_20px_rgba(168,85,247,0.15)] group">
                                 <ChevronDown aria-hidden="true" className="w-4 h-4 mr-2 text-purple-400 group-hover:translate-y-1 transition-transform" />
                                 Load More Blogs
                             </Button>
                             <noscript>
                                 <Link href={`?tab=blogs&bPage=${blogsPage + 1}`} title="Next page of blogs" className="text-[10px] text-purple-400 underline">
                                     Browse page {blogsPage + 1} of blogs
                                 </Link>
                             </noscript>
                         </div>
                      )}
                    </>
                ) : (
                    <EmptyState msg="No blog posts yet." />
                )
            )}
        </section>
    </div>
  );
}

function EmptyState({ msg }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 sm:py-24 text-gray-500 border-2 border-dashed border-white/5 rounded-[2rem] sm:rounded-[2.5rem] bg-white/[0.02]">
            <p className="text-lg sm:text-xl font-bold uppercase tracking-widest text-center px-4">{msg}</p>
        </div>
    );
}