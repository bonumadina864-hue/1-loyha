import React, { useState } from 'react';
import { Shield, Fingerprint, Lock, AlertTriangle, RefreshCw } from 'lucide-react';

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
  const [attempts, setAttempts] = useState(0);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [isPurged, setIsPurged] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSimulateScan = (success: boolean) => {
    setIsAuthenticating(true);
    setErrorMessage(null);

    setTimeout(() => {
      setIsAuthenticating(false);
      if (success) {
        setAttempts(0);
        onUnlock();
      } else {
        const nextAttempts = attempts + 1;
        setAttempts(nextAttempts);

        if (nextAttempts >= maxAttempts) {
          setIsPurged(true);
          onPurgeTriggered?.();
        } else {
          setErrorMessage(
            `Biometric verification failed (${nextAttempts}/${maxAttempts}). Warning: exceeding limit will purge local data on this device.`,
          );
        }
      }
    }, 700);
  };

  if (isPurged) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-bg-primary px-4">
        <div className="glass-modal max-w-md w-full p-8 rounded-3xl text-center border border-red-500/30">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-400">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-3">Chat Cleared on This Device</h2>
          <p className="text-text-secondary text-sm mb-6 leading-relaxed">
            Local encrypted storage for this conversation was safely wiped after consecutive biometric failures.
            Server archives remain secure and encrypted.
          </p>
          <div className="bg-bg-tertiary/60 p-4 rounded-xl text-xs text-text-secondary mb-6 text-left border border-white/5">
            🔒 <strong className="text-text-primary">Single-Sided Purge Complete:</strong> The other user's device and server encrypted records remain intact. You can request chat restoration from the Admin Ticket flow.
          </div>
          <button
            onClick={() => {
              setIsPurged(false);
              setAttempts(0);
              onUnlock();
            }}
            className="w-full py-3.5 px-4 rounded-xl font-medium text-sm bg-gradient-to-r from-accent-primary to-accent-teal text-white shadow-lg shadow-indigo-500/20 hover:opacity-95 transition"
          >
            Continue to Pairly & Request Restoration
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-bg-primary px-4">
      {/* Background ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-indigo-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2 translate-y-1/2 w-80 h-80 bg-teal-500/10 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative z-10 max-w-sm w-full text-center">
        {/* Pulsing Shield Animation */}
        <div className="relative w-28 h-28 mx-auto mb-8 flex items-center justify-center">
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-accent-primary/20 to-accent-teal/20 animate-shield-glow blur-sm" />
          <div className="relative w-24 h-24 rounded-2xl glass-panel flex items-center justify-center border border-white/10 shadow-2xl">
            <Shield className="w-12 h-12 text-indigo-400 drop-shadow-[0_0_12px_rgba(99,102,241,0.5)]" />
          </div>
        </div>

        <h1 className="text-2xl font-bold tracking-tight text-text-primary mb-2">
          Pairly Private Vault
        </h1>
        <p className="text-sm text-text-secondary mb-8">
          Biometric chat locking active. Authenticate with Touch ID / Face ID to access your conversations.
        </p>

        {errorMessage && (
          <div className="mb-6 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Action Button: Simulate Biometric Unlock */}
        <div className="space-y-3">
          <button
            onClick={() => handleSimulateScan(true)}
            disabled={isAuthenticating}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-accent-primary to-indigo-600 hover:to-indigo-500 text-white font-semibold text-sm shadow-xl shadow-indigo-600/25 flex items-center justify-center gap-3 transition active:scale-[0.98]"
          >
            {isAuthenticating ? (
              <RefreshCw className="w-5 h-5 animate-spin" />
            ) : (
              <Fingerprint className="w-5 h-5 text-teal-300" />
            )}
            <span>{isAuthenticating ? 'Scanning Biometrics...' : 'Unlock with Face ID / Fingerprint'}</span>
          </button>

          {/* Biometric Failure Simulator (for testing single-sided purge) */}
          <button
            onClick={() => handleSimulateScan(false)}
            className="w-full py-2.5 px-4 rounded-xl text-xs font-medium text-text-tertiary hover:text-red-400 hover:bg-red-500/5 transition flex items-center justify-center gap-1.5"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Simulate Biometric Failure ({attempts}/{maxAttempts})</span>
          </button>
        </div>

        <div className="mt-12 text-xs text-text-tertiary flex items-center justify-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>AES-256-GCM Envelope Encryption Armed</span>
        </div>
      </div>
    </div>
  );
};
