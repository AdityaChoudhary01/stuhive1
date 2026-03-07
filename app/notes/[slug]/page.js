import { getNoteBySlug, getRelatedNotes } from "@/actions/note.actions"; 
import { getServerSession } from "next-auth"; 
import { authOptions } from "@/lib/auth";
import { notFound, redirect } from "next/navigation"; 
import Link from "next/link";
import User from "@/lib/models/User"; // 🚀 Added to check purchases

// Components
import ClientPDFLoader from "@/components/notes/ClientPDFLoader";
import Reviews from "@/components/notes/Reviews";
import RelatedNotes from "@/components/notes/RelatedNotes";
import AuthorInfoBlock from "@/components/common/AuthorInfoBlock";
import NotePageActions from "@/components/notes/NotePageActions"; 
import AddToCollectionModal from "@/components/notes/AddToCollectionModal";
import DownloadButton from "./DownloadButton"; 
import SaveNoteHeart from "./SaveNoteHeart"; 
import ViewCounter from "./ViewCounter";
import BuyNoteButton from "./BuyNoteButton"; // 🚀 NEW COMPONENT

// UI Components
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Download, Calendar, Eye, ShieldCheck, Info, HeartHandshake, BookOpen, GraduationCap, FileText, ChevronDown, Lock } from "lucide-react"; 

// Utils
import { formatDate } from "@/lib/utils";
import { generateReadUrl } from "@/lib/r2";

// 🚀 ISR: Cache this page for 24 hours to boost Core Web Vitals/SEO
export const revalidate = 86400;

const APP_URL = process.env.NEXTAUTH_URL || "https://www.stuhive.in";
const R2_PUBLIC_URL = process.env.NEXT_PUBLIC_R2_PUBLIC_URL || "";

