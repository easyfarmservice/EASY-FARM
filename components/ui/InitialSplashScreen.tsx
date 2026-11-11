'use client';

import React, { useEffect, useState } from 'react';

const SESSION_STORAGE_KEY = 'easyfarm_initial_splash_displayed';

export function InitialSplashScreen() {
  const [isVisible, setIsVisible] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [logoReady, setLogoReady] = useState(false);

  useEffect(() => {
    // Only run in browser environment
    if (typeof window === 'undefined') return;

    // Check if the splash was already displayed in this browser session
    try {
      const alreadyShown = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (alreadyShown) {
        return; // Skip showing if already shown during this session
      }
    } catch {
      // In private browsing or restricted environments, gracefully proceed
    }

    // Activate the splash screen
    setIsVisible(true);
    const enterRaf = requestAnimationFrame(() => {
      setLogoReady(true);
    });

    const fadeTimer = setTimeout(() => {
      setIsFadingOut(true);
      try {
        window.sessionStorage.setItem(SESSION_STORAGE_KEY, 'true');
      } catch {}
    }, 450);

    const hideTimer = setTimeout(() => {
      setIsVisible(false);
    }, 850);

    return () => {
      cancelAnimationFrame(enterRaf);
      clearTimeout(fadeTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (!isVisible) {
    return null;
  }

  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 z-[99999] flex flex-col items-center justify-center bg-white select-none transition-opacity duration-400 ease-out ${
        isFadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        paddingTop: 'env(safe-area-inset-top, 0px)',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        paddingLeft: 'env(safe-area-inset-left, 0px)',
        paddingRight: 'env(safe-area-inset-right, 0px)',
      }}
    >
      {/* Centered Brand Mark Container */}
      <div className="flex flex-col items-center justify-center px-6">
        <div
          className={`w-36 sm:w-44 md:w-52 max-w-[70vw] aspect-[1024/887] relative transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] motion-reduce:transition-none ${
            logoReady ? 'opacity-100 scale-100' : 'opacity-0 scale-95'
          }`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/images/easyfarm-logo.png"
            alt="Easy Farm"
            width={1024}
            height={887}
            className="w-full h-full object-contain pointer-events-none select-none"
            loading="eager"
            priority-attribute="true"
            decoding="sync"
          />
        </div>

        {/* Subtle, refined startup loading arc indicator */}
        <div className="mt-8 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full border-2 border-slate-100 border-t-emerald-700 animate-spin motion-reduce:animate-none opacity-80" />
        </div>
      </div>
    </div>
  );
}
