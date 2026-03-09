import { getCollectionBySlug } from "@/actions/collection.actions";
import { notFound } from "next/navigation";
import NoteCard from "@/components/notes/NoteCard";
import { FolderHeart, Library, ArrowLeft, Globe, ShieldCheck, Zap, BookOpen, Trophy, School, Lightbulb, Crown } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import ShareCollectionButton from "@/components/collections/ShareCollectionButton";
import CheckoutBundleButton from "@/components/collections/CheckoutBundleButton"; // 🚀 Added Checkout Component

// 🚀 PERFORMANCE & SEO: Cache this page at the edge for 1 hour. TTFB < 50ms.
export const revalidate = 3600;

const APP_URL = process.env.NEXTAUTH_URL || "https://www.stuhive.in";

// 🚀 Dynamic Config Helper for Categories
const getCategoryDetails = (cat) => {
  switch (cat) {
    case 'School': 
      return { label: "Board / School", icon: <BookOpen size={14} className="text-pink-400" /> };
    case 'Competitive Exams': 
      return { label: "Exam Body", icon: <Trophy size={14} className="text-amber-400" /> };
    case 'Other': 
      return { label: "Context", icon: <Lightbulb size={14} className="text-blue-400" /> };
    case 'University':
    default: 
      return { label: "University", icon: <School size={14} className="text-cyan-400" /> };
  }
};

// 🚀 EXTREME SEO METADATA
export async function generateMetadata({ params }) {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug);

  if (!collection) return { title: "Collection Not Found | StuHive", robots: { index: false } };

  const catLabel = collection.category || "Study";
  const premiumTag = collection.isPremium ? "Premium " : "";
  const title = `${collection.name} | ${premiumTag}${catLabel} Bundle by ${collection.user?.name}`;
  const description = collection.description 
    ? `${collection.description.substring(0, 150)}...` 
    : `Access "${collection.name}", a ${premiumTag.toLowerCase()}${catLabel} collection of ${collection.notes?.length || 0} study resources curated by ${collection.user?.name} on StuHive.`;

  const ogImage = collection.user?.avatar || `${APP_URL}/logo512.png`;

  return {
    title,
    description,
    keywords: [
      collection.name, 
      collection.user?.name,
      collection.category || "Education",
      "study notes bundle", 
      collection.isPremium ? "premium study notes" : "free study materials",
      "handwritten academic notes", 
      "university resources", 
      "competitive exam preparation",
      "StuHive collections",
      "curated study guide"
    ],
    authors: [{ name: collection.user?.name, url: `${APP_URL}/profile/${collection.user?._id}` }],
    category: collection.category || "Education",
    alternates: { 
      canonical: `${APP_URL}/shared-collections/${slug}` 
    },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        'max-video-preview': -1,
        'max-image-preview': 'large',
        'max-snippet': -1,
      },
    },
    openGraph: {
      title,
      description,
      url: `${APP_URL}/shared-collections/${slug}`,
      siteName: "StuHive",
      images: [
        { 
          url: ogImage,
          width: 800,
          height: 800,
          alt: `${collection.name} curated by ${collection.user?.name}`
        }
      ],
      type: "article",
      publishedTime: collection.createdAt,
      modifiedTime: collection.updatedAt || collection.createdAt,
    },
    twitter: {
      card: "summary", 
      title,
      description,
      images: [ogImage],
    },
  };
}