// 🚀 ULTRA HYPER SEO METADATA ENGINE
export async function generateMetadata({ params }) {
  const resolvedParams = await params;
  const note = await getNoteBySlug(resolvedParams.slug); 
  if (!note) return { title: "Note Not Found | StuHive", robots: "noindex, nofollow" };

  const ogImage = note.thumbnailKey 
    ? `${R2_PUBLIC_URL}/${note.thumbnailKey}` 
    : (note.fileType?.startsWith("image/") && note.fileKey 
        ? `${R2_PUBLIC_URL}/${note.fileKey}` 
        : `${APP_URL}/og-shared-archives.png`);

  const dynamicKeywords = [
    note.subject, note.course, note.university,
    `${note.subject} notes`, `${note.course} study material`, 
    `${note.university} ${note.course} notes`, "PDF download",
    "exam preparation", "lecture notes", "university notes",
    note.year ? `${note.year} year notes` : "",
    "free study guide", "StuHive documents", "handwritten notes", "university pyqs"
  ].filter(Boolean);

  const title = `${note.title} | ${note.subject} Notes - ${note.university} | StuHive`;
  const description = `Download ${note.title} PDF. High-quality study material for ${note.course} at ${note.university}. Includes ${note.subject} lecture notes, diagrams, and exam preparation guides. Verified by StuHive community.`;

  return {
    title,
    description,
    keywords: dynamicKeywords,
    authors: [{ name: note.user?.name || "StuHive Contributor", url: `${APP_URL}/profile/${note.user?._id}` }],
    creator: note.user?.name || "StuHive Contributor",
    publisher: "StuHive",
    category: "Academic Resources",
    applicationName: "StuHive",
    alternates: {
        canonical: `${APP_URL}/notes/${note.slug || resolvedParams.slug}`, 
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
      url: `${APP_URL}/notes/${note.slug || resolvedParams.slug}`, 
      siteName: "StuHive",
      type: "article",
      publishedTime: note.uploadDate || new Date().toISOString(),
      modifiedTime: note.updatedAt || new Date().toISOString(),
      authors: [note.user?.name || "StuHive Contributor"],
      section: note.subject,
      tags: dynamicKeywords,
      images: [{ url: ogImage, width: 1200, height: 630, alt: title, type: "image/jpeg" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [ogImage],
    }
  };
}

export default async function ViewNotePage({ params }) {
  const { slug } = await params;
  
  const [session, note] = await Promise.all([
    getServerSession(authOptions),
    getNoteBySlug(slug) 
  ]);
  
  if (!note) notFound();

  // 🚀 301 REDIRECT FOR ALREADY INDEXED PAGES
  if (slug === note._id.toString() && note.slug) {
    redirect(`/notes/${note.slug}`);
  }

  // 🚀 MARKETPLACE ACCESS LOGIC
  let hasPurchased = false;
  
  if (session?.user) {
    const currentUser = await User.findById(session.user.id).select('purchasedNotes').lean();
    if (currentUser?.purchasedNotes?.map(id => id.toString()).includes(note._id.toString())) {
        hasPurchased = true;
    }
  }

  const isOwner = session?.user?.id === (note.user?._id?.toString() || note.user?.toString());
  const canEdit = isOwner || session?.user?.role === 'admin';
  
  // Grant access if: free, purchased, uploader, or admin
  const hasAccess = !note.isPaid || note.price === 0 || hasPurchased || isOwner || canEdit;

  const [relatedNotes, signedUrl] = await Promise.all([
    getRelatedNotes(note._id),
    generateReadUrl(note.fileKey, note.fileName)
  ]);
  
  const reviewCount = note.reviews?.length || 0;
  const avgRating = reviewCount > 0
      ? (note.reviews.reduce((acc, r) => acc + (r.rating || 5), 0) / reviewCount).toFixed(1)
      : "5.0";

  const ogImage = note.thumbnailKey 
    ? `${R2_PUBLIC_URL}/${note.thumbnailKey}` 
    : `${APP_URL}/og-shared-archives.png`;

  // 🚀 HYPER-OPTIMIZED JSON-LD
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Home", "item": APP_URL },
      { "@type": "ListItem", "position": 2, "name": "Global Search", "item": `${APP_URL}/global-search` },
      { "@type": "ListItem", "position": 3, "name": note.university, "item": `${APP_URL}/global-search?q=${encodeURIComponent(note.university)}` },
      { "@type": "ListItem", "position": 4, "name": note.course, "item": `${APP_URL}/global-search?q=${encodeURIComponent(note.course)}` },
      { "@type": "ListItem", "position": 5, "name": note.title, "item": `${APP_URL}/notes/${note.slug}` } 
    ]
  };

  const resourceSchema = {
    "@context": "https://schema.org",
    "@type": ["LearningResource", "Course", "CreativeWork"],
    "name": note.title,
    "description": note.description || `Study notes for ${note.subject} at ${note.university}`,
    "learningResourceType": ["Study Guide", "Lecture Notes", "Handwritten Notes"],
    "educationalLevel": note.category || "University",
    "teaches": [note.subject, note.course],
    "educationalUse": "Review",
    "courseCode": note.course,
    "image": ogImage,
    "isAccessibleForFree": !note.isPaid, 
    "inLanguage": "en",
    "datePublished": note.uploadDate,
    "dateModified": note.updatedAt || note.uploadDate,
    "author": {
      "@type": "Person",
      "name": note.user?.name || "StuHive Contributor",
      "url": `${APP_URL}/profile/${note.user?._id || ''}`
    },
    "provider": {
      "@type": "CollegeOrUniversity",
      "name": note.university,
      "sameAs": `https://www.google.com/search?q=${encodeURIComponent(note.university)}`
    },
    "publisher": {
      "@type": "Organization",
      "name": "StuHive",
      "logo": { "@type": "ImageObject", "url": `${APP_URL}/logo192.png` }
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": avgRating,
      "bestRating": "5",
      "worstRating": "1",
      "ratingCount": reviewCount > 0 ? reviewCount : 1,
      "reviewCount": reviewCount > 0 ? reviewCount : 1
    }
  };

  const serializedNote = {
    ...note,
    _id: note._id.toString(), 
    user: note.user ? { ...note.user, _id: note.user._id?.toString() || note.user.toString() } : null,
    reviews: note.reviews ? note.reviews.map(rev => ({
      ...rev,
      _id: rev._id.toString(),
      parentReviewId: rev.parentReviewId?.toString() || null,
      user: rev.user ? { ...rev.user, _id: rev.user._id?.toString() || rev.user.toString() } : null,
      date: rev.date ? new Date(rev.date).toISOString() : new Date().toISOString()
    })) : []
  };

  return (
    <main className="w-full px-3 md:px-8 mx-auto py-8 md:py-12 pt-24 md:pt-32 max-w-7xl relative" itemScope itemType="https://schema.org/CreativeWork">
      {/* 🚀 INJECT RAZORPAY SCRIPT */}
      <script src="https://checkout.razorpay.com/v1/checkout.js" async></script>
      
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(resourceSchema) }} />
      
      <ViewCounter noteId={serializedNote._id} />

      <div className="sr-only">
        <h2>{note.subject} handwritten notes for {note.university}</h2>
        <p>This resource covers {note.course} syllabus including topics like {note.description?.substring(0, 150)}</p>
      </div>

      <div className="absolute top-20 left-1/2 -translate-x-1/2 w-3/4 h-32 bg-primary/10 blur-[100px] pointer-events-none rounded-full" />

      <article className="grid grid-cols-1 xl:grid-cols-12 gap-6 lg:gap-12 relative z-10">
        
        <div className="xl:col-span-8 space-y-8 md:space-y-10">
          <header className="space-y-6">
            <nav className="flex flex-wrap items-center gap-2 md:gap-3" aria-label="Breadcrumb navigation">
                <Link href={`/global-search?q=${encodeURIComponent(note.university)}`} title={`Search notes from ${note.university}`}>
                  <Badge variant="secondary" className="px-2.5 py-1 text-[10px] md:text-xs font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20 uppercase tracking-widest hover:bg-blue-500/20 transition-colors cursor-pointer">
                    <GraduationCap className="w-3 h-3 mr-1 inline" /> {note.university}
                  </Badge>
                </Link>

                <Link href={`/global-search?q=${encodeURIComponent(note.course)}`} title={`Search notes for ${note.course}`}>
                  <Badge variant="outline" className="px-2.5 py-1 text-[10px] md:text-xs font-bold border-white/10 text-muted-foreground uppercase tracking-widest bg-white/5 hover:bg-white/10 transition-colors cursor-pointer">
                    {note.course}
                  </Badge>
                </Link>
                
                {note.subject && (
                  <Link href={`/global-search?q=${encodeURIComponent(note.subject)}`} title={`Search notes about ${note.subject}`}>
                    <Badge variant="outline" className="px-2.5 py-1 text-[10px] md:text-xs font-bold border-pink-500/20 text-pink-400 uppercase tracking-widest bg-pink-500/5 hover:bg-pink-500/10 transition-colors cursor-pointer">
                      <BookOpen className="w-3 h-3 mr-1 inline" /> {note.subject}
                    </Badge>
                  </Link>
                )}
                
                {note.year && (
                  <Badge variant="outline" className="px-2.5 py-1 text-[10px] md:text-xs font-bold border-emerald-500/20 text-emerald-400 uppercase tracking-widest bg-emerald-500/5">
                    Year {note.year}
                  </Badge>
                )}
            </nav>
            
            <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                <div className="flex items-start gap-3 md:gap-4">
                  <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold tracking-tight text-foreground leading-tight" itemProp="name">
                    {note.title}
                  </h1>
                  <div className="mt-1.5 md:mt-2 shrink-0">
                    <SaveNoteHeart noteId={serializedNote._id} />
                  </div>
                </div>
                
                <div className="shrink-0">
                  <NotePageActions note={serializedNote} canEdit={canEdit} userId={session?.user?.id} />
                </div>
            </div>
            
            {/* 🚀 PRICE BADGE */}
            {note.isPaid && note.price > 0 && (
                <div className="inline-block px-4 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 font-black text-lg tracking-wider">
                   ₹{note.price} <span className="text-[10px] font-medium text-muted-foreground ml-2 uppercase tracking-widest">Lifetime Access</span>
                </div>
            )}

            <div className="flex flex-wrap items-center gap-4 md:gap-8 text-[11px] md:text-xs font-bold uppercase tracking-wider text-muted-foreground bg-secondary/20 p-3 md:p-4 rounded-2xl border border-border w-fit">
                <span className="flex items-center gap-1.5 md:gap-2" title="Upload Date">
                  <Calendar className="w-3.5 h-3.5 md:w-4 md:h-4 text-cyan-400" aria-hidden="true" /> 
                  <time dateTime={note.uploadDate} itemProp="datePublished">{formatDate(note.uploadDate)}</time>
                </span>
                <span className="flex items-center gap-1.5 md:gap-2" title="Total Views">
                  <Eye className="w-3.5 h-3.5 md:w-4 md:h-4 text-purple-400" aria-hidden="true" /> 
                  <span className="text-foreground">{note.viewCount || 0}</span> Student Views
                </span>
                <span className="flex items-center gap-1.5 md:gap-2" title="Total Downloads">
                  <Download className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-400" aria-hidden="true" /> 
                  <span className="text-foreground">{note.downloadCount || 0}</span> Downloads
                </span>
            </div>
          </header>

          <section className="rounded-[1.5rem] md:rounded-[2rem] border border-white/10 bg-background/50 backdrop-blur-xl overflow-hidden shadow-2xl relative group" aria-label="PDF Document Viewer">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 opacity-80" />
             
             <div className="min-h-[400px] md:min-h-[700px] bg-black/40 relative">
               {/* 🚀 Pass maxPages to limit preview if unpaid */}
               <ClientPDFLoader 
                 url={signedUrl} 
                 fileType={note.fileType} 
                 title={note.title} 
                 maxPages={hasAccess ? null : note.previewPages || 3} 
               />

               {/* 🚀 PAYWALL OVERLAY */}
               {!hasAccess && (
                 <div className="absolute bottom-0 left-0 w-full h-56 bg-gradient-to-t from-black via-black/90 to-transparent flex flex-col items-center justify-end pb-8 z-50 px-4 text-center">
                    <Lock className="w-8 h-8 md:w-10 md:h-10 text-amber-400 mb-3" />
                    <h3 className="text-white font-black text-lg md:text-xl mb-2">Preview Reached</h3>
                    <p className="text-muted-foreground text-xs md:text-sm max-w-md mb-6">
                      Unlock the full document instantly to continue studying {note.subject}.
                    </p>
                    <BuyNoteButton noteId={serializedNote._id} price={note.price} userEmail={session?.user?.email} />
                 </div>
               )}
             </div>
             
             <div className="p-4 md:p-6 bg-secondary/30 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center gap-4 md:gap-5">
                <div className="flex items-center gap-2 text-[10px] md:text-[11px] font-bold text-muted-foreground uppercase tracking-widest bg-black/20 px-3 py-1.5 rounded-full border border-white/5">
                    <ShieldCheck className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-400" />
                    <span>Verified Study Material</span>
                </div>
                
                <div className="flex flex-wrap items-center justify-center gap-3 w-full sm:w-auto">
                    <AddToCollectionModal noteId={serializedNote._id} />
                    {/* 🚀 Protect Download Button */}
                    {hasAccess ? (
                      <DownloadButton signedUrl={signedUrl} fileName={note.fileName} noteId={serializedNote._id} />
                    ) : (
                      <BuyNoteButton noteId={serializedNote._id} price={note.price} userEmail={session?.user?.email} />
                    )}
                </div>
             </div>
          </section>

          <section className="bg-gradient-to-br from-secondary/30 to-background border border-border p-5 md:p-8 rounded-[1.5rem] md:rounded-[2rem] shadow-lg">
            <h2 className="text-lg md:text-xl font-bold mb-3 md:mb-4 flex items-center gap-2 text-foreground">
                <Info className="w-5 h-5 text-cyan-400" />
                Resource Description
            </h2>
            <p className="whitespace-pre-wrap text-muted-foreground leading-relaxed font-medium text-sm md:text-base" itemProp="description">
                {note.description}
            </p>
          </section>

          <section className="bg-secondary/10 border border-white/5 p-5 md:p-6 rounded-[1.5rem] group">
            <details className="cursor-pointer">
              <summary className="flex items-center justify-between text-sm font-bold uppercase tracking-widest text-muted-foreground list-none group-hover:text-cyan-400 transition-colors">
                 <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4" /> Note Transcript / Content Preview
                 </div>
                 <ChevronDown className="w-4 h-4" />
              </summary>
              <div className="mt-6 pt-4 border-t border-white/5 text-xs md:text-sm text-gray-500 leading-loose text-justify italic">
                 The following is a digital representation of &quot;{note.title}&quot; study material for {note.subject}. 
                 This comprehensive resource includes key lecture summaries, exam-oriented diagrams, and technical definitions specifically curated for {note.university} students. 
                 By downloading this PDF, you will gain access to complete syllabus coverage for {note.course}, including semester-specific insights and academic research summaries. 
                 Contributors at StuHive have verified this document for academic accuracy. 
                 Ideal for quick revision and deep-dive learning.
              </div>
            </details>
          </section>

          <Separator className="bg-border/50" />

          <section id="reviews" className="pt-2" aria-label="Student reviews">
            <Reviews noteId={serializedNote._id} initialReviews={serializedNote.reviews} />
          </section>
        </div>

        <aside className="xl:col-span-4 space-y-6 md:space-y-8">
            <section className="rounded-[1.5rem] md:rounded-[2rem] border border-white/10 bg-gradient-to-b from-secondary/20 to-background p-5 md:p-8 shadow-xl backdrop-blur-md">
                <h2 className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-pink-400 to-purple-400 mb-5 md:mb-6">
                  Note Contributor
                </h2>
                <address className="not-italic" itemProp="author" itemScope itemType="https://schema.org/Person">
                  <AuthorInfoBlock user={serializedNote.user} />
                </address>
            </section>

            <section className="rounded-[1.5rem] md:rounded-[2rem] border border-white/10 bg-secondary/10 p-5 md:p-8 shadow-xl backdrop-blur-md">
                <h2 className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400 mb-5 md:mb-6">
                  Recommended for you
                </h2>
                <RelatedNotes notes={relatedNotes} />
            </section>

            <section className="rounded-[1.5rem] md:rounded-[2rem] bg-gradient-to-b from-cyan-500/20 via-background to-background border border-cyan-500/30 p-6 md:p-8 text-center relative overflow-hidden group shadow-[0_0_40px_-10px_rgba(34,211,238,0.25)]">
                <div className="absolute inset-0 bg-cyan-400/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none duration-500" />
                <div className="bg-cyan-500/20 w-14 h-14 md:w-16 md:h-16 rounded-full flex items-center justify-center mx-auto mb-4 md:mb-5 border border-cyan-500/30 group-hover:scale-110 transition-transform duration-500">
                   <HeartHandshake className="w-6 h-6 md:w-8 md:h-8 text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.8)]" />
                </div>
                <h3 className="text-lg md:text-xl font-black text-foreground tracking-tight mb-2">Help Peers Succeed</h3>
                <p className="text-[11px] md:text-xs text-muted-foreground font-medium mb-6 leading-relaxed">
                  Join StuHive in keeping academic resources free and accessible for every student globally.
                </p>
                <Link href="/donate" title="Donate to StuHive">
                    <Button className="w-full h-12 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white font-black uppercase tracking-widest text-xs hover:shadow-[0_0_20px_rgba(34,211,238,0.4)] transition-all hover:-translate-y-1 border-0">
                        Support the Mission
                    </Button>
                </Link>
            </section>
        </aside>
      </article>
    </main>
  );
}