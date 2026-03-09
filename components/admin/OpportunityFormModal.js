"use client";

import { useState } from "react";
import { createOpportunity, updateOpportunity } from "@/actions/admin.actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea"; 
import { Loader2, X, Plus, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// 🚀 FIXED: defaultState now matches your Mongoose Schema exactly (Arrays instead of Objects)
const defaultState = {
  title: "", 
  category: "Latest Jobs", 
  organization: "", 
  advtNo: "", 
  shortDescription: "", 
  feeMode: "",
  importantDates: [], // Matches [{ event: String, date: String }]
  applicationFee: [], // Matches [{ category: String, amount: String }]
  vacancyDetails: [],
  howToApply: [], 
  selectionProcess: [], 
  importantLinks: [], 
  faqs: [],
  ageLimit: { minimumAge: "", maximumAge: "", asOnDate: "", extraDetails: "" }
};

const CATEGORIES = ['Latest Jobs', 'Admit Card', 'Result', 'Admission', 'Syllabus', 'Answer Key'];

export default function OpportunityFormModal({ initialData, onClose, onSuccess }) {
  const [formData, setFormData] = useState(initialData || defaultState);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    let res;
    if (initialData?._id) {
      res = await updateOpportunity(initialData._id, formData);
    } else {
      res = await createOpportunity(formData);
    }

    if (res.success) {
      toast({ title: "Success!", description: "Post saved successfully." });
      onSuccess(res.opportunity, !!initialData?._id);
    } else {
      toast({ title: "Error", description: res.error, variant: "destructive" });
    }
    setLoading(false);
  };

  // Helper function for Arrays of Objects
  const handleArrayAdd = (field, emptyObject) => setFormData({ ...formData, [field]: [...formData[field], emptyObject] });
  const handleArrayUpdate = (field, index, key, value) => {
    const newArr = [...formData[field]];
    newArr[index][key] = value;
    setFormData({ ...formData, [field]: newArr });
  };
  const handleArrayRemove = (field, index) => setFormData({ ...formData, [field]: formData[field].filter((_, i) => i !== index) });

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-[32px] p-6 sm:p-8 shadow-2xl relative scrollbar-thin scrollbar-thumb-white/10">
        
        <button onClick={onClose} className="absolute top-6 right-6 text-gray-500 hover:text-white bg-white/5 p-2 rounded-full">
          <X className="w-5 h-5" />
        </button>

        <h2 className="text-2xl font-black text-white mb-6 uppercase tracking-widest">{initialData ? "Edit Sarkari Post" : "New Sarkari Post"}</h2>

        <form onSubmit={handleSave} className="space-y-8">
          
          {/* Basic Info */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Title</label>
              <Input required value={formData.title} onChange={e => setFormData({...formData, title: e.target.value})} className="bg-white/5 border-white/10" placeholder="e.g. UPSC IAS Pre Online Form 2024" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Organization</label>
              <Input required value={formData.organization} onChange={e => setFormData({...formData, organization: e.target.value})} className="bg-white/5 border-white/10" placeholder="e.g. UPSC" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Category</label>
              <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} className="w-full h-10 rounded-md bg-white/5 border border-white/10 text-sm px-3 text-white outline-none focus:ring-2 focus:ring-cyan-500">
                {CATEGORIES.map(c => <option key={c} value={c} className="bg-black text-white">{c}</option>)}
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Advt No.</label>
              <Input value={formData.advtNo} onChange={e => setFormData({...formData, advtNo: e.target.value})} className="bg-white/5 border-white/10" placeholder="e.g. CEN 04/2025" />
            </div>
            <div className="md:col-span-2 space-y-1">
              <label className="text-xs font-bold text-gray-400 uppercase tracking-widest">Short Description</label>
              <Textarea value={formData.shortDescription} onChange={e => setFormData({...formData, shortDescription: e.target.value})} className="bg-white/5 border-white/10 min-h-[80px]" placeholder="Briefly describe the notification..." />
            </div>
          </div>

          {/* Age Limits */}
          <div className="border-t border-white/10 pt-6">
             <h3 className="text-sm font-black text-cyan-400 uppercase tracking-widest mb-4">Age Limit Specifications</h3>
             <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div><label className="text-xs text-gray-400">Min Age</label><Input value={formData.ageLimit?.minimumAge || ""} onChange={e => setFormData({...formData, ageLimit: {...formData.ageLimit, minimumAge: e.target.value}})} className="bg-white/5 border-white/10" placeholder="e.g. 18 Years" /></div>
                <div><label className="text-xs text-gray-400">Max Age</label><Input value={formData.ageLimit?.maximumAge || ""} onChange={e => setFormData({...formData, ageLimit: {...formData.ageLimit, maximumAge: e.target.value}})} className="bg-white/5 border-white/10" placeholder="e.g. 27 Years" /></div>
                <div><label className="text-xs text-gray-400">As On Date</label><Input value={formData.ageLimit?.asOnDate || ""} onChange={e => setFormData({...formData, ageLimit: {...formData.ageLimit, asOnDate: e.target.value}})} className="bg-white/5 border-white/10" placeholder="e.g. 01/01/2026" /></div>
                <div><label className="text-xs text-gray-400">Extra Details</label><Input value={formData.ageLimit?.extraDetails || ""} onChange={e => setFormData({...formData, ageLimit: {...formData.ageLimit, extraDetails: e.target.value}})} className="bg-white/5 border-white/10" placeholder="Age relaxation as per rules..." /></div>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-white/10 pt-6">
            {/* Dates Array */}
            <div className="space-y-3">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-black text-emerald-400 uppercase tracking-widest">Important Dates</h3>
                <Button type="button" onClick={() => handleArrayAdd('importantDates', {event:'', date:''})} variant="outline" size="sm" className="h-7 text-xs border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/10">
                  <Plus className="w-3 h-3 mr-1"/> Add Date
                </Button>
              </div>
              {formData.importantDates.map((item, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <Input placeholder="Event (e.g. Apply Last Date)" value={item.event} onChange={e => handleArrayUpdate('importantDates', i, 'event', e.target.value)} className="bg-white/5 border-white/10 h-9" />
                  <Input placeholder="Date" value={item.date} onChange={e => handleArrayUpdate('importantDates', i, 'date', e.target.value)} className="bg-white/5 border-white/10 h-9" />
                  <Button type="button" variant="ghost" onClick={() => handleArrayRemove('importantDates', i)} className="text-red-400 px-2 h-9"><Trash2 className="w-4 h-4"/></Button>
                </div>
              ))}
            </div>

            {/* Fees Array */}
            <div className="space-y-3">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-sm font-black text-pink-400 uppercase tracking-widest">Application Fees</h3>
                <Button type="button" onClick={() => handleArrayAdd('applicationFee', {category:'', amount:''})} variant="outline" size="sm" className="h-7 text-xs border-pink-500/20 text-pink-400 hover:bg-pink-500/10">
                  <Plus className="w-3 h-3 mr-1"/> Add Fee
                </Button>
              </div>
              {formData.applicationFee.map((item, i) => (
                <div key={i} className="flex gap-2 mb-2">
                  <Input placeholder="Category (e.g. Gen/OBC)" value={item.category} onChange={e => handleArrayUpdate('applicationFee', i, 'category', e.target.value)} className="bg-white/5 border-white/10 h-9" />
                  <Input placeholder="Amount" value={item.amount} onChange={e => handleArrayUpdate('applicationFee', i, 'amount', e.target.value)} className="bg-white/5 border-white/10 h-9" />
                  <Button type="button" variant="ghost" onClick={() => handleArrayRemove('applicationFee', i)} className="text-red-400 px-2 h-9"><Trash2 className="w-4 h-4"/></Button>
                </div>
              ))}
              <Input placeholder="Fee Payment Mode Info" value={formData.feeMode || ""} onChange={e => setFormData({...formData, feeMode: e.target.value})} className="bg-white/5 border-white/10 mt-2 text-xs h-9" />
            </div>
          </div>

          {/* Vacancies Array */}
          <div className="border-t border-white/10 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-black text-blue-400 uppercase tracking-widest">Vacancy Details</h3>
              <Button type="button" onClick={() => handleArrayAdd('vacancyDetails', {postName:'', ur:'', ews:'', obc:'', sc:'', st:'', totalPost:'', eligibility:''})} variant="outline" size="sm" className="h-7 text-xs border-blue-500/20 text-blue-400">
                <Plus className="w-3 h-3 mr-1"/> Add Row
              </Button>
            </div>
            {formData.vacancyDetails.map((vac, i) => (
              <div key={i} className="flex flex-col gap-2 mb-4 p-4 bg-white/5 rounded-xl border border-white/10">
                <div className="flex justify-between text-xs font-bold text-gray-500 uppercase">
                  <span>Post {i+1}</span>
                  <Button type="button" variant="ghost" onClick={() => handleArrayRemove('vacancyDetails', i)} className="text-red-400 h-6 px-2"><Trash2 className="w-4 h-4"/></Button>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <Input placeholder="Post Name" value={vac.postName} onChange={e => handleArrayUpdate('vacancyDetails', i, 'postName', e.target.value)} className="bg-black/40 border-white/10 col-span-2 md:col-span-3 h-9" />
                  <Input placeholder="Total" value={vac.totalPost} onChange={e => handleArrayUpdate('vacancyDetails', i, 'totalPost', e.target.value)} className="bg-black/40 border-white/10 font-bold text-cyan-400 h-9" />
                </div>
                <div className="grid grid-cols-5 gap-2">
                  <Input placeholder="UR" value={vac.ur} onChange={e => handleArrayUpdate('vacancyDetails', i, 'ur', e.target.value)} className="bg-black/40 border-white/10 text-xs text-center h-8" />
                  <Input placeholder="EWS" value={vac.ews} onChange={e => handleArrayUpdate('vacancyDetails', i, 'ews', e.target.value)} className="bg-black/40 border-white/10 text-xs text-center h-8" />
                  <Input placeholder="OBC" value={vac.obc} onChange={e => handleArrayUpdate('vacancyDetails', i, 'obc', e.target.value)} className="bg-black/40 border-white/10 text-xs text-center h-8" />
                  <Input placeholder="SC" value={vac.sc} onChange={e => handleArrayUpdate('vacancyDetails', i, 'sc', e.target.value)} className="bg-black/40 border-white/10 text-xs text-center h-8" />
                  <Input placeholder="ST" value={vac.st} onChange={e => handleArrayUpdate('vacancyDetails', i, 'st', e.target.value)} className="bg-black/40 border-white/10 text-xs text-center h-8" />
                </div>
                <Textarea placeholder="Eligibility Criteria..." value={vac.eligibility} onChange={e => handleArrayUpdate('vacancyDetails', i, 'eligibility', e.target.value)} className="bg-black/40 border-white/10 min-h-[60px]" />
              </div>
            ))}
          </div>

          {/* Links, How to Apply, Selection Process */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 border-t border-white/10 pt-6">
             <div>
                <div className="flex justify-between items-center mb-3"><h3 className="text-sm font-black text-purple-400 uppercase">How To Apply</h3><Button type="button" onClick={() => handleArrayAdd('howToApply', {step:''})} variant="outline" size="sm" className="h-7 text-xs"><Plus className="w-3 h-3 mr-1"/> Add</Button></div>
                {formData.howToApply.map((item, i) => (
                  <div key={i} className="flex gap-2 mb-2"><Textarea value={item.step} onChange={e => handleArrayUpdate('howToApply', i, 'step', e.target.value)} className="bg-white/5 border-white/10 min-h-[40px] text-xs" /><Button type="button" variant="ghost" onClick={() => handleArrayRemove('howToApply', i)} className="text-red-400 px-2"><Trash2 className="w-4 h-4"/></Button></div>
                ))}
             </div>
             <div>
                <div className="flex justify-between items-center mb-3"><h3 className="text-sm font-black text-orange-400 uppercase">Selection Process</h3><Button type="button" onClick={() => handleArrayAdd('selectionProcess', {step:''})} variant="outline" size="sm" className="h-7 text-xs"><Plus className="w-3 h-3 mr-1"/> Add</Button></div>
                {formData.selectionProcess.map((item, i) => (
                  <div key={i} className="flex gap-2 mb-2"><Input value={item.step} onChange={e => handleArrayUpdate('selectionProcess', i, 'step', e.target.value)} className="bg-white/5 border-white/10 h-9 text-xs" /><Button type="button" variant="ghost" onClick={() => handleArrayRemove('selectionProcess', i)} className="text-red-400 px-2"><Trash2 className="w-4 h-4"/></Button></div>
                ))}
             </div>
          </div>

          {/* Important Links Array */}
          <div className="border-t border-white/10 pt-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-black text-cyan-400 uppercase tracking-widest">Important Links</h3>
              {/* 🚀 FIXED: Pointed to handleArrayAdd */}
              <Button type="button" onClick={() => handleArrayAdd('importantLinks', {label:'', url:''})} variant="outline" size="sm" className="h-7 text-xs border-white/10">
                <Plus className="w-3 h-3 mr-1"/> Add Link
              </Button>
            </div>
            {formData.importantLinks.map((link, i) => (
              <div key={i} className="flex gap-2 mb-2 items-center">
                {/* 🚀 FIXED: Pointed to handleArrayUpdate */}
                <Input placeholder="Label (e.g. Apply Online)" value={link.label} onChange={e => handleArrayUpdate('importantLinks', i, 'label', e.target.value)} className="bg-white/5 border-white/10 h-9 w-1/3" />
                <Input placeholder="URL (https://...)" value={link.url} onChange={e => handleArrayUpdate('importantLinks', i, 'url', e.target.value)} className="bg-white/5 border-white/10 h-9" />
                {/* 🚀 FIXED: Pointed to handleArrayRemove */}
                <Button type="button" variant="ghost" onClick={() => handleArrayRemove('importantLinks', i)} className="text-red-400 hover:bg-red-500/20 px-2 h-9">
                  <Trash2 className="w-4 h-4"/>
                </Button>
              </div>
            ))}
          </div>

          <div className="flex justify-end gap-3 pt-6 border-t border-white/10">
            <Button type="button" variant="ghost" onClick={onClose} className="rounded-full px-6 text-sm font-bold">Cancel</Button>
            <Button type="submit" disabled={loading} className="rounded-full px-8 bg-cyan-500 text-black hover:bg-cyan-400 font-black uppercase tracking-widest text-xs">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2"/> : null} Save Post
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}