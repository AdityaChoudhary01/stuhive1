"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button"; // 🚀 Added Button
import { IndianRupee, Users, Crown, FileText, ShieldCheck, ExternalLink, Loader2, ChevronDown } from "lucide-react"; // 🚀 Added Loaders
import { formatDate } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import Link from "next/link"; 
import { getMoreTransactions } from "@/actions/analytics.actions"; // 🚀 Requires server action update below

export default function TransactionManagementTable({ financialData }) {
  // 🚀 PAGINATION STATE
  const [txList, setTxList] = useState(financialData?.transactions || []);
  const [page, setPage] = useState(1);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState((financialData?.transactions || []).length === 50); 

  if (!financialData || !financialData.success) {
    return <div className="p-10 text-red-500 text-center bg-red-500/10 rounded-2xl border border-red-500/20">Failed to load financial data.</div>;
  }

  const { stats } = financialData;

  // 🚀 REAL DB FETCH FOR LOAD MORE
  const handleLoadMore = async () => {
    setLoadingMore(true);
    const nextPage = page + 1;
    const res = await getMoreTransactions(nextPage, 50);
    
    if (res?.length > 0) {
      setTxList((prev) => [...prev, ...res]);
      setPage(nextPage);
      if (res.length < 50) setHasMore(false);
    } else {
      setHasMore(false);
    }
    setLoadingMore(false);
  };

  return (
    <div className="space-y-6">
      {/* --- METRIC CARDS --- */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <Card className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/30 p-6 rounded-3xl relative overflow-hidden">
          <p className="text-blue-400 font-bold uppercase tracking-widest text-xs mb-1">Gross Volume (100%)</p>
          <h2 className="text-3xl font-black text-white flex items-center">
            <IndianRupee className="w-5 h-5 mr-1 text-blue-500" /> {stats?.totalRevenue?.toFixed(2) || "0.00"}
          </h2>
        </Card>

        <Card className="bg-gradient-to-br from-amber-900/20 to-black border border-amber-500/30 p-6 rounded-3xl relative overflow-hidden">
          <div className="absolute top-4 right-4 p-2 bg-amber-500/20 rounded-full"><ShieldCheck className="text-amber-400 w-4 h-4"/></div>
          <p className="text-amber-500 font-bold uppercase tracking-widest text-xs mb-1">Admin Revenue (20%)</p>
          <h2 className="text-3xl font-black text-white flex items-center">
            <IndianRupee className="w-5 h-5 mr-1 text-amber-500" /> {stats?.totalAdminFee?.toFixed(2) || "0.00"}
          </h2>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-900/20 to-black border border-emerald-500/30 p-6 rounded-3xl relative overflow-hidden">
          <div className="absolute top-4 right-4 p-2 bg-emerald-500/20 rounded-full"><Users className="text-emerald-400 w-4 h-4"/></div>
          <p className="text-emerald-400 font-bold uppercase tracking-widest text-xs mb-1">Creator Payouts (80%)</p>
          <h2 className="text-3xl font-black text-white flex items-center">
            <IndianRupee className="w-5 h-5 mr-1 text-emerald-500" /> {stats?.totalCreatorEarnings?.toFixed(2) || "0.00"}
          </h2>
        </Card>
      </div>

      {/* --- TRANSACTIONS TABLE --- */}
      <Card className="bg-card/50 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-xl shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left min-w-[1000px]">
            <thead className="bg-white/[0.02] text-white/40 uppercase text-[10px] font-black tracking-[0.2em] border-b border-white/5">
              <tr>
                <th className="px-6 py-5">Date</th>
                <th className="px-6 py-5">Item Sold</th>
                <th className="px-6 py-5">Buyer</th>
                <th className="px-6 py-5">Seller (Creator)</th>
                <th className="px-6 py-5 text-right">Total</th>
                <th className="px-6 py-5 text-right">Admin (20%)</th>
                <th className="px-6 py-5 text-right">Creator (80%)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {txList?.map((tx) => {
                const isBundle = !!tx.bundle;
                const item = isBundle ? tx.bundle : tx.note;
                const itemPath = isBundle 
                  ? `/shared-collections/${item?.slug || tx.bundle}` 
                  : `/notes/${item?.slug || tx.note}`;
                
                return (
                  <tr key={tx._id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-400 font-medium">
                      {formatDate(tx.createdAt)}
                    </td>
                    
                    <td className="px-6 py-4">
                      {item ? (
                        <Link 
                          href={itemPath} 
                          target="_blank"
                          className="flex items-center gap-2 hover:text-cyan-400 transition-colors"
                        >
                          {isBundle ? <Crown className="w-4 h-4 text-yellow-500" /> : <FileText className="w-4 h-4 text-blue-400" />}
                          <span className="font-bold max-w-[200px] truncate" title={item?.name || item?.title}>
                            {item?.name || item?.title}
                          </span>
                          <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-50 transition-opacity" />
                        </Link>
                      ) : (
                        <div className="flex items-center gap-2 text-gray-500 italic">
                          <FileText className="w-4 h-4" />
                          <span>Deleted Item</span>
                        </div>
                      )}
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6"><AvatarImage src={tx.buyer?.avatar} /><AvatarFallback>B</AvatarFallback></Avatar>
                        <span className="text-xs font-medium text-gray-300 truncate w-24">{tx.buyer?.name || "Unknown"}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-6 h-6 border border-emerald-500/50"><AvatarImage src={tx.seller?.avatar} /><AvatarFallback>S</AvatarFallback></Avatar>
                        <span className="text-xs font-bold text-emerald-400 truncate w-24">{tx.seller?.name || "Unknown"}</span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-right font-black text-white">
                      ₹{tx.amount?.toFixed(2)}
                    </td>

                    <td className="px-6 py-4 text-right font-bold text-amber-500">
                      ₹{tx.adminFee?.toFixed(2)}
                    </td>

                    <td className="px-6 py-4 text-right font-bold text-emerald-400">
                      ₹{tx.sellerEarnings?.toFixed(2)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          
          {(!txList || txList.length === 0) && (
            <div className="py-20 text-center text-gray-500 text-sm font-bold uppercase tracking-widest">
              No transactions found.
            </div>
          )}
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
                  <>Load More Transactions <ChevronDown className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          </div>
        )}
      </Card>
    </div>
  );
}