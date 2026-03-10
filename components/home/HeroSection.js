"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { FaBolt, FaStar, FaRocket, FaArrowRight, FaFeatherAlt } from "react-icons/fa";

export default function HeroSection() {
  const [currentActivity, setCurrentActivity] = useState(0);
  const [fade, setFade] = useState(true);

  const activities = useMemo(
    () => [
      { user: "Aditya", action: "uploaded React Notes", icon: <FaBolt aria-hidden="true" className="text-amber-400 w-3.5 h-3.5" /> },
      { user: "Sneha", action: "shared DBMS PDF", icon: <FaStar aria-hidden="true" className="text-cyan-400 w-3.5 h-3.5" /> },
      { user: "Rahul", action: "joined StuHive", icon: <FaRocket aria-hidden="true" className="text-purple-400 w-3.5 h-3.5" /> },
    ],
    []
  );

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setCurrentActivity((prev) => (prev + 1) % activities.length);
        setFade(true);
      }, 300);
    }, 4000);
    return () => clearInterval(interval);
  }, [activities.length]);

  return (
    <section
      // 🚀 CHANGED: Added bg-background here to perfectly match the global theme
      className="relative w-full min-h-[80vh] flex flex-col items-center justify-center overflow-hidden py-20 px-4 sm:px-6 lg:px-8 bg-background"
      aria-label="Welcome to StuHive Educational Network"
      itemScope
      itemType="https://schema.org/WPHeader"
    >
      {/* --- PROFESSIONAL AMBIENT BACKGROUND --- */}
      {/* Soft, diffuse background glows instead of harsh neon blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-3xl h-[500px] bg-cyan-500/10 blur-[120px] rounded-full pointer-events-none -z-10" aria-hidden="true" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-500/5 blur-[150px] rounded-full pointer-events-none -z-10" aria-hidden="true" />

      {/* Elegant Architect Grid Overlay */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20 -z-10"
        aria-hidden="true"
        style={{
          maskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse at center, black 40%, transparent 80%)",
        }}
      >
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.05)_1px,transparent_1px)] [background-size:40px_40px]" />
      </div>

      <div className="text-center z-10 max-w-4xl mx-auto w-full">
        
        {/* --- LIVE ACTIVITY BADGE (SaaS Style) --- */}
        <div className="mx-auto w-fit mb-8 sm:mb-10" aria-hidden="true">
          <div
            className="flex items-center gap-2.5 bg-white/[0.03] backdrop-blur-md border border-white/10
              rounded-full px-4 py-1.5 sm:px-5 sm:py-2 shadow-sm transition-all duration-300 hover:bg-white/[0.05] hover:border-white/20"
          >
            <div className="relative flex h-2 w-2 shrink-0 items-center justify-center">
              <span className="absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-60 animate-pulse"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-cyan-500"></span>
            </div>

            <div
              className={`relative z-10 text-[11px] sm:text-xs font-medium tracking-wide
                text-gray-300 flex items-center gap-2 transition-opacity duration-300 ${fade ? "opacity-100" : "opacity-0"}`}
            >
              {activities[currentActivity].icon}
              <span className="truncate max-w-[220px] sm:max-w-none">
                <strong className="text-white font-semibold">{activities[currentActivity].user}</strong> {activities[currentActivity].action}
              </span>
            </div>
          </div>
        </div>

        {/* --- HEADLINE --- */}
        <h1 
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white mb-6 leading-[1.15] tracking-tight" 
          itemProp="headline"
        >
          Master Your Coursework <br className="hidden sm:block" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500">
            with StuHive
          </span>
        </h1>

        {/* --- DESCRIPTION --- */}
        <p 
          className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-10 sm:mb-12 leading-relaxed" 
          itemProp="description"
        >
          The collaborative archive for high-performing university students. 
          <span className="text-gray-300 block mt-1 sm:mt-0 sm:inline"> Download free study materials, share notes, and conquer exams together.</span>
        </p>

        {/* --- CALL TO ACTION BUTTONS --- */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 w-full px-2 sm:px-0">
          
          {/* Primary Button */}
          <Link
            href="/search"
            title="Explore Free Study Materials"
            aria-label="Start Learning and explore academic notes"
            className="w-full sm:w-auto group flex items-center justify-center gap-3 px-8 py-3.5 sm:py-4 rounded-full
              bg-cyan-500 text-black font-bold text-sm sm:text-base
              transition-all duration-300 transform hover:-translate-y-0.5 hover:shadow-[0_10px_40px_-10px_rgba(34,211,238,0.5)]
              outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
          >
            <FaRocket aria-hidden="true" className="transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
            <span>Start Learning</span>
            <FaArrowRight aria-hidden="true" size={14} className="transition-transform duration-300 group-hover:translate-x-1" />
          </Link>

          {/* Secondary Button */}
          <Link
            href="/notes/upload"
            title="Upload your notes"
            aria-label="Share your own academic notes with the community"
            className="w-full sm:w-auto group flex items-center justify-center gap-3 px-8 py-3.5 sm:py-4 rounded-full
              bg-white/[0.03] border border-white/10 text-white font-semibold text-sm sm:text-base backdrop-blur-md
              transition-all duration-300 hover:bg-white/[0.08] hover:border-white/20 hover:-translate-y-0.5
              outline-none focus-visible:ring-2 focus-visible:ring-white/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050505]"
          >
            <FaFeatherAlt aria-hidden="true" className="text-cyan-400 transition-transform duration-300 group-hover:rotate-12" />
            <span>Share Notes</span>
          </Link>
          
        </div>
        
      </div>
    </section>
  );
}