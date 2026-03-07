"use client";

import { useState, useEffect } from "react";
import { formatDistanceToNow, format } from "date-fns";
import { 
  Plus, Calendar as CalIcon, BookOpen, ExternalLink, Clock, Globe, 
  Lock, Share2, Trash2, CheckCircle2, Circle, Trophy, School, 
  GraduationCap, Lightbulb, Layout, Flame, Award
} from "lucide-react";
import { 
  createStudyEvent, togglePlanVisibility, deleteStudyPlan, 
  removeResourceFromPlan, toggleStepCompletion 
} from "@/actions/planner.actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import Link from "next/link";
import ConfettiCelebration from "./ConfettiCelebration"; // 🚀 ADDED

// 🚀 Progress Circle Component for Visual Analytics
const ProgressCircle = ({ progress, size = 44 }) => {
  const radius = 18;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="22" cy="22" r={radius}
          stroke="currentColor" strokeWidth="4"
          fill="transparent" className="text-white/5"
        />
        <circle
          cx="22" cy="22" r={radius}
          stroke="currentColor" strokeWidth="4"
          fill="transparent"
          strokeDasharray={circumference}
          style={{ strokeDashoffset: offset }}
          strokeLinecap="round"
          className="text-cyan-500 transition-all duration-1000 ease-in-out"
        />
      </svg>
      <span className="absolute text-[10px] font-black text-white">{Math.round(progress)}%</span>
    </div>
  );
};

// 🚀 Category UI Config
const CATEGORY_CONFIG = {
  "University": { icon: <School size={12} />, color: "text-cyan-400 bg-cyan-400/10 border-cyan-400/20" },
  "School": { icon: <BookOpen size={12} />, color: "text-pink-400 bg-pink-400/10 border-pink-400/20" },
  "Competitive Exams": { icon: <Trophy size={12} />, color: "text-amber-400 bg-amber-400/10 border-amber-400/20" },
  "General": { icon: <Lightbulb size={12} />, color: "text-blue-400 bg-blue-400/10 border-blue-400/20" }
};

