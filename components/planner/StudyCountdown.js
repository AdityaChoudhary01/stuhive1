import { getUserStudyPlans } from "@/actions/planner.actions";
import { Clock, ArrowRight, Target, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";

export default async function StudyCountdown({ userId }) {
  const { plans } = await getUserStudyPlans(userId);
  
  // Plans are pre-sorted by date in the action
  const nextExam = plans && plans.length > 0 ? plans[0] : null;

  if (!nextExam) return null;

  // Calculate Progress Stats
  const totalSteps = nextExam.resources?.length || 0;
  const completedSteps = nextExam.resources?.filter(r => r.isDone).length || 0;
  const progressPercentage = totalSteps > 0 ? Math.round((completedSteps / totalSteps) * 100) : 0;

  return (
    <div className="p-5 rounded-[32px] bg-gradient-to-br from-cyan-500/10 via-transparent to-purple-500/10 border border-white/10 relative overflow-hidden group transition-all duration-500 hover:border-cyan-500/30">
      {/* Background Decorative Icon */}
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Target size={60} className="text-cyan-400" />
      </div>
      
      <div className="relative z-10">
        <div className="flex justify-between items-start">
          <div className="flex flex-col">
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-cyan-400">Next Target</span>
             <h3 className="text-xl font-black text-white mt-1 leading-tight group-hover:text-cyan-300 transition-colors">
               {nextExam.title}
             </h3>
          </div>
          
          {/* 🚀 NEW: Progress Circular Indicator (SVG) */}
          <div className="relative flex items-center justify-center h-12 w-12 shrink-0">
             <svg className="h-full w-full transform -rotate-90">
               <circle
                 cx="24" cy="24" r="20"
                 stroke="currentColor" strokeWidth="4"
                 fill="transparent" className="text-white/5"
               />
               <circle
                 cx="24" cy="24" r="20"
                 stroke="currentColor" strokeWidth="4"
                 fill="transparent"
                 strokeDasharray={125.6}
                 strokeDashoffset={125.6 - (125.6 * progressPercentage) / 100}
                 className="text-cyan-500 transition-all duration-1000 ease-out"
               />
             </svg>
             <span className="absolute text-[10px] font-black text-white">{progressPercentage}%</span>
          </div>
        </div>
        
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-2 text-gray-400">
            <Clock size={14} className="text-pink-500" />
            <span className="text-sm font-bold">
              {formatDistanceToNow(new Date(nextExam.examDate), { addSuffix: true })}
            </span>
          </div>
          
          {progressPercentage === 100 && (
            <div className="flex items-center gap-1.5 text-emerald-400 bg-emerald-400/10 px-2 py-0.5 rounded-full border border-emerald-400/20">
               <CheckCircle2 size={10} />
               <span className="text-[9px] font-black uppercase tracking-widest">Ready</span>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Milestones</span>
            <span className="text-white font-black">
              {completedSteps} / {totalSteps} Completed
            </span>
          </div>
          
          <Link href={`/planner`}>
            <button className="h-10 w-10 rounded-full bg-white text-black flex items-center justify-center hover:scale-110 active:scale-95 transition-all shadow-lg shadow-white/10">
              <ArrowRight size={18} />
            </button>
          </Link>
        </div>
      </div>
      
      {/* 🚀 NEW: Bottom Progress Bar for extra visual feedback */}
      <div className="absolute bottom-0 left-0 h-1 bg-cyan-500/20 w-full">
         <div 
           className="h-full bg-cyan-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(34,211,238,0.5)]" 
           style={{ width: `${progressPercentage}%` }} 
         />
      </div>
    </div>
  );
}