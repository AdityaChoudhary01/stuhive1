import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, ArrowRight, Star, Eye, ShieldCheck, BadgeCheck } from "lucide-react"; // 🚀 Added BadgeCheck
import { formatDate } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
// 🚀 IMPORTED: Planner Button
import AddToPlanButton from "@/components/planner/AddToPlanButton";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.stuhive.in";

export default function BlogCard({ blog, priority = false }) {
  const readTime = blog.readTime || 3;
  const rating = blog.rating || 0;
  const views = blog.viewCount || 0;
  const isAdmin = blog.author?.role === "admin";

  const authorProfileUrl = `${APP_URL}/profile/${blog.author?._id || ""}`;

  const blogSchema = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: blog.title,
    image: blog.coverImage || `${APP_URL}/default-blog.png`,
    datePublished: blog.createdAt,
    dateModified: blog.updatedAt || blog.createdAt,
    author: {
      "@type": "Person",
      name: blog.author?.name || "StuHive Contributor",
      url: authorProfileUrl,
      jobTitle: blog.author?.isVerifiedEducator ? "Verified Expert Educator" : (isAdmin ? "Admin" : "Contributor"), // 🚀 SEO update
    },
    publisher: {
      "@type": "Organization",
      name: "StuHive",
      logo: {
        "@type": "ImageObject",
        url: `${APP_URL}/logo512.png`,
      },
    },
    description: blog.summary || blog.excerpt || `Read this academic article about ${blog.tags?.[0] || "education"}.`,
    interactionStatistic: [
      {
        "@type": "InteractionCounter",
        interactionType: "https://schema.org/ViewAction",
        userInteractionCount: views,
      },
    ],
  };

  const machineReadableDate = blog.createdAt ? new Date(blog.createdAt).toISOString() : new Date().toISOString();

  return (
    <article className="h-full" itemScope itemType="https://schema.org/BlogPosting">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(blogSchema) }} />

      <div className="relative h-full group">
        {/* 🚀 ADDED: Planner Button (Positioned top-right relative to the whole card) */}
        <div className="absolute top-3 right-3 z-30">
          <AddToPlanButton resourceId={blog._id} resourceType="Blog" />
        </div>

        <Link href={`/blogs/${blog.slug}`} title={`Read: ${blog.title}`} className="block h-full outline-none" itemProp="url">
          <Card
            className="relative h-full overflow-hidden flex flex-col bg-[#0a0a0a]
              border border-white/10 rounded-[26px]
              transition-all duration-500 transform-gpu will-change-transform
              hover:-translate-y-1 hover:border-white/20
              hover:shadow-[0_28px_80px_-55px_rgba(168,85,247,0.55)]
              focus-visible:ring-2 focus-visible:ring-cyan-500/60
              before:content-[''] before:absolute before:inset-0 before:rounded-[inherit] before:p-[1px]
              before:bg-gradient-to-br before:from-white/14 before:via-white/0 before:to-white/6
              before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-500
              after:content-[''] after:absolute after:inset-0 after:rounded-[inherit] after:opacity-[0.06] after:pointer-events-none
              after:[background-image:radial-gradient(circle_at_1px_1px,rgba(255,255,255,0.14)_1px,transparent_0)]
              after:[background-size:20px_20px]"
          >
            {/* top media */}
            <div className="relative h-44 w-full overflow-hidden bg-secondary/20 shrink-0 -mb-[1px] z-0">
              {blog.coverImage ? (
                <Image
                  src={blog.coverImage}
                  alt={`Cover for ${blog.title}`}
                  fill
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  priority={priority}
                  fetchPriority={priority ? "high" : "auto"}
                  unoptimized={true}
                  className="object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-[1.06] will-change-transform transform-gpu"
                  itemProp="image"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-secondary/5">
                  <span className="text-[10px] uppercase tracking-widest text-white/60 font-black">StuHive</span>
                </div>
              )}

              {/* subtle cinematic overlay */}
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 bg-[radial-gradient(900px_circle_at_30%_20%,rgba(34,211,238,0.10),transparent_50%)]" aria-hidden="true" />
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#0a0a0a] to-transparent opacity-90 z-10" aria-hidden="true" />

              <div className="absolute top-3 left-3 flex flex-wrap gap-2 z-10" aria-label="Blog Categories">
                {blog.isFeatured && (
                  <Badge className="relative overflow-hidden bg-gradient-to-r from-amber-500 to-orange-600 border-0 text-[9px] font-black uppercase tracking-widest text-white px-2 py-0.5 shadow-lg">
                    <span className="relative z-10">Featured</span>
                    <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/40 to-transparent z-0 skew-x-12 animate-[shimmer_2.5s_infinite]" />
                  </Badge>
                )}
                {blog.tags?.slice(0, 2).map((tag) => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="bg-black/80 text-white backdrop-blur-md border border-white/20 text-[9px] uppercase font-black tracking-widest px-2 py-0.5"
                  >
                    <span itemProp="keywords">{tag}</span>
                  </Badge>
                ))}
              </div>
            </div>

            <CardContent className="flex flex-col flex-grow p-4 sm:p-5 relative z-10 bg-[#0a0a0a]">
              <div className="flex items-center gap-x-3 text-[10px] font-black uppercase tracking-wider text-gray-300 mb-2">
                <time
                  dateTime={machineReadableDate}
                  itemProp="datePublished"
                  className="flex items-center gap-1"
                  title={`Published on ${formatDate(blog.createdAt)}`}
                >
                  <Calendar className="w-3 h-3 text-cyan-400" aria-hidden="true" /> {formatDate(blog.createdAt)}
                </time>
                <span className="flex items-center gap-1" aria-label={`${readTime} minute read time`}>
                  <Clock className="w-3 h-3 text-pink-400" aria-hidden="true" /> {readTime} min
                </span>
                <span className="flex items-center gap-1" aria-label={`${views} views`}>
                  <Eye className="w-3 h-3 text-purple-400" aria-hidden="true" /> {views}
                </span>
              </div>

              <h3
                className="text-lg font-extrabold tracking-tight leading-snug mb-2 line-clamp-2 text-white
                  group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-cyan-300 group-hover:to-purple-400
                  transition-all duration-500"
                itemProp="headline"
              >
                {blog.title}
              </h3>

              <div className="flex items-center gap-2 mb-3" aria-label={`Rated ${rating.toFixed(1)} out of 5 stars by ${blog.numReviews || 0} reviewers`}>
                <div className="flex gap-0.5" aria-hidden="true">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star key={star} className={`w-3 h-3 ${star <= Math.round(rating) ? "fill-yellow-500 text-yellow-500" : "text-white/20"}`} />
                  ))}
                </div>
                <span className="text-[9px] font-bold text-gray-400">
                  {rating.toFixed(1)} ({blog.numReviews || 0})
                </span>
              </div>

              <p className="text-gray-300 text-xs leading-relaxed line-clamp-2 mb-4 flex-grow font-medium" itemProp="description">
                {blog.summary || blog.excerpt || "Click to read the full article on StuHive..."}
              </p>

              <div className="flex items-center justify-between mt-auto pt-3 border-t border-white/10">
                <div className="flex items-center gap-2.5" itemProp="author" itemScope itemType="https://schema.org/Person">
                  <meta itemProp="url" content={authorProfileUrl} />

                  <div className="relative">
                    <Avatar className="w-8 h-8 border border-white/20 shrink-0">
                      <AvatarImage src={blog.author?.avatar} alt={`${blog.author?.name} avatar`} className="object-cover" />
                      <AvatarFallback className="bg-secondary text-[10px] font-black">{blog.author?.name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    {isAdmin && (
                      <div className="absolute -bottom-1 -right-1 bg-[#0a0a0a] rounded-full p-0.5 z-10" aria-hidden="true" title="Verified Admin">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400/20" />
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col">
                    <div className="flex items-center gap-1.5">
                        <span className="text-[11px] font-extrabold text-gray-200 truncate max-w-[120px]" itemProp="name">
                          {blog.author?.name || "StuHive Contributor"}
                        </span>
                        {/* 🚀 VERIFIED EDUCATOR BADGE */}
                        {blog.author?.isVerifiedEducator && (
                            <BadgeCheck className="w-3 h-3 text-blue-400 shrink-0" title="Verified Expert Educator" />
                        )}
                    </div>
                    {isAdmin ? (
                      <span className="text-[8px] uppercase tracking-widest text-emerald-400 font-black mt-0.5" itemProp="jobTitle">
                        Admin
                      </span>
                    ) : (
                      <span className="text-[8px] uppercase tracking-widest text-gray-500 font-black mt-0.5" itemProp="jobTitle">
                        Contributor
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-cyan-300 text-[10px] font-black uppercase tracking-widest flex items-center gap-1 group-hover:translate-x-1 transition-transform" aria-hidden="true">
                  Read <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </article>
  );
}