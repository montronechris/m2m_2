// src/components/client/scan/ScanInstructions.tsx
"use client";

import { useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, Sparkles, ShoppingCart, Layers2, Star } from "lucide-react";
import { useI18n } from "@/components/i18n/I18nProvider";

interface ScanInstructionsProps {
  primaryColor?: string;
  restaurantName?: string;
  logoUrl?: string;
  ready: boolean;
  onContinue: () => void;
}


export function ScanInstructions({
  primaryColor,
  restaurantName,
  logoUrl,
  ready,
  onContinue,
}: ScanInstructionsProps) {
  const { tr } = useI18n();
  const t = tr.client.scan;
  const [confirmed, setConfirmed] = useState(false);
  const [ticked, setTicked] = useState(false);
  const [showCheckboxError, setShowCheckboxError] = useState(false);
  const checkboxCardRef = useRef<HTMLLabelElement>(null);

  const STEPS = [
    { number: "1", title: t.step1Title, description: t.step1Desc, icon: (color: string) => <ShoppingCart size={22} color={color} strokeWidth={1.8} /> },
    { number: "2", title: t.step2Title, description: t.step2Desc, icon: (color: string) => <Layers2 size={22} color={color} strokeWidth={1.8} /> },
    { number: "3", title: t.step3Title, description: t.step3Desc, icon: (color: string) => <Star size={22} color={color} strokeWidth={1.8} /> },
  ];
  const ACTIONS = [
    { icon: <Bell size={18} color="#fff" />, title: t.actionWaiterTitle, description: t.actionWaiterDesc },
    { icon: <Sparkles size={18} color="#fff" />, title: t.actionAiTitle, description: t.actionAiDesc },
  ];

  const brand = primaryColor ?? "#1A3D2B";
  const canContinue = ready && confirmed;
  const errorColor = "#E0473E";

  function handleContinue() {
    if (!ready) return;
    if (!confirmed) {
      setShowCheckboxError(true);
      checkboxCardRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }
    setTicked(true);
    setTimeout(onContinue, 600);
  }

  function handleCheckboxToggle() {
    setConfirmed(v => !v);
    setShowCheckboxError(false);
  }

  return (
    <div
      style={{
        position: "relative",
        height: "100dvh",
        overflow: "hidden",
        fontFamily: "'Inter', system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700&family=Inter:wght@400;500;600;700&display=swap');
        @keyframes shakeError {
          10%, 90% { transform: translateX(-1px); }
          20%, 80% { transform: translateX(2px); }
          30%, 50%, 70% { transform: translateX(-4px); }
          40%, 60% { transform: translateX(4px); }
        }
      `}</style>

      {/* Fixed background layer — stays put while the content scrolls */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          backgroundImage: "url('/food-bg.jpg')",
          backgroundSize: "cover",
          backgroundPosition: "center top",
          backgroundRepeat: "no-repeat",
          zIndex: 0,
        }}
      />

      {/* Scrollable content area */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          flex: 1,
          overflowY: "auto",
          WebkitOverflowScrolling: "touch",
          padding: "28px 24px 0",
          maxWidth: 480,
          width: "100%",
          margin: "0 auto",
        }}
      >
        {/* Restaurant header */}
        {restaurantName && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              marginBottom: 28,
            }}
          >
            {logoUrl && (
              <img
                src={logoUrl}
                alt={restaurantName}
                style={{ width: 24, height: 24, borderRadius: "50%", objectFit: "cover" }}
              />
            )}
            <span style={{ fontSize: 13, fontWeight: 700, color: "#1C1C1E", letterSpacing: "0.04em" }}>
              {restaurantName}
            </span>
          </motion.div>
        )}

        {/* Eyebrow */}
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.05 }}
          style={{
            textAlign: "center",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.18em",
            textTransform: "uppercase",
            color: brand,
            marginBottom: 8,
          }}
        >
          {t.howItWorks}
        </motion.p>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.1 }}
          style={{
            fontFamily: "'Playfair Display', Georgia, serif",
            fontSize: 32,
            fontWeight: 700,
            color: "#1C1C1E",
            textAlign: "center",
            letterSpacing: "-0.02em",
            lineHeight: 1.15,
            margin: "0 0 32px",
          }}
        >
          {t.beforeOrdering}
        </motion.h1>

        {/* Steps card */}
        <div style={{
          background: "#fff",
          borderRadius: 20,
          padding: "20px 18px",
          marginBottom: 16,
          boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
        }}>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {STEPS.map((step, i) => (
            <motion.div
              key={step.number}
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.15 + i * 0.1 }}
              style={{ display: "flex", alignItems: "flex-start", gap: 16 }}
            >
              {/* Icon tile */}
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 14,
                  background: `${brand}18`,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {step.icon(brand)}
              </div>
              <div style={{ paddingTop: 2 }}>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#1C1C1E", marginBottom: 3 }}>
                  {step.number}. {step.title}
                </p>
                <p style={{ fontSize: 13, color: "#6B6560", lineHeight: 1.55 }}>
                  {step.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
        </div>

        {/* Tasti disponibili card */}
        <div style={{
          background: "#fff",
          borderRadius: 20,
          padding: "18px 18px",
          marginBottom: 16,
          boxShadow: "0 2px 16px rgba(0,0,0,0.07)",
        }}>
        <p style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            color: "#9C9188",
            marginBottom: 14,
          }}
        >
          {t.availableKeys}
        </p>

        {/* Action buttons */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {ACTIONS.map((action, i) => (
            <motion.div
              key={action.title}
              initial={{ opacity: 0, x: -14 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.65 + i * 0.1 }}
              style={{
                background: brand,
                borderRadius: 50,
                padding: "14px 18px",
                display: "flex",
                alignItems: "center",
                gap: 14,
              }}
            >
              {/* Circle icon */}
              <div
                style={{
                  width: 38,
                  height: 38,
                  borderRadius: "50%",
                  background: "rgba(255,255,255,0.15)",
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {action.icon}
              </div>
              <div>
                <p style={{ fontSize: 14, fontWeight: 700, color: "#fff", marginBottom: 2 }}>
                  {action.title}
                </p>
                <p style={{ fontSize: 12, color: "rgba(255,255,255,0.65)", lineHeight: 1.5 }}>
                  {action.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
        </div>

        {/* Checkbox card */}
        <motion.label
          ref={checkboxCardRef}
          initial={{ opacity: 0, x: -12 }}
          animate={{
            opacity: 1,
            x: showCheckboxError ? [0, -4, 4, -4, 4, 0] : 0,
          }}
          transition={{
            duration: showCheckboxError ? 0.4 : 0.4,
            delay: showCheckboxError ? 0 : 0.85,
          }}
          style={{
            display: "flex",
            alignItems: "flex-start",
            gap: 12,
            cursor: "pointer",
            userSelect: "none",
            background: "#fff",
            borderRadius: 20,
            padding: "14px 18px",
            marginBottom: showCheckboxError ? 8 : 20,
            boxShadow: showCheckboxError
              ? `0 0 0 2px ${errorColor}, 0 2px 16px rgba(0,0,0,0.07)`
              : "0 2px 16px rgba(0,0,0,0.07)",
            transition: "box-shadow 0.2s ease-out, margin-bottom 0.2s ease-out",
          }}
        >
          <motion.div
            whileTap={{ scale: 0.9 }}
            role="checkbox"
            aria-checked={confirmed}
            style={{
              width: 20,
              height: 20,
              borderRadius: "50%",
              border: `2px solid ${confirmed ? brand : showCheckboxError ? errorColor : "#B5A898"}`,
              background: confirmed ? brand : "transparent",
              boxShadow: confirmed ? `0 0 0 4px ${brand}26` : "none",
              flexShrink: 0,
              marginTop: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              transition: "background 0.2s ease-out, border-color 0.2s ease-out, box-shadow 0.2s ease-out",
            }}
            onClick={handleCheckboxToggle}
          >
            <svg
              width="12"
              height="12"
              viewBox="0 0 12 12"
              fill="none"
              style={{
                opacity: confirmed ? 1 : 0,
                transform: confirmed ? "scale(1)" : "scale(0.4)",
                transition: "opacity 0.2s ease-out, transform 0.2s ease-out",
              }}
            >
              <path d="M2 6l3 3 5-6" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </motion.div>
          <span style={{ fontSize: 14, color: showCheckboxError ? errorColor : "#3D3530", lineHeight: 1.5 }}>
            {t.readAndReady}
          </span>
        </motion.label>

        <AnimatePresence>
          {showCheckboxError && (
            <motion.p
              initial={{ opacity: 0, y: -4, height: 0 }}
              animate={{ opacity: 1, y: 0, height: "auto" }}
              exit={{ opacity: 0, y: -4, height: 0 }}
              transition={{ duration: 0.2 }}
              style={{
                fontSize: 13,
                fontWeight: 600,
                color: errorColor,
                margin: "0 0 20px 4px",
              }}
            >
              {t.checkboxRequired}
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* Sticky CTA */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, delay: 0.95 }}
        style={{
          position: "relative",
          zIndex: 1,
          padding: "0 24px max(28px, env(safe-area-inset-bottom))",
          maxWidth: 480,
          width: "100%",
          margin: "0 auto",
          paddingTop: 12,
        }}
      >
        <motion.button
          type="button"
          onClick={handleContinue}
          disabled={!ready || ticked}
          whileTap={ready && !ticked ? { scale: 0.97 } : undefined}
          style={{
            width: "100%",
            background: !canContinue ? `${brand}80` : brand,
            color: "#fff",
            border: "none",
            borderRadius: 50,
            padding: "18px 24px",
            fontSize: 15,
            fontWeight: 700,
            letterSpacing: "0.1em",
            textTransform: "uppercase",
            cursor: ready && !ticked ? "pointer" : "default",
            transition: "background 0.25s",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            boxShadow: canContinue ? `0 6px 24px ${brand}55` : "none",
          }}
        >
          <AnimatePresence mode="wait">
            {ticked ? (
              <motion.span
                key="tick"
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
                style={{ display: "flex", alignItems: "center", gap: 8 }}
              >
                <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                  <motion.path
                    d="M4 10.5l4.5 4.5 7.5-9"
                    stroke="#fff"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  />
                </svg>
              </motion.span>
            ) : !ready ? (
              <motion.span key="loading" style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span
                  style={{
                    width: 14,
                    height: 14,
                    borderRadius: "50%",
                    border: "2px solid rgba(255,255,255,0.3)",
                    borderTopColor: "#fff",
                    animation: "spin 0.7s linear infinite",
                  }}
                />
                {t.verifying}
              </motion.span>
            ) : (
              <motion.span key="label" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                {t.goToMenu}
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </motion.div>
    </div>
  );
}