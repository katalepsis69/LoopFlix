/**
 * HomeClient — Client component for the home page.
 * Receives server-fetched data as props (no client-side API calls).
 */
"use client";

import { motion, useScroll, useSpring } from "framer-motion";
import Navbar from "../Navbar";
import Hero from "../Hero";
import ContentRow from "../ContentRow";
import Footer from "../Footer";
import Scanlines from "../Scanlines";
import MovieModal from "../MovieModal";
import Settings from "../Settings";
import WatchlistPanel from "../WatchlistPanel";
import OfflineDetector from "../OfflineDetector";
import ErrorBoundary from "../ErrorBoundary";
import BootSequence from "../BootSequence";
import RandomPicker from "../RandomPicker";
import { useStore } from "@/store/useStore";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import {
  shouldShowBoot,
  applyFontSettings,
  isDataSaverActive,
} from "@/hooks/useDeviceCapability";
import { useState, useEffect } from "react";
import type { MediaItem } from "@/lib/tmdb/types";

interface HomeClientProps {
  nowPlaying: MediaItem[];
  upcoming: MediaItem[];
  topRatedMovies: MediaItem[];
  trendingTv: MediaItem[];
  topRatedTv: MediaItem[];
}

export default function HomeClient({
  nowPlaying,
  upcoming,
  topRatedMovies,
  trendingTv,
  topRatedTv,
}: HomeClientProps) {
  const bootComplete = useStore((s) => s.bootComplete);
  const setBootComplete = useStore((s) => s.setBootComplete);
  const signalLostOpen = useStore((s) => s.signalLostOpen);
  const [showBoot, setShowBoot] = useState(() => !bootComplete && shouldShowBoot());
  const [dataSaverOn, setDataSaverOn] = useState(() => isDataSaverActive());
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001,
  });

  useEffect(() => {
    applyFontSettings();
  }, []);
  useEffect(() => {
    const handler = () => setDataSaverOn(isDataSaverActive());
    window.addEventListener("loopflix_datasaver_changed", handler);
    return () => window.removeEventListener("loopflix_datasaver_changed", handler);
  }, []);

  useKeyboardShortcuts();

  const handleBootComplete = () => {
    setShowBoot(false);
    setBootComplete(true);
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  };

  if (showBoot) {
    return <BootSequence onComplete={handleBootComplete} />;
  }

  return (
    <ErrorBoundary>
      <div className="relative min-h-screen bg-[#0A0A0A]">
        <Scanlines />
        {dataSaverOn && <div className="data-saver-badge">📶 DATA SAVER</div>}
        <motion.div
          className="fixed top-0 left-0 right-0 h-[2px] bg-[#E4002B] z-[60] origin-left"
          style={{ scaleX }}
        />
        <OfflineDetector />
        <Navbar />

        <main className="relative z-10">
          <Hero />

          <div className="max-w-7xl mx-auto px-4 md:px-8 py-4">
            <div className="hline-dim" />
          </div>

          <div className="space-y-10 py-8">
            <ContentRow title="NOW IN THEATERS" items={nowPlaying} icon="▶" />
            <ContentRow title="UPCOMING RELEASES" items={upcoming} icon="◎" />
            <ContentRow title="TOP RATED FILMS" items={topRatedMovies} icon="★" />
            <ContentRow title="TRENDING TV SERIES" items={trendingTv} icon="◈" />
            <ContentRow title="TOP RATED TV" items={topRatedTv} icon="◆" />
          </div>

          <Footer />
        </main>

        <MovieModal />
        <Settings />
        <WatchlistPanel />
        {signalLostOpen && <RandomPicker />}
      </div>
    </ErrorBoundary>
  );
}
