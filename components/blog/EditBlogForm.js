"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import { FaFeatherAlt, FaSave, FaTimes, FaLink, FaAlignLeft, FaQuoteRight, FaImage } from 'react-icons/fa';
import { updateBlog } from "@/actions/blog.actions";
import { getBlogCoverUploadUrlAction } from "@/actions/upload.actions"; // ✅ NEW: R2 Upload Action

const EditBlogForm = ({ blog }) => {
    const router = useRouter();

    // --- State Management ---
    const [formData, setFormData] = useState({
        title: blog.title || '',
        summary: blog.summary || '',
        content: blog.content || '',
        slug: blog.slug || '',
        tags: blog.tags ? blog.tags.join(', ') : '' 
    });

    const [coverImage, setCoverImage] = useState(null); 
    const [previewImage, setPreviewImage] = useState(blog.coverImage || null); 
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [uploadStatus, setUploadStatus] = useState('');

    // --- INTERNAL CSS: HOLOGRAPHIC THEME ---
    const styles = {
        container: { padding: '0', maxWidth: '100%', margin: '0 auto' },
        formCard: { background: 'rgba(255, 255, 255, 0.03)', backdropFilter: 'blur(20px)', borderRadius: '24px', border: '1px solid rgba(255, 255, 255, 0.1)', padding: '3rem', boxShadow: '0 25px 50px rgba(0,0,0,0.4)', color: '#fff' },
        header: { textAlign: 'center', marginBottom: '2.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '1.5rem' },
        title: { fontSize: '2rem', fontWeight: '800', background: 'linear-gradient(to right, #00d4ff, #ff00cc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' },
        formGroup: { marginBottom: '1.5rem', position: 'relative' },
        label: { marginBottom: '0.5rem', color: 'rgba(255,255,255,0.8)', fontSize: '0.95rem', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px' },
        input: { width: '100%', padding: '14px', background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: '#fff', fontSize: '1rem', outline: 'none', transition: 'border-color 0.3s, box-shadow 0.3s', fontFamily: 'inherit', boxSizing: 'border-box' },
        textarea: { width: '100%', padding: '14px', background: 'rgba(0, 0, 0, 0.2)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '12px', color: '#fff', fontSize: '1rem', outline: 'none', transition: 'border-color 0.3s, box-shadow 0.3s', fontFamily: 'inherit', resize: 'vertical', minHeight: '100px', boxSizing: 'border-box' },
        fileInputWrapper: { position: 'relative', overflow: 'hidden', display: 'inline-block', width: '100%' },
        fileLabel: { border: '2px dashed rgba(255,255,255,0.2)', borderRadius: '12px', padding: '2rem', textAlign: 'center', cursor: 'pointer', transition: 'border-color 0.3s', display: 'block', color: 'rgba(255,255,255,0.5)' },
        imagePreview: { width: '100%', maxHeight: '300px', objectFit: 'cover', borderRadius: '12px', marginTop: '1rem', border: '1px solid rgba(255,255,255,0.1)' },
        previewBox: { background: 'rgba(255, 255, 255, 0.05)', padding: '2rem', borderRadius: '12px', border: '1px dashed rgba(255, 255, 255, 0.2)', marginTop: '1rem', maxHeight: '400px', overflowY: 'auto', color: 'rgba(255,255,255,0.9)' },
        submitBtn: { padding: '14px 40px', borderRadius: '50px', background: 'linear-gradient(135deg, #00d4ff 0%, #333399 100%)', color: '#fff', border: 'none', fontSize: '1.1rem', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 15px rgba(0, 212, 255, 0.3)', transition: 'transform 0.2s, opacity 0.2s', display: 'flex', alignItems: 'center', gap: '10px' },
        cancelBtn: { padding: '14px 30px', borderRadius: '50px', background: 'rgba(255, 255, 255, 0.1)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.1)', fontSize: '1.1rem', fontWeight: '600', cursor: 'pointer', transition: 'background 0.2s', display: 'flex', alignItems: 'center', gap: '10px' },
        actions: { display: 'flex', justifyContent: 'center', gap: '1rem', marginTop: '3rem', flexWrap: 'wrap' },
        errorMsg: { background: 'rgba(255, 0, 85, 0.1)', color: '#ff0055', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', border: '1px solid rgba(255, 0, 85, 0.2)', textAlign: 'center' },
        helperText: { fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '5px' },
        requiredStar: { color: '#ff0055', marginLeft: '4px' }
    };

    // --- Handlers ---
    const handleChange = e => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleImageChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            setCoverImage(file);
            setPreviewImage(URL.createObjectURL(file)); 
        }
    };

    const handleFocus = (e) => {
        e.target.style.borderColor = '#00d4ff';
        e.target.style.boxShadow = '0 0 10px rgba(0, 212, 255, 0.2)';
    };
    
    const handleBlur = (e) => {
        e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        e.target.style.boxShadow = 'none';
    };

    // --- Helper: Client-Side Image Optimizer (16:9 WebP) ---
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

                    // 🚀 AGGRESSIVE FIX 2: Lowered quality from 0.8 to 0.65.
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

    // --- Submit Logic (Cloudflare R2) ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (!formData.title.trim() || !formData.summary.trim() || !formData.content.trim() || !formData.slug.trim()) {
            setError('All text fields are required.');
            return;
        }

        // 🚀 ADDED: Tag limit validation before processing upload
        const tagArray = formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [];
        if (tagArray.length > 5) {
            setError('You can only add a maximum of 5 tags.');
            return;
        }

        setLoading(true);

        try {
            let imageUrl = previewImage;
            let imageKey = blog.coverImageKey || null; // Track existing key

            // 1. Upload new image ONLY if a new file was selected
            if (coverImage) {
                setUploadStatus("Optimizing new image...");
                const optimizedImage = await optimizeCoverImage(coverImage);

                setUploadStatus("Uploading to R2...");
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

            setUploadStatus("Saving changes...");

            // 2. Prepare Data
            const updatedData = {
                ...formData,
                tags: tagArray,
                coverImage: imageUrl,        // Public URL
                coverImageKey: imageKey      // Secret R2 Key (triggers deletion of old one on backend)
            };

            // 3. Call Server Action
            const res = await updateBlog(blog._id, updatedData, blog.author._id);

            if (res.success) {
                router.push(`/blogs/${res.slug}`);
                router.refresh();
            } else {
                throw new Error(res.error);
            }

        } catch (err) {
            console.error('Update failed', err);
            setError(err.message || "Failed to update blog.");
        } finally {
            setLoading(false);
            setUploadStatus('');
        }
    };

    return (
        <div style={styles.container}>
            <form onSubmit={handleSubmit} style={styles.formCard}>
                <div style={styles.header}>
                    <h2 style={styles.title}>
                        <FaFeatherAlt /> Edit Blog Post
                    </h2>
                    <p style={{color: 'rgba(255,255,255,0.6)', marginTop: '0.5rem'}}>
                        Refine your thoughts and update your community.
                    </p>
                </div>

                {error && <div style={styles.errorMsg}>{error}</div>}
                
                {/* --- Image Upload Section --- */}
                <div style={styles.formGroup}>
                    <label style={styles.label}>
                        <FaImage style={{color: '#ffaa00'}} /> Cover Image
                    </label>
                    <div style={styles.fileInputWrapper}>
                        <label htmlFor="coverImage" style={styles.fileLabel}
                            onMouseEnter={(e) => e.currentTarget.style.borderColor = '#00d4ff'}
                            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
                        >
                            {coverImage ? coverImage.name : "Click to Change Cover Image"}
                        </label>
                        <input 
                            id="coverImage" 
                            type="file" 
                            accept="image/*"
                            onChange={handleImageChange}
                            style={{display: 'none'}} 
                        />
                    </div>
                    {previewImage && (
                        <img 
                            src={previewImage} 
                            alt="Cover Preview" 
                            style={styles.imagePreview} 
                            referrerPolicy="no-referrer" // ✅ R2 compatibility
                        />
                    )}
                </div>

                <div style={styles.formGroup}>
                    <label htmlFor="title" style={styles.label}>
                        <FaQuoteRight style={{color: '#00d4ff'}} /> Title <span style={styles.requiredStar}>*</span>
                    </label>
                    <input 
                        id="title" 
                        name="title" 
                        type="text" 
                        value={formData.title} 
                        onChange={handleChange} 
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        required 
                        style={styles.input}
                    />
                </div>
                
                <div style={styles.formGroup}>
                    <label htmlFor="summary" style={styles.label}>
                        <FaAlignLeft style={{color: '#bc13fe'}} /> Summary (Teaser) <span style={styles.requiredStar}>*</span>
                    </label>
                    <textarea 
                        id="summary" 
                        name="summary" 
                        value={formData.summary} 
                        onChange={handleChange} 
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        rows="2" 
                        required 
                        style={styles.textarea}
                    />
                </div>

                <div style={styles.formGroup}>
                    {/* 🚀 ADDED: Max 5 Indicator text */}
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                        <label htmlFor="tags" style={{ ...styles.label, marginBottom: 0 }}>
                            <FaLink style={{color: '#ff00cc'}} /> Tags
                        </label>
                        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>Max 5</span>
                    </div>
                    <input 
                        id="tags" 
                        name="tags" 
                        type="text" 
                        value={formData.tags} 
                        onChange={handleChange} 
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        placeholder="React, JavaScript, WebDev (Comma separated)" 
                        style={styles.input}
                    />
                </div>
                
                <div style={styles.formGroup}>
                    <label htmlFor="slug" style={styles.label}>
                        <FaLink style={{color: '#00ffaa'}} /> URL Slug <span style={styles.requiredStar}>*</span>
                    </label>
                    <input 
                        id="slug" 
                        name="slug" 
                        type="text" 
                        value={formData.slug} 
                        onChange={handleChange} 
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        required 
                        style={{...styles.input, fontFamily: 'monospace', color: '#00d4ff'}}
                    />
                    <p style={styles.helperText}>Changing the slug will change the URL of this post.</p>
                </div>

                <div style={styles.formGroup}>
                    <label htmlFor="content" style={styles.label}>
                        <FaFeatherAlt style={{color: '#ff00cc'}} /> Content (Markdown Supported) <span style={styles.requiredStar}>*</span>
                    </label>
                    <textarea 
                        id="content" 
                        name="content" 
                        value={formData.content} 
                        onChange={handleChange} 
                        onFocus={handleFocus}
                        onBlur={handleBlur}
                        rows="15" 
                        required 
                        style={{...styles.textarea, fontFamily: 'monospace'}}
                    />
                </div>
                
                <div style={styles.formGroup}>
                    <h3 style={{color: 'rgba(255,255,255,0.8)', fontSize: '1.1rem', marginBottom: '0.5rem'}}>
                        Live Preview
                    </h3>
                    <div style={styles.previewBox} className="markdown-content prose prose-invert max-w-none">
                         <ReactMarkdown>{formData.content || "*Your content preview will appear here...*"}</ReactMarkdown>
                    </div>
                </div>

                <div style={styles.actions}>
                    <button 
                        type="button" 
                        style={styles.cancelBtn} 
                        onClick={() => router.back()}
                        disabled={loading}
                        onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                        onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    >
                        <FaTimes /> Cancel
                    </button>

                    <button 
                        type="submit" 
                        disabled={loading} 
                        style={{...styles.submitBtn, opacity: loading ? 0.7 : 1, cursor: loading ? 'wait' : 'pointer'}}
                        onMouseEnter={(e) => !loading && (e.currentTarget.style.transform = 'translateY(-2px)')}
                        onMouseLeave={(e) => !loading && (e.currentTarget.style.transform = 'translateY(0)')}
                    >
                        <FaSave /> {loading ? (uploadStatus || 'Saving...') : 'Save Changes'}
                    </button>
                </div>
            </form>
        </div>
    );
};

export default EditBlogForm;