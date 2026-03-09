"use client";

import { useState } from "react";
import Link from "next/link";
import { FaUpload, FaBookmark, FaList, FaPenNib, FaEdit, FaRss, FaPlus, FaGlobe, FaLock, FaShareAlt } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; 
// 🚀 FIXED: Imported Badge from your UI components, removed from react-icons
import { Badge } from "@/components/ui/badge"; 
import NoteCard from "@/components/notes/NoteCard";
import BlogCard from "@/components/blog/BlogCard";
import RoleBadge from "@/components/common/RoleBadge";
import dynamic from 'next/dynamic'; 
import { updateProfile, updateUserAvatar } from "@/actions/user.actions";
import { deleteCollection, createCollection, updateCollection } from "@/actions/collection.actions"; 
import { deleteBlog } from "@/actions/blog.actions";
import { deleteNote } from "@/actions/note.actions"; 
import { useToast } from '@/hooks/use-toast';
import { useSession } from "next-auth/react";
import { Trash2, Loader2, MoreVertical, Search, Check, TrendingUp, Sparkles, Crown, AlertCircle, ShieldCheck, Clock, CheckCircle } from "lucide-react"; 
import ProfileImageUpload from "@/components/profile/ProfileImageUpload";
import EditBio from "@/components/profile/EditBio"; 
import { formatDate } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const EditNoteModal = dynamic(() => import('@/components/notes/EditNoteModal'), { 
  ssr: false, 
  loading: () => <Loader2 className="animate-spin text-cyan-400 mx-auto mt-4" /> 
});

