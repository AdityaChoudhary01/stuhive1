"use client";

import { useMemo, useState } from "react";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { format, subDays } from "date-fns";
import { Eye, Download, Sparkles, IndianRupee, ShoppingCart, Crown, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function AnalyticsClient({ rawData, financialStats, contentStats, transactions }) {
  const [timeRange, setTimeRange] = useState(30);

  // 🚀 Fill missing days for the chart
  const chartData = useMemo(() => {
    const dataMap = new Map(rawData.map(item => [item.date, item]));
    const filledData = [];
    
    for (let i = timeRange - 1; i >= 0; i--) {
      const d = subDays(new Date(), i);
      const dateStr = d.toISOString().split('T')[0];
      
      filledData.push({
        date: format(d, 'MMM dd'),
        views: dataMap.get(dateStr)?.views || 0,
        downloads: dataMap.get(dateStr)?.downloads || 0,
      });
    }
    return filledData;
  }, [rawData, timeRange]);

  return (
    <div className="animate-in fade-in duration-500 space-y-12">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black text-white tracking-tight flex items-center gap-3">
            Creator Analytics <Sparkles className="text-cyan-400 w-6 h-6" />
          </h1>
          <p className="text-gray-400 text-sm font-medium mt-2">Track your impact and earnings across the network.</p>
        </div>

        <select 
          value={timeRange} 
          onChange={(e) => setTimeRange(Number(e.target.value))}
          className="bg-white/5 border border-white/10 text-white text-sm rounded-lg px-4 py-2 outline-none focus:ring-2 focus:ring-cyan-500"
        >
          <option value={7} className="bg-black">Last 7 Days</option>
          <option value={14} className="bg-black">Last 14 Days</option>
          <option value={30} className="bg-black">Last 30 Days</option>
        </select>
      </div>

      {/* 🚀 Financial & Content Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
        <Card className="bg-gradient-to-br from-emerald-900/30 to-black border border-emerald-500/30 p-6 rounded-3xl relative overflow-hidden col-span-2 md:col-span-1">
          <p className="text-emerald-400 font-bold uppercase tracking-widest text-[10px] mb-1">Total Earnings (80%)</p>
          <h2 className="text-3xl font-black text-white flex items-center">
            <IndianRupee className="w-5 h-5 mr-1 text-emerald-500" /> {financialStats.totalEarnings.toFixed(2)}
          </h2>
        </Card>

        <Card className="bg-white/[0.02] border border-white/5 p-6 rounded-3xl">
          <div className="flex items-center gap-2 mb-1 text-cyan-400">
             <ShoppingCart size={16} />
             <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Total Sales</p>
          </div>
          <h2 className="text-3xl font-black text-white">{financialStats.totalSales}</h2>
        </Card>

        <Card className="bg-white/[0.02] border border-white/5 p-6 rounded-3xl">
          <div className="flex items-center gap-2 mb-1 text-purple-400">
             <Eye size={16} />
             <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Note Views</p>
          </div>
          <h2 className="text-3xl font-black text-white">{contentStats.totalViews}</h2>
        </Card>

        <Card className="bg-white/[0.02] border border-white/5 p-6 rounded-3xl">
          <div className="flex items-center gap-2 mb-1 text-blue-400">
             <Download size={16} />
             <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Downloads</p>
          </div>
          <h2 className="text-3xl font-black text-white">{contentStats.totalDownloads}</h2>
        </Card>
      </div>

      {/* 🚀 Impact Chart */}
      <div className="bg-white/[0.02] border border-white/5 rounded-3xl p-4 sm:p-8 pt-10 h-[400px] sm:h-[500px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22d3ee" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#22d3ee" stopOpacity={0}/>
              </linearGradient>
              <linearGradient id="colorDownloads" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff10" vertical={false} />
            <XAxis dataKey="date" stroke="#ffffff40" fontSize={12} tickMargin={10} minTickGap={20} />
            <YAxis stroke="#ffffff40" fontSize={12} tickLine={false} axisLine={false} />
            <Tooltip 
              contentStyle={{ backgroundColor: '#0a0a0a', borderColor: '#ffffff20', borderRadius: '12px', fontWeight: 'bold' }}
              itemStyle={{ color: '#fff' }}
              labelStyle={{ color: '#888', marginBottom: '4px' }}
            />
            <Area type="monotone" dataKey="views" stroke="#22d3ee" strokeWidth={3} fillOpacity={1} fill="url(#colorViews)" name="Views" />
            <Area type="monotone" dataKey="downloads" stroke="#a855f7" strokeWidth={3} fillOpacity={1} fill="url(#colorDownloads)" name="Downloads" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* 🚀 Sales History */}
      <div className="space-y-4">
        <h3 className="text-xl font-black text-white">Recent Sales History</h3>
        <Card className="bg-card/50 border border-white/5 rounded-3xl overflow-hidden backdrop-blur-xl">
          {transactions.length === 0 ? (
            <div className="py-20 text-center text-gray-500 font-bold uppercase tracking-widest">No sales yet.</div>
          ) : (
            <div className="divide-y divide-white/5">
              {transactions.map((tx) => {
                const isBundle = !!tx.bundle;
                const item = isBundle ? tx.bundle : tx.note;
                return (
                  <div key={tx._id} className="p-4 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-white/[0.02] transition-colors">
                    <div className="flex items-start gap-4">
                      <div className={`p-3 rounded-xl ${isBundle ? 'bg-yellow-500/10' : 'bg-cyan-500/10'}`}>
                        {isBundle ? <Crown className="text-yellow-500 w-5 h-5" /> : <FileText className="text-cyan-400 w-5 h-5" />}
                      </div>
                      <div>
                        <h4 className="font-bold text-white text-sm sm:text-base line-clamp-1">{item?.name || item?.title || "Deleted Item"}</h4>
                        <div className="flex items-center gap-2 mt-1 text-xs text-gray-400">
                           <span>{formatDate(tx.createdAt)}</span>
                           <span>•</span>
                           <span className="flex items-center gap-1">
                             <Avatar className="w-4 h-4"><AvatarImage src={tx.buyer?.avatar}/><AvatarFallback>B</AvatarFallback></Avatar>
                             {tx.buyer?.name || "Unknown User"}
                           </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end shrink-0">
                       <span className="text-lg font-black text-emerald-400">+ ₹{tx.sellerEarnings.toFixed(2)}</span>
                       <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold">Price: ₹{tx.amount}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}