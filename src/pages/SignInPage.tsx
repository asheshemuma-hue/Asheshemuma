import React, { useState } from 'react';
import {
  User,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  RotateCcw,
  Info,
  X,
} from 'lucide-react';
import {
  resetDemoLoginOnly,
  verifyCredentials,
} from '../utils/authUtils';
import { ChangePasswordModal } from '../components/ChangePasswordModal';

interface SignInPageProps {
  onSignInSuccess: (username: string) => void;
}

export const SignInPage: React.FC<SignInPageProps> = ({ onSignInSuccess }) => {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);

  // Modals on Sign-In screen
  const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [confirmDemoLoginReset, setConfirmDemoLoginReset] = useState(false);

  const handleSignInSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusBanner(null);

    const result = verifyCredentials(identifier, password);
    if (!result.valid || !result.account) {
      setErrorMsg(
        result.error ||
          'Invalid username/email or password. Please check your details and try again.'
      );
      return;
    }

    onSignInSuccess(result.account.username);
  };

  const handleConfirmResetDemoLogin = () => {
    resetDemoLoginOnly();
    setConfirmDemoLoginReset(false);
    setIsForgotPasswordOpen(false);
    setErrorMsg(null);
    setPassword('');
    setStatusBanner(
      'Initial practice login has been restored for "admin". Existing church records (members, attendance, giving, and events) were preserved.'
    );
  };

  return (
    <div className="min-h-screen bg-[#EEF2F6] flex flex-col items-center justify-center p-4 sm:p-6">
      {/* Main Centered Sign-In Panel matching the attached picture */}
      <div className="bg-white rounded-2xl shadow-[0_8px_30px_rgba(15,23,42,0.06)] border border-slate-200/70 w-full max-w-[430px] px-6 sm:px-9 py-8 sm:py-9">
        {/* Centered Original ECR Church Logo */}
        <div className="w-56 sm:w-64 h-28 sm:h-32 mx-auto overflow-hidden flex items-center justify-center mb-3">
          <img
            src="/assets/aistudio/image_e7d4d54d.png"
            alt="ECR — Église Cité de Restauration Kolwezi-RDC"
            referrerPolicy="no-referrer"
            className="w-full h-44 sm:h-48 object-contain scale-110 select-none"
          />
        </div>

        {/* Heading & Subtitle */}
        <div className="mb-6">
          <h1 className="text-[26px] font-bold text-[#0F172A] tracking-tight leading-tight">
            Sign In
          </h1>
          <p className="text-[13.5px] text-slate-500 mt-1">
            Welcome back. Please sign in to continue.
          </p>
        </div>

        {/* Error Message */}
        {errorMsg && (
          <div
            role="alert"
            className="mb-4 bg-red-50 border border-red-200 text-red-700 px-3.5 py-2.5 rounded-lg text-xs font-medium flex items-start gap-2"
          >
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Status / Success Banner (e.g., after changing password or resetting demo login) */}
        {statusBanner && (
          <div
            role="status"
            className="mb-4 bg-emerald-50 border border-emerald-200 text-emerald-800 px-3.5 py-2.5 rounded-lg text-xs font-medium flex items-start gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>{statusBanner}</span>
          </div>
        )}

        <form onSubmit={handleSignInSubmit} noValidate className="space-y-4">
          {/* Email or Username Field */}
          <div>
            <label
              htmlFor="signin-identifier"
              className="flex items-center gap-2 text-[13.5px] font-semibold text-slate-800 mb-1.5"
            >
              <User className="w-4 h-4 text-slate-500 stroke-[2]" />
              <span>Email or Username</span>
            </label>
            <input
              id="signin-identifier"
              type="text"
              autoComplete="username"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
              placeholder="Enter your email or username"
              className="w-full bg-[#F9FAFB] border border-slate-200/90 rounded-lg px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#0D62C6] transition-colors"
            />
          </div>

          {/* Password Field */}
          <div>
            <label
              htmlFor="signin-password"
              className="flex items-center gap-2 text-[13.5px] font-semibold text-slate-800 mb-1.5"
            >
              <Lock className="w-4 h-4 text-slate-500 stroke-[2]" />
              <span>Password</span>
            </label>
            <div className="relative">
              <input
                id="signin-password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="w-full bg-[#F9FAFB] border border-slate-200/90 rounded-lg pl-3.5 pr-10 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-[#0D62C6] transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
              >
                {showPassword ? (
                  <EyeOff className="w-[18px] h-[18px]" />
                ) : (
                  <Eye className="w-[18px] h-[18px]" />
                )}
              </button>
            </div>
          </div>

          {/* Forgot Password Link */}
          <div className="flex justify-end pt-0.5">
            <button
              type="button"
              onClick={() => {
                setConfirmDemoLoginReset(false);
                setIsForgotPasswordOpen(true);
              }}
              className="text-[13px] font-medium text-[#0D62C6] hover:text-[#0A4694] hover:underline cursor-pointer"
            >
              Forgot password?
            </button>
          </div>

          {/* Sign In Button */}
          <button
            type="submit"
            className="w-full bg-[#CE1B22] hover:bg-[#B2151B] active:bg-[#991116] text-white font-semibold text-[15px] py-3 rounded-lg shadow-xs transition-colors cursor-pointer mt-1"
          >
            Sign In
          </button>
        </form>

        {/* Bottom Divider & Change Password Link */}
        <div className="border-t border-slate-100 mt-6 pt-5 text-center text-[13px] text-slate-500">
          <span>Need to change your password? </span>
          <button
            type="button"
            onClick={() => setIsChangePasswordOpen(true)}
            className="font-semibold text-[#0D62C6] hover:text-[#0A4694] hover:underline cursor-pointer"
          >
            Change Password
          </button>
        </div>
      </div>

      {/* Quiet Practice Sign-In Disclaimer */}
      <p className="mt-4 max-w-[420px] text-center text-[11px] text-slate-500 leading-relaxed px-2">
        <strong>Practice Sign-In:</strong> This browser-based demo uses a salted password hash in local storage for practice only. Browser-only checks do not provide real protection for church, personal, or financial records.
      </p>

      {/* Change Password Modal */}
      <ChangePasswordModal
        isOpen={isChangePasswordOpen}
        signedInUsername={null}
        onClose={() => setIsChangePasswordOpen(false)}
        onPasswordChanged={() => {
          setErrorMsg(null);
          setStatusBanner(
            'Password changed. Please sign in with your new password.'
          );
        }}
      />

      {/* Forgot Password / Reset Demo Login Dialog */}
      {isForgotPasswordOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-[1px] flex items-center justify-center p-3.5 sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="forgot-password-title"
        >
          <div className="bg-white border border-slate-200 rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="bg-[#2C3542] text-white px-5 sm:px-6 py-4 flex items-center justify-between">
              <div>
                <h2 id="forgot-password-title" className="text-base font-bold">
                  Forgot Password — Practice App
                </h2>
                <p className="text-xs text-slate-300 mt-0.5">
                  Account recovery information & demo login reset
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsForgotPasswordOpen(false)}
                aria-label="Close forgot password dialog"
                className="text-slate-300 hover:text-white transition-colors cursor-pointer p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 text-xs text-slate-700 leading-relaxed">
              <div className="bg-amber-50 border border-amber-200 text-amber-900 rounded-lg p-3.5 flex items-start gap-2.5">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-amber-950">
                    Email recovery is not configured
                  </div>
                  <p className="mt-1 text-amber-800">
                    This is a local browser-based practice application. No email server or external recovery service is connected, so a password reset email cannot be sent.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3.5 space-y-2">
                <div className="font-semibold text-slate-900">
                  Reset Demo Login (Practice Only)
                </div>
                <p className="text-slate-600">
                  If you forgot the password you set during practice, you can restore the initial demo administrator login (<code className="font-mono font-semibold text-slate-800">admin</code>).
                </p>
                <p className="text-slate-500 text-[11px]">
                  <strong>Important:</strong> This demo reset does not verify identity and is provided strictly for practice convenience. Resetting the demo login will <strong>not</strong> delete your members, attendance, giving, or event records.
                </p>

                {!confirmDemoLoginReset ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDemoLoginReset(true)}
                    className="mt-2 w-full flex items-center justify-center gap-2 bg-white hover:bg-red-50 text-[#CE1B22] border border-red-200 rounded-lg py-2.5 px-3 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reset Demo Login</span>
                  </button>
                ) : (
                  <div className="mt-2 bg-red-50/90 border border-red-200 rounded-lg p-3 space-y-2.5">
                    <div className="text-xs font-semibold text-red-900">
                      Confirm restoring the initial practice login?
                    </div>
                    <p className="text-[11px] text-red-800">
                      This will restore the initial administrator password hash while keeping all church records intact.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleConfirmResetDemoLogin}
                        className="flex-1 bg-[#CE1B22] hover:bg-[#B2151B] text-white text-xs font-semibold py-2 rounded-md cursor-pointer"
                      >
                        Confirm Reset
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDemoLoginReset(false)}
                        className="flex-1 bg-white border border-slate-300 text-slate-700 text-xs font-semibold py-2 rounded-md hover:bg-slate-50 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsForgotPasswordOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-300 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
