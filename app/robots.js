export default function robots() {
  const BASE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://www.stuhive.in";

  return {
    rules: [
      {
        userAgent: "*",
        allow: [
          "/",
          "/search", // Explicitly allow the Notes Listing page
        ],
        disallow: [
          "/api/",       // Protect backend routes 
          "/settings/",  // Private user settings
          "/admin/",     // Sensitive admin area
          "/*?q=",       // Disallow global-search result variations
          "/*?search=",  // Disallow specific search query result variations
          "/*?tag=",     // 🚀 PREVENT INDEXING OF TAG FILTERS
        ],
      },
    ],
    sitemap: `${BASE_URL}/sitemap.xml`,
  };
}