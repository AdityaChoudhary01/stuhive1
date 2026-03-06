"use client";

import { useState } from "react";
import { deleteOpportunity, toggleOpportunityPublish } from "@/actions/admin.actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { Trash2, Edit, Loader2, Globe, Lock, Search, Plus, ExternalLink } from "lucide-react";
import Link from "next/link";
import OpportunityFormModal from "./OpportunityFormModal";

export default function OpportunityManagementTable({ initialData }) {
  const [opportunities, setOpportunities] = useState(initialData);
  const [searchTerm, setSearchTerm] = useState("");
  const [loadingId, setLoadingId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOpp, setEditingOpp] = useState(null);
  const { toast } = useToast();

  const filtered = opportunities.filter(opp => 
    opp.title?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    opp.organization?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleTogglePublish = async (id, currentState) => {
    setLoadingId(id);
    const res = await toggleOpportunityPublish(id, currentState);
    if (res.success) {
      setOpportunities(opportunities.map(o => o._id === id ? { ...o, isPublished: !currentState } : o));
      toast({ title: !currentState ? "Published Live!" : "Moved to Drafts" });
    } else {
      toast({ title: "Error", description: res.error, variant: "destructive" });
    }
    setLoadingId(null);
  };

  const handleDelete = async (id) => {
    if (!confirm("Are you sure you want to permanently delete this post?")) return;
    setLoadingId(id);
    const res = await deleteOpportunity(id);
    if (res.success) {
      setOpportunities(opportunities.filter(o => o._id !== id));
      toast({ title: "Deleted successfully", variant: "destructive" });
    } else {
      toast({ title: "Error", description: res.error, variant: "destructive" });
    }
    setLoadingId(null);
  };

  return (
    // 🚀 FIX: Added a React Fragment `<>` wrapper
    <> 
      <div className="border border-white/10 rounded-3xl overflow-hidden bg-card/50 backdrop-blur-sm shadow-xl">
        
        {/* Utility Bar */}
        <div className="p-4 sm:p-5 border-b border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 bg-white/[0.01]">
          <div className="relative w-full sm:max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <Input 
              placeholder="Search by title or organization..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-10 bg-black/40 border-white/10 text-sm focus-visible:ring-cyan-500 text-white placeholder:text-gray-600 rounded-xl"
            />
          </div>
          <Button 
            onClick={() => { setEditingOpp(null); setIsModalOpen(true); }}
            className="bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-widest text-[10px] rounded-full h-10 px-6 shrink-0"
          >
            <Plus className="w-4 h-4 mr-2" /> Create Post
          </Button>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[900px]">
            <thead className="bg-white/[0.02] text-white/40 uppercase text-[10px] font-black tracking-[0.2em] border-b border-white/5">
              <tr>
                <th className="px-6 py-5">Post Details</th>
                <th className="px-6 py-5 text-center">Category</th>
                <th className="px-6 py-5 text-center">Status</th>
                <th className="px-6 py-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filtered.map((opp) => (
                <tr key={opp._id} className="hover:bg-white/[0.03] transition-all group">
                  
                  <td className="px-6 py-4">
                    <div className="flex flex-col min-w-0">
                      <span className="font-bold text-white text-base truncate max-w-[300px]">{opp.title}</span>
                      <span className="text-[10px] text-cyan-400 font-black uppercase tracking-widest">{opp.organization}</span>
                    </div>
                  </td>

                  <td className="px-6 py-4 text-center">
                    <Badge variant="outline" className="bg-white/5 border-white/10 text-gray-300 font-bold text-[10px]">{opp.category}</Badge>
                  </td>

                  <td className="px-6 py-4 text-center">
                    <Badge className={`font-black text-[9px] uppercase tracking-widest ${opp.isPublished ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-gray-500/10 text-gray-400 border-gray-500/20'}`}>
                      {opp.isPublished ? "Published" : "Draft"}
                    </Badge>
                  </td>

                  <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                    <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-400 hover:text-white" onClick={() => handleTogglePublish(opp._id, opp.isPublished)} disabled={loadingId === opp._id} title={opp.isPublished ? "Unpublish" : "Publish"}>
                      {opp.isPublished ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
                    </Button>

                    <Button variant="ghost" size="icon" className="h-9 w-9 text-blue-400 hover:bg-blue-500/10" onClick={() => { setEditingOpp(opp); setIsModalOpen(true); }} disabled={loadingId === opp._id} title="Edit">
                      <Edit className="w-4 h-4" />
                    </Button>

                    {opp.isPublished && (
                      <Link href={`/updates/${opp.slug}`} target="_blank">
                        <Button variant="ghost" size="icon" className="h-9 w-9 text-gray-400 hover:text-white">
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </Link>
                    )}

                    <Button variant="ghost" size="icon" className="h-9 w-9 text-red-500/40 hover:text-red-500 hover:bg-red-500/10" onClick={() => handleDelete(opp._id)} disabled={loadingId === opp._id} title="Delete">
                      {loadingId === opp._id ? <Loader2 className="w-4 h-4 animate-spin"/> : <Trash2 className="w-4 h-4" />}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 🚀 FIX: Moved Modal completely OUTSIDE the overflow-hidden container! */}
      {isModalOpen && (
        <OpportunityFormModal 
          initialData={editingOpp} 
          onClose={() => setIsModalOpen(false)} 
          onSuccess={(savedOpp, isEdit) => {
            if (isEdit) {
              setOpportunities(opportunities.map(o => o._id === savedOpp._id ? savedOpp : o));
            } else {
              setOpportunities([savedOpp, ...opportunities]);
            }
            setIsModalOpen(false);
          }} 
        />
      )}
    </>
  );
}