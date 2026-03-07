"use client";

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { subscribeToNewsletter } from '@/actions/newsletter.actions'; 
import { getTopUniversities } from '@/actions/university.actions'; // 🚀 Added import for University Hubs
import { 
  FaLinkedin, FaGithub, FaYoutube, FaInstagram, 
  FaHeart, FaRocket, FaEnvelope, FaSpinner, FaCheckCircle, FaGraduationCap
} from 'react-icons/fa';

export default function Footer() {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState({ loading: false, success: false, error: null });
  const [universities, setUniversities] = useState([]); // 🚀 State for dynamic SEO links

  const currentYear = new Date().getFullYear();

  // 🚀 Fetch dynamic university hubs on mount
  useEffect(() => {
    async function loadUniversities() {
      try {
        const topUnivs = await getTopUniversities();
        setUniversities(topUnivs || []);
      } catch (error) {
        console.error("Failed to load university hubs", error);
      }
    }
    loadUniversities();
  }, []);

  const handleSubscribe = async (e) => {
    e.preventDefault();
    if (!email || status.loading) return;

    setStatus({ loading: true, success: false, error: null });

    try {
      const res = await subscribeToNewsletter(email);

      if (res.success) {
        setStatus({ loading: false, success: true, error: null });
        setEmail('');
        setTimeout(() => {
          setStatus(prev => ({ ...prev, success: false }));
        }, 5000);
      } else {
        throw new Error(res.error || "Failed to subscribe");
      }
    } catch (err) {
      setStatus({ 
        loading: false, 
        success: false, 
        error: err.message || "Failed to join. Try again later." 
      });
    }
  };

  const socialLinks = [
    { icon: <FaLinkedin />, url: "https://www.linkedin.com/in/aditya-kumar-38093a304/", color: "hover:bg-[#0077b5]", label: "LinkedIn" },
    { icon: <FaGithub />, url: "https://github.com/AdityaChoudhary01", color: "hover:bg-[#333] dark:hover:bg-white dark:hover:text-black", label: "GitHub" },
    { icon: <FaYoutube />, url: "https://www.youtube.com/@AdeeChoudhary", color: "hover:bg-[#ff0000]", label: "YouTube" },
    { icon: <FaInstagram />, url: "https://www.instagram.com/aditya_choudhary__021/", color: "hover:bg-gradient-to-tr hover:from-[#f09433] hover:via-[#dc2743] hover:to-[#bc1888]", label: "Instagram" }
  ];

  return (
    <footer className="relative mt-20 border-t border-border overflow-hidden bg-gradient-to-b from-transparent via-secondary/10 to-secondary/30 backdrop-blur-xl">
      
      {/* Glow Effect */}
      <div className="absolute -top-[200px] left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-primary/20 rounded-full blur-[80px] pointer-events-none animate-pulse-slow" />
      
      <div className="container relative z-10 py-20 pb-8">
        {/* 🚀 Changed grid to 5 columns to accommodate the new University Hubs section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-12 mb-12">
          
          {/* Brand Section */}
          <div className="flex flex-col gap-4 lg:col-span-1">
            <div className="text-3xl font-black bg-gradient-to-r from-cyan-400 to-purple-600 bg-clip-text text-transparent tracking-tighter">
              StuHive
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              A collaborative ecosystem for students to share knowledge, discover academic insights, and build the future of learning together.
            </p>
            <div className="flex gap-4 mt-4">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label={social.label}
                  className={`w-11 h-11 rounded-xl bg-secondary/30 border border-border flex items-center justify-center text-xl transition-all duration-300 hover:-translate-y-1 hover:scale-110 hover:text-white hover:shadow-lg hover:shadow-primary/20 ${social.color}`}
                >
                  {social.icon}
                </a>
              ))}
            </div>
          </div>

          {/* Quick Links */}
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-bold bg-gradient-to-r from-[#f093fb] to-[#4facfe] bg-clip-text text-transparent">Explore</h3>
            <ul className="flex flex-col gap-3">
              {[
                { name: "Home", path: "/" },
                { name: "About Mission", path: "/about" },
                { name: "Blog & Insights", path: "/blogs" },
                { name: "Share Notes", path: "/notes/upload" },
                { name: "Support Us", path: "/donate" }
              ].map(link => (
                <li key={link.name}>
                  <Link href={link.path} className="flex items-center gap-2 text-sm text-muted-foreground hover:text-primary hover:translate-x-1 transition-all duration-300 w-fit">
                    <FaRocket className="text-[10px] opacity-50" /> {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* 🚀 NEW: Top University Hubs SEO Column */}
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-bold bg-gradient-to-r from-[#f093fb] to-[#4facfe] bg-clip-text text-transparent">Top Hubs</h3>
            <ul className="flex flex-col gap-3">
              {universities.slice(0, 5).map(univ => (
                <li key={univ.slug}>
                  <Link 
                    href={`/univ/${univ.slug}`} 
                    title={`${univ.name} Study Materials`}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-cyan-400 hover:translate-x-1 transition-all duration-300 w-fit"
                  >
                    <FaGraduationCap className="text-[10px] opacity-50" /> {univ.name}
                  </Link>
                </li>
              ))}
              {universities.length === 0 && (
                <li className="text-sm text-muted-foreground animate-pulse">Loading hubs...</li>
              )}
            </ul>
          </div>

          {/* Legal & Help */}
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-bold bg-gradient-to-r from-[#f093fb] to-[#4facfe] bg-clip-text text-transparent">Legal & Help</h3>
            <ul className="flex flex-col gap-3">
              {[
                { name: "Contact Support", path: "/contact" },
                { name: "Terms of Service", path: "/terms" },
                { name: "Privacy Policy", path: "/privacy" },
                { name: "Purchase Policy", path: "/premium-purchase-policy" }, // 🚀 ADDED Premium Purchase Link
                { name: "DMCA Policy", path: "/dmca" }
              ].map(link => (
                <li key={link.name}>
                  <Link href={link.path} className="text-sm text-muted-foreground hover:text-primary hover:translate-x-1 transition-all duration-300 w-fit">
                    {link.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect Section (Newsletter) */}
          <div className="flex flex-col gap-4">
            <h3 className="text-lg font-bold bg-gradient-to-r from-[#f093fb] to-[#4facfe] bg-clip-text text-transparent">Connect</h3>
            <a href="mailto:aadiwrld01@gmail.com" className="text-sm text-cyan-400 hover:text-cyan-300 transition-colors w-fit">
              aadiwrld01@gmail.com
            </a>
            <p className="text-sm text-muted-foreground">Greater Noida, UP, India</p>
            
            <form onSubmit={handleSubscribe} className="flex flex-col gap-2 mt-4">
              <div className="flex gap-2">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Your email..."
                  className="flex-1 px-4 py-3 bg-secondary/20 border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all min-w-[120px]"
                />
                <button 
                  type="submit"
                  disabled={status.loading}
                  aria-label="Subscribe"
                  className={`px-5 rounded-xl flex items-center justify-center transition-all duration-300 ${
                    status.success 
                      ? 'bg-green-500 text-black' 
                      : 'bg-primary text-primary-foreground hover:opacity-90'
                  } ${status.loading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {status.loading ? <FaSpinner className="animate-spin" /> : status.success ? <FaCheckCircle /> : <FaEnvelope />}
                </button>
              </div>
              
              {status.error && <span className="text-xs text-red-500 mt-1">{status.error}</span>}
              {status.success && <span className="text-xs text-green-500 mt-1">Successfully subscribed!</span>}
            </form>
          </div>
        </div>

        {/* Divider */}
        <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent my-8" />

        {/* Bottom Bar */}
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 pt-4">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span>© {currentYear} StuHive. Made with</span>
            <FaHeart className="text-pink-500 animate-pulse" />
            <span>by Aditya Choudhary</span>
          </div>
          
          <div className="flex items-center gap-2 px-4 py-2 bg-secondary/20 border border-border rounded-full text-sm font-medium">
            <FaRocket className="text-cyan-400" />
            <span>Version 2.0</span>
          </div>
        </div>
      </div>

      {/* Custom Animation for the Glow */}
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes pulse-slow {
          0%, 100% { transform: translateX(-50%) scale(1); opacity: 0.5; }
          50% { transform: translateX(-50%) scale(1.1); opacity: 0.3; }
        }
        .animate-pulse-slow {
          animation: pulse-slow 8s ease-in-out infinite;
        }
      `}} />
    </footer>
  );
}