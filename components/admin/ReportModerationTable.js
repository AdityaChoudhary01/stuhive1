"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { updateReportStatus, getAllReports } from "@/actions/admin.actions"; // 🚀 Added getAllReports
import { useToast } from "@/hooks/use-toast";
import { 
  Eye, CheckCircle2, XCircle, Search, 
  ExternalLink, AlertCircle, MessageSquare, Loader2, ChevronDown // 🚀 Added Loader2 and ChevronDown
} from "lucide-react";
import Link from "next/link";

export default function ReportModerationTable({ reports }) {
  const { toast } = useToast();
  
  // 🚀 PAGINATION & DATA STATE
  const [reportList, setReportList] = useState(reports || []);
  const [loading, setLoading] = useState(null);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState((reports || []).length === 50); 

  const handleStatusUpdate = async (reportId, newStatus) => {
    setLoading(reportId);
    const res = await updateReportStatus(reportId, newStatus);
    if (res.success) {
      setReportList(reportList.map(r => r._id === reportId ? { ...r, status: newStatus } : r));
      toast({ title: "Updated", description: `Report marked as ${newStatus}` });
    } else {
      toast({ title: "Error", description: res.error, variant: "destructive" });
    }
    setLoading(null);
  };

  // 🚀 REAL DB FETCH FOR LOAD MORE
  const handleLoadMore = async () => {
    setLoadingMore(true);
    const nextPage = page + 1;
    const res = await getAllReports(nextPage, 50);
    
    if (res?.length > 0) {
      setReportList((prev) => [...prev, ...res]);
      setPage(nextPage);
      if (res.length < 50) setHasMore(false); 
    } else {
      setHasMore(false);
    }
    setLoadingMore(false);
  };

  return (
    <div className="bg-[#0c0c10] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse min-w-[800px]">
          <thead>
            <tr className="bg-white/5 border-b border-white/10">
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Reporter</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Target</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Reason</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400">Status</th>
              <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-gray-400 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5">
            {reportList.map((report) => (
              <tr key={report._id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white">{report.reporter?.name || "Unknown"}</span>
                    <span className="text-[10px] text-gray-500 uppercase">{report.reporter?.email || "Deleted User"}</span>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Link 
                    href={report.targetNote ? `/notes/${report.targetNote.slug}` : `/shared-collections/${report.targetBundle?.slug}`}
                    className="text-cyan-400 hover:underline flex items-center gap-1.5 text-sm font-medium"
                    target="_blank"
                  >
                    {report.targetNote ? 'Note' : 'Bundle'} <ExternalLink size={12} />
                  </Link>
                  <p className="text-[10px] text-gray-500 mt-1 max-w-[200px] truncate">
                    {report.targetNote?.title || report.targetBundle?.name || "Deleted Item"}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <div className="flex flex-col gap-1">
                    <Badge variant="outline" className="w-fit text-[9px] border-red-500/30 text-red-400 font-bold uppercase">
                      {report.reason}
                    </Badge>
                    <p className="text-[11px] text-gray-400 line-clamp-1 italic max-w-[200px]">
                      &quot;{report.details}&quot;
                    </p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <Badge className={`uppercase text-[9px] font-black ${
                    report.status === 'pending' ? 'bg-amber-500 text-black' : 
                    report.status === 'investigating' ? 'bg-blue-500 text-white' : 
                    'bg-emerald-500 text-black'
                  }`}>
                    {report.status}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button 
                      size="sm" variant="ghost" 
                      onClick={() => handleStatusUpdate(report._id, 'investigating')}
                      disabled={loading === report._id || report.status === 'investigating'}
                      className="h-8 w-8 p-0 hover:bg-blue-500/20 text-blue-400"
                      title="Investigate"
                    >
                      {loading === report._id && report.status !== 'investigating' ? <Loader2 size={14} className="animate-spin" /> : <Search size={14} />}
                    </Button>
                    <Button 
                      size="sm" variant="ghost"
                      onClick={() => handleStatusUpdate(report._id, 'resolved')}
                      disabled={loading === report._id || report.status === 'resolved'}
                      className="h-8 w-8 p-0 hover:bg-emerald-500/20 text-emerald-400"
                      title="Resolve"
                    >
                      {loading === report._id && report.status !== 'resolved' ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                    </Button>
                    <Button 
                      size="sm" variant="ghost"
                      onClick={() => handleStatusUpdate(report._id, 'dismissed')}
                      disabled={loading === report._id || report.status === 'dismissed'}
                      className="h-8 w-8 p-0 hover:bg-gray-500/20 text-gray-400"
                      title="Dismiss"
                    >
                      {loading === report._id && report.status !== 'dismissed' ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 🚀 TRUE BACKEND LOAD MORE BUTTON */}
      {hasMore && (
        <div className="p-4 flex justify-center border-t border-white/5 bg-white/[0.01]">
          <Button 
            variant="outline" 
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="rounded-full border-white/10 text-gray-300 hover:text-white hover:bg-white/5 font-bold uppercase tracking-widest text-[10px] h-10 px-6 transition-all"
          >
             {loadingMore ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin"/> Loading...</>
            ) : (
                <>Load More Reports <ChevronDown className="w-4 h-4 ml-2" /></>
            )}
          </Button>
        </div>
      )}
    </div>
  );
}