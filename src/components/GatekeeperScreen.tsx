import React, { useState } from "react";
import { KeyRound, Eye, EyeOff, Sparkles, ExternalLink, ShieldCheck, ArrowRight } from "lucide-react";
import { validateApiKey } from "../services/geminiService";

interface GatekeeperScreenProps {
  onSaveKey: (key: string) => void;
  initialError?: string | null;
}

export function GatekeeperScreen({ onSaveKey, initialError }: GatekeeperScreenProps) {
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [isValidating, setIsValidating] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(initialError || null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanKey = apiKeyInput.trim();
    if (!cleanKey) {
      setErrorMessage("Please enter your Gemini API key to proceed.");
      return;
    }

    if (cleanKey.length < 15) {
      setErrorMessage("Please enter a valid Gemini API key (typically starts with 'AIza...').");
      return;
    }

    setIsValidating(true);
    setErrorMessage(null);

    try {
      // Validate the key with a lightweight live test
      await validateApiKey(cleanKey);
      onSaveKey(cleanKey);
    } catch (err: any) {
      setErrorMessage(
        err?.message || "Invalid Gemini API key or connection error. Please verify your key."
      );
    } finally {
      setIsValidating(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#000000] text-[#f5f5f5] flex flex-col justify-between items-center px-4 sm:px-6 py-8 sm:py-12 relative overflow-hidden select-none">
      {/* Subtle AMOLED Glow Aura */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-emerald-500/5 rounded-full blur-[140px] pointer-events-none" />

      {/* Top Header Tag */}
      <header className="w-full max-w-4xl flex items-center justify-center pt-2 sm:pt-4 z-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-neutral-900/80 border border-neutral-800 text-xs font-mono tracking-wider text-neutral-400 uppercase">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          CUET PG Economics (COQP10) · Gatekeeper
        </div>
      </header>

      {/* Main Centered Authentication Card */}
      <main className="w-full max-w-md my-auto py-6 sm:py-10 z-10 flex flex-col items-center">
        <div className="w-full bg-[#050505] border border-neutral-900 rounded-3xl p-6 sm:p-9 shadow-2xl shadow-black relative overflow-hidden">
          {/* Subtle top border highlight */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />

          {/* Icon and Title */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-neutral-900/90 border border-neutral-800 flex items-center justify-center text-emerald-400 mb-4 shadow-inner">
              <KeyRound className="w-7 h-7" />
            </div>
            <h1 className="text-xl sm:text-2xl font-semibold tracking-tight text-white mb-2">
              Enter Gemini API Key
            </h1>
            <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed max-w-xs">
              Unlock the Feynman synthesis engine, authentic multi-year PYQs (2021–2025), and interactive Plotly economic models.
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="gemini-key"
                className="block text-xs font-mono tracking-wide text-neutral-400 uppercase"
              >
                Gemini API Key
              </label>
              <div className="relative">
                <input
                  id="gemini-key"
                  type={showKey ? "text" : "password"}
                  value={apiKeyInput}
                  onChange={(e) => {
                    setApiKeyInput(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="AIzaSy..."
                  autoComplete="off"
                  autoFocus
                  className="w-full px-4 py-3 pr-11 bg-[#0a0a0a] border border-neutral-800 rounded-xl text-sm font-mono text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500/70 focus:ring-1 focus:ring-emerald-500/70 transition-all duration-200"
                />
                <button
                  type="button"
                  onClick={() => setShowKey(!showKey)}
                  aria-label={showKey ? "Hide API key" : "Show API key"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors p-1"
                >
                  {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {errorMessage && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-900/60 text-xs text-red-300 leading-relaxed animate-in fade-in">
                {errorMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isValidating || !apiKeyInput.trim()}
              className="w-full py-3.5 px-4 bg-emerald-500 hover:bg-emerald-400 active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed text-black font-semibold text-sm rounded-xl transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40 cursor-pointer"
            >
              {isValidating ? (
                <>
                  <span className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  <span>Verifying API Key...</span>
                </>
              ) : (
                <>
                  <span>Enter Workspace</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Privacy & Link Footer */}
          <div className="mt-6 pt-5 border-t border-neutral-900 space-y-3 text-center">
            <div className="flex items-center justify-center gap-1.5 text-xs text-neutral-500">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/80" />
              <span>Saved locally in browser localStorage only</span>
            </div>
            <div>
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-neutral-400 hover:text-emerald-400 transition-colors underline underline-offset-4"
              >
                <span>Get a free Gemini API key</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>
      </main>

      {/* The Signature */}
      <footer className="w-full text-center py-6 sm:py-8 mt-auto z-10 border-t border-neutral-950">
        <p className="text-2xl sm:text-3xl md:text-4xl font-extralight tracking-widest text-neutral-400 hover:text-neutral-300 transition-colors duration-300 select-none font-sans">
          a gift by Hirak
        </p>
      </footer>
    </div>
  );
}
