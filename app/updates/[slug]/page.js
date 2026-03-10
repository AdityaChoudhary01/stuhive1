import { getOpportunityBySlug } from "@/actions/opportunity.actions";
import { notFound } from "next/navigation";
import { ExternalLink, CheckCircle2, Calendar, CreditCard, Users, Link as LinkIcon, HelpCircle } from "lucide-react";
import ShareButtons from "@/components/updates/ShareButtons"; 
// 🚀 ADDED IMPORTS FOR WATCHLIST
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import connectDB from "@/lib/db";
import User from "@/lib/models/User";
import SaveOpportunityButton from "@/components/opportunity/SaveOpportunityButton";

// 🚀 HYPER-SEO: Dynamic Metadata Generation
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const { opportunity } = await getOpportunityBySlug(slug);

  if (!opportunity) return { title: "Update Not Found | StuHive" };

  const title = `${opportunity.title} 2026 - ${opportunity.category} | StuHive`;
  const description = `${opportunity.organization} has released the ${opportunity.category} for ${opportunity.title}. Check important dates, application fees, vacancy details, and apply online at StuHive.`;

  return {
    title,
    description,
    keywords: [opportunity.organization, opportunity.category, "Sarkari Result", "Government Jobs 2026", "Exam Updates", opportunity.title],
    openGraph: {
      title,
      description,
      type: "article",
      url: `https://stuhive.com/updates/${slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

export default async function UpdateDetailsPage({ params }) {
  const { slug } = await params;
  const { opportunity } = await getOpportunityBySlug(slug);

  if (!opportunity) notFound();

  // 🚀 SERVER-SIDE CHECK: Has the user saved this to their Watchlist?
  let initiallySaved = false;
  const session = await getServerSession(authOptions);
  if (session?.user?.id) {
    await connectDB();
    const user = await User.findById(session.user.id).select("savedOpportunities").lean();
    if (user?.savedOpportunities?.some(id => id.toString() === opportunity._id.toString())) {
      initiallySaved = true;
    }
  }

  // 🚀 HYPER-SEO: Structured Data (JSON-LD) for Google Rich Results
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting", // For Jobs
    "title": opportunity.title,
    "description": opportunity.shortDescription,
    "datePosted": opportunity.createdAt,
    "hiringOrganization": {
      "@type": "Organization",
      "name": opportunity.organization,
    },
    "identifier": {
      "@type": "PropertyValue",
      "name": "Advertisement Number",
      "value": opportunity.advtNo || "N/A"
    },
    "validThrough": opportunity.importantDates?.find(d => d.event.toLowerCase().includes('last date'))?.date || "",
    "employmentType": "FULL_TIME",
  };

  return (
    <main className="min-h-screen pt-28 pb-20 px-4">
      {/* 🚀 Injecting JSON-LD into the head */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-5xl mx-auto bg-white/[0.03] border border-white/20 shadow-2xl rounded-3xl overflow-hidden backdrop-blur-md font-sans">
        
        {/* 1. TOP HEADER SECTION */}
        <div className="p-6 md:p-10 border-b border-white/10">
          <div className="space-y-6">
            
            {/* 🚀 Title + Watchlist Button Flex Container */}
            <div className="flex justify-between items-start gap-4">
              <h1 className="text-3xl md:text-5xl font-black text-white leading-tight tracking-tight">
                {opportunity.title}
              </h1>
              <div className="shrink-0 bg-white/5 border border-white/10 rounded-full p-1 shadow-lg">
                <SaveOpportunityButton 
                  opportunityId={opportunity._id.toString()} 
                  initiallySaved={initiallySaved} 
                />
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px] md:text-[13px] uppercase tracking-widest font-black">
              <p className="flex items-center gap-2 text-gray-400">
                <span className="text-pink-500">Name of Post:</span> 
                <span className="text-white">{opportunity.title}</span>
              </p>
              <p className="flex items-center gap-2 text-gray-400 md:justify-end">
                <span className="text-pink-500">Last Updated:</span> 
                <span className="text-white">
                  {new Date(opportunity.updatedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                </span>
              </p>
            </div>

            <div className="text-sm text-gray-300 font-medium leading-relaxed bg-white/5 p-6 rounded-2xl border border-white/10 shadow-inner">
              <h2 className="text-pink-500 font-black uppercase text-xs block mb-2 tracking-widest">Short Information</h2> 
              <p>{opportunity.shortDescription || "No short description provided."}</p>
            </div>

            {/* 🚀 Share Buttons */}
            <ShareButtons title={opportunity.title} slug={opportunity.slug} />
          </div>
        </div>

        {/* 2. ORGANIZATION BANNER */}
        <div className="text-center p-8 border-b border-white/10 bg-gradient-to-r from-cyan-500/5 via-transparent to-purple-500/5">
          <h2 className="text-2xl md:text-3xl font-black text-white uppercase tracking-tighter">{opportunity.organization}</h2>
          <div className="flex items-center justify-center gap-3 mt-3">
            <span className="px-4 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-black uppercase tracking-widest">
              {opportunity.category} 2026
            </span>
          </div>
          {opportunity.advtNo && (
            <p className="text-sm font-bold text-pink-500 mt-4 opacity-80 italic">Advt No : {opportunity.advtNo}</p>
          )}
        </div>

        {/* 3. DATES & FEES GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 border-b border-white/10">
          <section className="p-8 border-b md:border-b-0 md:border-r border-white/10 bg-white/[0.01]">
            <h3 className="text-sm font-black text-emerald-400 mb-6 uppercase tracking-[0.2em] flex items-center gap-2">
              <Calendar size={16} /> Important Dates
            </h3>
            <ul className="space-y-4 text-sm">
              {opportunity.importantDates?.map((item, idx) => (
                <li key={idx} className="flex justify-between items-start border-b border-white/5 pb-3 last:border-0">
                  <span className="text-gray-400 font-bold">{item.event}</span> 
                  <span className="text-white font-black text-right ml-4">{item.date}</span>
                </li>
              ))}
            </ul>
          </section>

          <section className="p-8 bg-white/[0.01]">
            <h3 className="text-sm font-black text-pink-400 mb-6 uppercase tracking-[0.2em] flex items-center gap-2">
              <CreditCard size={16} /> Application Fee
            </h3>
            <ul className="space-y-4 text-sm">
              {opportunity.applicationFee?.map((item, idx) => (
                <li key={idx} className="flex justify-between items-center border-b border-white/5 pb-3 last:border-0">
                  <span className="text-gray-400 font-bold">{item.category}</span> 
                  <span className="text-white font-black">₹ {item.amount}/-</span>
                </li>
              ))}
            </ul>
            {opportunity.feeMode && (
              <div className="mt-6 p-4 rounded-xl bg-pink-500/5 border border-pink-500/10">
                <p className="text-[10px] font-black text-pink-500 uppercase tracking-widest mb-1">Payment Mode</p>
                <p className="text-xs text-gray-300 font-bold">{opportunity.feeMode}</p>
              </div>
            )}
          </section>
        </div>

        {/* 4. AGE LIMIT */}
        {(opportunity.ageLimit?.minimumAge || opportunity.ageLimit?.maximumAge) && (
          <section className="p-8 border-b border-white/10 text-center bg-white/[0.02]">
            <h3 className="text-xs font-black text-cyan-400 mb-6 uppercase tracking-[0.3em]">Age Limits as on {opportunity.ageLimit.asOnDate || "Notification"}</h3>
            <div className="flex flex-col sm:flex-row justify-center gap-4 sm:gap-12">
              {opportunity.ageLimit.minimumAge && (
                <div className="flex flex-col">
                   <span className="text-[10px] text-gray-500 uppercase font-black">Minimum</span>
                   <span className="text-xl font-black text-white">{opportunity.ageLimit.minimumAge}</span>
                </div>
              )}
              {opportunity.ageLimit.maximumAge && (
                <div className="flex flex-col">
                   <span className="text-[10px] text-gray-500 uppercase font-black">Maximum</span>
                   <span className="text-xl font-black text-white">{opportunity.ageLimit.maximumAge}</span>
                </div>
              )}
            </div>
            {opportunity.ageLimit.extraDetails && (
              <p className="mt-6 text-xs text-gray-500 font-bold italic">{opportunity.ageLimit.extraDetails}</p>
            )}
          </section>
        )}

        {/* 5. VACANCY DETAILS TABLE */}
        {opportunity.vacancyDetails?.length > 0 && (
          <section className="border-b border-white/10">
            <div className="bg-cyan-500 text-black text-center py-3 font-black uppercase tracking-[0.3em] text-[10px] flex items-center justify-center gap-2">
              <Users size={14} /> Vacancy Details
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-white/5 text-gray-400 font-black uppercase tracking-widest border-b border-white/10">
                  <tr>
                    <th className="p-4 border-r border-white/10">Post Name</th>
                    <th className="p-4 border-r border-white/10 text-center">UR</th>
                    <th className="p-4 border-r border-white/10 text-center">EWS</th>
                    <th className="p-4 border-r border-white/10 text-center">OBC</th>
                    <th className="p-4 border-r border-white/10 text-center">SC</th>
                    <th className="p-4 border-r border-white/10 text-center">ST</th>
                    <th className="p-4 border-r border-white/10 text-center text-white">Total</th>
                    <th className="p-4 min-w-[200px]">Eligibility</th>
                  </tr>
                </thead>
                <tbody className="text-gray-300 font-bold">
                  {opportunity.vacancyDetails.map((vac, idx) => (
                    <tr key={idx} className="border-b border-white/5 last:border-0 hover:bg-white/[0.02] transition-colors">
                      <td className="p-4 border-r border-white/5 text-cyan-400 font-black">{vac.postName}</td>
                      <td className="p-4 border-r border-white/5 text-center">{vac.ur || '-'}</td>
                      <td className="p-4 border-r border-white/5 text-center">{vac.ews || '-'}</td>
                      <td className="p-4 border-r border-white/5 text-center">{vac.obc || '-'}</td>
                      <td className="p-4 border-r border-white/5 text-center">{vac.sc || '-'}</td>
                      <td className="p-4 border-r border-white/5 text-center">{vac.st || '-'}</td>
                      <td className="p-4 border-r border-white/5 text-center text-white font-black bg-white/5">{vac.totalPost}</td>
                      <td className="p-4 text-[11px] leading-relaxed text-gray-400">{vac.eligibility}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* 6. HOW TO APPLY & SELECTION PROCESS */}
        <div className="grid grid-cols-1 lg:grid-cols-2 border-b border-white/10">
          <section className="p-8 border-b lg:border-b-0 lg:border-r border-white/10">
            <h3 className="text-sm font-black text-cyan-400 mb-6 uppercase tracking-widest">How to Apply</h3>
            <ul className="space-y-4">
              {opportunity.howToApply?.length > 0 ? opportunity.howToApply.map((item, idx) => (
                <li key={idx} className="flex items-start gap-3 text-xs text-gray-300 font-bold leading-relaxed">
                  <CheckCircle2 size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                  <span>{item.step}</span>
                </li>
              )) : <li className="text-gray-600 italic text-xs">Read the official notification for application steps.</li>}
            </ul>
          </section>
          <section className="p-8">
            <h3 className="text-sm font-black text-pink-400 mb-6 uppercase tracking-widest">Mode Of Selection</h3>
            <div className="space-y-3">
              {opportunity.selectionProcess?.length > 0 ? opportunity.selectionProcess.map((step, idx) => (
                <div key={idx} className="flex items-center gap-4 p-3 rounded-xl bg-white/5 border border-white/10">
                  <span className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center text-xs font-black text-pink-500 shrink-0">
                    {idx + 1}
                  </span>
                  <span className="text-xs text-gray-200 font-black uppercase tracking-wider">{step.step}</span>
                </div>
              )) : <p className="text-gray-600 italic text-xs">As per the recruitment rules.</p>}
            </div>
          </section>
        </div>

        {/* 7. IMPORTANT LINKS */}
        <section className="bg-white/[0.03]">
          <div className="bg-emerald-500 text-black text-center py-3 font-black uppercase tracking-[0.3em] text-[10px] flex items-center justify-center gap-2">
            <LinkIcon size={14} /> Some Useful Important Links
          </div>
          <div className="grid grid-cols-1">
            {opportunity.importantLinks?.map((link, idx) => (
              <div key={idx} className="flex flex-col sm:flex-row items-center justify-between p-5 sm:px-10 border-b border-white/5 hover:bg-white/[0.02] transition-colors group">
                <span className="font-black text-white text-[13px] uppercase tracking-widest mb-4 sm:mb-0 group-hover:text-cyan-400 transition-colors">
                  {link.label}
                </span>
                <a 
                  href={link.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="w-full sm:w-auto text-center bg-white text-black hover:bg-cyan-500 transition-all px-8 py-2.5 rounded-full font-black uppercase tracking-tighter text-xs flex items-center justify-center gap-2"
                >
                  Click Here <ExternalLink size={14} />
                </a>
              </div>
            ))}
          </div>
        </section>

        {/* 8. FAQs */}
        {opportunity.faqs?.length > 0 && (
          <section className="p-8 md:p-12 bg-white/[0.01]">
            <h3 className="text-sm font-black text-white mb-10 text-center uppercase tracking-[0.4em] flex items-center justify-center gap-3">
              <HelpCircle size={18} className="text-cyan-400" /> Frequently Asked Questions
            </h3>
            <div className="space-y-4 max-w-3xl mx-auto">
              {opportunity.faqs.map((faq, idx) => (
                <div key={idx} className="bg-white/5 border border-white/10 p-6 rounded-2xl hover:border-cyan-500/30 transition-all">
                  <p className="font-black text-cyan-400 mb-3 text-sm tracking-wide">Q: {faq.question}</p>
                  <p className="text-xs font-bold text-gray-400 leading-relaxed pl-4 border-l-2 border-white/10">A: {faq.answer}</p>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </main>
  );
}