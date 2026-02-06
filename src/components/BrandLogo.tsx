
"use client";

import { cn } from "@/lib/utils";

interface BrandLogoProps {
  className?: string;
  showText?: boolean;
  size?: "sm" | "md" | "lg" | "xl";
}

export default function BrandLogo({ className, showText = true, size = "md" }: BrandLogoProps) {
  const sizes = {
    sm: "h-8",
    md: "h-12",
    lg: "h-20",
    xl: "h-32"
  };

  return (
    <div className={cn("flex items-center gap-3", sizes[size], className)}>
      <svg
        viewBox="0 0 200 60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-full w-auto drop-shadow-sm"
      >
        <defs>
          <linearGradient id="bagGrad" x1="0" y1="0" x2="50" y2="60" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#BE29EC" />
            <stop offset="100%" stopColor="#29A6EC" />
          </linearGradient>
          <linearGradient id="textGrad" x1="120" y1="0" x2="180" y2="0" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#29A6EC" />
            <stop offset="100%" stopColor="#BE29EC" />
          </linearGradient>
          <filter id="textGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        
        {/* Shopping Bag */}
        <path 
          d="M12 18C12 15.7909 13.7909 14 16 14H44C46.2091 14 48 15.7909 48 18V48C48 51.3137 45.3137 54 42 54H18C14.6863 54 12 51.3137 12 48V18Z" 
          fill="url(#bagGrad)" 
        />
        
        {/* Bag Handles */}
        <path 
          d="M22 14V11C22 7.13401 25.134 4 29 4C32.866 4 36 7.13401 36 11V14" 
          stroke="white" 
          strokeOpacity="0.6" 
          strokeWidth="2.5" 
          strokeLinecap="round" 
        />
        <circle cx="22" cy="14" r="2.5" fill="white" fillOpacity="0.8" />
        <circle cx="36" cy="14" r="2.5" fill="white" fillOpacity="0.8" />

        {/* 'W' on Bag */}
        <text 
          x="30" 
          y="44" 
          fill="white" 
          fontFamily="Inter, sans-serif" 
          fontWeight="900" 
          fontSize="26" 
          textAnchor="middle"
        >
          W
        </text>

        {/* 'WishZep' Text */}
        {showText && (
          <text 
            x="60" 
            y="42" 
            fontFamily="Inter, sans-serif" 
            fontWeight="900" 
            fontSize="32" 
            letterSpacing="-0.04em"
          >
            <tspan fill="#111" className="dark:fill-white">Wish</tspan>
            <tspan fill="url(#textGrad)">Zep</tspan>
          </text>
        )}
      </svg>
    </div>
  );
}
