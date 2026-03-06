import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getUserStudyPlans } from "@/actions/planner.actions";
import PlannerClient from "@/components/planner/PlannerClient";
import { Target } from "lucide-react"; 

export const metadata = {
  title: "Study Planner | StuHive",
  description: "Map your resources to your exam dates and ace your finals.",
};

export default async function PlannerPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const { plans } = await getUserStudyPlans(session.user.id);

  return (
    <main className="min-h-screen pt-28 pb-20 px-4">
      
      <div className="max-w-5xl mx-auto relative z-10">
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="space-y-2">
            <div className="flex items-center gap-3 text-cyan-400">
              <Target className="w-5 h-5" />
              <span className="text-[10px] font-black uppercase tracking-[0.3em]">Academic Strategy</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight">
              Study <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-500">Planner</span>
            </h1>
            <p className="text-gray-400 font-medium">Organize your resources around your exam schedule.</p>
          </div>
        </header>

        {/* 🚀 The Interactive Client Logic */}
        <PlannerClient initialPlans={plans} userId={session.user.id} />
      </div>
    </main>
  );
}