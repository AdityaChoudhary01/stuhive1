import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getCreatorAnalytics, getUserDashboardAnalytics } from "@/actions/analytics.actions";
import AnalyticsClient from "./AnalyticsClient";

export const metadata = {
  title: "Creator Analytics | StuHive Dashboard",
  robots: { index: false, follow: false }
};

export default async function AnalyticsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  // 🚀 Fetch all analytical data in parallel
  const [rawData, financialData] = await Promise.all([
    getCreatorAnalytics(session.user.id),
    getUserDashboardAnalytics()
  ]);

  if (!financialData.success) {
    return <div className="p-10 text-red-500 text-center">Failed to load analytics data.</div>;
  }

  return (
    <main className="min-h-screen bg-background pt-24 pb-12">
      <div className="container max-w-6xl px-4 mx-auto">
        <AnalyticsClient 
          rawData={rawData} 
          financialStats={financialData.financialStats}
          contentStats={financialData.contentStats}
          transactions={financialData.transactions}
        />
      </div>
    </main>
  );
}