export default function PlannerClient({ initialPlans, userId, userBadges = [] }) {
  const [plans, setPlans] = useState(initialPlans);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ title: "", examDate: "", category: "University" });
  const [loadingId, setLoadingId] = useState(null);
  const [triggerConfetti, setTriggerConfetti] = useState(false); // 🚀 Confetti State

  const handleCreate = async (e) => {
    e.preventDefault();
    const res = await createStudyEvent(userId, formData);
    if (res.success) {
      setPlans([res.event, ...plans].sort((a, b) => new Date(a.examDate) - new Date(b.examDate)));
      setShowModal(false);
      setFormData({ title: "", examDate: "", category: "University" });
      toast({ title: "Study Goal Set!", description: "Now start pinning resources to this goal." });
    }
  };

  const handleToggleStep = async (planId, resourceId) => {
    const res = await toggleStepCompletion(userId, planId, resourceId);
    if (res.success) {
      setPlans(plans.map(p => {
        if (p._id === planId) {
          const updatedResources = p.resources.map(r => r.resourceId === resourceId ? { ...r, isDone: !r.isDone } : r);
          
          // 🚀 CHECK FOR COMPLETION CELEBRATION
          const isNowFinished = updatedResources.every(r => r.isDone) && updatedResources.length > 0;
          if (isNowFinished) {
            setTriggerConfetti(true);
            setTimeout(() => setTriggerConfetti(false), 5000);
            toast({ title: "Roadmap Complete!", description: "Goal achieved! You are ready for your exam." });
          }

          // 🚀 CHECK FOR STREAK CELEBRATION (From Server Action response)
          if (res.badgeAwarded) {
             setTriggerConfetti(true);
             setTimeout(() => setTriggerConfetti(false), 5000);
             toast({ title: "Consistency Earned!", description: "You unlocked the Consistent Learner badge!" });
          }

          return { ...p, resources: updatedResources };
        }
        return p;
      }));
    }
  };

  const handleTogglePublish = async (plan) => {
    setLoadingId(plan._id);
    const newStatus = !plan.isPublic;
    const res = await togglePlanVisibility(userId, plan._id, newStatus);
    
    if (res.success) {
      setPlans(plans.map(p => p._id === plan._id ? { ...p, isPublic: newStatus, slug: res.slug || p.slug } : p));
      toast({ title: newStatus ? "Roadmap Published!" : "Roadmap is now Private." });
    } else {
      toast({ title: "Error", description: res.error, variant: "destructive" });
    }
    setLoadingId(null);
  };

  const handleDeletePlan = async (planId) => {
    if (!confirm("Are you sure you want to permanently delete this study plan?")) return;
    setLoadingId(planId);
    const res = await deleteStudyPlan(userId, planId);
    
    if (res.success) {
      setPlans(plans.filter(p => p._id !== planId));
      toast({ title: "Study Plan Deleted" });
    } else {
      toast({ title: "Error", description: res.error, variant: "destructive" });
    }
    setLoadingId(null);
  };

  const handleRemoveResource = async (planId, resourceId) => {
    const res = await removeResourceFromPlan(userId, planId, resourceId);
    if (res.success) {
      setPlans(plans.map(p => {
        if (p._id === planId) {
          return { ...p, resources: p.resources.filter(r => r.resourceId !== resourceId) };
        }
        return p;
      }));
      toast({ title: "Resource removed from plan." });
    } else {
      toast({ title: "Error", description: res.error, variant: "destructive" });
    }
  };

  const handleShare = async (plan) => {
    const url = `${window.location.origin}/roadmaps/${plan.slug}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Roadmap: ${plan.title}`, url });
      } catch (err) {
        if (err.name !== "AbortError") fallbackCopy(url);
      }
    } else {
      fallbackCopy(url);
    }
  };

  const fallbackCopy = (url) => {
    navigator.clipboard.writeText(url);
    toast({ title: "Link Copied!" });
  };

  return (
    <div className="space-y-10">
      <ConfettiCelebration trigger={triggerConfetti} />
      
      {/* 🚀 STREAK DASHBOARD */}
      <div className="p-6 rounded-[32px] bg-gradient-to-br from-orange-500/10 via-transparent to-pink-500/10 border border-white/10 flex flex-col md:flex-row items-center justify-between gap-6 group backdrop-blur-sm">
        <div className="flex items-center gap-5">
          <div className={`p-4 rounded-[24px] ${userBadges.includes("Consistent Learner") ? 'bg-orange-500 text-black' : 'bg-white/5 text-gray-500'} transition-all duration-700 shadow-2xl`}>
            <Flame size={32} className={userBadges.includes("Consistent Learner") ? "animate-pulse" : ""} />
          </div>
          <div>
            <h4 className="text-lg font-black text-white uppercase tracking-wider">Consistency Status</h4>
            <p className="text-xs text-gray-500 font-bold uppercase tracking-widest mt-1">
              {userBadges.includes("Consistent Learner") 
                ? "Level: Consistent Learner (Badge Earned)" 
                : "Task: Complete a step 3 days in a row to earn your badge."}
            </p>
          </div>
        </div>
        {userBadges.includes("Consistent Learner") && (
          <Badge className="bg-orange-500/20 text-orange-400 border-orange-500/30 px-6 py-2 rounded-full flex gap-2 items-center text-[10px] font-black uppercase">
            <Award size={14} /> Certified Elite
          </Badge>
        )}
      </div>

      <div className="flex justify-end">
        <Link href="/roadmaps">
          <Button variant="outline" className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 rounded-full backdrop-blur-sm">
            <Globe className="w-4 h-4 mr-2" /> Browse Community Roadmaps
          </Button>
        </Link>
      </div>

      <button 
        onClick={() => setShowModal(true)}
        className="group relative w-full py-8 border-2 border-dashed border-white/10 rounded-[32px] flex flex-col items-center justify-center hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all duration-500"
      >
        <div className="p-4 rounded-full bg-white/5 group-hover:bg-cyan-500 group-hover:text-black transition-all duration-500 shadow-xl">
          <Plus size={24} />
        </div>
        <span className="mt-4 font-bold text-gray-400 group-hover:text-white transition-colors uppercase tracking-widest text-[10px]">Set New Academic Objective</span>
      </button>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {plans.map((plan) => {
          const completedSteps = plan.resources.filter(r => r.isDone).length;
          const totalSteps = plan.resources.length;
          const progress = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
          const totalEstimatedTime = plan.resources.reduce((acc, r) => acc + (r.estimatedTime || 60), 0);
          const cat = CATEGORY_CONFIG[plan.category] || CATEGORY_CONFIG["General"];

          return (
            <div key={plan._id} className="group relative p-8 rounded-[40px] bg-white/[0.02] border border-white/10 hover:border-cyan-500/30 transition-all duration-500 flex flex-col h-full overflow-hidden shadow-2xl backdrop-blur-sm">
              
              {/* 🚀 Visual Progress Bar (Top) */}
              <div className="absolute top-0 left-0 w-full h-1 bg-white/5">
                <div 
                  className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 transition-all duration-1000 ease-out shadow-[0_0_10px_rgba(34,211,238,0.5)]" 
                  style={{ width: `${progress}%` }}
                />
              </div>

              <div className="flex justify-between items-start mb-6">
                <Badge className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${cat.color} flex items-center gap-1.5 shadow-sm`}>
                  {cat.icon} {plan.category}
                </Badge>
                
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className={`h-8 w-8 rounded-full transition-colors ${plan.isPublic ? "text-cyan-400 hover:bg-cyan-400/10" : "text-gray-500"}`} 
                    onClick={() => handleTogglePublish(plan)}
                    disabled={loadingId === plan._id}
                  >
                    {plan.isPublic ? <Globe size={16} /> : <Lock size={16} />}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8 rounded-full text-gray-500 hover:text-red-500 hover:bg-red-500/10" 
                    onClick={() => handleDeletePlan(plan._id)}
                    disabled={loadingId === plan._id}
                  >
                    <Trash2 size={16} />
                  </Button>
                </div>
              </div>

              <div className="mb-6 flex justify-between items-start gap-4">
                <div className="flex-1">
                  <h2 className="text-2xl font-black text-white leading-tight mb-2 group-hover:text-cyan-300 transition-colors">
                    {plan.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-4">
                    <div className="flex items-center gap-1.5 text-pink-500 text-[10px] font-black uppercase tracking-widest bg-pink-500/10 px-2 py-1 rounded-md border border-pink-500/20">
                      <Clock size={12} /> {formatDistanceToNow(new Date(plan.examDate), { addSuffix: true })}
                    </div>
                    <div className="text-gray-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1">
                      <CalIcon size={12} /> {format(new Date(plan.examDate), "MMM dd, yyyy")}
                    </div>
                  </div>
                </div>
                {/* 🚀 Progress Ring with Animation */}
                <div className="shrink-0 group-hover:scale-110 transition-transform duration-500">
                   <ProgressCircle progress={progress} />
                </div>
              </div>

              {/* 🚀 Milestones Checklist */}
              <div className="flex-1 space-y-3">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex flex-col">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-gray-400">Execution Path</h4>
                    <span className="text-[9px] text-gray-500 font-bold uppercase flex items-center gap-1 mt-0.5">
                      <Clock size={10} className="text-cyan-500/70" /> Workload: {totalEstimatedTime} mins
                    </span>
                  </div>
                  <span className="text-[10px] font-black text-cyan-400 bg-cyan-400/10 px-2 py-0.5 rounded-full border border-cyan-400/20">
                    {Math.round(progress)}% Mastery
                  </span>
                </div>

                {totalSteps === 0 ? (
                  <div className="py-6 text-center border border-dashed border-white/5 rounded-3xl bg-white/[0.01]">
                    <p className="text-[10px] text-gray-600 font-bold uppercase tracking-widest italic">Inventory empty. Add notes to begin.</p>
                  </div>
                ) : (
                  plan.resources.map((res, i) => {
                    const linkTarget = res.resourceType === 'Note' 
                      ? `/notes/${res.resourceSlug || res.resourceId}` 
                      : `/blogs/${res.resourceSlug || res.resourceId}`;

                    return (
                      <div key={i} className={`group/item flex items-center justify-between p-4 rounded-2xl transition-all duration-300 border ${res.isDone ? 'bg-cyan-500/5 border-cyan-500/20' : 'bg-white/[0.03] border-white/5 hover:border-white/10'}`}>
                        <div className="flex items-center gap-4 overflow-hidden flex-1">
                          <button 
                            onClick={() => handleToggleStep(plan._id, res.resourceId)}
                            className="shrink-0 transition-transform active:scale-90"
                          >
                            {res.isDone ? (
                              <CheckCircle2 className="text-cyan-400 w-6 h-6 fill-cyan-400/10" />
                            ) : (
                              <Circle className="text-gray-600 w-6 h-6 group-hover/item:text-cyan-400/50" />
                            )}
                          </button>
                          <div className="flex flex-col min-w-0 flex-1">
                            <Link href={linkTarget} className={`text-sm font-bold truncate transition-all ${res.isDone ? 'text-gray-500 line-through opacity-60' : 'text-gray-200 group-hover/item:text-white'}`}>
                              {res.resourceTitle || `View ${res.resourceType}`}
                            </Link>
                            <span className="text-[9px] text-gray-500 font-black uppercase tracking-tighter mt-0.5 flex items-center gap-1">
                              ~{res.estimatedTime || 60} mins
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Link href={linkTarget}>
                            <Button size="icon" variant="ghost" className="h-8 w-8 text-gray-500 hover:text-white hover:bg-white/5">
                              <ExternalLink size={14} />
                            </Button>
                          </Link>
                          <button 
                            onClick={() => handleRemoveResource(plan._id, res.resourceId)}
                            className="h-8 w-8 flex items-center justify-center text-gray-600 hover:text-red-500 transition-colors opacity-0 group-hover/item:opacity-100"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {plan.isPublic && (
                <Button 
                  className="mt-8 w-full rounded-2xl bg-white/5 border border-white/10 text-white font-black uppercase tracking-widest text-[10px] hover:bg-cyan-500 hover:text-black hover:border-cyan-500 transition-all py-6 shadow-xl"
                  onClick={() => handleShare(plan)}
                >
                  <Share2 className="mr-2 h-4 w-4" /> Share Path
                </Button>
              )}
            </div>
          );
        })}
      </div>

      {/* 🚀 SET GOAL MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="bg-[#0a0a0a] border border-white/10 w-full max-w-md rounded-[40px] p-10 shadow-[0_0_50px_rgba(34,211,238,0.1)] animate-in zoom-in-95 duration-500">
            <div className="flex justify-center mb-6">
              <div className="p-4 bg-cyan-500/10 rounded-full text-cyan-400 border border-cyan-500/20 shadow-2xl">
                <Layout size={32} />
              </div>
            </div>
            <h2 className="text-3xl font-black text-white mb-2 text-center tracking-tight">Initiate Objective</h2>
            <p className="text-gray-500 text-center text-sm mb-8 font-medium">Classify your goal and define the temporal horizon.</p>
            
            <form onSubmit={handleCreate} className="space-y-6">
              <div className="space-y-3">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Category Selection</label>
                <div className="grid grid-cols-2 gap-2">
                  {Object.keys(CATEGORY_CONFIG).map(cat => (
                    <button 
                      key={cat} type="button" 
                      onClick={() => setFormData({...formData, category: cat})}
                      className={`p-3 text-[9px] font-black uppercase tracking-widest rounded-2xl border transition-all flex items-center justify-center gap-2 ${formData.category === cat ? 'bg-white text-black border-white shadow-xl scale-[1.02]' : 'bg-white/5 border-white/10 text-gray-500 hover:text-white hover:bg-white/10'}`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Objective Designation</label>
                <input required type="text" placeholder="e.g. UPSC CSE Mains" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-cyan-500 transition-all shadow-inner font-bold" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-gray-500 ml-2">Target Date</label>
                <input required type="date" className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-white outline-none focus:border-cyan-500 transition-all invert-calendar-icon font-bold" value={formData.examDate} onChange={(e) => setFormData({...formData, examDate: e.target.value})} />
              </div>

              <div className="flex gap-3 pt-4">
                <Button type="button" variant="ghost" className="flex-1 rounded-2xl h-14 text-gray-500 font-bold hover:bg-white/5" onClick={() => setShowModal(false)}>Cancel</Button>
                <Button type="submit" className="flex-[2] h-14 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-black font-black uppercase tracking-widest text-[11px] shadow-[0_10px_30px_rgba(34,211,238,0.3)]">Publish Roadmap</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}