export default function ProfileDashboard({ user, initialMyNotes, initialSavedNotes, initialCollections, initialMyBlogs, initialReports }) {
  const { data: session, update: updateSession } = useSession();
  const { toast } = useToast();
  
  const [activeTab, setActiveTab] = useState("uploads");
  const [isEditingName, setIsEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.name || "");
  const [editingNote, setEditingNote] = useState(null);
  const [isDeletingNoteId, setIsDeletingNoteId] = useState(null); 
  
  // 🚀 EXPANDED: Edit Collection State
  const [editingColId, setEditingColId] = useState(null);
  const [editColName, setEditColName] = useState("");
  const [editColDescription, setEditColDescription] = useState(""); 
  const [editColUniversity, setEditColUniversity] = useState(""); 
  const [editColIsPremium, setEditColIsPremium] = useState(false);
  const [editColPrice, setEditColPrice] = useState("");
  
  // 🚀 EXPANDED: Create Collection State
  const [isCreatingCollection, setIsCreatingCollection] = useState(false);
  const [newColName, setNewColName] = useState("");
  const [newColDesc, setNewColDesc] = useState("");
  const [newColUniversity, setNewColUniversity] = useState(""); 
  const [newColVisibility, setNewColVisibility] = useState("private");
  const [newColIsPremium, setNewColIsPremium] = useState(false);
  const [newColPrice, setNewColPrice] = useState("");
  const [isCreatingLoader, setIsCreatingLoader] = useState(false);

  const [optimisticAvatar, setOptimisticAvatar] = useState(null); 
  
  const [myNotes, setMyNotes] = useState(initialMyNotes || []);
  const [collections, setCollections] = useState(initialCollections || []);
  const [myBlogs, setMyBlogs] = useState(initialMyBlogs || []); 
  const [myReports, setMyReports] = useState(initialReports || []); // 🚀 NEW: Reports State

  const handleNameSave = async (e) => {
    e.preventDefault();
    if (!user?._id) return;
    
    const res = await updateProfile(user._id, { name: newName });
    
    if (res.success) {
      toast({ title: "Profile Updated" });
      setIsEditingName(false);
      await updateSession({ ...session, user: { ...session.user, name: newName } });
    } else {
      // 🚀 FIXED: Handle server errors gracefully (Catches the Admin Impersonation Block)
      toast({ 
        title: "Update Failed", 
        description: res.error || "Could not update profile name.", 
        variant: "destructive" 
      });
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

  // 🚀 UPDATED: Create Collection Logic with Premium Support
  const handleCreateCollection = async (e) => {
    e.preventDefault();
    if (!newColName.trim()) return;

    if (newColIsPremium && (!newColPrice || Number(newColPrice) <= 0)) {
        return toast({ title: "Price Required", description: "Premium bundles must have a valid price.", variant: "destructive" });
    }
    
    setIsCreatingLoader(true);
    
    const res = await createCollection({
        name: newColName,
        description: newColDesc,
        university: newColUniversity,
        visibility: newColIsPremium ? 'public' : newColVisibility,
        isPremium: newColIsPremium,
        price: newColIsPremium ? Number(newColPrice) : 0
    }, user._id);
    
    if (res.success) {
      setCollections([res.collection, ...collections]);
      
      // Reset State
      setNewColName("");
      setNewColDesc("");
      setNewColUniversity(""); 
      setNewColVisibility("private");
      setNewColIsPremium(false);
      setNewColPrice("");
      setIsCreatingCollection(false);
      toast({ title: "Collection Created", description: "Your new bundle is ready." });
    } else {
      toast({ title: "Error", description: res.error, variant: "destructive" });
    }
    
    setIsCreatingLoader(false);
  };

  // 🚀 UPDATED: Delete Collection Logic with Archive Support
  const handleDeleteCollection = async (col) => {
    const hasBuyers = col.purchasedBy && col.purchasedBy.length > 0;
    const msg = hasBuyers 
        ? "This bundle has buyers. It will be archived instead of permanently deleted to protect access. Proceed?" 
        : "Delete this collection? This won't delete the notes inside it.";

    if(!confirm(msg)) return;
    const res = await deleteCollection(col._id, user._id);
    
    if(res.success) {
        if (res.message && res.message.includes("archived")) {
            setCollections(prev => prev.map(c => c._id === col._id ? { ...c, isArchived: true, visibility: 'private' } : c));
            toast({ title: "Archived", description: res.message });
        } else {
            setCollections(prev => prev.filter(c => c._id !== col._id));
            toast({ title: "Deleted" });
        }
    } else {
        toast({ title: "Error", description: res.error, variant: "destructive" });
    }
  };

  // 🚀 UPDATED: Edit Details with Premium Support
  const handleSaveDetails = async (id) => {
    if (!editColName.trim()) return toast({ title: "Name cannot be empty", variant: "destructive" });
    if (editColIsPremium && (!editColPrice || Number(editColPrice) <= 0)) {
        return toast({ title: "Price Required", variant: "destructive" });
    }

    const res = await updateCollection(id, { 
        name: editColName, 
        description: editColDescription, 
        university: editColUniversity,
        isPremium: editColIsPremium,
        price: editColIsPremium ? Number(editColPrice) : 0,
        visibility: editColIsPremium ? 'public' : undefined // Force public if switching to premium
    }, user._id);

    if (res.success) {
      setCollections(prev => prev.map(c => c._id === id ? { 
          ...c, 
          name: editColName, 
          description: editColDescription, 
          university: editColUniversity, 
          isPremium: editColIsPremium,
          price: editColIsPremium ? Number(editColPrice) : 0,
          slug: res.collection.slug 
      } : c));
      setEditingColId(null);
      toast({ title: "Bundle Details Updated" });
    } else {
      toast({ title: "Update Restricted", description: res.error, variant: "destructive" });
    }
  };

  const handleToggleVisibility = async (col) => {
    // 🛡️ FRAUD PROTECTION: Prevent hiding bundles with buyers
    const hasBuyers = col.purchasedBy && col.purchasedBy.length > 0;
    if (hasBuyers && col.visibility === 'public') {
        return toast({ title: "Restricted", description: "Bundles with active buyers cannot be made private.", variant: "destructive" });
    }

    const newVisibility = col.visibility === 'public' ? 'private' : 'public';
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
    const shareData = {
      title: `${col.name} | StuHive`,
      text: "Check out this curated study bundle on StuHive!",
      url: url,
    };

    try {
      if (navigator.share && navigator.canShare(shareData)) {
        await navigator.share(shareData);
        toast({ title: "Shared successfully!" });
      } else {
        await navigator.clipboard.writeText(url);
        toast({
          title: "Link Copied!",
          description: "Ready to share with your peers.",
        });
      }
    } catch (err) {
      if (err.name !== "AbortError") {
        console.error("Error sharing:", err);
      }
    }
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
      </div>
    );
  }

  const displayAvatar = optimisticAvatar || user?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name || 'Student')}`;

  return (
    <div className="container py-8 max-w-6xl">
        <div className="bg-secondary/10 border rounded-3xl p-8 mb-8 flex flex-col items-center text-center shadow-lg backdrop-blur-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 to-purple-600"></div>
            <div className="mb-4 relative z-10">
              <ProfileImageUpload currentImage={displayAvatar} onUploadComplete={handleAvatarUpdate} />
            </div>
            {!isEditingName ? (
                <div className="flex items-center gap-2 mb-2 relative z-10">
                    <h1 className="text-3xl font-bold">{user.name}</h1>
                    <button onClick={() => setIsEditingName(true)} className="text-muted-foreground hover:text-primary transition"><FaEdit /></button>
                </div>
            ) : (
                <form onSubmit={handleNameSave} className="flex gap-2 mb-2 relative z-10">
                    <Input value={newName} onChange={e => setNewName(e.target.value)} className="h-8 w-48 text-center" autoFocus />
                    <Button size="sm" type="submit">Save</Button>
                    <Button size="sm" variant="ghost" onClick={() => { setIsEditingName(false); setNewName(user?.name || ""); }}>Cancel</Button>
                </form>
            )}
            <p className="text-muted-foreground mb-4 relative z-10">{user.email}</p>
            <div className="flex gap-2 mb-4 relative z-10">
                <RoleBadge role={user.role} />
            </div>

            <div className="relative z-10 w-full mb-6">
                <EditBio user={user} />
            </div>

            <div className="relative z-10 flex flex-wrap justify-center gap-4">
                <Link href="/feed">
                    <Button className="rounded-full bg-white/5 border border-white/10 hover:bg-white/10 text-white font-bold transition-all">
                        <FaRss className="mr-2" /> My Personalized Feed
                    </Button>
                </Link>

                <Link href="/dashboard/analytics">
                    <Button className="rounded-full gap-2 px-6 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-black uppercase tracking-widest shadow-[0_0_20px_rgba(34,211,238,0.3)] transition-all hover:scale-105">
                        <TrendingUp className="w-4 h-4" />
                        My Analytics <Sparkles className="w-3 h-3 text-yellow-300" />
                    </Button>
                </Link>
            </div>
        </div>

        <div className="flex flex-wrap justify-center gap-2 mb-8">
            <TabButton active={activeTab === 'uploads'} onClick={() => setActiveTab('uploads')} icon={<FaUpload />}>Uploads ({myNotes.length})</TabButton>
            <TabButton active={activeTab === 'saved'} onClick={() => setActiveTab('saved')} icon={<FaBookmark />}>Saved ({initialSavedNotes?.length || 0})</TabButton>
            <TabButton active={activeTab === 'collections'} onClick={() => setActiveTab('collections')} icon={<FaList />}>Collections ({collections.length})</TabButton>
            <TabButton active={activeTab === 'blogs'} onClick={() => setActiveTab('blogs')} icon={<FaPenNib />}>My Blogs ({myBlogs.length})</TabButton>
            {/* 🚀 NEW TAB BUTTON */}
            <TabButton active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={<ShieldCheck className="w-4 h-4" />}>Reports ({myReports.length})</TabButton>
        </div>

        <div className="min-h-[400px]">
            {activeTab === 'uploads' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {myNotes.map((note, index) => (
                        <div key={note._id} className="relative group">
                            <NoteCard note={{...note, user}} priority={index < 3} /> 
                            <div className="absolute top-2 left-2 flex gap-2 z-30 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                <Button 
                                  variant="secondary" 
                                  size="icon" 
                                  className="h-8 w-8 rounded-full shadow-md bg-blue-600 text-white hover:bg-blue-700 border-0 active:scale-90" 
                                  onClick={(e) => { e.preventDefault(); setEditingNote(note); }}
                                >
                                    <FaEdit className="w-3.5 h-3.5" />
                                </Button>
                                <Button 
                                  variant="destructive" 
                                  size="icon" 
                                  className="h-8 w-8 rounded-full shadow-md border-0 active:scale-90" 
                                  disabled={isDeletingNoteId === note._id}
                                  onClick={(e) => { e.preventDefault(); handleDeleteNote(note._id); }}
                                >
                                    {isDeletingNoteId === note._id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                </Button>
                            </div>
                        </div>
                    ))}
                    {myNotes.length === 0 && (
                      <EmptyState 
                        msg="You haven't uploaded any notes yet." 
                        action={<Link href="/notes/upload"><Button><FaUpload className="mr-2"/> Upload Note</Button></Link>} 
                      />
                    )}
                </div>
            )}

            {activeTab === 'saved' && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {initialSavedNotes?.map((note, index) => <NoteCard key={note._id} note={note} priority={index < 3} />)}
                    {(!initialSavedNotes || initialSavedNotes.length === 0) && (
                      <EmptyState 
                        msg="You haven't saved any notes to your collection." 
                        action={<Link href="/search"><Button variant="outline"><Search className="mr-2 w-4 h-4"/> Browse Notes</Button></Link>} 
                      />
                    )}
                </div>
            )}

            {activeTab === 'blogs' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {myBlogs.map((blog, index) => (
                        <div key={blog._id} className="relative group h-full">
                          <BlogCard blog={{...blog, author: user}} priority={index < 2} />
                          <div className="absolute top-3 right-3 z-20">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="secondary" size="icon" className="h-8 w-8 rounded-full shadow-md bg-background/80 backdrop-blur-md hover:bg-background">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem asChild>
                                  <Link href={`/blogs/edit/${blog.slug}`} className="cursor-pointer">
                                    <FaEdit className="w-4 h-4 mr-2" /> Edit Blog
                                  </Link>
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleDeleteBlog(blog._id)} className="text-destructive focus:text-destructive cursor-pointer">
                                  <Trash2 className="w-4 h-4 mr-2" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                    ))}
                    {myBlogs.length === 0 && (
                      <EmptyState 
                        msg="You haven't written any blogs yet." 
                        action={<Link href="/blogs/post"><Button className="rounded-full font-bold px-6 bg-purple-500 text-white hover:bg-purple-400"><FaPenNib className="mr-2"/> Write a Blog</Button></Link>} 
                      />
                    )}
                </div>
            )}

            {activeTab === 'collections' && (
                <div className="max-w-3xl mx-auto space-y-4">
                    
                    {/* 🚀 UPGRADED: Collection Creation Form */}
                    <div className="p-4 bg-white/[0.02] border border-white/5 rounded-2xl shadow-sm mb-8">
                        {isCreatingCollection ? (
                          <form onSubmit={handleCreateCollection} className="space-y-4 animate-in fade-in zoom-in-95 duration-200">
                            
                            {/* 🚀 PREMIUM TOGGLE SECTION */}
                            <div className="p-4 rounded-xl border border-yellow-500/30 bg-yellow-500/5 space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs font-black uppercase tracking-widest text-yellow-400 flex items-center gap-2 cursor-pointer">
                                        <Crown size={14} /> Sell as Premium Bundle
                                    </label>
                                    <input 
                                        type="checkbox" 
                                        checked={newColIsPremium} 
                                        onChange={(e) => setNewColIsPremium(e.target.checked)}
                                        className="w-4 h-4 accent-yellow-500"
                                    />
                                </div>
                                {newColIsPremium && (
                                    <div className="animate-in slide-in-from-top-2">
                                        <label className="text-[10px] text-gray-400 mb-1 block">Bundle Price (₹ INR)</label>
                                        <Input 
                                            type="number" 
                                            min="1" 
                                            placeholder="e.g. 499" 
                                            value={newColPrice}
                                            onChange={(e) => setNewColPrice(e.target.value)}
                                            className="bg-black/40 border-yellow-500/30 focus-visible:ring-yellow-500 text-yellow-400 font-bold"
                                            required={newColIsPremium}
                                        />
                                    </div>
                                )}
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Bundle Name</label>
                                <Input 
                                    placeholder="e.g. Engineering Mathematics II" 
                                    value={newColName} 
                                    onChange={(e) => setNewColName(e.target.value)} 
                                    className="bg-black/40 border-white/10 focus-visible:ring-cyan-500"
                                    autoFocus 
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">University (Optional)</label>
                                <Input 
                                    placeholder="e.g. Mumbai University" 
                                    value={newColUniversity}
                                    onChange={(e) => setNewColUniversity(e.target.value)}
                                    className="bg-black/40 border-white/10 focus-visible:ring-cyan-500"
                                />
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Description (Optional)</label>
                                <Textarea 
                                    placeholder="What is this bundle about?" 
                                    value={newColDesc}
                                    onChange={(e) => setNewColDesc(e.target.value)}
                                    className="bg-black/40 border-white/10 focus-visible:ring-cyan-500 resize-none min-h-[80px] text-sm"
                                    maxLength={200}
                                />
                            </div>

                            {!newColIsPremium && (
                                <div className="space-y-1.5">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Visibility</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        <Button 
                                            type="button" 
                                            variant={newColVisibility === 'private' ? 'default' : 'outline'}
                                            className={newColVisibility === 'private' ? 'bg-white text-black font-bold' : 'border-white/10 text-gray-400 hover:text-white'}
                                            onClick={() => setNewColVisibility('private')}
                                        >
                                            <FaLock className="w-3.5 h-3.5 mr-2" /> Private
                                        </Button>
                                        <Button 
                                            type="button" 
                                            variant={newColVisibility === 'public' ? 'default' : 'outline'}
                                            className={newColVisibility === 'public' ? 'bg-cyan-500 text-black font-bold hover:bg-cyan-400' : 'border-white/10 text-gray-400 hover:text-white'}
                                            onClick={() => setNewColVisibility('public')}
                                        >
                                            <FaGlobe className="w-3.5 h-3.5 mr-2" /> Public
                                        </Button>
                                    </div>
                                    {newColVisibility === 'public' && (
                                        <p className="text-[10px] text-cyan-400 mt-1 italic">Public collections are indexed by Google and can be shared.</p>
                                    )}
                                </div>
                            )}

                            <div className="flex gap-2 pt-2">
                                <Button type="button" variant="ghost" className="flex-1 text-gray-400 hover:text-white" onClick={() => setIsCreatingCollection(false)}>Cancel</Button>
                                <Button type="submit" className="flex-1 bg-cyan-500 text-black font-bold hover:bg-cyan-400" disabled={isCreatingLoader || !newColName.trim()}>
                                    {isCreatingLoader ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : <Check className="w-4 h-4 mr-2" />} Create Bundle
                                </Button>
                            </div>
                          </form>
                        ) : (
                          <Button 
                            variant="outline" 
                            className="w-full border-dashed border-white/20 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 py-6" 
                            onClick={() => setIsCreatingCollection(true)}
                          >
                            <FaPlus className="mr-2" /> Create New Collection
                          </Button>
                        )}
                    </div>

                    {collections.map(col => {
                        const hasBuyers = col.purchasedBy && col.purchasedBy.length > 0;
                        
                        return (
                        <div key={col._id} className={`flex flex-col p-4 border rounded-2xl transition-all duration-300 gap-3 ${col.isArchived ? 'bg-amber-500/5 border-amber-500/20' : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.04] hover:border-cyan-500/20'}`}>
                            {editingColId === col._id ? (
                                <div className="flex flex-col gap-3 w-full bg-black/40 p-4 rounded-xl border border-white/10 animate-in fade-in zoom-in-95">
                                    <div className={`p-4 rounded-xl border space-y-3 mb-3 ${editColIsPremium ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-white/5 bg-white/[0.02]'}`}>
                                        <div className="flex items-center justify-between">
                                            <label className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 cursor-pointer ${editColIsPremium ? 'text-yellow-400' : 'text-gray-400'}`}>
                                                <Crown size={14} /> Premium Bundle
                                            </label>
                                            <input 
                                                type="checkbox" 
                                                checked={editColIsPremium} 
                                                disabled={hasBuyers}
                                                onChange={(e) => setEditColIsPremium(e.target.checked)}
                                                className="w-4 h-4 accent-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                                            />
                                        </div>
                                        {hasBuyers && (
                                            <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                                <AlertCircle size={12} className="text-amber-500 shrink-0" />
                                                <p className="text-[9px] text-amber-500 font-bold uppercase leading-tight">Locked due to active buyers.</p>
                                            </div>
                                        )}
                                        {editColIsPremium && (
                                            <div className="animate-in slide-in-from-top-2">
                                                <label className="text-[10px] text-gray-400 mb-1 block">Price (₹ INR)</label>
                                                <Input 
                                                    type="number" 
                                                    min="1" 
                                                    placeholder="e.g. 499" 
                                                    value={editColPrice}
                                                    onChange={(e) => setEditColPrice(e.target.value)}
                                                    className="bg-black/40 border-yellow-500/30 focus-visible:ring-yellow-500 text-yellow-400 font-bold"
                                                    required={editColIsPremium}
                                                />
                                            </div>
                                        )}
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-cyan-400 ml-1">Bundle Name</label>
                                        <Input 
                                            value={editColName} 
                                            onChange={(e) => setEditColName(e.target.value)} 
                                            className="h-10 flex-1 bg-black/40 border-white/10 focus-visible:ring-cyan-500" 
                                            placeholder="e.g., Engineering Mathematics II"
                                            autoFocus 
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">University</label>
                                        <Input 
                                            value={editColUniversity} 
                                            onChange={(e) => setEditColUniversity(e.target.value)} 
                                            className="h-10 flex-1 bg-black/40 border-white/10 focus-visible:ring-cyan-500" 
                                            placeholder="e.g., Mumbai University"
                                        />
                                    </div>

                                    <div className="space-y-1">
                                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">Short Description (SEO)</label>
                                        <textarea 
                                            value={editColDescription} 
                                            onChange={(e) => setEditColDescription(e.target.value)} 
                                            className="w-full min-h-[80px] bg-black/40 border border-white/10 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-cyan-500/50 resize-none"
                                            placeholder="Describe what&apos;s inside this bundle..."
                                            maxLength={200}
                                        />
                                        <p className="text-[9px] text-right text-gray-500">{editColDescription.length}/200</p>
                                    </div>
                                    <div className="flex justify-end gap-2">
                                        <Button size="sm" variant="ghost" onClick={() => setEditingColId(null)} className="text-gray-400 hover:text-white">Cancel</Button>
                                        <Button size="sm" onClick={() => handleSaveDetails(col._id)} className="bg-cyan-500 text-black hover:bg-cyan-400 font-bold">Save Changes</Button>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-wrap items-center justify-between w-full gap-4">
                                    <Link href={`/collections/${col._id}`} className="flex items-center gap-4 flex-1 min-w-0">
                                        <div className={`p-3 rounded-xl ${col.isPremium ? 'bg-yellow-500/10' : 'bg-white/5'}`}>
                                            {col.isPremium ? <Crown className="text-yellow-400 w-5 h-5" /> : <FaList className="text-cyan-400 w-5 h-5" />}
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="font-bold flex items-center gap-2 text-white/90 truncate">
                                              {col.name}
                                              {col.isPremium && <Badge className="bg-yellow-500/20 text-yellow-400 border-0 text-[8px] uppercase tracking-widest px-1.5 py-0">Premium</Badge>}
                                              {!col.isPremium && (col.visibility === 'public' ? <FaGlobe className="text-cyan-400 w-3 h-3 shrink-0" /> : <FaLock className="text-gray-500 w-3 h-3 shrink-0" />)}
                                            </h3>
                                            <p className="text-xs text-gray-400 mt-0.5">
                                                {col.notes?.length || 0} notes • <span className="capitalize">{col.visibility || 'private'}</span>
                                                {col.university && <span className="text-cyan-400/80"> • {col.university}</span>}
                                            </p>
                                        </div>
                                    </Link>
                                    <div className="flex items-center gap-1 shrink-0">
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          title={col.visibility === 'public' ? "Make Private" : "Make Public"}
                                          onClick={() => handleToggleVisibility(col)}
                                          disabled={col.isPremium || hasBuyers}
                                          className={col.visibility === 'public' ? "text-cyan-400 hover:bg-cyan-400/10" : "text-gray-500 hover:bg-white/10 hover:text-white"}
                                        >
                                            {col.visibility === 'public' ? <FaGlobe className="w-4 h-4" /> : <FaLock className="w-4 h-4" />}
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="icon" 
                                          onClick={() => { 
                                            setEditingColId(col._id); 
                                            setEditColName(col.name); 
                                            setEditColDescription(col.description || ""); 
                                            setEditColUniversity(col.university || ""); 
                                            setEditColIsPremium(col.isPremium || false);
                                            setEditColPrice(col.price || "");
                                          }} 
                                          className="text-gray-400 hover:text-cyan-400 hover:bg-cyan-400/10"
                                        >
                                            <FaEdit className="w-4 h-4" />
                                        </Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleDeleteCollection(col)} className="text-red-400 hover:bg-red-500/10 hover:text-red-500">
                                            <Trash2 className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}

                            {col.visibility === 'public' && col.slug && !editingColId && (
                              <div className="flex items-center justify-between mt-2 p-2 bg-black/30 rounded-lg border border-white/5">
                                <span className="text-[10px] text-gray-500 truncate max-w-[200px] sm:max-w-md">stuhive.in/shared-collections/{col.slug}</span>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  className="h-6 text-[10px] font-black uppercase tracking-widest text-cyan-400 hover:bg-cyan-400/10 shrink-0"
                                  onClick={() => handleShareCollection(col)}
                                >
                                  <FaShareAlt className="mr-1.5 w-2.5 h-2.5" /> Share
                                </Button>
                              </div>
                            )}

                            {col.isArchived && (
                              <div className="mt-1 flex items-center gap-1.5 text-[9px] font-bold text-amber-500 uppercase tracking-widest">
                                  <AlertCircle className="w-3 h-3" /> Archived (Hidden from store, kept for buyers)
                              </div>
                            )}
                        </div>
                    )})}
                    
                    {collections.length === 0 && !isCreatingCollection && (
                         <div className="text-center py-12 text-gray-500 text-sm">
                             No collections yet. Start organizing your notes!
                         </div>
                    )}
                </div>
            )}

            {/* 🚀 NEW TAB CONTENT: Reports Tracking */}
            {activeTab === 'reports' && (
                <div className="max-w-4xl mx-auto space-y-4">
                  <div className="mb-6">
                    <h2 className="text-xl font-bold text-white">Report Tracking</h2>
                    <p className="text-sm text-muted-foreground">Monitor the status of content you have reported for quality or fraud concerns.</p>
                  </div>

                  {myReports.length === 0 ? (
                    <EmptyState msg="You haven't submitted any reports yet." />
                  ) : (
                    <div className="grid gap-4">
                      {myReports.map((report) => (
                        <div key={report._id} className="p-5 bg-white/[0.02] border border-white/5 rounded-2xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge className="bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[10px] uppercase font-black px-2 py-0.5">{report.reason}</Badge>
                              <span className="text-gray-600">•</span>
                              <span className="text-[10px] text-gray-500 font-medium">{formatDate(report.createdAt)}</span>
                            </div>
                            <h3 className="font-bold text-white mt-1">
                              Target: {report.targetNote?.title || report.targetBundle?.name || "Deleted Item"}
                            </h3>
                            <p className="text-sm text-gray-400 line-clamp-1 italic">&quot;{report.details}&quot;</p>
                          </div>

                          <div className="shrink-0">
                            {report.status === 'pending' && (
                              <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 gap-1.5 px-3 py-1 font-black uppercase text-[10px] tracking-widest">
                                <Clock size={12} /> Under Review
                              </Badge>
                            )}
                            {report.status === 'resolved' && (
                              <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 gap-1.5 px-3 py-1 font-black uppercase text-[10px] tracking-widest">
                                <CheckCircle size={12} /> Resolved
                              </Badge>
                            )}
                            {report.status === 'dismissed' && (
                              <Badge className="bg-white/5 text-gray-400 border-white/10 gap-1.5 px-3 py-1 font-black uppercase text-[10px] tracking-widest">
                                Dismissed
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
            )}
        </div>

        {editingNote && <EditNoteModal note={editingNote} onClose={() => setEditingNote(null)} />}
    </div>
  );
}

function TabButton({ active, onClick, children, icon }) {
    return (
        <Button variant={active ? "default" : "outline"} onClick={onClick} className={`rounded-full transition-all border-white/10 ${active ? "bg-cyan-500 text-black font-bold shadow-[0_0_15px_rgba(6,182,212,0.3)] hover:bg-cyan-400" : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10"}`}>
            <span className="mr-2">{icon}</span> {children}
        </Button>
    )
}

function EmptyState({ msg, action }) {
    return (
        <div className="col-span-full flex flex-col items-center justify-center py-20 text-gray-400 border border-dashed border-white/10 rounded-[2rem] gap-4 bg-white/[0.01]">
            <p className="text-sm font-medium">{msg}</p>
            {action}
        </div>
    )
}