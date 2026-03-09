"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import ReactMarkdown from 'react-markdown';
import { FaFeatherAlt, FaSave, FaTimes, FaLink, FaAlignLeft, FaQuoteRight, FaImage, FaSpinner, FaEye } from 'react-icons/fa';
import { createBlog, updateBlog } from "@/actions/blog.actions"; 
import { getBlogCoverUploadUrlAction } from "@/actions/upload.actions"; 

const PostBlogPage = ({ existingBlog = null, onBlogUpdated = () => {}, onClose = () => {} }) => {
    const { data: session } = useSession();
    const router = useRouter();
    const isEditing = !!existingBlog;

    // --- State Management ---
    const [formData, setFormData] = useState({
        title: existingBlog?.title || '',
        summary: existingBlog?.summary || '', 
        content: existingBlog?.content || '',
        slug: existingBlog?.slug || '',
        tags: existingBlog?.tags ? existingBlog.tags.join(', ') : '' 
    });

    const [coverImage, setCoverImage] = useState(null); 
    const [previewImage, setPreviewImage] = useState(existingBlog?.coverImage || null); 
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [uploadStatus, setUploadStatus] = useState('');

    useEffect(() => {
        if (!session && typeof window !== "undefined") {
            // Optional: router.push('/login');
        }
    }, [session, router]);

    // --- Handlers ---
    const handleChange = e => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        
        // Auto-generate slug only if it's a new post and the user is typing the title
        if (name === 'title' && !isEditing) {
            const newSlug = value.toLowerCase().replace(/[^a-z0-9\s-]/g, '').trim().replace(/\s+/g, '-');
            setFormData(prev => ({ ...prev, slug: newSlug }));
        }
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setCoverImage(file);
            setPreviewImage(URL.createObjectURL(file)); 
        }
    };

    // --- Helper: Client-Side Image Optimizer (16:9 WebP - Aggressive Compression) ---
    const optimizeCoverImage = (file) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement("canvas");
                    const ctx = canvas.getContext("2d");

                    // 🚀 AGGRESSIVE FIX 1: Reduced MAX_WIDTH from 1200 to 800.
                    // This creates an 800x450 image, which is perfectly sharp for web banners
                    // but drastically reduces the file size footprint.
                    const MAX_WIDTH = 800;
                    let targetWidth = img.width > MAX_WIDTH ? MAX_WIDTH : img.width;
                    let targetHeight = Math.round(targetWidth * (9 / 16));

                    canvas.width = targetWidth;
                    canvas.height = targetHeight;

                    const imgRatio = img.width / img.height;
                    const targetRatio = 16 / 9;
                    let sWidth = img.width, sHeight = img.height, sx = 0, sy = 0;

                    if (imgRatio > targetRatio) {
                        sWidth = img.height * targetRatio;
                        sx = (img.width - sWidth) / 2;
                    } else {
                        sHeight = img.width / targetRatio;
                        sy = (img.height - sHeight) / 2;
                    }

                    ctx.drawImage(img, sx, sy, sWidth, sHeight, 0, 0, targetWidth, targetHeight);

                    // 🚀 AGGRESSIVE FIX 2: Lowered quality from 0.8 to 0.65 to hit that 20-30kb sweet spot.
                    canvas.toBlob((blob) => {
                        if (blob) {
                            resolve(new File([blob], `cover.webp`, { type: "image/webp" }));
                        } else {
                            reject(new Error("Canvas to Blob failed"));
                        }
                    }, "image/webp", 0.65);
                };
                img.onerror = (error) => reject(error);
            };
        });
    };

    // --- Submit Logic (Migrated to Cloudflare R2) ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        
        // 🚀 STRICT DOUBLE-CLICK PREVENTION: Abort immediately if already submitting
        if (loading) return;
        
        setError('');

        if (!formData.title.trim() || !formData.summary.trim() || !formData.content.trim() || !formData.slug.trim()) {
            setError('All text fields are required.');
            return;
        }

        if (!isEditing && !coverImage) {
            setError('A cover image is required for new posts.');
            return;
        }

        // 🚀 ADDED: Tag limit validation before processing upload
        const tagArray = formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
        if (tagArray.length > 5) {
            setError('You can only add a maximum of 5 tags.');
            return;
        }

        setLoading(true); // Lock the form instantly

        try {
            let imageUrl = previewImage; 
            let imageKey = existingBlog?.coverImageKey || null;

            if (coverImage) {
                setUploadStatus("Optimizing image...");
                const optimizedImage = await optimizeCoverImage(coverImage);

                setUploadStatus("Uploading to server...");
                const { success, uploadUrl, fileKey, error: uploadErr } = await getBlogCoverUploadUrlAction("image/webp");
                
                if (!success) throw new Error(uploadErr);

                await fetch(uploadUrl, {
                    method: "PUT",
                    body: optimizedImage,
                    headers: { "Content-Type": "image/webp" },
                });

                imageUrl = `${process.env.NEXT_PUBLIC_R2_PUBLIC_URL}/${fileKey}`;
                imageKey = fileKey;
            }

            setUploadStatus(isEditing ? "Saving changes..." : "Publishing article...");

            let result;

            if (isEditing) {
                const updateData = {
                    title: formData.title,
                    content: formData.content,
                    summary: formData.summary,
                    slug: formData.slug,
                    tags: tagArray,
                    coverImage: imageUrl,
                    coverImageKey: imageKey,
                };
                result = await updateBlog(existingBlog._id, updateData, session?.user?.id);
            } else {
                result = await createBlog({
                    title: formData.title,
                    content: formData.content,
                    summary: formData.summary,
                    slug: formData.slug,
                    tags: tagArray,
                    coverImage: imageUrl,
                    coverImageKey: imageKey,
                    userId: session?.user?.id
                });
            }

            if (result.success) {
                if (isEditing) {
                    onBlogUpdated(result); 
                    onClose(); 
                } else {
                    router.push(`/blogs/${result.slug}`);
                }
            } else {
                throw new Error(result.error);
            }

        } catch (err) {
            console.error('Blog submission failed', err);
            setError(err.message || `Failed to ${isEditing ? 'update' : 'create'} blog.`);
            setLoading(false); // Only unlock if it fails (success redirects/closes)
            setUploadStatus('');
        }
    };
    
    return (
        <div className="w-full max-w-7xl mx-auto px-4 py-8 sm:py-12 relative">
            
            {/* Background ambient glow specific to this form */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[400px] bg-cyan-500/5 blur-[120px] rounded-full pointer-events-none -z-10" />

            <form 
                onSubmit={handleSubmit} 
                className="bg-[#0a0118]/80 backdrop-blur-xl border border-white/10 rounded-[2rem] p-6 sm:p-10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.5)] relative z-10"
            >
                <div className="text-center mb-10 pb-6 border-b border-white/10">
                    <h2 className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500 flex items-center justify-center gap-3">
                        <FaFeatherAlt className="text-cyan-400" /> 
                        {isEditing ? 'Edit Publication' : 'Draft New Article'}
                    </h2>
                    <p className="text-muted-foreground mt-2 font-medium">
                        {isEditing ? 'Refine your insights and update your knowledge base.' : 'Share your expertise with the high-performing community.'}
                    </p>
                </div>

                {error && (
                    <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl mb-8 text-center font-semibold animate-in fade-in slide-in-from-top-4">
                        {error}
                    </div>
                )}
                
                {/* --- COVER IMAGE DROPZONE --- */}
                <div className="mb-8">
                    <label className="flex items-center gap-2 text-sm font-bold text-white/80 mb-3 uppercase tracking-wider">
                        <FaImage className="text-amber-400" /> Cover Banner {!isEditing && <span className="text-red-500">*</span>}
                    </label>
                    <div className="relative w-full group">
                        <input 
                            id="coverImage" 
                            type="file" 
                            accept="image/*"
                            onChange={handleImageChange}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-20"
                            required={!isEditing} 
                            disabled={loading}
                        />
                        <div className={`relative flex flex-col items-center justify-center w-full min-h-[200px] rounded-2xl border-2 border-dashed transition-all duration-300 overflow-hidden ${previewImage ? 'border-cyan-500/50 bg-cyan-500/5' : 'border-white/20 bg-white/5 group-hover:border-cyan-400/50 group-hover:bg-white/10'}`}>
                            
                            {previewImage ? (
                                <>
                                    <img 
                                        src={previewImage} 
                                        alt="Cover Preview" 
                                        className="absolute inset-0 w-full h-full object-cover opacity-60 group-hover:opacity-30 transition-opacity duration-300"
                                        referrerPolicy="no-referrer"
                                    />
                                    <div className="relative z-10 bg-black/60 backdrop-blur-md px-6 py-3 rounded-full text-white font-semibold border border-white/20 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center gap-2">
                                        <FaImage /> Click to change image
                                    </div>
                                </>
                            ) : (
                                <div className="text-center p-8 relative z-10">
                                    <FaImage className="w-12 h-12 text-white/20 mx-auto mb-4 group-hover:text-cyan-400/50 transition-colors" />
                                    <p className="text-white/60 font-medium">Drag and drop or click to browse</p>
                                    <p className="text-white/40 text-xs mt-2">Recommended: 16:9 ratio, High Resolution WebP/JPG</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
                    {/* --- LEFT COLUMN: METADATA --- */}
                    <div className="space-y-6">
                        <div>
                            <label htmlFor="title" className="flex items-center gap-2 text-sm font-bold text-white/80 mb-2 uppercase tracking-wider">
                                <FaQuoteRight className="text-cyan-400" /> Title <span className="text-red-500">*</span>
                            </label>
                            <input 
                                id="title" name="title" type="text" 
                                value={formData.title} onChange={handleChange} 
                                placeholder="The Ultimate Guide to..." required disabled={loading}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white font-medium placeholder:text-white/20 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 transition-all outline-none"
                            />
                        </div>
                        
                        <div>
                            <label htmlFor="summary" className="flex items-center gap-2 text-sm font-bold text-white/80 mb-2 uppercase tracking-wider">
                                <FaAlignLeft className="text-purple-400" /> Teaser Summary <span className="text-red-500">*</span>
                            </label>
                            <textarea 
                                id="summary" name="summary" rows="3"
                                value={formData.summary} onChange={handleChange} 
                                placeholder="A brief, engaging hook for the feed..." required disabled={loading}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white font-medium placeholder:text-white/20 focus:border-purple-400 focus:ring-1 focus:ring-purple-400 transition-all outline-none resize-none"
                            />
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div>
                                {/* 🚀 ADDED: Max 5 Indicator text right aligned */}
                                <label htmlFor="tags" className="flex items-center justify-between text-sm font-bold text-white/80 mb-2 uppercase tracking-wider">
                                    <span className="flex items-center gap-2"><FaLink className="text-green-400" /> Tags</span>
                                    <span className="text-[10px] text-white/40 font-mono normal-case tracking-normal">Max 5</span>
                                </label>
                                <input 
                                    id="tags" name="tags" type="text" 
                                    value={formData.tags} onChange={handleChange} 
                                    placeholder="React, NextJS..." disabled={loading}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3.5 text-white font-medium placeholder:text-white/20 focus:border-green-400 focus:ring-1 focus:ring-green-400 transition-all outline-none"
                                />
                            </div>
                            <div>
                                <label htmlFor="slug" className="flex items-center gap-2 text-sm font-bold text-white/80 mb-2 uppercase tracking-wider">
                                    <FaLink className="text-orange-400" /> URL Slug <span className="text-red-500">*</span>
                                </label>
                                <input 
                                    id="slug" name="slug" type="text" 
                                    value={formData.slug} onChange={handleChange} 
                                    placeholder="auto-generated-slug" required disabled={loading}
                                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-cyan-400 font-mono text-sm placeholder:text-white/20 focus:border-orange-400 focus:ring-1 focus:ring-orange-400 transition-all outline-none"
                                />
                            </div>
                        </div>
                    </div>

                    {/* --- RIGHT COLUMN: EDITOR --- */}
                    <div className="flex flex-col h-full">
                        <label htmlFor="content" className="flex items-center justify-between text-sm font-bold text-white/80 mb-2 uppercase tracking-wider">
                            <span className="flex items-center gap-2"><FaFeatherAlt className="text-pink-400" /> Article Body <span className="text-red-500">*</span></span>
                            <span className="text-[10px] text-white/40 font-mono normal-case tracking-normal">Markdown Supported</span>
                        </label>
                        <textarea 
                            id="content" name="content" 
                            value={formData.content} onChange={handleChange} 
                            placeholder="Start writing your masterpiece here... Use # for headings, **bold**, etc." required disabled={loading}
                            className="w-full h-full min-h-[300px] bg-white/5 border border-white/10 rounded-xl px-4 py-4 text-white font-mono text-sm placeholder:text-white/20 focus:border-pink-400 focus:ring-1 focus:ring-pink-400 transition-all outline-none resize-y"
                        />
                    </div>
                </div>
                
                {/* --- FULL WIDTH LIVE PREVIEW --- */}
                <div className="mt-12 pt-8 border-t border-white/10">
                    <h3 className="flex items-center gap-2 text-lg font-black text-white/80 mb-4 uppercase tracking-widest">
                        <FaEye className="text-cyan-400" /> Live Render Preview
                    </h3>
                    <div className="w-full bg-[#030014]/50 rounded-2xl border border-white/5 p-6 sm:p-10 min-h-[200px] max-h-[500px] overflow-y-auto custom-scrollbar">
                        {formData.content ? (
                            <div className="prose prose-invert prose-cyan max-w-none prose-headings:font-black prose-a:text-cyan-400 hover:prose-a:text-cyan-300">
                                <ReactMarkdown>{formData.content}</ReactMarkdown>
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-white/20 italic">
                                Your formatted content will appear here...
                            </div>
                        )}
                    </div>
                </div>

                {/* --- SUBMIT ACTIONS --- */}
                <div className="flex flex-col sm:flex-row justify-end items-center gap-4 mt-10 pt-6 border-t border-white/10">
                    {isEditing && (
                         <button 
                            type="button" 
                            onClick={onClose} 
                            disabled={loading}
                            className="w-full sm:w-auto px-8 py-3.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 text-white font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            <FaTimes /> Cancel
                        </button>
                    )}
                    
                    <button 
                        type="submit" 
                        disabled={loading} 
                        className={`w-full sm:w-auto group relative px-10 py-3.5 rounded-full bg-gradient-to-r from-cyan-500 to-purple-600 text-white font-black text-lg overflow-hidden transition-all shadow-[0_0_20px_rgba(34,211,238,0.3)] hover:shadow-[0_0_30px_rgba(168,85,247,0.5)] flex items-center justify-center gap-3 ${loading ? 'opacity-80 cursor-wait pointer-events-none' : 'hover:scale-[1.02] active:scale-[0.98]'}`}
                    >
                        {!loading && <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />}
                        
                        {loading ? (
                            <>
                                <FaSpinner className="animate-spin" /> {uploadStatus || 'Processing...'}
                            </>
                        ) : (
                            <>
                                <FaSave className="group-hover:-translate-y-1 transition-transform" /> 
                                {isEditing ? 'Save Publication' : 'Publish Post'}
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default PostBlogPage;