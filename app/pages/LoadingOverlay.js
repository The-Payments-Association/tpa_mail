"use client";

import { useEffect, useState } from "react";
import { Building2 } from "lucide-react";

export default function LoadingOverlay({ 
  isVisible, 
  title = "Finding members you need to contact...", 
  subtitle = "Identifying the most relevant companies for commentary",
  forcedDuration = 5000 // 10 seconds default
}) {
  const [showOverlay, setShowOverlay] = useState(isVisible);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (isVisible) {
      setShowOverlay(true);
      setProgress(0);

      // Progress animation
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + (100 / (forcedDuration / 100)); // Update every 100ms
        });
      }, 100);

      // Force minimum duration
      const timer = setTimeout(() => {
        setShowOverlay(false);
        setProgress(100);
        clearInterval(progressInterval);
      }, forcedDuration);

      return () => {
        clearTimeout(timer);
        clearInterval(progressInterval);
      };
    } else {
      setShowOverlay(false);
      setProgress(0);
    }
  }, [isVisible, forcedDuration]);

  if (!showOverlay) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-white dark:bg-slate-900 flex items-center justify-center transition-colors duration-300">
      {/* Background pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#8882_1px,transparent_1px),linear-gradient(to_bottom,#8882_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"></div>
      
      {/* Main loading card */}
      <div className="relative backdrop-blur-xl bg-white dark:bg-slate-800 border border-white/30 dark:border-slate-700/30 rounded-3xl shadow-2xl p-12 text-center max-w-md mx-4 animate-in fade-in duration-500 transition-colors">
        
        {/* Spinner with logo */}
        <div className="w-20 h-20 mx-auto mb-8 relative">
          {/* Outer spinning ring */}
          <div className="absolute inset-0 animate-spin">
            <div className="h-20 w-20 border-4 border-[#00DFB8]/20 dark:border-[#00DFB8]/30 rounded-full"></div>
            <div className="absolute top-0 left-0 h-20 w-20 border-4 border-transparent border-t-[#00DFB8] rounded-full animate-spin"></div>
          </div>
          
          {/* Inner logo */}
          <div className="absolute inset-4 bg-gradient-to-br from-[#00DFB8] to-[#00B894] rounded-full flex items-center justify-center shadow-lg">
            <Building2 className="w-7 h-7 text-white" />
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-gradient-to-r from-[#00DFB8] to-[#00E6C7] rounded-full border-2 border-white dark:border-slate-800 shadow-lg flex items-center justify-center">
              <div className="w-1.5 h-1.5 bg-white rounded-full"></div>
            </div>
          </div>
        </div>
        
        {/* Title and subtitle */}
        <h2 className="text-xl font-semibold text-gray-800 dark:text-gray-200 mb-3 transition-colors">
          {title}
        </h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6 leading-relaxed transition-colors">
          {subtitle}
        </p>
        
        {/* Progress bar */}
        <div className="w-full bg-gray-200 dark:bg-slate-700 rounded-full h-2 mb-4 overflow-hidden transition-colors">
          <div 
            className="bg-gradient-to-r from-[#00DFB8] to-[#00B894] h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        {/* Animated dots */}
        <div className="flex items-center justify-center gap-2">
          <div className="w-2 h-2 bg-[#00DFB8] rounded-full animate-bounce [animation-delay:-0.3s]"></div>
          <div className="w-2 h-2 bg-[#00B894] rounded-full animate-bounce [animation-delay:-0.15s]"></div>
          <div className="w-2 h-2 bg-[#00A085] rounded-full animate-bounce"></div>
        </div>
        
        {/* Progress percentage */}
        <div className="mt-4 text-sm text-gray-500 dark:text-gray-400 font-medium transition-colors">
          {Math.round(progress)}% complete
        </div>
      </div>
    </div>
  );
}