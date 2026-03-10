import Link from "next/link";
import { getBlogs, getUniqueBlogTags } from "@/actions/blog.actions";
import BlogCard from "@/components/blog/BlogCard"; 
import Pagination from "@/components/common/Pagination";
import { Hash } from "lucide-react"; 
import { Button } from "@/components/ui/button";

const APP_URL = process.env.NEXTAUTH_URL || "https://www.stuhive.in";

export default async function BlogListServer({ params }) {
  // Immediate destructuring to prevent waterfall
  const { page = 1, search = "", tag = "All" } = params;

  // Parallel fetching fetches everything in one network trip
  const [blogsData, dynamicTags] = await Promise.all([
      getBlogs({ page: Number(page), search, tag }),
      getUniqueBlogTags()
  ]);

  const { blogs, totalPages } = blogsData;
  const categories = ["All", ...dynamicTags]; 

  // 🚀 SUPERCHARGED JSON-LD: Exposes Authors, Headlines, and Dates to Google
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "StuHive Academic Blogs",
    "description": "A collection of student-written articles, exam tips, and insights.",
    "url": `${APP_URL}/blogs`,
    "mainEntity": {
      "@type": "ItemList",
      "itemListElement": blogs.map((b, i) => ({
        "@type": "ListItem",
        "position": i + 1,
        "item": {
          "@type": "BlogPosting", // 🚀 Crucial: Tells Google these are Articles, not just links
          "headline": b.title,
          "url": `${APP_URL}/blogs/${b.slug}`,
          "datePublished": b.createdAt,
          "author": {
            "@type": "Person",
            "name": b.author?.name || "StuHive Contributor"
          }
        }
      }))
    }
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="max-w-4xl mx-auto mb-10 sm:mb-12">
        <nav className="relative w-full overflow-hidden" aria-label="Blog Categories Filter">
            {/* Fade gradients to indicate scrolling is possible */}
            <div className="absolute left-0 top-0 bottom-4 w-6 sm:w-8 bg-gradient-to-r from-[#0a0a0a] to-transparent pointer-events-none z-10" />
            <div className="absolute right-0 top-0 bottom-4 w-8 sm:w-12 bg-gradient-to-l from-[#0a0a0a] to-transparent pointer-events-none z-10" />
            
            {/* ✅ FIXED SCROLLING BUG: Removed md:justify-center so the track always starts from the left */}
            {/* 🚀 CHANGED: Reduced horizontal padding (px-2 sm:px-6) and gaps for mobile */}
            <div className="flex overflow-x-auto gap-2 sm:gap-3 pb-4 hide-scrollbar px-2 sm:px-6 relative w-full snap-x snap-mandatory">
                {categories.map((cat) => (
                    <Link 
                        key={cat} 
                        href={`/blogs?${new URLSearchParams({ ...(search && { search }), ...(cat !== "All" && { tag: cat }) })}`}
                        title={`Filter blogs by ${cat}`}
                        className={`snap-start shrink-0 px-4 sm:px-5 py-2 sm:py-2.5 rounded-full text-xs sm:text-sm font-bold uppercase tracking-wider transition-all duration-300 ${
                            tag === cat 
                            ? "bg-cyan-500 text-black shadow-[0_0_15px_rgba(34,211,238,0.4)]" 
                            : "bg-white/5 text-gray-400 border border-white/10 hover:text-white"
                        }`}
                    >
                        {cat}
                    </Link>
                ))}
            </div>
        </nav>
      </div>

      <section aria-label="Blog posts grid">
        {blogs.length > 0 ? (
          <div 
            // 🚀 CHANGED: grid-cols-2 on mobile, smaller gap-3 on mobile to fit the screen
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8"
            itemScope 
            itemType="https://schema.org/ItemList" // 🚀 SEO Microdata Container
          >
              {blogs.map((blog, index) => (
                  <article 
                    key={blog._id} 
                    className="h-full transform transition-all duration-300 hover:-translate-y-2"
                    itemProp="itemListElement" 
                    itemScope 
                    itemType="https://schema.org/ListItem"
                  >
                      {/* 🚀 Tracks position visually for Google's schema parser */}
                      <meta itemProp="position" content={index + 1} />
                      
                      <div itemProp="item" itemScope itemType="https://schema.org/BlogPosting" className="h-full">
                         <BlogCard blog={blog} priority={index === 0} />
                      </div>
                  </article>
              ))}
          </div>
        ) : (
          <div className="text-center py-20 sm:py-24 bg-white/[0.02] rounded-[2.5rem] border border-dashed border-white/10 mx-2 sm:mx-0">
              <Hash className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-white/10 mb-6" aria-hidden="true" />
              <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">No articles found</h2>
              <p className="text-sm sm:text-base text-gray-400">Be the first to share your experience with the community!</p>
              
              {(search || tag !== "All") && (
                <Link href="/blogs" className="inline-block mt-6" title="Reset blog filters">
                  <Button variant="outline" className="rounded-full">Clear Filters</Button>
                </Link>
              )}
          </div>
        )}
      </section>

      {totalPages > 1 && (
        <footer className="mt-12 sm:mt-16" aria-label="Pagination Navigation">
            <Pagination currentPage={Number(page)} totalPages={totalPages} />
        </footer>
      )}
    </>
  );
}