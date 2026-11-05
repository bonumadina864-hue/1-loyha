import React, { useState, useEffect, useRef } from 'react';
import { Shield, Lock, AlertTriangle, RefreshCw, Camera, CheckCircle2, Scan } from 'lucide-react';
import { useI18n } from '../services/i18n';
import { extractFaceVector, saveEnrolledProfile, EnrolledFaceProfile } from '../services/faceMatcher';

interface BiometricLockScreenProps {
  onUnlock: () => void;
  maxAttempts?: number;
  onPurgeTriggered?: () => void;
}

export const BiometricLockScreen: React.FC<BiometricLockScreenProps> = ({
  onUnlock,
  maxAttempts = 5,
  onPurgeTriggered,
}) => {
  const { t, language, setLanguage } = useI18n();
  const [attempts, setAttempts] = useState(0);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isFaceEnrolled, setIsFaceEnrolled] = useState(false);
  const [isPurged, setIsPurged] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Activate webcam for Face ID scanning
  useEffect(() => {
    let stream: MediaStream | null = null;
    navigator.mediaDevices?.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      .then((s) => {
        stream = s;
        if (videoRef.current) {
          videoRef.current.srcObject = s;
          videoRef.current.play().catch(() => {});
        }
        setCameraReady(true);
      })
      .catch(() => {
        setCameraReady(false);
        setErrorMessage("Yuzingiz ko'rinmayapti. Iltimos, kamerani oching va yorug' joyga o'ting.");
      });

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  const handleCaptureOwnerFace = () => {
    setIsAuthenticating(true);
    setErrorMessage(null);

    setTimeout(() => {
      if (!videoRef.current || !canvasRef.current || videoRef.current.readyState < 2) {
        setIsAuthenticating(false);
        setErrorMessage("Yuzingiz ko'rinmayapti. Iltimos, kamerani oching va yorug' joyga o'ting.");
        return;
      }

      const extracted = extractFaceVector(videoRef.current, canvasRef.current);
      if (!extracted || !extracted.isVisible) {
        setIsAuthenticating(false);
        setErrorMessage("Yuzingiz ko'rinmayapti. Iltimos, kamerani oching va yorug' joyga o'ting.");
        return;
      }

      // Save valid enrolled profile
      const newProfile: EnrolledFaceProfile = {
        vector: extracted.vector,
        avgBrightness: extracted.avgBrightness,
        enrolledAt: new Date().toISOString(),
      };
      saveEnrolledProfile(newProfile);

      setIsAuthenticating(false);
      setIsFaceEnrolled(true);

      setTimeout(() => {
        setAttempts(0);
        onUnlock();
      }, 700);
    }, 1000);
  };

  const handleSimulateFailure = () => {
    const nextAttempts = attempts + 1;
    setAttempts(nextAttempts);

    if (nextAttempts >= maxAttempts) {
      setIsPurged(true);
      onPurgeTriggered?.();
    } else {
      setErrorMessage(
        `Face ID: Ruxsatsiz begona shaxs aniqlandi! (${nextAttempts}/${maxAttempts})`,
      );
    }
  };

  if (isPurged) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-primary px-4">
        <div className="glass-modal max-w-md w-full p-8 rounded-3xl text-center border border-red-500/30">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-400">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-3">Chat Bu Qurilmada Xavfsiz Tozalandi</h2>
          <p className="text-text-secondary text-sm mb-6 leading-relaxed">
            Ruxsatsiz begona shaxs tomonidan ketma-ket urinishlar soni oshib ketgani sababli qurilmadagi lokal chat xavfsizlik uchun butunlay o‘chirildi. Serverdagi zaxira esa xavfsiz saqlanmoqda.
          </p>
          <button
            onClick={() => {
              setIsPurged(false);
              setAttempts(0);
              onUnlock();
            }}
            className="w-full py-3.5 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-accent-primary to-accent-teal text-white shadow-lg"
          >
            FMTg ga kirish & Tiklash Arizasi Berish
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#070A13] px-4 select-none">
      <canvas ref={canvasRef} className="hidden" />

      {/* Background ambient lighting */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-96 h-96 bg-teal-500/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Language Switcher on Top */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-1.5 p-1 rounded-2xl bg-bg-secondary/80 border border-white/10 text-xs">
        {(['uz', 'ru', 'en'] as const).map((lang) => (
          <button
            key={lang}
            onClick={() => setLanguage(lang)}
            className={`px-3 py-1 rounded-xl font-bold uppercase transition ${
              language === lang
                ? 'bg-gradient-to-r from-accent-primary to-accent-teal text-white shadow-sm'
                : 'text-text-tertiary hover:text-white'
            }`}
          >
            {lang}
          </button>
        ))}
      </div>

      <div className="relative z-10 max-w-sm w-full text-center">
        {/* Real Front Camera Face Scanner Box */}
        <div className="relative w-40 h-40 mx-auto mb-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-accent-primary/40 to-accent-teal/40 animate-pulse blur-md" />
          <div className="relative w-36 h-36 rounded-3xl bg-[#0B1020] border-2 border-indigo-500/50 shadow-2xl flex flex-col items-center justify-center overflow-hidden">
            {cameraReady ? (
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1] opacity-90"
              />
            ) : (
              <span className="text-4xl font-black bg-gradient-to-tr from-indigo-400 via-indigo-200 to-teal-300 bg-clip-text text-transparent">
                FM
              </span>
            )}

            {/* Scanning radar line overlay */}
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cyan-400/30 to-transparent animate-scanLine pointer-events-none" />

            {/* Face Targeting Box */}
            <div className="absolute inset-3 border-2 border-dashed border-cyan-400/50 rounded-2xl pointer-events-none flex items-center justify-center">
              <Scan className="w-8 h-8 text-cyan-300 opacity-60" />
            </div>

            {isFaceEnrolled && (
              <div className="absolute inset-0 bg-emerald-950/85 flex flex-col items-center justify-center text-emerald-400 animate-fadeIn">
                <CheckCircle2 className="w-10 h-10 mb-1" />
                <span className="text-[11px] font-bold">Yuzingiz Saqlandi!</span>
              </div>
            )}
          </div>
        </div>

        <h1 className="text-2xl font-black tracking-tight text-text-primary mb-1">
          {t.appName}
        </h1>
        <p className="text-xs text-text-secondary mb-2 px-2">
          <strong>Biometrik Face ID Autentifikatsiyasi:</strong>
        </p>
        <p className="text-[11px] text-text-tertiary mb-6 px-4 leading-relaxed">
          Kameraga qarang va yuzingizni skanerlang. Ilova aynan <strong>sizning yuzingizni taniydi</strong> va chatni ochadi. Kamera to‘silgan bo‘lsa o‘chirilmaydi, faqat begona shaxs aniqlangandagina o‘chadi.
        </p>

        {errorMessage && (
          <div className="mb-5 p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2 text-left">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action Button: Capture & Authenticate Face */}
        <div className="space-y-3">
          <button
            onClick={handleCaptureOwnerFace}
            disabled={isAuthenticating}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-accent-primary via-indigo-600 to-accent-teal hover:opacity-95 text-white font-bold text-sm shadow-xl shadow-indigo-600/30 flex items-center justify-center gap-3 transition active:scale-[0.98]"
          >
            {isAuthenticating ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Camera className="w-5 h-5 text-teal-300" />
            )}
            <span>{isAuthenticating ? 'Yuzingiz tekshirilmoqda...' : 'Yuzimni ro‘yxatga olish & Kirish'}</span>
          </button>

          {/* Test Failure Simulation button */}
          <button
            onClick={handleSimulateFailure}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-medium text-text-tertiary hover:text-red-400 transition flex items-center justify-center gap-1.5"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Ruxsatsiz begona urinishni sinash ({attempts}/{maxAttempts})</span>
          </button>
        </div>

        <div className="mt-8 text-[11px] text-text-tertiary flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span>FMTg Biometric Owner Profile Protection</span>
        </div>
      </div>
    </div>
  );
};
