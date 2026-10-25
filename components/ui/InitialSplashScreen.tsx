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
      // Mark as shown for subsequent route transitions and re-renders
      window.sessionStorage.setItem(SESSION_STORAGE_KEY, 'true');
    } catch {
      // In private browsing or restricted environments, gracefully proceed
    }

    // Activate the splash screen
    setIsVisible(true);

    // Trigger initial logo entrance animation on the next animation frame
    const enterRaf = requestAnimationFrame(() => {
      setLogoReady(true);
    });

    // Check application readiness
    const onAppReady = () => {
      // Allow the smooth entrance animation to finish, then dismiss smoothly
      setTimeout(() => {
        setIsFadingOut(true);
        // After fade out transition (400ms), completely remove from DOM
        setTimeout(() => {
          setIsVisible(false);
        }, 450);
      }, 500);
    };

    if (document.readyState === 'complete') {
      onAppReady();
    } else {
      window.addEventListener('load', onAppReady, { once: true });
      // Fallback safeguard in case window.load already passed or third-party asset delays
      const safeguardTimer = setTimeout(onAppReady, 1200);
      return () => {
        cancelAnimationFrame(enterRaf);
        window.removeEventListener('load', onAppReady);
        clearTimeout(safeguardTimer);
      };
    }

    return () => {
      cancelAnimationFrame(enterRaf);
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