export default async function PublicCollectionDetails({ params }) {
  const { slug } = await params;
  const collection = await getCollectionBySlug(slug);

  if (!collection) return notFound();

  const authorProfileUrl = `${APP_URL}/profile/${collection.user?._id}`;
  const catDetails = getCategoryDetails(collection.category);

  // 🚀 CALCULATE BUNDLE SAVINGS
  const totalIndividualPrice = collection.notes?.reduce((sum, note) => sum + (note.price || 0), 0) || 0;
  const savings = totalIndividualPrice - (collection.price || 0);
  const savingsPercentage = totalIndividualPrice > 0 ? Math.round((savings / totalIndividualPrice) * 100) : 0;

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": APP_URL },
      { "@type": "ListItem", "position": 2, "name": "Shared Collections", "item": `${APP_URL}/shared-collections` },
      { "@type": "ListItem", "position": 3, "name": collection.name, "item": `${APP_URL}/shared-collections/${slug}` }
    ]
  };

  const collectionJsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": collection.name,
    "description": collection.description || `Curated academic bundle by ${collection.user?.name}`,
    "url": `${APP_URL}/shared-collections/${slug}`,
    "datePublished": collection.createdAt,
    "dateModified": collection.updatedAt || collection.createdAt,
    "author": {
      "@type": "Person",
      "name": collection.user?.name,
      "url": authorProfileUrl,
      "image": collection.user?.avatar
    },
    "mainEntity": {
      "@type": "ItemList",
      "name": `Documents in ${collection.name}`,
      "numberOfItems": collection.notes?.length || 0,
      "itemListElement": collection.notes?.map((note, index) => ({
        "@type": "ListItem",
        "position": index + 1,
        "url": `${APP_URL}/notes/${note.slug || note._id}`,
        "name": note.title
      }))
    }
  };

  return (
    <main 
      className="min-h-screen text-foreground"
      itemScope 
      itemType="https://schema.org/CollectionPage"
    >
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(collectionJsonLd) }} />

      {/* 🚀 DYNAMIC PREMIUM BACKGROUND */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
        <div className={`absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[500px] blur-[120px] rounded-full -z-10 ${collection.isPremium ? 'bg-yellow-500/10' : 'bg-cyan-500/5'}`} />
      </div>

      <nav className="sr-only" aria-label="Collection Documents List">
        <h2>List of all study materials in {collection.name}</h2>
        <ul>
          {collection.notes?.map(note => (
            <li key={`seo-${note._id}`}>
              <a href={`${APP_URL}/notes/${note.slug || note._id}`}>{note.title}</a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="container relative z-10 max-w-5xl py-8 md:py-20 px-4 mx-auto">
        
        <nav aria-label="Breadcrumb" className="mb-8 md:mb-16 animate-in fade-in slide-in-from-left-4 duration-500">
            <Link 
              href="/shared-collections" 
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/[0.03] border border-white/10 text-gray-300 hover:text-white hover:bg-white/[0.05] transition-all text-sm font-medium"
            >
              <ArrowLeft size={14} aria-hidden="true" /> Back to Archives
            </Link>
        </nav>

        <header className="flex flex-col items-start mb-12 md:mb-20">
          
          {/* 🚀 PREMIUM BADGE OR STANDARD ICON */}
          {collection.isPremium ? (
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-yellow-500/20 to-amber-600/20 border border-yellow-500/30 text-yellow-400 mb-6 shadow-[0_0_20px_rgba(234,179,8,0.15)] animate-in fade-in zoom-in duration-500">
              <Crown size={16} className="drop-shadow-md" />
              <span className="text-[10px] md:text-xs font-black uppercase tracking-widest drop-shadow-md">Premium Bundle</span>
            </div>
          ) : (
            <div className="p-3 bg-white/[0.03] border border-white/10 rounded-2xl text-cyan-400 mb-6 shadow-sm" aria-hidden="true">
              {/* 🚀 FIXED: Removed md:size namespace prop which caused build error */}
              <FolderHeart size={28} strokeWidth={1.5} className="w-6 h-6 md:w-7 md:h-7" />
            </div>
          )}

          <h1 
            className="text-2xl md:text-5xl lg:text-6xl font-extrabold tracking-tight mb-5 max-w-4xl text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-300 leading-tight"
            itemProp="name headline"
          >
            {collection.name}
          </h1>

          {collection.description && (
            <p 
              className="text-gray-400 text-sm md:text-lg max-w-3xl mb-8 leading-relaxed font-normal"
              itemProp="description"
            >
                {collection.description}
            </p>
          )}

          {/* Metadata Section - Optimized for all devices */}
          <div className="flex flex-col gap-6 w-full">
            
            <div className="flex flex-wrap items-center gap-3 md:gap-4">
                {/* Author - Now always visible and professional */}
                <Link 
                    href={authorProfileUrl} 
                    className="group flex items-center gap-3 bg-white/[0.02] hover:bg-white/[0.05] backdrop-blur-md px-4 py-2 rounded-full border border-white/10 transition-all duration-300"
                    aria-label={`Curated by ${collection.user?.name}`}
                    itemProp="author" itemScope itemType="https://schema.org/Person"
                >
                    <meta itemProp="url" content={authorProfileUrl} />
                    <Avatar className="h-6 w-6 border border-white/20">
                        <AvatarImage src={collection.user?.avatar} alt={`Avatar of ${collection.user?.name}`} itemProp="image" />
                        <AvatarFallback className="bg-cyan-900 text-cyan-100 font-bold text-[10px]">
                        {collection.user?.name?.charAt(0)}
                        </AvatarFallback>
                    </Avatar>
                    <span className="text-xs md:text-sm font-medium text-gray-200 group-hover:text-white transition-colors" itemProp="name">
                        By {collection.user?.name}
                    </span>
                </Link>

                {/* 🚀 DYNAMIC CATEGORY & INSTITUTION BADGE */}
                <div className="flex items-center gap-2 bg-white/[0.02] text-gray-200 px-3 md:px-4 py-2 rounded-full border border-white/10">
                    {catDetails.icon}
                    <span className="text-[10px] md:text-sm font-medium tracking-wide">
                        {collection.university || 'General'} <span className="text-gray-500 mx-1">•</span> {catDetails.label}
                    </span>
                </div>

                {/* 🚀 RESOURCES COUNT */}
                <div className="flex items-center gap-2 bg-white/[0.02] text-gray-200 px-3 md:px-4 py-2 rounded-full border border-white/10">
                    <Library size={14} className="text-gray-300" aria-hidden="true" />
                    <span className="text-[10px] md:text-sm font-medium tracking-wide">
                        {collection.notes?.length || 0} Resources
                    </span>
                </div>
            </div>

            {/* Price & Checkout Row - Optimized for mobile stacking */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pt-4 border-t border-white/5">
                
                {/* 🚀 PRICE COMPARISON UI */}
                {collection.isPremium && totalIndividualPrice > collection.price ? (
                    <div className="flex items-center gap-4 bg-emerald-500/5 border border-emerald-500/20 px-4 md:px-5 py-2.5 rounded-2xl animate-in fade-in zoom-in duration-700">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest line-through decoration-red-500/50">Total Value: ₹{totalIndividualPrice}</span>
                            <span className="text-lg font-black text-emerald-400 leading-none mt-1">Bundle: ₹{collection.price}</span>
                        </div>
                        <div className="bg-emerald-500 text-black text-[10px] font-black px-2 py-1 rounded-md uppercase tracking-tighter shadow-lg shadow-emerald-500/20">
                            Save {savingsPercentage}%
                        </div>
                    </div>
                ) : (
                    <div className="hidden sm:block" /> 
                )}

                {/* 🚀 REAL CHECKOUT COMPONENT */}
                {collection.isPremium && (
                    <div className="w-full sm:w-auto">
                        <CheckoutBundleButton bundle={JSON.parse(JSON.stringify(collection))} />
                    </div>
                )}
            </div>
          </div>
        </header>

        <section aria-labelledby="collection-contents">
          <h2 id="collection-contents" className="text-xs font-black uppercase tracking-[0.2em] text-gray-500 mb-8 flex items-center gap-3">
             <div className="h-px w-8 bg-gray-800" /> Bundle Contents
          </h2>
          
          {collection.notes && collection.notes.length > 0 ? (
            <div 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700"
              itemProp="mainEntity" 
              itemScope 
              itemType="https://schema.org/ItemList"
            >
              {collection.notes.map((note, index) => (
                <div 
                  key={note._id} 
                  className="h-full transition-transform duration-300 hover:-translate-y-1"
                  itemProp="itemListElement" 
                  itemScope 
                  itemType="https://schema.org/ListItem"
                >
                  <meta itemProp="position" content={index + 1} />
                  <meta itemProp="url" content={`${APP_URL}/notes/${note.slug || note._id}`} />
                  <meta itemProp="name" content={note.title} />
                  <div className="h-full">
                    <NoteCard note={note} priority={index < 3} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 md:py-32 rounded-3xl bg-white/[0.01] border border-dashed border-white/10 text-center px-6">
              <div className="p-4 bg-white/5 rounded-full mb-5" aria-hidden="true">
                <BookOpen size={28} className="text-gray-500" strokeWidth={1.5} />
              </div>
              <h3 className="text-lg font-bold text-gray-200 tracking-tight">Empty Archive</h3>
              <p className="text-sm text-gray-400 max-w-xs mx-auto mt-2 leading-relaxed">
                The curator hasn&apos;t added any study materials to this bundle yet. Check back soon.
              </p>
            </div>
          )}
        </section>

        <footer className="mt-20 md:mt-32 pt-12 border-t border-white/10 flex flex-col items-center text-center gap-8">
            <div className="space-y-3">
                <h3 className="text-xl md:text-2xl font-bold tracking-tight text-white">Share the Knowledge</h3>
                <p className="text-gray-400 max-w-md mx-auto text-sm md:text-base leading-relaxed">
                  Help your peers by sharing this curated bundle. Good resources are meant to be circulated.
                </p>
            </div>
            
            <ShareCollectionButton />
            
            <div className="flex flex-wrap justify-center gap-6 md:gap-10 text-[9px] md:text-[10px] font-bold uppercase tracking-widest text-gray-500 pt-4">
                <span className="flex items-center gap-2">
                  <Zap size={14} className="text-yellow-400" /> High-Speed
                </span>
                <span className="flex items-center gap-2">
                  <Globe size={14} className="text-blue-400" /> Public Link
                </span>
                <span className="flex items-center gap-2">
                  <ShieldCheck size={14} className="text-green-400" /> Verified
                </span>
            </div>
        </footer>
      </div>
    </main>
  );
}