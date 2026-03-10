"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  FaUpload, FaBookmark, FaList, FaPenNib, FaEdit, FaRss,
  FaPlus, FaGlobe, FaLock, FaShareAlt,
} from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import NoteCard from "@/components/notes/NoteCard";
import BlogCard from "@/components/blog/BlogCard";
import RoleBadge from "@/components/common/RoleBadge";
import dynamic from "next/dynamic";
import { updateProfile, updateUserAvatar, getUserNotes, getSavedNotes } from "@/actions/user.actions"; // 🚀 Added chunk fetch actions
import { deleteCollection, createCollection, updateCollection } from "@/actions/collection.actions";
import { deleteBlog } from "@/actions/blog.actions";
import { deleteNote } from "@/actions/note.actions";
import { useToast } from "@/hooks/use-toast";
import { useSession } from "next-auth/react";
import {
  Trash2, Loader2, MoreVertical, Search, Check,
  TrendingUp, Sparkles, Crown, AlertCircle, ShieldCheck,
  Clock, CheckCircle, BellRing,
} from "lucide-react";
import ProfileImageUpload from "@/components/profile/ProfileImageUpload";
import EditBio from "@/components/profile/EditBio";
import { formatDate } from "@/lib/utils";
import MyWatchlist from "@/components/profile/MyWatchlist";
import {
  DropdownMenu, DropdownMenuContent,
  DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const EditNoteModal = dynamic(
  () => import("@/components/notes/EditNoteModal"),
  { ssr: false, loading: () => <Loader2 className="animate-spin text-cyan-400 mx-auto mt-4" /> }
);

// 🚀 HELPER: Serialize newly fetched chunks just like the server does
const serializeClientNotes = (notes) => {
  const fallbackDate = new Date().toISOString();
  return notes.map(note => ({
    ...note,
    _id: note._id?.toString() || note._id,
    user: note.user?._id ? { ...note.user, _id: note.user._id.toString() } : note.user?.toString(),
    fileKey: note.fileKey || null,
    thumbnailKey: note.thumbnailKey || null,
    uploadDate: note.uploadDate ? new Date(note.uploadDate).toISOString() : fallbackDate,
  }));
};

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function ProfileDashboard({
  user, initialMyNotes, initialSavedNotes,
  initialCollections, initialMyBlogs, initialReports,
}) {
  const { data: session, update: updateSession } = useSession();
  const { toast } = useToast();

  const [activeTab, setActiveTab]           = useState("uploads");
  const [isEditingName, setIsEditingName]   = useState(false);
  const [newName, setNewName]               = useState(user?.name || "");
  const [editingNote, setEditingNote]       = useState(null);
  const [isDeletingNoteId, setIsDeletingNoteId] = useState(null);

  // Edit Collection
  const [editingColId, setEditingColId]             = useState(null);
  const [editColName, setEditColName]               = useState("");
  const [editColDescription, setEditColDescription] = useState("");
  const [editColUniversity, setEditColUniversity]   = useState("");
  const [editColIsPremium, setEditColIsPremium]     = useState(false);
  const [editColPrice, setEditColPrice]             = useState("");

  // Create Collection
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [newColName, setNewColName]         = useState("");
  const [newColDesc, setNewColDesc]         = useState("");
  const [newColUniversity, setNewColUniversity] = useState("");
  const [newColVisibility, setNewColVisibility] = useState("private");
  const [newColIsPremium, setNewColIsPremium] = useState(false);
  const [newColPrice, setNewColPrice]       = useState("");
  const [isCreatingLoader, setIsCreatingLoader] = useState(false);

  const [optimisticAvatar, setOptimisticAvatar] = useState(null);

  // 🚀 ADVANCED DATA STATE WITH CHUNKING
  const [myNotes, setMyNotes]         = useState(initialMyNotes || []);
  const [savedNotes, setSavedNotes]   = useState(initialSavedNotes || []);
  const [collections, setCollections] = useState(initialCollections || []);
  const [myBlogs, setMyBlogs]         = useState(initialMyBlogs || []);
  const [myReports, setMyReports]     = useState(initialReports || []);

  const [uploadsChunk, setUploadsChunk] = useState(1);
  const [hasMoreUploads, setHasMoreUploads] = useState((initialMyNotes?.length || 0) === 120);
  const [isFetchingUploads, setIsFetchingUploads] = useState(false);

  const [savedChunk, setSavedChunk] = useState(1);
  const [hasMoreSaved, setHasMoreSaved] = useState((initialSavedNotes?.length || 0) === 120);
  const [isFetchingSaved, setIsFetchingSaved] = useState(false);

  // 🚀 PAGINATION STATE
  const ITEMS_PER_PAGE = 12;
  const [currentPage, setCurrentPage] = useState(1);

  const handleTabChange = (tabName) => {
    setActiveTab(tabName);
    setCurrentPage(1);
  };

  // 🚀 CHUNK FETCH HANDLERS
  const loadMoreUploadsChunk = async () => {
    setIsFetchingUploads(true);
    const nextChunk = uploadsChunk + 1;
    const res = await getUserNotes(user._id, nextChunk, 120); // Fetch next 120

    if (res && res.notes) {
      const formatted = serializeClientNotes(res.notes);
      setMyNotes(prev => [...prev, ...formatted]);
      setUploadsChunk(nextChunk);
      setHasMoreUploads(res.notes.length === 120);
    }
    setIsFetchingUploads(false);
  };

  const loadMoreSavedChunk = async () => {
    setIsFetchingSaved(true);
    const nextChunk = savedChunk + 1;
    const res = await getSavedNotes(user._id, nextChunk, 120); // Fetch next 120

    if (res && res.notes) {
      const formatted = serializeClientNotes(res.notes);
      setSavedNotes(prev => [...prev, ...formatted]);
      setSavedChunk(nextChunk);
      setHasMoreSaved(res.notes.length === 120);
    }
    setIsFetchingSaved(false);
  };

  // Derived Paginated Arrays
  const paginatedUploads = myNotes.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const paginatedSaved = savedNotes.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const paginatedBlogs = myBlogs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const paginatedCollections = collections.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const paginatedReports = myReports.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  /* ── Handlers ─────────── */
  const handleNameSave = async (e) => {
    e.preventDefault();
    if (!user?._id) return;
    const res = await updateProfile(user._id, { name: newName });
    if (res.success) {
      toast({ title: "Profile Updated" });
      setIsEditingName(false);
      await updateSession({ ...session, user: { ...session.user, name: newName } });
    } else {
      toast({ title: "Update Failed", description: res.error || "Could not update profile name.", variant: "destructive" });
    }
  };

  const handleAvatarUpdate = async (newUrl, avatarKey) => {
    setOptimisticAvatar(newUrl);
    const res = await updateUserAvatar(user._id, newUrl, avatarKey);
    if (res.success) {
      toast({ title: "Profile updated!" });
      await updateSession({ ...session, user: { ...session?.user, image: newUrl, avatar: newUrl } });
    } else {
      setOptimisticAvatar(null);
      toast({ title: "Update Failed", description: res.error, variant: "destructive" });
    }
  };

  const handleDeleteNote = async (noteId) => {
    if (!confirm("Are you sure you want to permanently delete this note?")) return;
    setIsDeletingNoteId(noteId);
    const res = await deleteNote(noteId, user._id);
    if (res.success) {
      setMyNotes(prev => prev.filter(n => n._id !== noteId));
      toast({ title: "Note Deleted", description: "Document removed from cloud storage." });
    } else {
      toast({ title: "Error", description: res.error, variant: "destructive" });
    }
    setIsDeletingNoteId(null);
  };

  const handleCreateCollection = async (e) => {
    e.preventDefault();
    if (!newColName.trim()) return;
    if (newColIsPremium && (!newColPrice || Number(newColPrice) <= 0)) {
      return toast({ title: "Price Required", description: "Premium bundles must have a valid price.", variant: "destructive" });
    }
    setIsCreatingLoader(true);
    const res = await createCollection({
      name: newColName, description: newColDesc, university: newColUniversity,
      visibility: newColIsPremium ? "public" : newColVisibility,
      isPremium: newColIsPremium, price: newColIsPremium ? Number(newColPrice) : 0,
    }, user._id);
    if (res.success) {
      setCollections([res.collection, ...collections]);
      setNewColName(""); setNewColDesc(""); setNewColUniversity("");
      setNewColVisibility("private"); setNewColIsPremium(false);
      setNewColPrice(""); setIsCreatingCollection(false);
      toast({ title: "Collection Created", description: "Your new bundle is ready." });
    } else {
      toast({ title: "Error", description: res.error, variant: "destructive" });
    }
    setIsCreatingLoader(false);
  };

  const handleDeleteCollection = async (col) => {
    const hasBuyers = col.purchasedBy && col.purchasedBy.length > 0;
    const msg = hasBuyers
      ? "This bundle has buyers. It will be archived instead of permanently deleted to protect access. Proceed?"
      : "Delete this collection? This won't delete the notes inside it.";
    if (!confirm(msg)) return;
    const res = await deleteCollection(col._id, user._id);
    if (res.success) {
      if (res.message && res.message.includes("archived")) {
        setCollections(prev => prev.map(c => c._id === col._id ? { ...c, isArchived: true, visibility: "private" } : c));
        toast({ title: "Archived", description: res.message });
      } else {
        setCollections(prev => prev.filter(c => c._id !== col._id));
        toast({ title: "Deleted" });
      }
    } else {
      toast({ title: "Error", description: res.error, variant: "destructive" });
    }
  };

  const handleSaveDetails = async (id) => {
    if (!editColName.trim()) return toast({ title: "Name cannot be empty", variant: "destructive" });
    if (editColIsPremium && (!editColPrice || Number(editColPrice) <= 0))
      return toast({ title: "Price Required", variant: "destructive" });
    const res = await updateCollection(id, {
      name: editColName, description: editColDescription, university: editColUniversity,
      isPremium: editColIsPremium, price: editColIsPremium ? Number(editColPrice) : 0,
      visibility: editColIsPremium ? "public" : undefined,
    }, user._id);
    if (res.success) {
      setCollections(prev => prev.map(c => c._id === id ? {
        ...c, name: editColName, description: editColDescription,
        university: editColUniversity, isPremium: editColIsPremium,
        price: editColIsPremium ? Number(editColPrice) : 0, slug: res.collection.slug,
      } : c));
      setEditingColId(null);
      toast({ title: "Bundle Details Updated" });
    } else {
      toast({ title: "Update Restricted", description: res.error, variant: "destructive" });
    }
  };

  const handleToggleVisibility = async (col) => {
    const hasBuyers = col.purchasedBy && col.purchasedBy.length > 0;
    if (hasBuyers && col.visibility === "public")
      return toast({ title: "Restricted", description: "Bundles with active buyers cannot be made private.", variant: "destructive" });
    const newVisibility = col.visibility === "public" ? "private" : "public";
    const res = await updateCollection(col._id, { visibility: newVisibility }, user._id);
    if (res.success) {
      setCollections(prev => prev.map(c => c._id === col._id ? { ...c, visibility: newVisibility, slug: res.collection.slug } : c));
      toast({ title: `Collection is now ${newVisibility}` });
    } else {
      toast({ title: "Error updating visibility", variant: "destructive" });
    }
  };

  const handleDeleteBlog = async (blogId) => {
    if (!confirm("Are you sure you want to permanently delete this blog?")) return;
    const res = await deleteBlog(blogId, user._id);
    if (res.success) {
      setMyBlogs(prev => prev.filter(b => b._id !== blogId));
      toast({ title: "Blog Deleted" });
    } else {
      toast({ title: "Error", description: res.error, variant: "destructive" });
    }
  };

  const handleShareCollection = async (col) => {
    const url = `https://www.stuhive.in/shared-collections/${col.slug}`;
    const shareData = { title: `${col.name} | StuHive`, text: "Check out this curated study bundle on StuHive!", url };
    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast({ title: "Shared successfully!" });
      } else {
        await navigator.clipboard.writeText(url);
        toast({ title: "Link Copied!", description: "Ready to share with your peers." });
      }
    } catch (err) {
      if (err.name !== "AbortError") console.error("Error sharing:", err);
    }
  };

  /* ── Guard ───────────────────────────────── */
  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  const displayAvatar = optimisticAvatar || user?.avatar
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || "Student")}`;

  /* ═══════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════ */
  return (
    <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 lg:px-6 py-6 sm:py-8 lg:py-10 space-y-6 sm:space-y-8">

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          PROFILE HERO CARD (UPDATED UI ONLY)
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="relative rounded-2xl sm:rounded-3xl overflow-hidden border border-white/8 shadow-2xl shadow-black/40">
        {/* Decorative top accent bar */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-600 z-10" />

        {/* Subtle mesh / glow background (UNCHANGED THEME) */}
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.06] via-transparent to-purple-600/[0.06]" />
        <div className="absolute -top-20 -right-20 w-64 h-64 rounded-full bg-cyan-500/[0.05] blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full bg-purple-600/[0.05] blur-3xl pointer-events-none" />

        <div className="relative z-[1] bg-secondary/10 backdrop-blur-sm">
          <div className="px-4 sm:px-8 lg:px-12 py-7 sm:py-9">

            {/* Header strip: context + desktop actions */}
            <div className="flex items-start justify-between gap-4 mb-6 sm:mb-7">
              <div className="flex items-start gap-3 min-w-0">
                <div className="mt-1 h-9 w-1 rounded-full bg-gradient-to-b from-cyan-400 via-blue-500 to-purple-600 shrink-0" />
                <div className="min-w-0">
                  <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-500">
                    Profile Dashboard
                  </p>
                  <p className="text-xs sm:text-sm text-gray-500 mt-1 leading-snug max-w-xl">
                    Manage your identity, quick actions, and content in one place.
                  </p>
                </div>
              </div>

              {/* CTA buttons — desktop */}
              <div className="hidden lg:flex items-center gap-2 shrink-0">
                <Link href="/dashboard/analytics">
                  <Button className="rounded-full gap-2 px-5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(34,211,238,0.25)] hover:scale-[1.03] transition-all">
                    <TrendingUp className="w-4 h-4" /> Analytics <Sparkles className="w-3 h-3 text-yellow-300" />
                  </Button>
                </Link>
                <Link href="/feed">
                  <Button className="rounded-full gap-2 px-5 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-semibold transition-all">
                    <FaRss className="w-3.5 h-3.5 text-cyan-400" /> Personalized Feed
                  </Button>
                </Link>
              </div>
            </div>

            {/* Main profile grid */}
            <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-6 lg:gap-8 items-start">

              {/* Avatar block */}
              <div className="flex flex-col items-center lg:items-start gap-3">
                <div className="relative shrink-0 rounded-full">
                  {/* ring + soft glow (theme-safe) */}
                  <div className="absolute -inset-2 rounded-full bg-cyan-500/[0.06] blur-xl pointer-events-none" />
                  <div className="relative ring-4 ring-cyan-500/25 rounded-full shadow-lg shadow-cyan-500/10">
                    <ProfileImageUpload currentImage={displayAvatar} onUploadComplete={handleAvatarUpdate} />
                  </div>
                </div>

                {/* subtle helper line (mobile only) */}
                <p className="lg:hidden text-[10px] text-gray-600 font-medium">
                  Tip: Tap your avatar to update profile photo.
                </p>
              </div>

              {/* Details block */}
              <div className="min-w-0 space-y-5 sm:space-y-6">

                {/* Name + edit */}
                <div className="rounded-2xl border border-white/8 bg-white/[0.02] p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div className="min-w-0">
                      {!isEditingName ? (
                        <div className="flex items-center gap-2.5 min-w-0">
                          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight truncate">
                            {user.name}
                          </h1>
                          <button
                            onClick={() => setIsEditingName(true)}
                            className="shrink-0 p-2 rounded-xl text-gray-500 hover:text-cyan-400 hover:bg-cyan-400/10 transition-all border border-transparent hover:border-cyan-500/15 active:scale-95"
                            title="Edit name"
                            aria-label="Edit name"
                          >
                            <FaEdit className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <form onSubmit={handleNameSave} className="flex flex-col sm:flex-row sm:items-center gap-2 w-full">
                          <Input
                            value={newName}
                            onChange={e => setNewName(e.target.value)}
                            className="h-10 text-sm bg-black/40 border-white/15 focus-visible:ring-cyan-500 rounded-xl"
                            autoFocus
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              type="submit"
                              className="h-10 rounded-xl shrink-0 bg-cyan-500 text-black font-black hover:bg-cyan-400 px-4"
                            >
                              Save
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-10 rounded-xl shrink-0 text-gray-400 hover:text-white px-4"
                              onClick={() => { setIsEditingName(false); setNewName(user?.name || ""); }}
                              type="button"
                            >
                              Cancel
                            </Button>
                          </div>
                        </form>
                      )}

                      {/* Meta chips row */}
                      <div className="mt-3 flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold bg-black/25 border border-white/10 text-gray-300 max-w-full">
                          <span className="truncate">{user.email}</span>
                        </span>

                        <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold bg-white/[0.03] border border-white/10 text-gray-400">
                          Account
                        </span>

                        <div className="flex flex-wrap items-center gap-2">
                          <RoleBadge role={user.role} />
                        </div>
                      </div>
                    </div>

                    {/* Right-side micro panel (only if space) */}
                    <div className="hidden sm:flex flex-col items-end gap-2 shrink-0">
                      <div className="rounded-xl border border-white/8 bg-black/20 px-3 py-2">
                        <p className="text-[10px] uppercase tracking-widest font-black text-gray-600 text-right">
                          Status
                        </p>
                        <div className="mt-1 inline-flex items-center gap-1.5 text-[11px] font-bold text-cyan-400">
                          <ShieldCheck className="w-3.5 h-3.5" />
                          Active
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Bio panel (more professional container, theme-safe) */}
                <div className="rounded-2xl border border-white/8 bg-white/[0.02] overflow-hidden">
                  <div className="px-4 sm:px-5 py-3 border-b border-white/8 bg-black/10">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.22em] text-gray-600">
                        Bio & Highlights
                      </p>
                      <span className="text-[10px] text-gray-600">
                        Keep it short & searchable
                      </span>
                    </div>
                  </div>
                  <div className="px-4 sm:px-5 py-4">
                    <EditBio user={user} />
                  </div>
                </div>

                {/* Mobile CTA buttons (kept, just cleaner spacing) */}
                <div className="flex flex-wrap justify-center sm:justify-start gap-2 lg:hidden pt-1">
                  <Link href="/dashboard/analytics">
                    <Button className="rounded-full gap-2 px-5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black uppercase tracking-widest text-xs shadow-[0_0_20px_rgba(34,211,238,0.25)] transition-all">
                      <TrendingUp className="w-4 h-4" /> Analytics <Sparkles className="w-3 h-3 text-yellow-300" />
                    </Button>
                  </Link>
                  <Link href="/feed">
                    <Button className="rounded-full gap-2 px-5 bg-white/5 border border-white/10 hover:bg-white/10 text-white text-xs font-semibold transition-all">
                      <FaRss className="w-3.5 h-3.5 text-cyan-400" /> Personalized Feed
                    </Button>
                  </Link>
                </div>

              </div>
            </div>

          </div>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          TAB BAR
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="relative">
        {/* Fade-out edges on small screens */}
        <div className="pointer-events-none absolute right-0 top-0 h-full w-8 bg-gradient-to-l from-background to-transparent z-10 sm:hidden" />
        <div className="pointer-events-none absolute left-0 top-0 h-full w-4 bg-gradient-to-r from-background to-transparent z-10 sm:hidden" />

        <div className="flex gap-1.5 overflow-x-auto scrollbar-hide pb-1 px-0.5 snap-x snap-mandatory">
          <TabButton active={activeTab === "uploads"}     onClick={() => handleTabChange("uploads")}     icon={<FaUpload className="w-3.5 h-3.5" />}>
            Uploads <CountPill n={myNotes.length} active={activeTab === "uploads"} />
          </TabButton>
          <TabButton active={activeTab === "saved"}       onClick={() => handleTabChange("saved")}       icon={<FaBookmark className="w-3.5 h-3.5" />}>
            Saved <CountPill n={savedNotes.length} active={activeTab === "saved"} />
          </TabButton>
          <TabButton active={activeTab === "watchlist"}   onClick={() => handleTabChange("watchlist")}   icon={<BellRing className="w-3.5 h-3.5" />}>
            Watchlist <CountPill n={user?.savedOpportunities?.length || 0} active={activeTab === "watchlist"} />
          </TabButton>
          <TabButton active={activeTab === "collections"} onClick={() => handleTabChange("collections")} icon={<FaList className="w-3.5 h-3.5" />}>
            Collections <CountPill n={collections.length} active={activeTab === "collections"} />
          </TabButton>
          <TabButton active={activeTab === "blogs"}       onClick={() => handleTabChange("blogs")}       icon={<FaPenNib className="w-3.5 h-3.5" />}>
            Blogs <CountPill n={myBlogs.length} active={activeTab === "blogs"} />
          </TabButton>
          <TabButton active={activeTab === "reports"}     onClick={() => handleTabChange("reports")}     icon={<ShieldCheck className="w-3.5 h-3.5" />}>
            Reports <CountPill n={myReports.length} active={activeTab === "reports"} />
          </TabButton>
        </div>
      </div>

      {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
          TAB PANELS
      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="min-h-[420px]">

        {/* ── UPLOADS ── */}
        {activeTab === "uploads" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 lg:gap-6">
              {paginatedUploads.map((note, i) => (
                <div key={note._id} className="relative group">
                  <NoteCard note={{ ...note, user }} priority={i < 3} />
                  {/* Action overlay */}
                  <div className="absolute top-2.5 left-2.5 flex gap-1.5 z-30 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity duration-200">
                    <button
                      onClick={e => { e.preventDefault(); setEditingNote(note); }}
                      className="h-7 w-7 sm:h-8 sm:w-8 rounded-full shadow-lg bg-blue-600 hover:bg-blue-500 text-white flex items-center justify-center border border-white/10 active:scale-90 transition-all"
                      title="Edit note"
                    >
                      <FaEdit className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                    <button
                      onClick={e => { e.preventDefault(); handleDeleteNote(note._id); }}
                      disabled={isDeletingNoteId === note._id}
                      className="h-7 w-7 sm:h-8 sm:w-8 rounded-full shadow-lg bg-red-600 hover:bg-red-500 text-white flex items-center justify-center border border-white/10 active:scale-90 transition-all disabled:opacity-60"
                      title="Delete note"
                    >
                      {isDeletingNoteId === note._id
                        ? <Loader2 className="w-3 h-3 animate-spin" />
                        : <Trash2 className="w-3 h-3 sm:w-3.5 sm:h-3.5" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
            {myNotes.length === 0 && (
              <EmptyState
                icon={<FaUpload className="w-8 h-8 text-cyan-500/50" />}
                msg="You haven't uploaded any notes yet."
                sub="Share your knowledge with students worldwide."
                action={
                  <Link href="/notes/upload">
                    <Button size="sm" className="rounded-full bg-cyan-500 text-black font-bold hover:bg-cyan-400 gap-2">
                      <FaUpload className="w-3.5 h-3.5" /> Upload Note
                    </Button>
                  </Link>
                }
              />
            )}
            <CustomPagination
              totalItems={myNotes.length}
              itemsPerPage={ITEMS_PER_PAGE}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              hasMoreChunk={hasMoreUploads}
              isFetchingChunk={isFetchingUploads}
              onLoadChunk={loadMoreUploadsChunk}
            />
          </div>
        )}

        {/* ── SAVED ── */}
        {activeTab === "saved" && (
          <div className="space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-5 lg:gap-6">
              {paginatedSaved.map((note, i) => (
                <NoteCard key={note._id} note={note} priority={i < 3} />
              ))}
            </div>
            {savedNotes.length === 0 && (
              <EmptyState
                icon={<FaBookmark className="w-8 h-8 text-cyan-500/50" />}
                msg="No saved notes yet."
                sub="Bookmark notes you want to revisit later."
                action={
                  <Link href="/search">
                    <Button size="sm" variant="outline" className="rounded-full border-white/15 gap-2 hover:border-cyan-500/40 hover:text-cyan-400">
                      <Search className="w-3.5 h-3.5" /> Browse Notes
                    </Button>
                  </Link>
                }
              />
            )}
            <CustomPagination
              totalItems={savedNotes.length}
              itemsPerPage={ITEMS_PER_PAGE}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
              hasMoreChunk={hasMoreSaved}
              isFetchingChunk={isFetchingSaved}
              onLoadChunk={loadMoreSavedChunk}
            />
          </div>
        )}

        {/* ── WATCHLIST ── */}
        {/* Watchlist handles its own internal data fetching and we will apply pagination there via updated MyWatchlist component */}
        {activeTab === "watchlist" && <MyWatchlist />}

        {/* ── BLOGS ── */}
        {activeTab === "blogs" && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 lg:gap-6">
              {paginatedBlogs.map((blog, i) => (
                <div key={blog._id} className="relative group h-full">
                  <BlogCard blog={{ ...blog, author: user }} priority={i < 2} />
                  <div className="absolute top-3 right-3 z-20">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="secondary" size="icon"
                          className="h-8 w-8 rounded-full shadow-lg bg-background/80 backdrop-blur-md hover:bg-background border border-white/10"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="min-w-[150px]">
                        <DropdownMenuItem asChild>
                          <Link href={`/blogs/edit/${blog.slug}`} className="cursor-pointer gap-2">
                            <FaEdit className="w-4 h-4" /> Edit Blog
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleDeleteBlog(blog._id)}
                          className="text-destructive focus:text-destructive cursor-pointer gap-2"
                        >
                          <Trash2 className="w-4 h-4" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
            {myBlogs.length === 0 && (
              <EmptyState
                icon={<FaPenNib className="w-8 h-8 text-purple-500/50" />}
                msg="You haven't written any blogs yet."
                sub="Share insights, guides, and ideas with the community."
                action={
                  <Link href="/blogs/post">
                    <Button size="sm" className="rounded-full bg-purple-500 text-white font-bold hover:bg-purple-400 gap-2">
                      <FaPenNib className="w-3.5 h-3.5" /> Write a Blog
                    </Button>
                  </Link>
                }
              />
            )}
            <CustomPagination
              totalItems={myBlogs.length}
              itemsPerPage={ITEMS_PER_PAGE}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
            />
          </div>
        )}

        {/* ── COLLECTIONS ── */}
        {activeTab === "collections" && (
          <div className="max-w-3xl mx-auto space-y-3 pb-8">
            {/* ── Create form / trigger ── */}
            <div className="rounded-2xl border border-white/8 overflow-hidden mb-6 shadow-sm">
              {isCreatingCollection ? (
                <form onSubmit={handleCreateCollection} className="p-5 space-y-4 bg-white/[0.02] animate-in fade-in zoom-in-95 duration-200">

                  {/* Section label */}
                  <div className="flex items-center gap-2 mb-1">
                    <div className="h-px flex-1 bg-white/8" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">New Bundle</span>
                    <div className="h-px flex-1 bg-white/8" />
                  </div>

                  {/* Premium toggle */}
                  <div className={`p-4 rounded-xl border transition-all ${newColIsPremium ? "border-yellow-500/30 bg-yellow-500/[0.04]" : "border-white/8 bg-white/[0.01]"}`}>
                    <div className="flex items-center justify-between">
                      <label className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 cursor-pointer ${newColIsPremium ? "text-yellow-400" : "text-gray-500"}`}>
                        <Crown size={13} /> Sell as Premium Bundle
                      </label>
                      <input
                        type="checkbox" checked={newColIsPremium}
                        onChange={e => setNewColIsPremium(e.target.checked)}
                        className="w-4 h-4 accent-yellow-500"
                      />
                    </div>
                    {newColIsPremium && (
                      <div className="mt-3 animate-in slide-in-from-top-2 duration-150">
                        <label className="text-[10px] text-gray-400 mb-1.5 block">Bundle Price (₹ INR)</label>
                        <Input
                          type="number" min="1" placeholder="e.g. 499"
                          value={newColPrice} onChange={e => setNewColPrice(e.target.value)}
                          className="bg-black/40 border-yellow-500/30 focus-visible:ring-yellow-500 text-yellow-400 font-bold"
                          required={newColIsPremium}
                        />
                      </div>
                    )}
                  </div>

                  {/* Fields */}
                  <FormField label="Bundle Name" accent="cyan">
                    <Input
                      placeholder="e.g. Engineering Mathematics II"
                      value={newColName} onChange={e => setNewColName(e.target.value)}
                      className="bg-black/40 border-white/10 focus-visible:ring-cyan-500"
                      autoFocus
                    />
                  </FormField>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField label="University (Optional)">
                      <Input
                        placeholder="e.g. Mumbai University"
                        value={newColUniversity} onChange={e => setNewColUniversity(e.target.value)}
                        className="bg-black/40 border-white/10 focus-visible:ring-cyan-500"
                      />
                    </FormField>
                    {!newColIsPremium && (
                      <FormField label="Visibility">
                        <div className="grid grid-cols-2 gap-2 h-10">
                          <button
                            type="button"
                            onClick={() => setNewColVisibility("private")}
                            className={`flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold border transition-all
                              ${newColVisibility === "private"
                                ? "bg-white text-black border-white"
                                : "bg-white/[0.03] border-white/10 text-gray-400 hover:text-white hover:border-white/20"}`}
                          >
                            <FaLock className="w-3 h-3" /> Private
                          </button>
                          <button
                            type="button"
                            onClick={() => setNewColVisibility("public")}
                            className={`flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold border transition-all
                              ${newColVisibility === "public"
                                ? "bg-cyan-500 text-black border-cyan-400"
                                : "bg-white/[0.03] border-white/10 text-gray-400 hover:text-white hover:border-white/20"}`}
                          >
                            <FaGlobe className="w-3 h-3" /> Public
                          </button>
                        </div>
                        {newColVisibility === "public" && (
                          <p className="text-[10px] text-cyan-400 mt-1 italic">Indexed by Google & shareable.</p>
                        )}
                      </FormField>
                    )}
                  </div>

                  <FormField label="Description (Optional)">
                    <div className="relative">
                      <Textarea
                        placeholder="What&apos;s inside this bundle?"
                        value={newColDesc} onChange={e => setNewColDesc(e.target.value)}
                        className="bg-black/40 border-white/10 focus-visible:ring-cyan-500 resize-none min-h-[80px] text-sm pb-5"
                        maxLength={200}
                      />
                      <span className="absolute bottom-2 right-3 text-[10px] text-gray-600">{newColDesc.length}/200</span>
                    </div>
                  </FormField>

                  <div className="flex gap-2.5 pt-1">
                    <Button type="button" variant="ghost" className="flex-1 text-gray-400 hover:text-white text-sm"
                      onClick={() => setIsCreatingCollection(false)}>Cancel</Button>
                    <Button type="submit"
                      className="flex-1 bg-cyan-500 text-black font-black hover:bg-cyan-400 text-sm gap-2"
                      disabled={isCreatingLoader || !newColName.trim()}>
                      {isCreatingLoader ? <Loader2 className="animate-spin w-4 h-4" /> : <Check className="w-4 h-4" />}
                      Create Bundle
                    </Button>
                  </div>
                </form>
              ) : (
                <button
                  onClick={() => setIsCreatingCollection(true)}
                  className="w-full flex items-center justify-center gap-2 py-5 px-4 bg-white/[0.01] border-dashed border-white/10 border text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/[0.05] rounded-2xl text-sm font-bold transition-all group"
                >
                  <span className="w-6 h-6 rounded-full border border-cyan-500/40 flex items-center justify-center group-hover:border-cyan-400 transition-all">
                    <FaPlus className="w-2.5 h-2.5" />
                  </span>
                  Create New Collection
                </button>
              )}
            </div>

            {/* ── Collection cards ── */}
            {paginatedCollections.map(col => {
              const hasBuyers = col.purchasedBy && col.purchasedBy.length > 0;
              return (
                <div
                  key={col._id}
                  className={`rounded-2xl border transition-all duration-300 overflow-hidden
                    ${col.isArchived
                      ? "bg-amber-500/[0.03] border-amber-500/20"
                      : "bg-white/[0.02] border-white/8 hover:bg-white/[0.035] hover:border-cyan-500/15"
                    }`}
                >
                  {editingColId === col._id ? (
                    /* ── Edit form ── */
                    <div className="p-5 space-y-4 animate-in fade-in zoom-in-95 duration-200">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="h-px flex-1 bg-white/8" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">Editing Bundle</span>
                        <div className="h-px flex-1 bg-white/8" />
                      </div>

                      {/* Premium toggle */}
                      <div className={`p-4 rounded-xl border space-y-3 ${editColIsPremium ? "border-yellow-500/30 bg-yellow-500/[0.04]" : "border-white/8 bg-white/[0.01]"}`}>
                        <div className="flex items-center justify-between">
                          <label className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 cursor-pointer ${editColIsPremium ? "text-yellow-400" : "text-gray-500"}`}>
                            <Crown size={13} /> Premium Bundle
                          </label>
                          <input
                            type="checkbox" checked={editColIsPremium}
                            disabled={hasBuyers}
                            onChange={e => setEditColIsPremium(e.target.checked)}
                            className="w-4 h-4 accent-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                          />
                        </div>
                        {hasBuyers && (
                          <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20">
                            <AlertCircle size={12} className="text-amber-500 shrink-0" />
                            <p className="text-[9px] text-amber-400 font-bold uppercase leading-tight">Locked — active buyers exist.</p>
                          </div>
                        )}
                        {editColIsPremium && (
                          <div className="animate-in slide-in-from-top-2">
                            <label className="text-[10px] text-gray-400 mb-1.5 block">Price (₹ INR)</label>
                            <Input
                              type="number" min="1" placeholder="e.g. 499"
                              value={editColPrice} onChange={e => setEditColPrice(e.target.value)}
                              className="bg-black/40 border-yellow-500/30 focus-visible:ring-yellow-500 text-yellow-400 font-bold"
                              required={editColIsPremium}
                            />
                          </div>
                        )}
                      </div>

                      <FormField label="Bundle Name" accent="cyan">
                        <Input
                          value={editColName} onChange={e => setEditColName(e.target.value)}
                          className="bg-black/40 border-white/10 focus-visible:ring-cyan-500"
                          placeholder="e.g. Engineering Mathematics II" autoFocus
                        />
                      </FormField>

                      <FormField label="University">
                        <Input
                          value={editColUniversity} onChange={e => setEditColUniversity(e.target.value)}
                          className="bg-black/40 border-white/10 focus-visible:ring-cyan-500"
                          placeholder="e.g. Mumbai University"
                        />
                      </FormField>

                      <FormField label="Short Description (SEO)">
                        <div className="relative">
                          <textarea
                            value={editColDescription} onChange={e => setEditColDescription(e.target.value)}
                            className="w-full min-h-[80px] bg-black/40 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none pb-5"
                            placeholder="Describe what's inside this bundle..."
                            maxLength={200}
                          />
                          <span className="absolute bottom-2 right-3 text-[10px] text-gray-600">{editColDescription.length}/200</span>
                        </div>
                      </FormField>

                      <div className="flex justify-end gap-2 pt-1">
                        <Button size="sm" variant="ghost" onClick={() => setEditingColId(null)}
                          className="text-gray-400 hover:text-white">Cancel</Button>
                        <Button size="sm" onClick={() => handleSaveDetails(col._id)}
                          className="bg-cyan-500 text-black hover:bg-cyan-400 font-black">Save Changes</Button>
                      </div>
                    </div>
                  ) : (
                    /* ── View row ── */
                    <div className="p-4">
                      <div className="flex items-center gap-3 sm:gap-4">

                        {/* Icon */}
                        <Link href={`/collections/${col._id}`} className="shrink-0">
                          <div className={`w-10 h-10 sm:w-11 sm:h-11 rounded-xl flex items-center justify-center ${col.isPremium ? "bg-yellow-500/10 ring-1 ring-yellow-500/20" : "bg-white/5 ring-1 ring-white/8"}`}>
                            {col.isPremium
                              ? <Crown className="text-yellow-400 w-4.5 h-4.5" />
                              : <FaList className="text-cyan-400 w-4 h-4" />}
                          </div>
                        </Link>

                        {/* Info */}
                        <Link href={`/collections/${col._id}`} className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="font-bold text-white/90 truncate text-sm sm:text-base leading-tight">{col.name}</span>
                            {col.isPremium && (
                              <Badge className="bg-yellow-500/15 text-yellow-400 border-0 text-[8px] uppercase tracking-widest px-1.5 py-0 shrink-0">
                                Premium
                              </Badge>
                            )}
                            {!col.isPremium && (
                              col.visibility === "public"
                                ? <FaGlobe className="text-cyan-400 w-3 h-3 shrink-0" />
                                : <FaLock className="text-gray-600 w-3 h-3 shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5 leading-tight">
                            {col.notes?.length || 0} notes
                            {col.university && <><span className="mx-1 text-gray-700">·</span><span className="text-cyan-400/70">{col.university}</span></>}
                          </p>
                        </Link>

                        {/* Actions */}
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            title={col.visibility === "public" ? "Make Private" : "Make Public"}
                            onClick={() => handleToggleVisibility(col)}
                            disabled={col.isPremium || hasBuyers}
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all disabled:opacity-30 disabled:cursor-not-allowed
                              ${col.visibility === "public"
                                ? "text-cyan-400 hover:bg-cyan-400/10"
                                : "text-gray-600 hover:bg-white/8 hover:text-gray-300"}`}
                          >
                            {col.visibility === "public" ? <FaGlobe className="w-3.5 h-3.5" /> : <FaLock className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            onClick={() => {
                              setEditingColId(col._id); setEditColName(col.name);
                              setEditColDescription(col.description || ""); setEditColUniversity(col.university || "");
                              setEditColIsPremium(col.isPremium || false); setEditColPrice(col.price || "");
                            }}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 hover:text-cyan-400 hover:bg-cyan-400/10 transition-all"
                          >
                            <FaEdit className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteCollection(col)}
                            className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:text-red-400 hover:bg-red-500/10 transition-all"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Share strip */}
                      {col.visibility === "public" && col.slug && !editingColId && (
                        <div className="flex items-center justify-between mt-3 px-3 py-2 bg-black/25 rounded-xl border border-white/[0.04]">
                          <span className="text-[10px] text-gray-600 truncate max-w-[180px] xs:max-w-[260px] sm:max-w-md font-mono">
                            stuhive.in/shared-collections/{col.slug}
                          </span>
                          <button
                            onClick={() => handleShareCollection(col)}
                            className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-cyan-400 hover:text-cyan-300 ml-2 shrink-0 px-2 py-1 rounded-lg hover:bg-cyan-400/10 transition-all"
                          >
                            <FaShareAlt className="w-2.5 h-2.5" /> Share
                          </button>
                        </div>
                      )}

                      {/* Archived banner */}
                      {col.isArchived && (
                        <div className="flex items-center gap-1.5 mt-2.5 px-3 py-1.5 rounded-lg bg-amber-500/8 border border-amber-500/15">
                          <AlertCircle className="w-3 h-3 text-amber-500 shrink-0" />
                          <span className="text-[9px] font-black text-amber-500 uppercase tracking-widest">Archived · Hidden from store, accessible to buyers</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {collections.length === 0 && !isCreatingCollection && (
              <EmptyState
                icon={<FaList className="w-8 h-8 text-cyan-500/50" />}
                msg="No collections yet."
                sub="Group your notes into focused study bundles."
              />
            )}

            <CustomPagination
              totalItems={collections.length}
              itemsPerPage={ITEMS_PER_PAGE}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
            />
          </div>
        )}

        {/* ── REPORTS ── */}
        {activeTab === "reports" && (
          <div className="max-w-3xl mx-auto space-y-4 pb-8">
            <div className="mb-6 pb-4 border-b border-white/8">
              <h2 className="text-lg sm:text-xl font-black text-white">Report Tracking</h2>
              <p className="text-sm text-gray-500 mt-0.5">Monitor content you&apos;ve flagged for quality or fraud concerns.</p>
            </div>

            {myReports.length === 0 ? (
              <EmptyState
                icon={<ShieldCheck className="w-8 h-8 text-cyan-500/50" />}
                msg="No reports submitted yet."
                sub="Reports you file will appear here for tracking."
              />
            ) : (
              <div className="space-y-3">
                {paginatedReports.map(report => (
                  <div
                    key={report._id}
                    className="p-4 sm:p-5 bg-white/[0.02] border border-white/8 rounded-2xl flex flex-col sm:flex-row sm:items-center gap-4 hover:border-white/12 transition-all"
                  >
                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[9px] uppercase font-black px-2 py-0.5 tracking-wider">
                          {report.reason}
                        </Badge>
                        <span className="text-[10px] text-gray-600 font-medium">{formatDate(report.createdAt)}</span>
                      </div>
                      <h3 className="font-bold text-white/90 text-sm leading-tight truncate">
                        {report.targetNote?.title || report.targetBundle?.name || "Deleted Item"}
                      </h3>
                      <p className="text-xs text-gray-500 line-clamp-1 italic">&quot;{report.details}&quot;</p>
                    </div>

                    <div className="shrink-0">
                      {report.status === "pending" && (
                        <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 gap-1.5 px-3 py-1 font-black uppercase text-[9px] tracking-widest">
                          <Clock size={10} /> Under Review
                        </Badge>
                      )}
                      {report.status === "resolved" && (
                        <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 gap-1.5 px-3 py-1 font-black uppercase text-[9px] tracking-widest">
                          <CheckCircle size={10} /> Resolved
                        </Badge>
                      )}
                      {report.status === "dismissed" && (
                        <Badge className="bg-white/5 text-gray-500 border-white/10 gap-1.5 px-3 py-1 font-black uppercase text-[9px] tracking-widest">
                          Dismissed
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <CustomPagination
              totalItems={myReports.length}
              itemsPerPage={ITEMS_PER_PAGE}
              currentPage={currentPage}
              setCurrentPage={setCurrentPage}
            />
          </div>
        )}
      </div>

      {/* Edit Note Modal */}
      {editingNote && <EditNoteModal note={editingNote} onClose={() => setEditingNote(null)} />}
    </div>
  );
}

/* ─────────────────────────────────────────────
   SUB-COMPONENTS
───────────────────────────────────────────── */

/** 🚀 UPGRADED: Custom Pagination Component with Server-Side Chunk Support */
function CustomPagination({
  totalItems, itemsPerPage, currentPage, setCurrentPage,
  hasMoreChunk = false, onLoadChunk, isFetchingChunk = false
}) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  // Hide pagination if only 1 page exists AND there are no more chunks to load
  if (totalPages <= 1 && !hasMoreChunk) return null;

  const handleNext = async () => {
    // If we are at the very end of our current chunk, AND the server has more data...
    if (currentPage === totalPages && hasMoreChunk) {
      if (onLoadChunk) await onLoadChunk();
      setCurrentPage(prev => prev + 1);
      window.scrollTo({ top: 350, behavior: "smooth" });
    } else {
      setCurrentPage(prev => prev + 1);
      window.scrollTo({ top: 350, behavior: "smooth" });
    }
  };

  const handlePrev = () => {
    setCurrentPage(prev => prev - 1);
    window.scrollTo({ top: 350, behavior: "smooth" });
  };

  const handlePageSelect = (page) => {
    setCurrentPage(page);
    window.scrollTo({ top: 350, behavior: "smooth" });
  };

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);

    if (end - start + 1 < maxVisible) {
      start = Math.max(1, end - maxVisible + 1);
    }

    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="flex justify-center items-center gap-1.5 sm:gap-2 mt-8 pt-6 border-t border-white/5 pb-4">
      <Button
        variant="outline"
        size="sm"
        disabled={currentPage === 1}
        onClick={handlePrev}
        className="border-white/10 text-gray-400 hover:text-white disabled:opacity-30 rounded-full h-9 px-4 text-xs font-bold"
      >
        Prev
      </Button>

      {getPageNumbers().map(num => (
        <Button
          key={num}
          variant={currentPage === num ? "default" : "outline"}
          size="sm"
          onClick={() => handlePageSelect(num)}
          className={`w-9 h-9 p-0 rounded-full transition-all text-xs ${currentPage === num ? "bg-cyan-500 text-black font-black hover:bg-cyan-400 shadow-[0_0_10px_rgba(6,182,212,0.4)]" : "border-white/10 text-gray-400 hover:text-white"}`}
        >
          {num}
        </Button>
      ))}

      <Button
        variant="outline"
        size="sm"
        disabled={(currentPage === totalPages && !hasMoreChunk) || isFetchingChunk}
        onClick={handleNext}
        className="border-white/10 text-gray-400 hover:text-white disabled:opacity-30 rounded-full h-9 px-4 text-xs font-bold"
      >
        {isFetchingChunk ? <Loader2 className="w-4 h-4 animate-spin" /> : "Next"}
      </Button>
    </div>
  );
}

/** Animated tab button with snap scroll support */
function TabButton({ active, onClick, children, icon }) {
  return (
    <button
      onClick={onClick}
      className={`
        snap-start shrink-0 inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 sm:py-2.5
        rounded-full text-xs sm:text-sm font-bold border transition-all duration-200
        ${active
          ? "bg-cyan-500 text-black border-transparent shadow-[0_0_16px_rgba(6,182,212,0.35)] scale-[1.03]"
          : "bg-white/[0.03] text-gray-400 border-white/10 hover:text-white hover:bg-white/[0.07] hover:border-white/15"
        }
      `}
    >
      {icon}
      <span className="whitespace-nowrap flex items-center gap-1.5">{children}</span>
    </button>
  );
}

/** Small count pill inside tab button */
function CountPill({ n, active }) {
  // 🚀 FIXED: Allow 0 to be rendered. Only return null if undefined/null.
  if (n === undefined || n === null) return null;
  return (
    <span className={`inline-flex items-center justify-center min-w-[1.25rem] h-5 px-1 rounded-full text-[10px] font-black transition-colors
      ${active ? "bg-black/20 text-black" : "bg-white/10 text-gray-400"}`}>
      {n > 99 ? "99+" : n}
    </span>
  );
}

/** Reusable form field wrapper */
function FormField({ label, accent = "gray", children }) {
  const color = accent === "cyan" ? "text-cyan-400" : "text-gray-500";
  return (
    <div className="space-y-1.5">
      <label className={`block text-[10px] font-black uppercase tracking-widest ${color}`}>{label}</label>
      {children}
    </div>
  );
}

/** Polished empty state */
function EmptyState({ icon, msg, sub, action }) {
  return (
    <div className="col-span-full flex flex-col items-center justify-center py-16 sm:py-20 px-6 text-center
      border border-dashed border-white/10 rounded-2xl bg-white/[0.01] gap-3">
      {icon && <div className="mb-1 opacity-80">{icon}</div>}
      <p className="text-sm font-semibold text-gray-300">{msg}</p>
      {sub && <p className="text-xs text-gray-600 max-w-xs">{sub}</p>}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
