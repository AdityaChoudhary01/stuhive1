import { getWalletData } from "@/actions/wallet.actions";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import PayoutSettingsForm from "@/components/wallet/PayoutSettingsForm";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { WalletCards, IndianRupee, ArrowUpRight, Clock, ShieldCheck, ChevronDown, FileText, UserCircle } from "lucide-react";
import { formatDate } from "@/lib/utils";
import Link from "next/link";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

export const metadata = {
  title: "Creator Wallet | StuHive",
};

export default async function WalletPage() {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const data = await getWalletData();
  if (!data.success) {
    return <div className="py-32 text-center text-red-400">Failed to load wallet data.</div>;
  }

  const walletBalance = data.walletBalance || 0;
  const payoutDetails = data.payoutDetails || {};
  const sales = data.sales || [];
  const performanceByNote = data.performanceByNote || []; // 🚀 New Data
  const isAdmin = data.isAdmin || false;

  return (
    <div className="container max-w-6xl py-24 sm:py-32 min-h-screen">
      <div className="mb-10">
        <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight flex items-center gap-3">
          <WalletCards className="w-8 h-8 md:w-12 md:h-12 text-emerald-400" />
          Creator Wallet
        </h1>
        <p className="text-muted-foreground mt-2 font-medium">Manage your earnings, payouts, and view detailed note analytics.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* LEFT COLUMN: Balance & Settings */}
        <div className="lg:col-span-5 space-y-8">
          
          {/* Balance Card */}
          <Card className="bg-gradient-to-br from-emerald-900/40 to-black border border-emerald-500/30 rounded-[2rem] p-8 relative overflow-hidden shadow-2xl shadow-emerald-900/20">
            <div className="absolute top-0 right-0 p-6 opacity-20 pointer-events-none">
                <IndianRupee className="w-32 h-32 text-emerald-400" />
            </div>
            
            <p className="text-emerald-400/80 font-bold uppercase tracking-widest text-xs mb-2">Available Balance</p>
            <h2 className="text-5xl md:text-6xl font-black text-white flex items-center tracking-tighter">
               <span className="text-3xl md:text-4xl text-emerald-500 mr-1">₹</span>
               {walletBalance.toFixed(2)}
            </h2>

            {isAdmin && (
              <Badge className="mt-4 bg-yellow-500/20 text-yellow-500 border border-yellow-500/50">
                Admin Note: 20% platform fees are settled directly in Razorpay Dashboard.
              </Badge>
            )}
          </Card>

          {/* Settings Form */}
          <Card className="bg-secondary/10 border border-white/5 rounded-[2rem] p-6 sm:p-8 backdrop-blur-xl">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
              <ShieldCheck className="text-emerald-400" /> Receiving Accounts
            </h3>
            <PayoutSettingsForm initialDetails={payoutDetails} />
          </Card>

        </div>

        {/* RIGHT COLUMN: Note Analytics & Transaction History */}
        <div className="lg:col-span-7 space-y-8">
          
          {/* 🚀 NEW: PERFORMANCE BY NOTE (ACCORDIONS) */}
          <Card className="bg-secondary/10 border border-white/5 rounded-[2rem] p-6 sm:p-8 backdrop-blur-xl">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center justify-between">
              Performance by Note
              <Badge variant="outline" className="bg-blue-500/10 text-blue-400 border-blue-500/20">
                {performanceByNote.length} Premium Notes
              </Badge>
            </h3>

            {performanceByNote.length === 0 ? (
              <div className="text-center py-10 bg-black/20 rounded-2xl border border-white/5 border-dashed">
                <FileText className="w-10 h-10 text-white/10 mx-auto mb-3" />
                <p className="text-white/40 font-bold text-sm">No premium notes sold yet.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {performanceByNote.map((stat) => (
                  <details key={stat.noteId} className="group bg-black/40 border border-white/5 rounded-2xl overflow-hidden [&_summary::-webkit-details-marker]:hidden">
                    <summary className="flex items-center justify-between p-5 cursor-pointer hover:bg-white/[0.02] transition-colors list-none">
                      <div className="flex flex-col gap-1 max-w-[60%]">
                        <span className="text-white font-bold truncate text-base group-hover:text-emerald-400 transition-colors">
                          {stat.title}
                        </span>
                        <span className="text-xs text-muted-foreground font-medium flex items-center gap-2">
                          Price: ₹{stat.price} • <span className="text-blue-400 font-bold">{stat.totalCopiesSold} Copies Sold</span>
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-right">
                        <div className="flex flex-col">
                          <span className="text-emerald-400 font-black text-lg">₹{stat.totalEarnings.toFixed(2)}</span>
                          <span className="text-[9px] uppercase tracking-widest text-muted-foreground">Earned</span>
                        </div>
                        <ChevronDown className="w-5 h-5 text-gray-500 group-open:rotate-180 transition-transform" />
                      </div>
                    </summary>
                    
                    {/* EXPANDED BUYER DETAILS */}
                    <div className="border-t border-white/5 bg-black/60 p-5 space-y-3">
                      <h4 className="text-xs font-bold uppercase tracking-widest text-muted-foreground mb-3">Buyer List</h4>
                      {stat.buyers.map((buyer) => (
                        <div key={buyer._id} className="flex items-center justify-between bg-white/[0.02] p-3 rounded-xl border border-white/5">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8 border border-white/10">
                              <AvatarImage src={buyer.buyerAvatar} />
                              <AvatarFallback className="bg-secondary text-emerald-400"><UserCircle className="w-4 h-4"/></AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span className="text-sm font-bold text-white/90">{buyer.buyerName}</span>
                              <span className="text-[10px] text-muted-foreground font-mono">{buyer.buyerEmail}</span>
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-xs font-bold text-emerald-400 block">+₹{buyer.earnings.toFixed(2)}</span>
                            <span className="text-[9px] text-muted-foreground">{formatDate(buyer.purchasedAt)}</span>
                          </div>
                        </div>
                      ))}
                      <Link href={`/notes/${stat.slug}`} className="text-xs text-blue-400 hover:underline mt-2 inline-block font-medium">
                        View Note Page →
                      </Link>
                    </div>
                  </details>
                ))}
              </div>
            )}
          </Card>

          {/* Chronological Transaction History */}
          <Card className="bg-secondary/10 border border-white/5 rounded-[2rem] p-6 sm:p-8 backdrop-blur-xl h-full">
            <h3 className="text-xl font-bold text-white mb-6 flex items-center justify-between">
              Recent Transactions
            </h3>

            {sales.length === 0 ? (
              <div className="text-center py-10 bg-black/20 rounded-2xl border border-white/5 border-dashed">
                <Clock className="w-10 h-10 text-white/10 mx-auto mb-3" />
                <p className="text-white/40 font-bold text-sm">No transaction history.</p>
              </div>
            ) : (
              <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
                {sales.map((sale) => (
                  <div key={sale._id} className="bg-black/40 border border-white/5 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-white/10 transition-colors">
                    <div>
                      <p className="text-white font-bold text-sm truncate max-w-[250px]">{sale.note?.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-1 flex items-center gap-1.5">
                        <UserCircle className="w-3 h-3" /> {sale.buyer?.name} • {formatDate(sale.createdAt)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-emerald-400 font-black text-base flex items-center justify-end">
                        +₹{sale.sellerEarnings?.toFixed(2) || "0.00"} <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>

        </div>
      </div>
    </div>
  );
}