import React from "react";

export default function LoadingSplash({ message = "Loading..." }) {
  return (
    <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#090E17] splash-entrance">
      {/* Animated background particles */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 grid-bg opacity-30" />
        <div className="splash-orb splash-orb-1" />
        <div className="splash-orb splash-orb-2" />
        <div className="splash-orb splash-orb-3" />
      </div>

      {/* Main content */}
      <div className="relative flex flex-col items-center gap-6 splash-content">
        {/* Logo with layered glow effects */}
        <div className="relative splash-logo-entry">
          {/* Outer glow ring */}
          <div className="absolute -inset-4 rounded-2xl bg-[#00A884]/10 splash-glow-outer" />
          {/* Middle glow ring */}
          <div className="absolute -inset-2 rounded-xl bg-[#00A884]/5 splash-glow-middle" />
          
          {/* Logo container */}
          <div className="relative w-24 h-24 rounded-xl logo-zoom splash-logo-float">
            <img
              src="/vyaparmind-logo.png"
              alt="VyaparMind"
              className="w-24 h-24"
            />
          </div>

          {/* Rotating ring */}
          <div className="absolute -inset-3 splash-ring">
            <svg className="w-full h-full" viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="56" fill="none" stroke="url(#splash-gradient)" strokeWidth="1.5" strokeDasharray="12 8" strokeLinecap="round" />
              <defs>
                <linearGradient id="splash-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#00A884" stopOpacity="0.8" />
                  <stop offset="50%" stopColor="#00C896" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="#00A884" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          {/* Pulse burst */}
          <div className="absolute inset-0 rounded-xl border border-[#00A884]/50 splash-pulse-burst" />
        </div>

        {/* Brand name with gradient */}
        <div className="splash-text-entry">
          <span className="font-display font-black text-2xl tracking-tighter bg-gradient-to-r from-white via-white to-[#00A884] bg-clip-text text-transparent">
            VyaparMind
          </span>
        </div>

        {/* Premium loading bar */}
        <div className="splash-bar-entry">
          <div className="w-52 h-[3px] bg-white/[0.06] rounded-full overflow-hidden backdrop-blur-sm">
            <div className="h-full rounded-full splash-loading-bar" />
          </div>
        </div>

        {/* Message with shimmer */}
        <div className="splash-msg-entry">
          <p className="text-sm text-white/40 tracking-wider uppercase splash-shimmer">{message}</p>
        </div>
      </div>
    </div>
  );
}
