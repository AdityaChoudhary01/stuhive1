"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation"; // 🚀 FIXED: Use useRouter for client-side redirection
import { getMyBlogs, deleteBlog } from "@/actions/blog.actions";
import { Button } from "@/components/ui/button";
import BlogCard from "@/components/blog/BlogCard";
import { FaPenNib } from "react-icons/fa";
import { Loader2, Trash2, Edit3, ChevronLeft, ChevronRight, FileText } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function MyBlogsPage() {
  const { data: session, status } = useSession();
  const router = useRouter(); // 🚀 Hook for redirection
  const { toast } = useToast();
  
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isDeletingId, setIsDeletingId] = useState(null);

  // 🚀 PAGINATION STATE
  const ITEMS_PER_PAGE = 12;
  const [currentPage, setCurrentPage] = useState(1);

  // 🚀 FIXED: Wrapped in useCallback with proper dependencies
  const fetchUserBlogs = useCallback(async () => {
    if (!session?.user?.id) return;
    
    setLoading(true);
    try {
      // Fetch with high limit for client-side pagination
      const res = await getMyBlogs(session.user.id, 1, 360); 
      
      const formattedBlogs = res.map(blog => ({
        ...blog,
        author: {
            _id: session.user.id,
            name: session.user.name,
            avatar: session.user.image || session.user.avatar,
            role: session.user.role
        }
      }));
      setBlogs(formattedBlogs);
    } catch (error) {
      console.error("Failed to fetch blogs:", error);
    } finally {
      setLoading(false);
    }
  }, [session?.user?.id, session?.user?.name, session?.user?.image, session?.user?.avatar, session?.user?.role]);

  useEffect(() => {
    // 🚀 FIXED: Check status carefully to prevent reload loops
    if (status === "unauthenticated") {
      router.push("/login?callbackUrl=/blogs/my-blogs");
      return;
    }

    if (status === "authenticated") {
      fetchUserBlogs();
    }
  }, [status, fetchUserBlogs, router]);

  const handleDelete = async (blogId) => {
    if (!confirm("Are you sure you want to delete this article?")) return;
    
    setIsDeletingId(blogId);
    const res = await deleteBlog(blogId, session.user.id);
    
    if (res.success) {
      setBlogs(prev => prev.filter(b => b._id !== blogId));
      toast({ title: "Success", description: "Article deleted successfully." });
    } else {
      toast({ title: "Error", description: res.error, variant: "destructive" });
    }
    setIsDeletingId(null);
  };

  // 🚀 Handle loading state before rendering content
  if (status === "loading" || (status === "authenticated" && loading)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-cyan-500" />
        <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">
          Loading your articles...
        </p>
      </div>
    );
  }

  // 🚀 PAGINATION LOGIC
  const totalPages = Math.ceil(blogs.length / ITEMS_PER_PAGE);
  const paginatedBlogs = blogs.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

  return (
    <div className="container px-2 sm:px-6 md:px-8 py-12 min-h-screen max-w-7xl pt-28">
        {/* 🚀 CHANGED: Moved comment inside the parent div to fix the parsing error, while keeping px-2 for small screens */}
        
        {/* --- Header Section --- */}
        <div className="flex flex-col md:flex-row justify-between items-center mb-12 gap-6 border-b border-white/5 pb-8">
            <div className="text-center md:text-left">
                <h1 className="text-4xl sm:text-5xl font-black text-white uppercase tracking-tighter">My Articles</h1>
                <p className="text-gray-500 mt-2 font-medium">Manage and track the performance of your published content.</p>
            </div>
            <Link href="/blogs/post">
                <Button className="rounded-full bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-widest px-8 py-6 shadow-xl shadow-cyan-500/20 transition-all hover:scale-105">
                    <FaPenNib className="mr-2" /> Write New Blog
                </Button>
            </Link>
        </div>

        {/* --- Content Section --- */}
        {blogs.length === 0 ? (
            <div className="text-center py-24 border-2 border-dashed border-white/10 rounded-[3rem] bg-white/[0.02] flex flex-col items-center">
                <div className="p-6 bg-white/5 rounded-full mb-6 text-gray-600">
                    <FileText size={48} />
                </div>
                <p className="text-xl text-gray-400 mb-8 font-bold">You haven&apos;t written any articles yet.</p>
                <Link href="/blogs/post">
                    <Button variant="outline" className="rounded-full px-10 h-12 border-white/20 hover:bg-white/5 font-bold">Start Your First Blog</Button>
                </Link>
            </div>
        ) : (
            <div className="space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {paginatedBlogs.map((blog) => (
                        <div key={blog._id} className="flex flex-col h-full group relative">
                            
                            <div className="flex-grow">
                                <BlogCard blog={blog} />
                            </div>

                            {/* --- Action Buttons --- */}
                            <div className="flex justify-end items-center gap-2 mt-4 px-2">
                                <Link href={`/blogs/edit/${blog.slug}`} className="flex-1 sm:flex-none"> 
                                    <Button variant="secondary" size="sm" className="w-full rounded-xl bg-white/5 hover:bg-white/10 text-white border border-white/10 font-bold">
                                        <Edit3 className="mr-2 w-4 h-4 text-cyan-400" /> Edit
                                    </Button>
                                </Link>

                                <Button 
                                    variant="destructive" 
                                    size="sm" 
                                    disabled={isDeletingId === blog._id}
                                    onClick={() => handleDelete(blog._id)}
                                    className="rounded-xl font-bold px-4"
                                >
                                    {isDeletingId === blog._id ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <><Trash2 className="mr-2 w-4 h-4" /> Delete</>
                                    )}
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>

                {/* --- Pagination Controls --- */}
                {totalPages > 1 && (
                    <div className="flex justify-center items-center gap-2 pt-8 border-t border-white/5">
                        <Button
                            variant="outline"
                            size="icon"
                            disabled={currentPage === 1}
                            onClick={() => { setCurrentPage(p => p - 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            className="rounded-full border-white/10 hover:bg-white/5"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>

                        <div className="flex items-center gap-1">
                            {[...Array(totalPages)].map((_, i) => (
                                <Button
                                    key={i}
                                    variant={currentPage === i + 1 ? "default" : "ghost"}
                                    size="sm"
                                    onClick={() => { setCurrentPage(i + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                                    className={`w-10 h-10 rounded-full font-black ${currentPage === i + 1 ? "bg-cyan-500 text-black shadow-lg shadow-cyan-500/20" : "text-gray-500 hover:text-white"}`}
                                >
                                    {i + 1}
                                </Button>
                            ))}
                        </div>

                        <Button
                            variant="outline"
                            size="icon"
                            disabled={currentPage === totalPages}
                            onClick={() => { setCurrentPage(p => p + 1); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                            className="rounded-full border-white/10 hover:bg-white/5"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                )}
            </div>
        )}
    </div>
  );
}