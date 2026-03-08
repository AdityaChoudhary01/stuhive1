"use client";

import { useState, useEffect } from "react";
import { getAllUniversities, upsertUniversity, deleteUniversityEntry } from "@/actions/admin.actions";
import { getUniversityLogoUploadUrlAction, getUniversityCoverUploadUrlAction } from "@/actions/upload.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { School, Trash2, Edit3, Loader2, Upload, Image as ImageIcon, Plus, X } from "lucide-react";
import Image from "next/image";

export default function UniversityManager() {
  const [univs, setUnivs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [uploading, setUploading] = useState({ logo: false, cover: false });
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: "", description: "", logo: "", coverImage: "", 
    location: "", website: "", metaTitle: "", metaDescription: ""
  });

  const fetchUnivs = async () => {
    setLoading(true);
    try {
      const data = await getAllUniversities();
      setUnivs(data);
    } catch (error) {
      console.error("Failed to fetch universities:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnivs();
  }, []);

  const optimizeImage = (file, maxWidth, maxHeight) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new window.Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement("canvas");
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height;
              height = maxHeight;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0, width, height);
          canvas.toBlob((blob) => resolve(blob), "image/webp", 0.8);
        };
      };
    });
  };

  const handleImageUpload = async (e, type) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      return toast({ title: "Invalid file", description: "Please upload an image.", variant: "destructive" });
    }

    setUploading((prev) => ({ ...prev, [type]: true }));

    try {
      // 1. Optimize locally
      const maxWidth = type === "logo" ? 400 : 1200;
      const maxHeight = type === "logo" ? 400 : 600;
      const optimizedBlob = await optimizeImage(file, maxWidth, maxHeight);
      
      // 2. 🚀 PREVIEW FIX: Create a temporary local URL for instant preview
      const localPreviewUrl = URL.createObjectURL(optimizedBlob);

      // 3. Get Presigned URL
      const action = type === "logo" ? getUniversityLogoUploadUrlAction : getUniversityCoverUploadUrlAction;
      const { success, uploadUrl, fileKey, error } = await action("image/webp");
      if (!success) throw new Error(error);

      // 4. Upload directly to R2
      const uploadRes = await fetch(uploadUrl, {
        method: "PUT",
        body: optimizedBlob,
        headers: { "Content-Type": "image/webp" },
      });

      if (!uploadRes.ok) throw new Error("Cloudflare R2 upload failed");

      const publicUrl = `https://cdn.stuhive.in/${fileKey}`;

      setFormData((prev) => ({
        ...prev,
        [type === "logo" ? "logo" : "coverImage"]: publicUrl,
      }));

      toast({ title: "Upload Success", description: `${type} ready.` });
    } catch (error) {
      toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
    } finally {
      setUploading((prev) => ({ ...prev, [type]: false }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const res = await upsertUniversity(formData);
    if (res.success) {
      toast({ title: "Success", description: "University hub professionalized!" });
      setIsEditing(false);
      setFormData({ name: "", description: "", logo: "", coverImage: "", location: "", website: "", metaTitle: "", metaDescription: "" });
      fetchUnivs();
    } else {
      toast({ title: "Error", description: res.error, variant: "destructive" });
    }
  };

  const handleEdit = (u) => {
    setFormData({
      _id: u.isVirtual ? undefined : u._id,
      name: u.name || "",
      description: u.description || "",
      logo: u.logo || "",
      coverImage: u.coverImage || "",
      location: u.location || "",
      website: u.website || "",
      metaTitle: u.metaTitle || "",
      metaDescription: u.metaDescription || "",
    });
    setIsEditing(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="space-y-8">
      <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md">
        <h3 className="text-xl font-black text-white mb-6 flex items-center gap-2">
          <School className="text-cyan-400" /> {isEditing ? "Edit University Details" : "Create Professional Hub"}
        </h3>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-gray-400">University Name</Label>
                <Input placeholder="e.g. Mumbai University" value={formData.name} onChange={(e)=>setFormData({...formData, name: e.target.value})} required className="bg-black/20 border-white/10" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-gray-400">Location</Label>
                <Input placeholder="e.g. Mumbai, Maharashtra" value={formData.location} onChange={(e)=>setFormData({...formData, location: e.target.value})} className="bg-black/20 border-white/10" />
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-gray-400">Official Website</Label>
                <Input placeholder="https://..." value={formData.website} onChange={(e)=>setFormData({...formData, website: e.target.value})} className="bg-black/20 border-white/10" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-gray-400">Logo</Label>
                <div className="relative aspect-square rounded-2xl bg-black/40 border border-dashed border-white/10 overflow-hidden flex items-center justify-center group">
                  {formData.logo ? (
                    <img 
                      src={formData.logo} 
                      key={formData.logo} 
                      alt="Logo Preview" 
                      className="w-full h-full object-contain p-4 transition-opacity duration-300" 
                    />
                  ) : <ImageIcon className="text-gray-600" />}
                  
                  <label className="absolute inset-0 cursor-pointer bg-cyan-500/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-black font-bold text-xs text-center px-2">
                    {uploading.logo ? <Loader2 className="animate-spin" /> : <><Upload size={14} /> Change Logo</>}
                    <input type="file" className="hidden" accept="image/*" disabled={uploading.logo} onChange={(e) => handleImageUpload(e, "logo")} />
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] uppercase font-bold text-gray-400">Cover</Label>
                <div className="relative aspect-square rounded-2xl bg-black/40 border border-dashed border-white/10 overflow-hidden flex items-center justify-center group">
                  {formData.coverImage ? (
                    <img 
                      src={formData.coverImage} 
                      key={formData.coverImage}
                      alt="Cover Preview" 
                      className="w-full h-full object-cover transition-opacity duration-300" 
                    />
                  ) : <ImageIcon className="text-gray-600" />}
                  
                  <label className="absolute inset-0 cursor-pointer bg-cyan-500/80 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 text-black font-bold text-xs text-center px-2">
                    {uploading.cover ? <Loader2 className="animate-spin" /> : <><Upload size={14} /> Change Cover</>}
                    <input type="file" className="hidden" accept="image/*" disabled={uploading.cover} onChange={(e) => handleImageUpload(e, "cover")} />
                  </label>
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input placeholder="SEO Meta Title" value={formData.metaTitle} onChange={(e)=>setFormData({...formData, metaTitle: e.target.value})} className="bg-black/20 border-white/10" />
            <Input placeholder="SEO Meta Description" value={formData.metaDescription} onChange={(e)=>setFormData({...formData, metaDescription: e.target.value})} className="bg-black/20 border-white/10" />
          </div>

          <Textarea placeholder="Rich description for the Hub page..." value={formData.description} onChange={(e)=>setFormData({...formData, description: e.target.value})} className="bg-black/20 border-white/10 min-h-[120px]" />

          <div className="flex gap-3">
             {isEditing && (
                <Button type="button" variant="outline" onClick={() => {setIsEditing(false); setFormData({name: "", description: "", logo: "", coverImage: "", location: "", website: "", metaTitle: "", metaDescription: ""})}} className="flex-1 border-white/10 text-white">Cancel</Button>
             )}
             <Button type="submit" disabled={uploading.logo || uploading.cover} className="flex-[2] bg-cyan-500 text-black font-black uppercase tracking-widest hover:bg-cyan-400 h-12">
                {isEditing ? "Update Hub" : "Save Professional Details"}
             </Button>
          </div>
        </form>
      </div>

      <div className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-white/5 text-[10px] uppercase font-black tracking-widest text-gray-400">
            <tr>
              <th className="px-6 py-4">University Hub</th>
              <th className="px-6 py-4">Location</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {loading ? (
              <tr><td colSpan="3" className="text-center py-10"><Loader2 className="animate-spin mx-auto text-cyan-400" /></td></tr>
            ) : univs.map((u) => (
              <tr key={u.slug} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-6 py-4 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center overflow-hidden border border-white/10 shrink-0 relative">
                    {u.logo ? <img src={u.logo} alt={u.name} className="w-full h-full object-contain p-1" /> : <School size={16} className={u.isVirtual ? "text-gray-700" : "text-cyan-400"} />}
                  </div>
                  <div className="flex flex-col min-w-0">
                    <span className="text-sm font-bold text-white truncate">{u.name}</span>
                    {u.isVirtual && (
                      <span className="text-[8px] font-black uppercase text-amber-500/80 tracking-widest">Auto-Generated (Needs Setup)</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm text-gray-400">{u.location || "—"}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={()=>handleEdit(u)} className={`h-8 px-3 gap-2 border ${u.isVirtual ? 'border-amber-500/20 text-amber-500 hover:bg-amber-500/10' : 'border-cyan-500/20 text-cyan-400 hover:bg-cyan-500/10'}`}>
                      {u.isVirtual ? <Plus size={14} /> : <Edit3 size={14} />}
                      {u.isVirtual ? "Setup" : "Edit"}
                    </Button>
                    {!u.isVirtual && (
                      <Button variant="ghost" size="sm" onClick={async ()=>{ if(confirm("Reset hub? images will be deleted from R2 storage.")){ await deleteUniversityEntry(u._id); fetchUnivs(); }}} className="h-8 w-8 p-0 hover:bg-red-500/20 text-red-400"><Trash2 size={14} /></Button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}