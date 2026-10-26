import React, { useState, useEffect } from 'react';
import {
  Shield,
  EyeOff,
  Clock,
  Trash2,
  Lock,
  Smartphone,
  Crown,
  X,
  AlertTriangle,
} from 'lucide-react';
import { api } from '../services/api';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenPaywall: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenPaywall,
}) => {
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [purgeEnabled, setPurgeEnabled] = useState(false);
  const [purgeMaxAttempts, setPurgeMaxAttempts] = useState(5);
  const [autoLockTimer, setAutoLockTimer] = useState(0);
  const [readSpoofingEnabled, setReadSpoofingEnabled] = useState(false);
  const [screenshotBlockingEnabled, setScreenshotBlockingEnabled] = useState(false);

  useEffect(() => {
    if (isOpen) {
      api.getSettings().then((s) => {
        if (s) {
          setBiometricEnabled(s.biometricEnabled ?? true);
          setPurgeEnabled(s.purgeEnabled ?? false);
          setPurgeMaxAttempts(s.purgeMaxAttempts ?? 5);
          setAutoLockTimer(s.autoLockTimerSeconds ?? 0);
          setReadSpoofingEnabled(s.readSpoofingEnabled ?? false);
          setScreenshotBlockingEnabled(s.screenshotBlockingEnabled ?? false);
        }
      }).catch(() => {});
    }
  }, [isOpen]);

  const handleSave = async (updatedFields: any) => {
    try {
      await api.updateSettings(updatedFields);
    } catch {
      // Graceful local state update
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4">
      <div className="glass-modal max-w-md w-full rounded-3xl border border-white/10 p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-text-primary flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent-primary" />
            <span>Privacy & Security Settings</span>
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-text-tertiary hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-5 text-xs text-text-secondary">
          {/* Biometric Guard */}
          <div className="p-4 rounded-2xl bg-bg-secondary border border-white/5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-text-primary text-sm">Biometric Chat Lock</div>
                <div className="text-[11px] text-text-tertiary">Require Face ID / Touch ID when opening chats</div>
              </div>
              <input
                type="checkbox"
                checked={biometricEnabled}
                onChange={(e) => {
                  setBiometricEnabled(e.target.checked);
                  handleSave({ biometricEnabled: e.target.checked });
                }}
                className="w-4 h-4 rounded text-accent-primary focus:ring-0"
              />
            </div>

            {/* Auto-Purge */}
            <div className="pt-2 border-t border-border-subtle flex items-center justify-between">
              <div>
                <div className="font-semibold text-text-primary">Local Purge on Failures</div>
                <div className="text-[11px] text-text-tertiary">Wipe local device DB after {purgeMaxAttempts} failures</div>
              </div>
              <input
                type="checkbox"
                checked={purgeEnabled}
                onChange={(e) => {
                  setPurgeEnabled(e.target.checked);
                  handleSave({ purgeEnabled: e.target.checked });
                }}
                className="w-4 h-4 rounded text-red-500 focus:ring-0"
              />
            </div>
          </div>

          {/* Premium Features */}
          <div className="p-4 rounded-2xl bg-gradient-to-br from-purple-950/20 to-indigo-950/30 border border-purple-500/20 space-y-3">
            <div className="flex items-center justify-between mb-1">
              <span className="font-bold text-purple-300 text-sm flex items-center gap-1.5">
                <Crown className="w-4 h-4 text-amber-400" />
                <span>Premium Privacy Features</span>
              </span>
              <button
                onClick={onOpenPaywall}
                className="text-[10px] uppercase font-bold text-indigo-400 hover:underline"
              >
                Upgrade
              </button>
            </div>

            {/* Unread Status Spoofing */}
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-text-primary flex items-center gap-1">
                  <EyeOff className="w-3.5 h-3.5 text-teal-400" />
                  <span>Unread Status Spoofing</span>
                </div>
                <div className="text-[11px] text-text-tertiary">
                  Read messages while withholding read receipts from partner
                </div>
              </div>
              <input
                type="checkbox"
                checked={readSpoofingEnabled}
                onChange={(e) => {
                  setReadSpoofingEnabled(e.target.checked);
                  handleSave({ readSpoofingEnabled: e.target.checked });
                }}
                className="w-4 h-4 rounded text-accent-teal focus:ring-0"
              />
            </div>

            {/* Screenshot Blocking */}
            <div className="pt-2 border-t border-white/5 flex items-center justify-between">
              <div>
                <div className="font-semibold text-text-primary flex items-center gap-1">
                  <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Screenshot & Capture Guard</span>
                </div>
                <div className="text-[11px] text-text-tertiary">
                  Block screenshots and alert partner upon detection
                </div>
              </div>
              <input
                type="checkbox"
                checked={screenshotBlockingEnabled}
                onChange={(e) => {
                  setScreenshotBlockingEnabled(e.target.checked);
                  handleSave({ screenshotBlockingEnabled: e.target.checked });
                }}
                className="w-4 h-4 rounded text-accent-primary focus:ring-0"
              />
            </div>
          </div>

          {/* Account Deletion */}
          <div className="p-4 rounded-2xl bg-red-500/5 border border-red-500/10 flex items-center justify-between">
            <div>
              <div className="font-semibold text-red-400">Delete Account</div>
              <div className="text-[11px] text-text-tertiary">30-day grace period with full data erasure</div>
            </div>
            <button
              onClick={() => alert('Account deletion flow initiates a 30-day grace period before physical erasure.')}
              className="py-1.5 px-3 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 font-medium text-xs transition"
            >
              Erase
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
