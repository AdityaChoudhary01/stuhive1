"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Edit, Loader2, Globe, Lock, School, Trophy, BookOpen, Lightbulb } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { updateCollection } from "@/actions/collection.actions";

// 🚀 DYNAMIC LABEL CONFIGURATION (Synced with AddToCollectionModal)
const CATEGORY_CONFIG = {
  "University": {
    instLabel: "University / College", instIcon: <School className="w-3.5 h-3.5 text-cyan-400" />, instPlace: "e.g. Mumbai University"
  },
  "School": {
    instLabel: "Board / School", instIcon: <BookOpen className="w-3.5 h-3.5 text-pink-400" />, instPlace: "e.g. CBSE / DPS"
  },
  "Competitive Exams": {
    instLabel: "Exam Body", instIcon: <Trophy className="w-3.5 h-3.5 text-amber-400" />, instPlace: "e.g. UPSC / JEE"
  },
  "Other": {
    instLabel: "Context", instIcon: <Lightbulb className="w-3.5 h-3.5 text-blue-400" />, instPlace: "e.g. General Knowledge"
  }
};

export default function EditCollectionModal({ collection }) {
  const { data: session } = useSession();
  const { toast } = useToast();
  
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(collection.name || "");
  const [category, setCategory] = useState(collection.category || "University"); // 🚀 ADDED: Category State
  const [university, setUniversity] = useState(collection.university || "");
  const [description, setDescription] = useState(collection.description || "");
  const [visibility, setVisibility] = useState(collection.visibility || "private");
  const [loading, setLoading] = useState(false);

  // Get current labels based on selected category
  const labels = CATEGORY_CONFIG[category];

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    const res = await updateCollection(
        collection._id, 
        { name, category, university, description, visibility }, // 🚀 ADDED: Pass Category to payload
        session.user.id
    );
    
    if (res.success) {
      toast({ title: "Updated", description: "Collection settings saved successfully." });
      setOpen(false);
    } else {
      toast({ title: "Error", description: res.error, variant: "destructive" });
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="bg-white/5 border-white/10 hover:bg-white/10 text-white">
          <Edit className="w-4 h-4 mr-2 text-cyan-400" /> Edit Settings
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md bg-[#0c0c10] border-white/10 text-white max-h-[90vh] overflow-y-auto custom-scrollbar">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">Edit Archive Settings</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleUpdate} className="space-y-5 py-2">
            {/* 🚀 NEW: Category Toggles */}
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Bundle Type</label>
              <div className="grid grid-cols-2 gap-2">
                {Object.keys(CATEGORY_CONFIG).map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setCategory(cat)}
                    className={`px-2 py-2 rounded-lg border text-[10px] font-bold transition-all flex items-center justify-center gap-2 ${
                      category === cat 
                      ? "bg-white/10 border-white/40 text-white" 
                      : "bg-black/20 border-white/5 text-gray-500 hover:text-gray-300"
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-cyan-400">Archive Name</label>
                <Input 
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Engineering Mathematics II"
                    className="bg-black/40 border-white/10 focus-visible:ring-cyan-500 font-medium"
                />
            </div>

            <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                  {labels.instIcon} {labels.instLabel}
                </label>
                <Input 
                    value={university}
                    onChange={(e) => setUniversity(e.target.value)}
                    placeholder={labels.instPlace}
                    className="bg-black/40 border-white/10 focus-visible:ring-cyan-500 font-medium"
                />
            </div>

            <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">SEO Description</label>
                <Textarea 
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe what's inside this bundle to help others find it..."
                    className="bg-black/40 border-white/10 focus-visible:ring-cyan-500 resize-none min-h-[100px] text-sm"
                    maxLength={200}
                />
                <p className="text-[9px] text-right text-gray-500">{description.length}/200</p>
            </div>

            <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Visibility Status</label>
                <div className="grid grid-cols-2 gap-2">
                    <Button 
                        type="button" 
                        variant={visibility === 'private' ? 'default' : 'outline'}
                        className={visibility === 'private' ? 'bg-white text-black font-bold' : 'border-white/10 text-gray-400 hover:text-white'}
                        onClick={() => setVisibility('private')}
                    >
                        <Lock className="w-4 h-4 mr-2" /> Private
                    </Button>
                    <Button 
                        type="button" 
                        variant={visibility === 'public' ? 'default' : 'outline'}
                        className={visibility === 'public' ? 'bg-cyan-500 text-black font-bold hover:bg-cyan-400' : 'border-white/10 text-gray-400 hover:text-white'}
                        onClick={() => setVisibility('public')}
                    >
                        <Globe className="w-4 h-4 mr-2" /> Public
                    </Button>
                </div>
            </div>
            
            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="text-gray-400 hover:text-white">Cancel</Button>
                <Button type="submit" disabled={loading || !name.trim()} className="bg-cyan-500 text-black font-bold hover:bg-cyan-400 transition-all active:scale-95">
                    {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                    Save Changes
                </Button>
            </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}