"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Edit, Loader2, Globe, Lock, School, Trophy, BookOpen, Lightbulb, Crown, AlertCircle } from "lucide-react"; 
import { useToast } from "@/hooks/use-toast";
import { updateCollection } from "@/actions/collection.actions";

// 🚀 DYNAMIC LABEL CONFIGURATION
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
  const [category, setCategory] = useState(collection.category || "University");
  const [university, setUniversity] = useState(collection.university || "");
  const [description, setDescription] = useState(collection.description || "");
  const [visibility, setVisibility] = useState(collection.visibility || "private");
  
  // 🚀 PREMIUM STATE
  const [isPremium, setIsPremium] = useState(collection.isPremium || false);
  const [price, setPrice] = useState(collection.price || "");

  const [loading, setLoading] = useState(false);

  // 🛡️ BUYER PROTECTION LOGIC
  const hasBuyers = collection.purchasedBy && collection.purchasedBy.length > 0;

  // Get current labels based on selected category
  const labels = CATEGORY_CONFIG[category];

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (isPremium && (!price || Number(price) <= 0)) {
        return toast({ title: "Price Required", description: "Premium bundles must have a valid price.", variant: "destructive" });
    }

    setLoading(true);
    const res = await updateCollection(
        collection._id, 
        { 
            name, 
            category, 
            university, 
            description, 
            visibility: isPremium ? 'public' : visibility, // Force public if premium
            isPremium,
            price: isPremium ? Number(price) : 0
        }, 
        session.user.id
    );
    
    if (res.success) {
      toast({ title: "Updated", description: "Archive settings saved successfully." });
      setOpen(false);
    } else {
      toast({ title: "Update Restricted", description: res.error, variant: "destructive" });
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
            
            {/* 🚀 PREMIUM TOGGLE SECTION */}
            <div className={`p-4 rounded-xl border space-y-3 ${isPremium ? 'border-yellow-500/30 bg-yellow-500/5' : 'border-white/5 bg-white/[0.02]'}`}>
                <div className="flex items-center justify-between">
                    <label className={`text-xs font-black uppercase tracking-widest flex items-center gap-2 cursor-pointer ${isPremium ? 'text-yellow-400' : 'text-gray-400'}`}>
                        <Crown size={14} /> Sell as Premium Bundle
                    </label>
                    <input 
                        type="checkbox" 
                        checked={isPremium} 
                        // 🛡️ LOCK IF HAS BUYERS
                        disabled={hasBuyers}
                        onChange={(e) => setIsPremium(e.target.checked)}
                        className="w-4 h-4 accent-yellow-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                </div>
                {hasBuyers && (
                  <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                    <AlertCircle size={12} className="text-amber-500" />
                    <p className="text-[9px] text-amber-500 font-bold uppercase leading-tight">Settings locked for buyer protection (Sales: {collection.purchasedBy.length})</p>
                  </div>
                )}
                {isPremium && (
                    <div className="animate-in slide-in-from-top-2">
                        <label className="text-[10px] text-gray-400 mb-1 block">Bundle Price (₹ INR)</label>
                        <Input 
                            type="number" 
                            min="1" 
                            placeholder="e.g. 499" 
                            value={price}
                            onChange={(e) => setPrice(e.target.value)}
                            className="bg-black/40 border-yellow-500/30 focus-visible:ring-yellow-500 text-yellow-400 font-bold"
                            required={isPremium}
                        />
                        <p className="text-[9px] text-yellow-500/70 mt-2">If you have other people&apos;s notes in this bundle, you will not be able to save it as Premium.</p>
                    </div>
                )}
            </div>

            {/* Category Toggles */}
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
                    placeholder="Describe what&apos;s inside this bundle to help others find it..."
                    className="bg-black/40 border-white/10 focus-visible:ring-cyan-500 resize-none min-h-[100px] text-sm"
                    maxLength={200}
                />
                <p className="text-[9px] text-right text-gray-500">{description.length}/200</p>
            </div>

            {/* Visibility Settings - Hidden if Premium */}
            {!isPremium && (
                <div className="space-y-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400">Visibility Status</label>
                    <div className="grid grid-cols-2 gap-2">
                        <Button 
                            type="button" 
                            disabled={hasBuyers}
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
            )}
            
            <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
                <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="text-gray-400 hover:text-white">Cancel</Button>
                <Button type="submit" disabled={loading || !name.trim()} className={`text-black font-bold transition-all active:scale-95 ${isPremium ? 'bg-yellow-500 hover:bg-yellow-400' : 'bg-cyan-500 hover:bg-cyan-400'}`}>
                    {loading ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                    Save Changes
                </Button>
            </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}