import React from 'react';
import { Crown, EyeOff, ShieldCheck, HardDrive, Smartphone, Check, X } from 'lucide-react';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubscribe: () => void;
}

export const PaywallModal: React.FC<PaywallModalProps> = ({
  isOpen,
  onClose,
  onSubscribe,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div className="glass-modal max-w-md w-full rounded-3xl border border-purple-500/30 p-6 md:p-8 shadow-2xl relative overflow-hidden">
        {/* Glow */}
        <div className="absolute -top-16 -right-16 w-48 h-48 bg-purple-600/20 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1.5 rounded-xl hover:bg-white/10 text-text-tertiary hover:text-white transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-accent-primary to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
            <Crown className="w-7 h-7 text-amber-300" />
          </div>
          <h3 className="text-xl font-bold text-text-primary">Pairly Premium Privacy</h3>
          <p className="text-xs text-text-secondary mt-1">
            State-of-the-art privacy mechanisms for uncompromising security
          </p>
        </div>

        {/* Benefits List */}
        <div className="space-y-3.5 mb-8 text-xs">
          <div className="flex items-start gap-3 p-3 rounded-2xl bg-bg-secondary/70 border border-white/5">
            <EyeOff className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-text-primary">Unread Status Spoofing</div>
              <div className="text-text-tertiary">Read messages locally while withholding read receipts from the sender.</div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-bg-secondary/70 border border-white/5">
            <HardDrive className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-text-primary">Zero-Knowledge Cloud Backup</div>
              <div className="text-text-tertiary">Argon2id passphrase-encrypted backups with 0% server/admin access.</div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 rounded-2xl bg-bg-secondary/70 border border-white/5">
            <Smartphone className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <div className="font-semibold text-text-primary">Screenshot Blocking & Intruder Alert</div>
              <div className="text-text-tertiary">FLAG_SECURE protection and capture event alerts.</div>
            </div>
          </div>
        </div>

        {/* Pricing Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-r from-accent-primary/20 to-purple-600/20 border border-purple-500/30 text-center mb-6">
          <div className="text-2xl font-bold text-text-primary">$4.99 <span className="text-xs text-text-tertiary font-normal">/ month</span></div>
          <div className="text-[11px] text-purple-300 mt-0.5">3-day grace period • Cancel anytime</div>
        </div>

        <button
          onClick={onSubscribe}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-accent-primary to-purple-600 text-white font-bold text-sm shadow-xl shadow-purple-600/30 hover:opacity-95 transition active:scale-[0.98]"
        >
          Activate Pairly Premium
        </button>
      </div>
    </div>
  );
};
