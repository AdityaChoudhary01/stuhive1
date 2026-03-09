"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { updateReportStatus } from "@/actions/admin.actions"; // We'll create this next
import { useToast } from "@/hooks/use-toast";
import { 
  Eye, CheckCircle2, XCircle, Search, 
  ExternalLink, AlertCircle, MessageSquare 
} from "lucide-react";
import Link from "next/link";

export default function ReportModerationTable({ reports }) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(null);

  const handleStatusUpdate = async (reportId, newStatus) => {
    setLoading(reportId);
    const res = await updateReportStatus(reportId, newStatus);
    if (res.success) {
      toast({ title: "Updated", description: `Report marked as ${newStatus}` });
    } else {
      toast({ title: "Error", description: res.error, variant: "destructive" });
    }
    setLoading(null);
  };

  return (
    <div className="bg-[#0c0c10] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
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
            {reports.map((report) => (
              <tr key={report._id} className="hover:bg-white/[0.02] transition-colors group">
                <td className="px-6 py-4">
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-white">{report.reporter?.name}</span>
                    <span className="text-[10px] text-gray-500 uppercase">{report.reporter?.email}</span>
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
                    {report.targetNote?.title || report.targetBundle?.name}
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
                    >
                      <Search size={14} />
                    </Button>
                    <Button 
                      size="sm" variant="ghost"
                      onClick={() => handleStatusUpdate(report._id, 'resolved')}
                      disabled={loading === report._id || report.status === 'resolved'}
                      className="h-8 w-8 p-0 hover:bg-emerald-500/20 text-emerald-400"
                    >
                      <CheckCircle2 size={14} />
                    </Button>
                    <Button 
                      size="sm" variant="ghost"
                      onClick={() => handleStatusUpdate(report._id, 'dismissed')}
                      disabled={loading === report._id || report.status === 'dismissed'}
                      className="h-8 w-8 p-0 hover:bg-gray-500/20 text-gray-400"
                    >
                      <XCircle size={14} />
                    </Button>
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