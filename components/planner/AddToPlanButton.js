"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { 
  CalendarPlus, Loader2, CheckCircle2, School, Trophy, 
  BookOpen, Lightbulb, ChevronRight, Target, Clock, Plus, Minus 
} from "lucide-react";
import { addResourceToPlan, getUserStudyPlans } from "@/actions/planner.actions";
import { useSession } from "next-auth/react";
import { useToast } from "@/hooks/use-toast";

// 🚀 Helper to match category icons in the dropdown
const getCategoryIcon = (category) => {
  switch (category) {
    case 'School': return <BookOpen className="w-3 h-3 text-pink-400" />;
    case 'Competitive Exams': return <Trophy className="w-3 h-3 text-amber-400" />;
    case 'Other': return <Lightbulb className="w-3 h-3 text-blue-400" />;
    case 'University':
    default: return <School className="w-3 h-3 text-cyan-400" />;
  }
};

export default function AddToPlanButton({ resourceId, resourceType }) {
  const { data: session } = useSession();
  const { toast } = useToast();
  
  const [isOpen, setIsOpen] = useState(false);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedTime, setSelectedTime] = useState(60); // 🚀 NEW: State for estimated time
  const [addingToId, setAddingToId] = useState(null); // Tracking specific plan being updated
  
  const menuRef = useRef(null);

  // Close menu on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("touchstart", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [isOpen]);

  const loadPlans = async () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    if (!session) return toast({ 
      title: "Authentication Required", 
      description: "Please login to pin items to your study planner.",
      variant: "destructive" 
    });

    setLoading(true);
    setIsOpen(true); 
    const res = await getUserStudyPlans(session.user.id);
    setPlans(res.plans || []);
    setLoading(false);
  };

  const handleAdd = async (planId) => {
    setAddingToId(planId);
    const res = await addResourceToPlan(session.user.id, planId, {
      id: resourceId,
      type: resourceType,
      estimatedTime: selectedTime // 🚀 Passing custom time to backend
    });

    if (res.success) {
      toast({ 
        title: "Strategy Updated", 
        description: `Linked to plan with a ${selectedTime} min study goal.` 
      });
      setIsOpen(false);
    } else {
      toast({ title: res.error, variant: "destructive" });
    }
    setAddingToId(null);
  };

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={(e) => {
          e.preventDefault(); 
          e.stopPropagation();
          loadPlans();
        }}
        className={`p-2.5 rounded-full border transition-all duration-300 transform active:scale-95 ${
          isOpen 
          ? "bg-cyan-500 text-black border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.4)]" 
          : "bg-black/40 border-white/10 text-gray-400 hover:text-cyan-400 hover:border-cyan-500/50 hover:bg-cyan-500/10"
        }`}
        title="Pin to Study Planner"
      >
        <CalendarPlus size={16} />
      </button>

      {isOpen && (
        <div className="absolute right-0 bottom-full mb-3 w-72 bg-[#0a0a0a]/95 backdrop-blur-xl border border-white/10 rounded-[24px] shadow-[0_20px_50px_rgba(0,0,0,0.5)] p-4 z-[100] animate-in fade-in slide-in-from-bottom-3 duration-200">
          
          {/* 🚀 NEW: Time Estimation Slider Section */}
          <div className="mb-4 p-3 bg-white/5 rounded-2xl border border-white/5">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest flex items-center gap-1">
                <Clock size={10} /> Study Duration
              </span>
              <span className="text-xs font-black text-cyan-400">{selectedTime} mins</span>
            </div>
            <div className="flex items-center gap-3">
              <button 
                onClick={(e) => { e.stopPropagation(); setSelectedTime(Math.max(15, selectedTime - 15))}} 
                className="p-1 hover:bg-white/10 rounded-lg text-gray-400 transition-colors"
              >
                <Minus size={14}/>
              </button>
              <input 
                type="range" min="15" max="300" step="15" 
                value={selectedTime} 
                onChange={(e) => { e.stopPropagation(); setSelectedTime(parseInt(e.target.value))}}
                className="flex-1 accent-cyan-500 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer"
              />
              <button 
                onClick={(e) => { e.stopPropagation(); setSelectedTime(Math.min(480, selectedTime + 15))}} 
                className="p-1 hover:bg-white/10 rounded-lg text-gray-400 transition-colors"
              >
                <Plus size={14}/>
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2 px-1 mb-2">
            <Target className="w-3 h-3 text-cyan-400" />
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-500">Target Roadmap</p>
          </div>

          <div className="max-h-[200px] overflow-y-auto space-y-1 pr-1 custom-scrollbar">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-6 gap-2">
                <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">Syncing...</span>
              </div>
            ) : plans.length === 0 ? (
              <div className="px-3 py-6 text-center">
                <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                  No active roadmaps.<br/>
                  <Link href="/planner" className="text-cyan-400 hover:underline">Create one here</Link>
                </p>
              </div>
            ) : (
              plans.map(plan => (
                <button
                  key={plan._id}
                  disabled={addingToId === plan._id}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleAdd(plan._id);
                  }}
                  className="w-full text-left p-3 rounded-xl hover:bg-white/[0.05] transition-all flex items-center justify-between group disabled:opacity-50"
                >
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="p-1.5 rounded-lg bg-white/5 group-hover:bg-cyan-500/20 transition-colors">
                      {getCategoryIcon(plan.category)}
                    </div>
                    <span className="text-xs font-bold text-gray-200 truncate group-hover:text-white transition-colors">
                      {plan.title}
                    </span>
                  </div>
                  {addingToId === plan._id ? (
                    <Loader2 size={12} className="animate-spin text-cyan-400" />
                  ) : (
                    <ChevronRight className="w-3 h-3 text-gray-600 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                  )}
                </button>
              ))
            )}
          </div>
          
          <Link href="/planner" onClick={() => setIsOpen(false)}>
             <div className="mt-2 p-2 text-center rounded-xl bg-white/[0.03] hover:bg-white/5 border border-white/5 transition-colors cursor-pointer group">
                <span className="text-[9px] font-black uppercase tracking-widest text-gray-500 group-hover:text-gray-300">Open Planner Dashboard</span>
             </div>
          </Link>
        </div>
      )}
    </div>
  );
}