"use client";

import { FaWhatsapp, FaTelegramPlane, FaTwitter, FaCopy } from "react-icons/fa";
import { useToast } from "@/hooks/use-toast";

export default function ShareButtons({ title, slug }) {
  const { toast } = useToast();
  const shareUrl = `https://www.stuhive.in/updates/${slug}`;
  const shareText = `📢 *${title}* %0A%0ACheck out the latest updates, important dates, and vacancy details on StuHive! %0A%0A👉 Read more here: `;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl);
    toast({
      title: "Link Copied!",
      description: "You can now paste it anywhere.",
    });
  };

  return (
    <div className="flex flex-col gap-4 p-6 bg-white/5 border border-white/10 rounded-2xl mt-8">
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-500 text-center">
        Share this update with friends
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        {/* WhatsApp */}
        <a
          href={`https://api.whatsapp.com/send?text=${shareText}${shareUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-5 py-2.5 bg-[#25D366] text-black rounded-full font-black text-xs uppercase tracking-tighter hover:scale-105 transition-transform"
        >
          <FaWhatsapp size={16} /> WhatsApp
        </a>

        {/* Telegram */}
        <a
          href={`https://t.me/share/url?url=${shareUrl}&text=${title}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-5 py-2.5 bg-[#0088cc] text-white rounded-full font-black text-xs uppercase tracking-tighter hover:scale-105 transition-transform"
        >
          <FaTelegramPlane size={16} /> Telegram
        </a>

        {/* Twitter/X */}
        <a
          href={`https://twitter.com/intent/tweet?text=${title}&url=${shareUrl}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-5 py-2.5 bg-black border border-white/20 text-white rounded-full font-black text-xs uppercase tracking-tighter hover:scale-105 transition-transform"
        >
          <FaTwitter size={14} /> Twitter
        </a>

        {/* Copy Link */}
        <button
          onClick={copyToClipboard}
          className="flex items-center gap-2 px-5 py-2.5 bg-white/10 text-white border border-white/10 rounded-full font-black text-xs uppercase tracking-tighter hover:bg-white/20 transition-all"
        >
          <FaCopy size={14} /> Copy Link
        </button>
      </div>
    </div>
  );
}