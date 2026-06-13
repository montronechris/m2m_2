"use client";

import { useRef } from "react";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";

import { HeroSection } from "@/components/sections/HeroSection";
import { FeaturesSection } from "@/components/sections/FeaturesSection";
import { SecuritySection } from "@/components/sections/SecuritySection";
import { TransitionSection } from "@/components/sections/TransitionSection";
import { ContactSection } from "@/components/sections/ContactSection";

export default function HomePage() {
  const featuresRef = useRef<HTMLDivElement>(null);

  const scrollToTop = () => {
    document.documentElement.scrollTo({ top: 0, behavior: "smooth" });
  };

  const scrollToFeatures = () => {
    featuresRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="min-h-screen bg-white font-sans text-gray-900 overflow-x-hidden selection:bg-green-200 selection:text-green-900">
      <Navbar onScrollToTop={scrollToTop} />
      <main>
        <HeroSection onScrollToFeatures={scrollToFeatures} />
        <div ref={featuresRef}>
          <FeaturesSection />
        </div>
        <SecuritySection />
        <TransitionSection />
        <ContactSection />
      </main>
      <Footer />
    </div>
  );
}