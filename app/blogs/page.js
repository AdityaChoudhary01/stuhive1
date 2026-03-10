import Link from "next/link";
import { Suspense } from "react";
import BlogSearchClient from "@/components/blog/BlogSearchClient"; 
import { PenTool } from "lucide-react"; 
import { Button } from "@/components/ui/button";
import BlogListServer from "./BlogListServer"; 

const APP_URL = process.env.NEXTAUTH_URL || "https://www.stuhive.in";

// ✅ 1. OPTIMIZATION: Enable aggressive edge caching for fast TTFB
export const dynamic = "force-dynamic";
export const revalidate = 60; 

// 🚀 ULTRA HYPER DYNAMIC METADATA
export async function generateMetadata({ searchParams }) {
  const params = await searchParams; 
  const page = params.page || 1;
  const tag = params.tag;
  const search = params.search;
  
  // 🚀 If there are search or tag params, we tell Google NOT to index this specific URL variant
  // to avoid duplicate content issues in GSC.
  const shouldIndex = !tag && !search;

  const title = page > 1 ? `Student Insights & Articles - Page ${page} | StuHive` : "Insights & Stories | Academic Blog & Student Experiences";
  const description = `Read the latest ${tag ? tag : "academic"} articles, exam preparation tips, and university success stories written by top students on StuHive. Page ${page}.`;

  return {
    title,
    description,
    keywords: [
      "student blog", "university tips", "exam preparation strategies",
      "academic insights", "college advice", "student experiences",
      "StuHive blog", tag ? `${tag} study tips` : "study hacks"
    ].filter(Boolean),
    alternates: {
      // 🚀 Force Canonical to base page (with page number) to consolidate link equity
      canonical: `${APP_URL}/blogs${page > 1 ? `?page=${page}` : ''}`,
    },
    robots: {
      index: shouldIndex,   // 🚀 Prevents indexing of ?tag= and ?search=
      follow: true,         // Still allows Google to follow the links to actual blog posts
      googleBot: {
        index: shouldIndex,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      title,
      description,
      url: `${APP_URL}/blogs`,
      siteName: "StuHive",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    }
  };
}

export default async function BlogPage({ searchParams }) {
  const params = await searchParams;
  const search = params?.search || "";
  
  // Use a stable key for Suspense based on the resolved params
  const suspenseKey = JSON.stringify(params);

  // 🚀 ADDED: Breadcrumb Schema to trigger GSC Enhancements on this index page
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      {
        "@type": "ListItem",
        "position": 1,
        "name": "Home",
        "item": APP_URL
      },
      {
        "@type": "ListItem",
        "position": 2,
        "name": "Blogs & Insights",
        "item": `${APP_URL}/blogs`
      }
    ]
  };

  return (
    // 🚀 SEO: Wrap the entire main container in the 'Blog' schema
    // 🚀 CHANGED: Replaced heavy padding with responsive px-2 sm:px-6
    <main 
      className="container px-2 sm:px-6 md:px-8 py-8 sm:py-12 pt-20 sm:pt-24 min-h-screen"
      itemScope 
      itemType="https://schema.org/Blog"
    >
      {/* 🚀 INJECT BREADCRUMB SCHEMA FOR GSC ENHANCEMENTS */}
      <script 
        type="application/ld+json" 
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} 
      />

      <style>{`
        .hide-scrollbar::-webkit-scrollbar { display: none; }
        .hide-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* 🚀 SEO BOT TRAP: Hidden semantic context for crawlers */}
      <div className="sr-only">
        <h1>StuHive Academic Blog and Student Insights</h1>
        <p>Discover peer-reviewed articles, tutorials, and lifestyle advice for university students.</p>
      </div>

      {/* Header Section */}
      <header className="text-center mb-8 sm:mb-12 space-y-4 sm:space-y-6 px-2">
        <h1 
          className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 tracking-tight pb-1 sm:pb-2"
          itemProp="name"
        >
            Insights & Stories
        </h1>
        <h2 
          className="text-muted-foreground text-sm sm:text-lg md:text-xl max-w-2xl mx-auto font-medium"
          itemProp="description"
        >
            Explore peer-contributed articles on exam prep, technology journeys, and student life.
        </h2>
        
        <div className="flex flex-wrap justify-center gap-3 sm:gap-4 pt-2 sm:pt-4">
            <Link href="/blogs/post" title="Write a new article and share your knowledge">
                <Button className="rounded-full bg-gradient-to-r from-pink-500 to-purple-600 border-0 shadow-lg hover:shadow-pink-500/25 transition-all text-white font-bold h-10 sm:h-12 px-5 sm:px-6 text-sm sm:text-base">
                    <PenTool className="mr-2 sm:mr-2.5 h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden="true" /> Write a Blog
                </Button>
            </Link>
            <Link href="/blogs/my-blogs" title="View and manage my published articles">
                 <Button variant="outline" className="rounded-full h-10 sm:h-12 px-5 sm:px-6 border-white/10 hover:bg-white/5 font-bold text-foreground text-sm sm:text-base">
                    My Articles
                 </Button>
            </Link>
        </div>
      </header>
      
      <section className="max-w-4xl mx-auto mb-8 sm:mb-10 px-2 sm:px-0" aria-label="Search Blog Articles">
        <BlogSearchClient initialSearch={search} />
      </section>

      {/* ✅ 2. OPTIMIZATION: Skeleton Fallback preserves layout to keep CLS at 0 */}
      <Suspense key={suspenseKey} fallback={<BlogGridLoader />}>
          <BlogListServer params={params} />
      </Suspense>
    </main>
  );
}

function BlogGridLoader() {
  return (
    // 🚀 CHANGED: Matches the updated grid-cols-2 and gap-3 mobile styling
    <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6 md:gap-8 py-10" aria-hidden="true">
      {[...Array(6)].map((_, i) => (
        <div key={i} className="h-[250px] sm:h-[400px] w-full rounded-[26px] bg-white/5 animate-pulse border border-white/10" />
      ))}
    </div>
  );
}