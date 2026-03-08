import { getUniversityHubData } from "@/actions/university.actions";
import { notFound } from "next/navigation";
import UniversityHubClient from "@/components/university/UniversityHubClient";
import { School, MapPin, Globe, BookOpen } from "lucide-react";
import Image from "next/image";

export const revalidate = 3600; // Edge cache for 1 hour

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.stuhive.in";

// 🚀 ULTRA-LOCALIZED SEO METADATA
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = await getUniversityHubData(slug);
  
  if (!data.success) return { title: "University Not Found" };

  const { universityName, stats, details } = data;

  const title = details?.metaTitle || `${universityName} Study Materials, Notes & PYQs | StuHive`;
  const description = details?.metaDescription || `Download free handwritten notes, previous year question papers (PYQs), and study bundles for ${universityName}. Join ${stats.noteCount}+ resources uploaded by top students.`;
  const ogImage = details?.coverImage || `${APP_URL}/og-shared-archives.png`;

  return {
    title,
    description,
    keywords: [
      ...(details?.keywords || []),
      `${universityName} notes`,
      `${universityName} PYQs`,
      `${universityName} study materials`,
      `${universityName} semester notes`,
      `${universityName} btech notes`,
      `download ${universityName} syllabus`
    ],
    alternates: { canonical: `${APP_URL}/univ/${slug}` },
    openGraph: {
      title,
      description,
      url: `${APP_URL}/univ/${slug}`,
      siteName: "StuHive",
      images: [{ url: ogImage, width: 1200, height: 630, alt: universityName }],
      type: "website",
    }
  };
}

export default async function UniversityPage({ params }) {
  const { slug } = await params;
  const data = await getUniversityHubData(slug);

  // Allow rendering if Admin has created a page (details exist), even if no notes yet
  if (!data.success || (data.notes.length === 0 && data.requests.length === 0 && !data.details)) {
    return notFound();
  }

  const { universityName, stats, details } = data;

  // 🚀 LOCALIZED KNOWLEDGE GRAPH & AUTO-FAQ
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": APP_URL },
        { "@type": "ListItem", "position": 2, "name": "Universities", "item": `${APP_URL}/univ` },
        { "@type": "ListItem", "position": 3, "name": universityName, "item": `${APP_URL}/univ/${slug}` }
      ]
    },
    {
      "@context": "https://schema.org",
      "@type": "CollegeOrUniversity",
      "name": universityName,
      "url": details?.website || `${APP_URL}/univ/${slug}`,
      "image": details?.logo || `${APP_URL}/logo512.png`,
      "description": details?.description || `Study materials for ${universityName}`,
      "address": details?.location ? { "@type": "PostalAddress", "addressLocality": details.location } : undefined
    },
    // 🚀 SEO GOLD: Auto-generated FAQ Schema ensures rich snippets in Google Search
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": `Where can I find free study materials for ${universityName}?`,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": `You can download free handwritten notes, previous year question papers (PYQs), and study bundles for ${universityName} directly from the StuHive community hub. Currently, there are ${stats.noteCount} notes available.`
          }
        },
        {
          "@type": "Question",
          "name": `Are the ${universityName} notes verified?`,
          "acceptedAnswer": {
            "@type": "Answer",
            "text": `Yes, materials uploaded to the ${universityName} hub are peer-reviewed and often verified by top educators and students within the StuHive community.`
          }
        }
      ]
    }
  ];

  return (
    <main 
      className="min-h-screen bg-background text-foreground overflow-hidden selection:bg-cyan-500/30 pt-20"
      itemScope 
      itemType="https://schema.org/CollectionPage"
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* Hero Background - Colors and Gradients Kept EXACTLY as you requested */}
      <div className="absolute top-0 left-0 w-full h-[50vh] pointer-events-none z-0" aria-hidden="true">
        {details?.coverImage && (
          <Image 
            src={details.coverImage} 
            alt="Cover" 
            fill 
            className="object-cover opacity-20 blur-[2px] mix-blend-screen" 
            priority 
          />
        )}
        <div className="absolute inset-0 w-full h-full bg-gradient-to-b from-cyan-950/30 to-background pointer-events-none" />
        <div className="absolute top-[-10%] left-[20%] w-[50vw] h-[30vw] bg-cyan-600/10 blur-[120px] rounded-full pointer-events-none" />
      </div>

      <div className="container relative z-10 max-w-6xl py-12 px-4 sm:px-6 mx-auto">
        
        {/* 🚀 UNIVERSITY HERO HEADER */}
        <header className="mb-12 flex flex-col items-center text-center">
          
          <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(34,211,238,0.15)] overflow-hidden relative">
             {details?.logo ? (
                 <Image src={details.logo} alt={`${universityName} Logo`} fill className="object-cover p-2" />
             ) : (
                 <School className="w-10 h-10 text-cyan-400" aria-hidden="true" />
             )}
          </div>
          
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white mb-4" itemProp="headline">
            {universityName}
          </h1>
          
          <div className="flex flex-wrap items-center justify-center gap-4 text-gray-400 font-medium text-sm sm:text-base mb-8">
            {details?.location ? (
                <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-cyan-500" />
                    <span>{details.location}</span>
                </div>
            ) : (
                <div className="flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-cyan-500" />
                    <span>Dedicated Student Hive</span>
                </div>
            )}
            
            {details?.website && (
                <>
                  <span className="hidden sm:inline text-white/20">•</span>
                  <a href={details.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:text-cyan-400 transition-colors">
                      <Globe className="w-4 h-4 text-emerald-500" />
                      <span>Official Website</span>
                  </a>
                </>
            )}
          </div>

          {/* 🚀 SEO FALLBACK TEXT: Gives Google rich content to crawl for this specific hub */}
          <div className="max-w-3xl mx-auto text-sm sm:text-base text-gray-300 leading-relaxed mb-10 text-center">
             {details?.description ? (
                 <p itemProp="description">{details.description}</p>
             ) : (
                 <p itemProp="description">
                    Welcome to the official <strong>{universityName}</strong> student hub on StuHive. 
                    This collaborative platform is built to help students excel in their semesters. 
                    Browse through our library of <strong>{stats.noteCount} peer-reviewed notes</strong>, 
                    previous year question papers, and comprehensive study bundles. Whether you are prepping for mid-terms 
                    or looking for complete syllabus coverage, you will find high-quality academic materials curated specifically for the {universityName} curriculum.
                 </p>
             )}
          </div>

          <div className="flex flex-wrap justify-center gap-4 sm:gap-8">
            <StatBadge label="Total Notes" value={stats.noteCount} />
            <StatBadge label="Study Bundles" value={stats.collectionCount} />
            <StatBadge label="Open Requests" value={stats.requestCount} />
          </div>
        </header>

        {/* 🚀 INTERACTIVE HUB CLIENT */}
        <UniversityHubClient data={data} slug={slug} />

      </div>
    </main>
  );
}

function StatBadge({ label, value }) {
  return (
    <div className="flex flex-col items-center p-4 rounded-2xl bg-white/[0.02] border border-white/5 min-w-[120px]">
      <span className="text-2xl sm:text-3xl font-black text-white">{value}</span>
      <span className="text-[10px] uppercase tracking-widest text-gray-500 font-bold mt-1">{label}</span>
    </div>
  );
}