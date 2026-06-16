"use client";
import { useState } from "react";
import LoadingScreen from "@/components/homepage/LoadingScreen";
import KnifeNav from "@/components/homepage/KnifeNav";
import Hero from "@/components/homepage/Hero";
import Features from "@/components/homepage/Features";
import Security from "@/components/homepage/Security";
import LiveDemo from "@/components/homepage/LiveDemo";
import ContactForm from "@/components/homepage/ContactForm";
import Footer from "@/components/homepage/Footer";

export default function Home() {
  const [ready, setReady] = useState(false);
  return (
    <>
      <LoadingScreen onComplete={() => setReady(true)} />
      <main id="top" className="relative overflow-x-clip transition-opacity duration-700" style={{ opacity: ready ? 1 : 0 }}>
        <KnifeNav />
        <Hero />
        <Features />
        <Security />
        <LiveDemo />
        <ContactForm />
        <Footer />
      </main>
    </>
  );
}