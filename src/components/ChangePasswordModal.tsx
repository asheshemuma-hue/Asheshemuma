import React, { useState } from 'react';
import {
  X,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  ShieldAlert,
} from 'lucide-react';
import { changeDemoPassword } from '../utils/authUtils';

interface ChangePasswordModalProps {
  isOpen: boolean;
  signedInUsername?: string | null;
  onClose: () => void;
  onPasswordChanged?: () => void;
}

export const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({
  isOpen,
  signedInUsername,
  onClose,
  onPasswordChanged,
}) => {
  const [username, setUsername] = useState(signedInUsername || '');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const effectiveUsername = signedInUsername || username;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const result = changeDemoPassword({
      usernameInput: effectiveUsername,
      currentPasswordInput: currentPassword,
      newPasswordInput: newPassword,
      confirmPasswordInput: confirmPassword,
    });

    if (!result.success) {
      setErrorMsg(result.error || 'Could not change password.');
      return;
    }

    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setSuccessMsg(
      'Password updated. Your new salted password hash has been saved in browser storage.'
    );
    if (onPasswordChanged) {
      onPasswordChanged();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-[1px] flex items-center justify-center p-3.5 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="change-password-title"
    >
      <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-md max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="bg-[#2C3542] text-white px-5 sm:px-6 py-4 flex items-center justify-between shrink-0">
          <div>
            <h2 id="change-password-title" className="text-base font-bold">
              Change Password
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Update the practice administrator login password
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close change password dialog"
            className="text-slate-300 hover:text-white transition-colors cursor-pointer p-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto">
          {errorMsg && (
            <div
              role="alert"
              className="bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-lg text-xs font-medium flex items-start gap-2"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div
              role="status"
              className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2.5 rounded-lg text-xs font-medium flex items-start gap-2"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Show Username input when not already signed in */}
          {!signedInUsername ? (
            <div>
              <label
                htmlFor="cp-username"
                className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5"
              >
                <User className="w-3.5 h-3.5 text-slate-500" />
                <span>Username</span>
              </label>
              <input
                id="cp-username"
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username (e.g., admin)"
                className="w-full bg-[#F9FAFB] border border-slate-200 rounded-lg px-3.5 py-2.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 transition-colors"
              />
            </div>
          ) : (
            <div className="bg-slate-50 border border-slate-200/80 rounded-lg px-3.5 py-2 flex items-center justify-between text-xs">
              <span className="text-slate-500">Account Username:</span>
              <span className="font-semibold text-slate-800">{signedInUsername}</span>
            </div>
          )}

          {/* Current Password */}
          <div>
            <label
              htmlFor="cp-current-password"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>Current Password</span>
            </label>
            <div className="relative">
              <input
                id="cp-current-password"
                type={showCurrent ? 'text' : 'password'}
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full bg-[#F9FAFB] border border-slate-200 rounded-lg pl-3.5 pr-10 py-2.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                aria-label={showCurrent ? 'Hide current password' : 'Show current password'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label
              htmlFor="cp-new-password"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>New Password</span>
            </label>
            <div className="relative">
              <input
                id="cp-new-password"
                type={showNew ? 'text' : 'password'}
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password"
                className="w-full bg-[#F9FAFB] border border-slate-200 rounded-lg pl-3.5 pr-10 py-2.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                aria-label={showNew ? 'Hide new password' : 'Show new password'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label
              htmlFor="cp-confirm-password"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 mb-1.5"
            >
              <Lock className="w-3.5 h-3.5 text-slate-500" />
              <span>Confirm New Password</span>
            </label>
            <div className="relative">
              <input
                id="cp-confirm-password"
                type={showConfirm ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                className="w-full bg-[#F9FAFB] border border-slate-200 rounded-lg pl-3.5 pr-10 py-2.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-600 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                aria-label={showConfirm ? 'Hide confirmed password' : 'Show confirmed password'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Practice Security Note */}
          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3 flex items-start gap-2 text-[11px] text-slate-500 leading-relaxed">
            <ShieldAlert className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <span>
              Practice sign-in stores a salted password hash in local browser storage. Your existing church records remain untouched.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              {successMsg ? 'Close' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-[#CE1B22] hover:bg-[#B2151B] text-xs font-semibold text-white shadow-xs transition-colors cursor-pointer"
            >
              Update Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
