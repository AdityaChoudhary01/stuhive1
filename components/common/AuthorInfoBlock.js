import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import RoleBadge from "./RoleBadge"; 
import { BadgeCheck } from "lucide-react"; 

const APP_URL = process.env.NEXTAUTH_URL || "https://www.stuhive.in";

export default function AuthorInfoBlock({ user }) {
  if (!user) return null;

  const profileUrl = `${APP_URL}/profile/${user._id}`;
  const defaultAvatar = `${APP_URL}/default-avatar.png`; 

  // 🚀 1. HYPER-ADVANCED SEO: Extended Person Schema (JSON-LD)
  // Keeps the SEO benefits without showing text on the screen
  const authorSchema = {
    "@context": "https://schema.org",
    "@type": "Person",
    "name": user.name,
    "url": profileUrl,
    "mainEntityOfPage": profileUrl,
    "image": user.avatar || defaultAvatar,
    "jobTitle": user.isVerifiedEducator ? "Verified Expert Educator" : (user.role || "Verified Academic Contributor"),
    "worksFor": {
      "@type": "Organization",
      "name": "StuHive",
      "url": APP_URL
    },
    "memberOf": {
      "@type": "Organization",
      "name": "StuHive Academic Community"
    }
  };

  return (
    <div 
      className="flex items-center gap-4 group p-3 rounded-2xl sm:rounded-3xl bg-white/[0.02] border border-white/5 hover:bg-white/[0.04] hover:border-cyan-500/20 transition-all duration-300"
      itemScope 
      itemType="https://schema.org/Person"
    >
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(authorSchema) }}
      />

      <Link 
        href={profileUrl} 
        rel="author" 
        itemProp="url"
        title={`View ${user.name}'s profile`}
        className="shrink-0 outline-none rounded-full focus-visible:ring-2 focus-visible:ring-cyan-500"
      >
        <Avatar className="w-12 h-12 sm:w-14 sm:h-14 border border-white/10 group-hover:border-cyan-500/40 transition-all duration-500 cursor-pointer shadow-lg">
            <AvatarImage 
                src={user.avatar} 
                alt={`${user.name}`} 
                itemProp="image" 
            />
            <AvatarFallback className="bg-cyan-950 text-cyan-400 font-bold text-sm">
              {user.name?.charAt(0) || "U"}
            </AvatarFallback>
        </Avatar>
      </Link>
      
      <div className="flex-1 min-w-0">
        <Link 
            href={profileUrl} 
            rel="author"
            className="flex items-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 rounded-sm w-fit group/name"
        >
            <span 
                className="block font-bold text-white/90 text-sm sm:text-base truncate group-hover:text-cyan-400 group-hover/name:text-cyan-400 transition-colors duration-300 tracking-tight" 
                itemProp="name"
            >
              {user.name}
            </span>
            
            {/* 🚀 VERIFIED TICK ONLY (No Text) */}
            {user.isVerifiedEducator && (
                <BadgeCheck 
                  className="w-4 h-4 text-blue-400 drop-shadow-[0_0_8px_rgba(96,165,250,0.8)] shrink-0" 
                />
            )}
        </Link>
        <div className="flex items-center gap-2 mt-1">
            <div itemProp="jobTitle">
               <RoleBadge role={user.role} />
            </div>
            
            {/* 🚀 Invisible semantic context for search engine crawlers & screen readers */}
            <span className="sr-only">, {user.isVerifiedEducator ? 'Verified Expert Educator' : 'Academic Contributor'}</span>
        </div>
      </div>
    </div>
  );
}