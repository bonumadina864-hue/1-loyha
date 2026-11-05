import React, { useState, useEffect } from 'react';
import {
  Shield,
  EyeOff,
  Trash2,
  Lock,
  X,
  AlertTriangle,
  User,
  Calendar,
  CheckCircle2,
  Globe,
  Check,
} from 'lucide-react';
import { api, UserSession } from '../services/api';
import { useI18n, Language } from '../services/i18n';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: UserSession;
  onAccountDeleted?: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  session,
  onAccountDeleted,
}) => {
  const { t, language, setLanguage } = useI18n();
  const [activeTab, setActiveTab] = useState<'profile' | 'security'>('profile');

  // Profile Form States
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDay, setBirthDay] = useState<number>(15);
  const [birthMonth, setBirthMonth] = useState<number>(6);
  const [birthYear, setBirthYear] = useState<number>(2000);
  const [googleAccount, setGoogleAccount] = useState<string>('');
  const [googleConnected, setGoogleConnected] = useState<boolean>(false);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Delete Account States
  const [deleteConfirmGoogleEmail, setDeleteConfirmGoogleEmail] = useState('');
  const [deleteConfirmGooglePassword, setDeleteConfirmGooglePassword] = useState('');
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Security toggles
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [antiPeepingEnabled, setAntiPeepingEnabled] = useState(true);

  useEffect(() => {
    if (isOpen) {
      // Load stored profile from backend/local
      const savedProfile = localStorage.getItem(`fmtg_profile_${session.userId}`);
      if (savedProfile) {
        try {
          const parsed = JSON.parse(savedProfile);
          setFirstName(parsed.firstName || session.fullName.split(' ')[0] || '');
          setLastName(parsed.lastName || session.fullName.split(' ')[1] || '');
          setBirthDay(parsed.birthDay || 15);
          setBirthMonth(parsed.birthMonth || 6);
          setBirthYear(parsed.birthYear || 2000);
          setGoogleAccount(parsed.googleAccount || '');
          setGoogleConnected(parsed.googleConnected || false);
        } catch {}
      } else {
        const parts = session.fullName.split(' ');
        setFirstName(parts[0] || 'User');
        setLastName(parts.slice(1).join(' ') || 'FMTg');
        setGoogleAccount(session.email || 'user@gmail.com');
        setGoogleConnected(true);
      }
    }
  }, [isOpen, session]);

  const handleSaveProfile = () => {
    const profileData = {
      firstName,
      lastName,
      birthDay,
      birthMonth,
      birthYear,
      googleAccount,
      googleConnected,
    };
    localStorage.setItem(`fmtg_profile_${session.userId}`, JSON.stringify(profileData));
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 2000);
  };

  const handleConnectGoogle = () => {
    setIsConnectingGoogle(true);
    setTimeout(() => {
      const email = prompt('Google emailingizni kiriting (masalan: yourname@gmail.com):', googleAccount || 'myaccount@gmail.com');
      if (email && email.includes('@')) {
        setGoogleAccount(email.trim());
        setGoogleConnected(true);
        localStorage.setItem(
          `fmtg_profile_${session.userId}`,
          JSON.stringify({
            firstName,
            lastName,
            birthDay,
            birthMonth,
            birthYear,
            googleAccount: email.trim(),
            googleConnected: true,
          }),
        );
        alert(t.googleConnected);
      }
      setIsConnectingGoogle(false);
    }, 400);
  };

  const handleDeleteAccount = () => {
    setDeleteError(null);

    if (!googleConnected && !googleAccount) {
      setDeleteError('Avval profilingizga Google hisobini ulashingiz kerak!');
      return;
    }

    if (!deleteConfirmGoogleEmail.trim() || !deleteConfirmGooglePassword.trim()) {
      setDeleteError('FMTg hisobini to‘liq o‘chirish uchun Google pochtangiz va parolingizni kiritishingiz shart!');
      return;
    }

    if (deleteConfirmGoogleEmail.trim().toLowerCase() !== googleAccount.toLowerCase()) {
      setDeleteError('Kiritilgan Google pochtasi profildagi ulangan Google pochtasiga mos kelmadi!');
      return;
    }

    setIsDeleting(true);
    setTimeout(() => {
      setIsDeleting(false);
      localStorage.clear();
      alert(t.deleteSuccess);
      onClose();
      onAccountDeleted?.();
      window.location.reload();
    }, 1200);
  };

  if (!isOpen) return null;

  const months = [
    'Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun',
    'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 select-none">
      <div className="glass-modal max-w-lg w-full max-h-[90vh] rounded-3xl border border-white/10 p-6 flex flex-col shadow-2xl overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-5 pb-3 border-b border-border-subtle">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-accent-primary to-accent-teal flex items-center justify-center font-bold text-white shadow-md text-sm">
              FM
            </div>
            <div>
              <h3 className="text-base font-bold text-text-primary">
                {t.profileSettings}
              </h3>
              <p className="text-[11px] text-text-tertiary">
                Shaxsiy ma'lumotlar, Google integratsiyasi va xavfsizlik
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-text-tertiary hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 mb-5 p-1 rounded-2xl bg-bg-secondary border border-white/5 text-xs font-semibold">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex-1 py-2 rounded-xl transition ${
              activeTab === 'profile'
                ? 'bg-accent-primary text-white shadow-sm'
                : 'text-text-tertiary hover:text-white'
            }`}
          >
            {t.profileSettings}
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`flex-1 py-2 rounded-xl transition ${
              activeTab === 'security'
                ? 'bg-accent-primary text-white shadow-sm'
                : 'text-text-tertiary hover:text-white'
            }`}
          >
            {t.privacySettings}
          </button>
        </div>

        {/* TAB 1: PROFILE & GOOGLE INTEGRATION */}
        {activeTab === 'profile' && (
          <div className="space-y-4 text-xs">
            {/* First & Last Name */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-text-tertiary uppercase font-bold mb-1">
                  {t.firstName}
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-bg-tertiary border border-white/10 rounded-xl p-2.5 text-text-primary focus:outline-none focus:border-accent-primary"
                />
              </div>
              <div>
                <label className="block text-[11px] text-text-tertiary uppercase font-bold mb-1">
                  {t.lastName}
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-bg-tertiary border border-white/10 rounded-xl p-2.5 text-text-primary focus:outline-none focus:border-accent-primary"
                />
              </div>
            </div>

            {/* Birth Date: Day, Month, Year */}
            <div>
              <label className="block text-[11px] text-text-tertiary uppercase font-bold mb-1 flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-indigo-400" />
                <span>Tug‘ilgan sana (Kun, Oy, Yil)</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <select
                  value={birthDay}
                  onChange={(e) => setBirthDay(Number(e.target.value))}
                  className="bg-bg-tertiary border border-white/10 rounded-xl p-2 text-text-primary focus:outline-none"
                >
                  {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => (
                    <option key={d} value={d} className="bg-bg-secondary">
                      {d} {t.birthDay}
                    </option>
                  ))}
                </select>

                <select
                  value={birthMonth}
                  onChange={(e) => setBirthMonth(Number(e.target.value))}
                  className="bg-bg-tertiary border border-white/10 rounded-xl p-2 text-text-primary focus:outline-none"
                >
                  {months.map((m, idx) => (
                    <option key={m} value={idx + 1} className="bg-bg-secondary">
                      {m}
                    </option>
                  ))}
                </select>

                <select
                  value={birthYear}
                  onChange={(e) => setBirthYear(Number(e.target.value))}
                  className="bg-bg-tertiary border border-white/10 rounded-xl p-2 text-text-primary focus:outline-none"
                >
                  {Array.from({ length: 70 }, (_, i) => 2015 - i).map((y) => (
                    <option key={y} value={y} className="bg-bg-secondary">
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Google Account Connection Card */}
            <div className="p-4 rounded-2xl bg-bg-secondary border border-white/10 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-full bg-white flex items-center justify-center font-bold text-xs text-red-500 shadow-sm">
                    G
                  </div>
                  <div>
                    <div className="font-bold text-text-primary text-xs">
                      {t.googleAccount}
                    </div>
                    <div className="text-[11px] text-text-tertiary">
                      {googleConnected && googleAccount ? googleAccount : 'Ulanmagan'}
                    </div>
                  </div>
                </div>

                {googleConnected ? (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-bold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Ulangan</span>
                  </span>
                ) : (
                  <button
                    onClick={handleConnectGoogle}
                    disabled={isConnectingGoogle}
                    className="py-1 px-3 rounded-lg bg-white/10 hover:bg-white/20 text-white text-[11px] font-semibold transition"
                  >
                    {t.googleConnectBtn}
                  </button>
                )}
              </div>
              <p className="text-[11px] text-text-tertiary leading-relaxed">
                * Google akkaunti FMTg ilovasidagi hisobingizni to‘liq va xavfsiz o‘chirish paytida tasdiqlash uchun xizmat qiladi.
              </p>
            </div>

            {/* Save Profile Button */}
            <button
              onClick={handleSaveProfile}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-accent-primary to-accent-teal text-white font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5"
            >
              {isSaved ? <Check className="w-4 h-4 text-emerald-300" /> : null}
              <span>{isSaved ? 'Saqlandi!' : t.saveChanges}</span>
            </button>

            {/* DELETE ACCOUNT SECTION (WITH GOOGLE VERIFICATION) */}
            <div className="pt-4 border-t border-red-500/20 space-y-3">
              <div className="flex items-center gap-2 text-red-400 font-bold text-xs">
                <AlertTriangle className="w-4 h-4" />
                <span>{t.deleteAccountTitle}</span>
              </div>
              <p className="text-[11px] text-text-tertiary leading-relaxed">
                {t.deleteAccountWarning}
              </p>

              {deleteError && (
                <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300 text-[11px]">
                  {deleteError}
                </div>
              )}

              <div className="space-y-2">
                <input
                  type="email"
                  value={deleteConfirmGoogleEmail}
                  onChange={(e) => setDeleteConfirmGoogleEmail(e.target.value)}
                  placeholder={t.googleEmailPlaceholder}
                  className="w-full bg-bg-tertiary border border-white/10 rounded-xl p-2.5 text-text-primary text-xs focus:outline-none focus:border-red-500"
                />
                <input
                  type="password"
                  value={deleteConfirmGooglePassword}
                  onChange={(e) => setDeleteConfirmGooglePassword(e.target.value)}
                  placeholder={t.googlePasswordPlaceholder}
                  className="w-full bg-bg-tertiary border border-white/10 rounded-xl p-2.5 text-text-primary text-xs focus:outline-none focus:border-red-500"
                />
                <button
                  onClick={handleDeleteAccount}
                  disabled={isDeleting}
                  className="w-full py-2.5 px-4 rounded-xl bg-red-600/80 hover:bg-red-600 text-white font-bold text-xs shadow-md shadow-red-900/30 transition flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>{isDeleting ? 'O‘chirilmoqda...' : t.deleteAccountBtn}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRIVACY & SECURITY & LANGUAGE */}
        {activeTab === 'security' && (
          <div className="space-y-4 text-xs">
            {/* Language Selection */}
            <div className="p-4 rounded-2xl bg-bg-secondary border border-white/5 space-y-2">
              <div className="font-semibold text-text-primary text-xs flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-indigo-400" />
                <span>{t.language} (3 xil til)</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(['uz', 'ru', 'en'] as const).map((lang) => (
                  <button
                    key={lang}
                    onClick={() => setLanguage(lang)}
                    className={`py-2 px-3 rounded-xl font-bold uppercase transition ${
                      language === lang
                        ? 'bg-accent-primary text-white shadow-sm'
                        : 'bg-bg-tertiary text-text-secondary hover:text-white'
                    }`}
                  >
                    {lang === 'uz' ? 'O‘zbek' : lang === 'ru' ? 'Русский' : 'English'}
                  </button>
                ))}
              </div>
            </div>

            {/* Biometric Face ID Lock Toggle */}
            <div className="p-4 rounded-2xl bg-bg-secondary border border-white/5 flex items-center justify-between">
              <div>
                <div className="font-semibold text-text-primary text-xs">Face ID / Biometrik Qulf</div>
                <div className="text-[11px] text-text-tertiary">Ilovaga kirishda yuzni majburiy skanerlash</div>
              </div>
              <input
                type="checkbox"
                checked={biometricEnabled}
                onChange={(e) => setBiometricEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-accent-primary focus:ring-0"
              />
            </div>

            {/* Anti-Peeping Real-time Front Camera */}
            <div className="p-4 rounded-2xl bg-bg-secondary border border-white/5 flex items-center justify-between">
              <div>
                <div className="font-semibold text-text-primary text-xs">Anti-Peeping (Begona odam qaraganda o‘chish)</div>
                <div className="text-[11px] text-text-tertiary">{t.antiPeepingDesc}</div>
              </div>
              <input
                type="checkbox"
                checked={antiPeepingEnabled}
                onChange={(e) => setAntiPeepingEnabled(e.target.checked)}
                className="w-4 h-4 rounded text-accent-primary focus:ring-0"
              />
            </div>

            {/* 3-Month Retention Details */}
            <div className="p-4 rounded-2xl bg-indigo-950/20 border border-indigo-500/20 text-[11px] text-text-secondary leading-relaxed">
              <div className="font-bold text-indigo-300 mb-1 flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-teal-400" />
                <span>3 Oylik Arxivlash Protokoli</span>
              </div>
              {t.retentionInfo}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
