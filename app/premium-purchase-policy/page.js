import { 
  ShieldCheck, RefreshCcw, FileWarning, Lock, 
  CreditCard, Scale, Percent, Wallet, Info, 
  Gavel, Ban, AlertCircle, Landmark, ShieldAlert,
  Clock // 🚀 FIXED: Added missing Clock import
} from "lucide-react";
import PremiumPolicyClient from "@/components/legal/PremiumPolicyClient";

export const metadata = {
  title: "Marketplace & Purchase Policy | StuHive",
  description: "Comprehensive legal terms for digital asset acquisition, 20% platform fee structure, creator payouts, and anti-piracy forensic watermarking protocols.",
  alternates: {
    canonical: "https://www.stuhive.in/premium-purchase-policy",
  },
};

export default function PremiumPolicyPage() {
  return (
    <main className="pt-32 pb-20 px-4">
      {/* Hyper-Level SEO Background Accent - Emerald Theme */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-[800px] bg-emerald-600/5 blur-[150px] pointer-events-none" />
      
      <div className="max-w-4xl mx-auto relative z-10">
        <header className="text-center mb-20">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 mb-6">
            <Scale size={14} />
            <span className="text-[10px] font-black uppercase tracking-[0.2em]">Marketplace Jurisprudence</span>
          </div>
          <h1 className="text-4xl md:text-7xl font-black text-white mb-6 tracking-tighter leading-none">
            Marketplace <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">Governance</span>
          </h1>
          <p className="text-gray-400 font-medium max-w-2xl mx-auto leading-relaxed border-l-2 border-emerald-500/30 pl-6 text-left md:text-center md:pl-0">
            StuHive operates as a decentralized academic marketplace. By transacting on this platform, you agree to the following fee structures, anti-piracy protocols, and digital licensing terms.
          </p>
        </header>

        <div className="space-y-8">
          
          {/* 1. Platform Fee Structure */}
          <section className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 backdrop-blur-sm group hover:border-emerald-500/20 transition-all">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Percent size={24} />
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-wider">1. Platform Commission & Fees</h2>
            </div>
            <div className="space-y-4 text-gray-400 leading-relaxed">
              <p>To maintain high-speed delivery, R2 cloud storage, and secure payment encryption, StuHive implements a standard **20% Platform Service Fee** on all successful transactions.</p>
              <div className="grid gap-3">
                <div className="flex items-start gap-3 bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                  <span className="text-sm">
                    <strong className="text-emerald-400 uppercase text-[10px] tracking-widest block mb-1">Creator Revenue</strong>
                    The seller is entitled to 80% of the gross sale price, credited to their StuHive Wallet immediately upon purchase verification.
                  </span>
                </div>
                <div className="flex items-start gap-3 bg-white/[0.03] p-4 rounded-2xl border border-white/5">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-2 shrink-0" />
                  <span className="text-sm">
                    <strong className="text-emerald-400 uppercase text-[10px] tracking-widest block mb-1">Infrastructure & Gateway</strong>
                    The 20% commission covers Razorpay/Stripe processing fees, storage overhead, and platform maintenance. No additional hidden costs are applied.
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* 2. Payout & Wallet Policy */}
          <section className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 backdrop-blur-sm group hover:border-cyan-500/20 transition-all">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                <Wallet size={24} />
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-wider">2. Disbursement & Payouts</h2>
            </div>
            <div className="space-y-4 text-gray-400 leading-relaxed">
              <p>Wallet balances represent &quot;Pending Clearance&quot; funds. To maintain marketplace integrity and handle potential disputes, the following payout cycle applies:</p>
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                  <Landmark className="text-cyan-400 mb-3" size={20} />
                  <h4 className="text-white text-xs font-black uppercase mb-2">Threshold</h4>
                  <p className="text-xs leading-relaxed text-gray-500">Minimum withdrawal limit is ₹100. Payouts are restricted to verified UPI IDs or Bank Accounts matching the profile name.</p>
                </div>
                <div className="p-5 rounded-2xl bg-white/[0.02] border border-white/5">
                  <Clock className="text-cyan-400 mb-3" size={20} />
                  <h4 className="text-white text-xs font-black uppercase mb-2">Lead Time</h4>
                  <p className="text-xs leading-relaxed text-gray-500">Standard processing takes 3-5 business days. High-volume creators may request &quot;Express Payout&quot; after 50 successful sales.</p>
                </div>
              </div>
            </div>
          </section>

          {/* 3. Refund Protocol */}
          <section className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 backdrop-blur-sm group hover:border-red-500/20 transition-all">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-2xl bg-red-500/10 text-red-400 border border-red-500/20">
                <RefreshCcw size={24} />
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-wider">3. Refund & Dispute Protocol</h2>
            </div>
            <p className="text-gray-400 leading-relaxed mb-6">
              Due to the &quot;Instant Consumption&quot; nature of digital PDFs, **Refunds are strictly exceptional.** StuHive Admin serves as the final arbitrator in all disputes.
            </p>
            <div className="bg-red-500/5 rounded-2xl p-6 border border-red-500/10 space-y-4">
              <h4 className="text-red-400 text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                <AlertCircle size={14} /> Reimbursable Conditions:
              </h4>
              <ul className="text-xs text-gray-500 space-y-3 list-none">
                <li className="flex gap-2"><span>&bull;</span> File is corrupted, unreadable, or contains empty pages.</li>
                <li className="flex gap-2"><span>&bull;</span> Material mismatch: The content does not match the subject or title provided.</li>
                <li className="flex gap-2"><span>&bull;</span> Duplicate Purchase: Accidental double-payment for the same resource ID.</li>
              </ul>
              <div className="pt-4 border-t border-red-500/10">
                <p className="text-[10px] text-gray-600 font-bold uppercase tracking-tight">Non-refundable: Personal dissatisfaction with handwriting, &quot;accidental clicks&quot;, or finding the content elsewhere.</p>
              </div>
            </div>
          </section>

          {/* 4. Anti-Piracy & Forensic Watermarking */}
          <section className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 backdrop-blur-sm group hover:border-purple-500/20 transition-all">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <ShieldAlert size={24} />
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-wider">4. Forensic Security Measures</h2>
            </div>
            <div className="space-y-4 text-gray-400 leading-relaxed text-sm">
              <p>Every premium download is uniquely hashed and embedded with **Forensic Watermarks**. This includes your Email ID, IP Address, and Order Timestamp hidden within the PDF metadata.</p>
              <div className="p-4 rounded-2xl bg-purple-500/5 border border-purple-500/10 flex items-start gap-3">
                <Ban size={16} className="text-purple-400 mt-1 shrink-0" />
                <p className="text-[11px] font-medium leading-relaxed italic">Distributing purchased assets on Telegram, WhatsApp, or Public Drives is a violation of the Indian Copyright Act (1957). Violators face permanent hardware-ID bans and legal prosecution.</p>
              </div>
            </div>
          </section>

          {/* 5. Creator Obligations */}
          <section className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 backdrop-blur-sm group hover:border-amber-500/20 transition-all">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                <Gavel size={24} />
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-wider">5. Creator Code of Conduct</h2>
            </div>
            <div className="space-y-4 text-gray-400 leading-relaxed text-sm">
              <p>Creators are responsible for the accuracy and originality of their notes. StuHive reserves the right to withhold payouts if:</p>
              <ul className="text-xs space-y-2 list-disc ml-5 text-gray-500">
                <li>Content is plagiarized from textbooks or other websites.</li>
                <li>Fake ratings or reviews are detected (Sybil attacks).</li>
                <li>The resource contains malicious links or prohibited external advertisements.</li>
              </ul>
            </div>
          </section>

          {/* 6. Taxation & GST */}
          <section className="p-8 rounded-[32px] bg-white/[0.02] border border-white/5 backdrop-blur-sm group hover:border-emerald-500/20 transition-all">
            <div className="flex items-center gap-4 mb-6">
              <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Landmark size={24} />
              </div>
              <h2 className="text-xl font-black text-white uppercase tracking-wider">6. Taxation & Legal Compliance</h2>
            </div>
            <p className="text-gray-400 leading-relaxed text-sm">
              Note prices are inclusive of all platform taxes. Creators are responsible for declaring their platform earnings as &quot;Professional Income&quot; under relevant tax jurisdictions. StuHive provides annual earning summaries upon request for tax filing purposes.
            </p>
          </section>

          {/* Client Interactive Support Section */}
          <PremiumPolicyClient />
        </div>

        {/* Legal Disclaimer Footer */}
        <footer className="mt-20 pt-8 border-t border-white/5 text-center">
          <p className="text-[10px] text-gray-600 font-bold uppercase tracking-[0.4em]">
            &copy; 2026 StuHive Marketplace &bull; Secured by RSA Encryption &bull; DMCA Protected
          </p>
        </footer>
      </div>
    </main>
  );
}