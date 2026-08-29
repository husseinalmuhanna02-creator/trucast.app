import React from 'react';

interface TruCastLogoProps {
  className?: string;
  showBg?: boolean;
}

export const TruCastLogo: React.FC<TruCastLogoProps> = ({ 
  className = "w-8 h-8", 
  showBg = false 
}) => {
  return (
    <svg 
      viewBox="0 0 512 512" 
      className={`${className} select-none`}
      fill="none" 
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        {/* Soft, premium shadow to match the floating paper-cut look in the user's uploaded logo */}
        <filter id="trucastLogoShadow" x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="12" stdDeviation="10" floodColor="#000000" floodOpacity="0.4" />
        </filter>
        
        {/* Beautiful radial & linear gradients to match the rich deep blue-purple background of the image */}
        <radialGradient id="trucastBgRadial" cx="50%" cy="30%" r="80%" fx="50%" fy="30%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="60%" stopColor="#1d4ed8" />
          <stop offset="100%" stopColor="#0f172a" />
        </radialGradient>
      </defs>

      {/* Rounded squircle background if requested */}
      {showBg && (
        <rect width="512" height="512" rx="140" fill="url(#trucastBgRadial)" />
      )}

      {/* Main Logo Group with the 3D Soft Shadow */}
      <g filter="url(#trucastLogoShadow)">
        {/* 1. Stylized "T" left arm and main vertical stem */}
        {/* The left arm curves beautifully down into the central stem. */}
        <path 
          d="M 140 224 
             C 140 196.38, 162.38 174, 190 174 
             L 300 174 
             C 327.62 174, 350 196.38, 350 224
             L 350 226
             C 350 231.52, 345.52 236, 340 236
             L 288 236
             C 281.37 236, 276 241.37, 276 248
             L 276 330
             C 276 341.05, 267.05 350, 256 350
             C 244.95 350, 236 341.05, 236 330
             L 236 248
             C 236 241.37, 230.63 236, 224 236
             L 150 236
             C 144.48 236, 140 231.52, 140 226
             Z" 
          fill="white" 
        />

        {/* 2. Right Arm of the T (The separate floating horizontal capsule) */}
        <path 
          d="M 290 174
             L 338 174
             C 344.63 174, 350 179.37, 350 186
             L 350 214
             C 350 220.63, 344.63 226, 338 226
             L 290 226
             C 283.37 226, 278 220.63, 278 214
             L 278 186
             C 278 179.37, 283.37 174, 290 174
             Z"
          fill="white"
          opacity="0.95"
        />

        {/* 3. Broadcast Waves (Concentric Arcs on the top right) */}
        {/* Inner Wave Arc */}
        <path 
          d="M 292 142 
             C 330 142, 382 176, 404 224" 
          stroke="white" 
          strokeWidth="16" 
          strokeLinecap="round" 
        />
        {/* Outer Wave Arc */}
        <path 
          d="M 292 100 
             C 362 100, 442 152, 472 224" 
          stroke="white" 
          strokeWidth="16" 
          strokeLinecap="round" 
        />

        {/* 4. Podcast Retro Microphone (at the bottom center) */}
        {/* Mic Capsule */}
        <rect 
          x="228" 
          y="342" 
          width="56" 
          height="92" 
          rx="28" 
          fill="white" 
        />
        {/* Mic Grille horizontal lines */}
        <line x1="238" y1="368" x2="274" y2="368" stroke="url(#trucastBgRadial)" strokeWidth="4" strokeLinecap="round" opacity="0.15" />
        <line x1="234" y1="380" x2="278" y2="380" stroke="url(#trucastBgRadial)" strokeWidth="4" strokeLinecap="round" opacity="0.15" />
        <line x1="234" y1="392" x2="278" y2="392" stroke="url(#trucastBgRadial)" strokeWidth="4" strokeLinecap="round" opacity="0.15" />
        <line x1="238" y1="404" x2="274" y2="404" stroke="url(#trucastBgRadial)" strokeWidth="4" strokeLinecap="round" opacity="0.15" />

        {/* Mic Cradle (U-shaped stand) */}
        <path 
          d="M 212 388 
             C 212 426, 230 442, 256 442 
             C 282 442, 300 426, 300 388" 
          stroke="white" 
          strokeWidth="10" 
          strokeLinecap="round" 
        />
        {/* Mic Stand and Base */}
        <line x1="256" y1="442" x2="256" y2="464" stroke="white" strokeWidth="10" strokeLinecap="round" />
        <line x1="232" y1="464" x2="280" y2="464" stroke="white" strokeWidth="10" strokeLinecap="round" />
      </g>
    </svg>
  );
};
