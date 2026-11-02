import React, { useState } from 'react';
import { User, Branch, CustomRole } from '../../types';
import {
  Mail,
  Copy,
  Check,
  ExternalLink,
  Shield,
  Key,
  UserCheck,
  Building2,
  X,
  Send,
} from 'lucide-react';

interface StaffWelcomeModalProps {
  user: User;
  branch?: Branch;
  role?: CustomRole;
  onClose: () => void;
}

export const StaffWelcomeModal: React.FC<StaffWelcomeModalProps> = ({
  user,
  branch,
  role,
  onClose,
}) => {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

  const originUrl = typeof window !== 'undefined' ? window.location.origin : 'https://catalogue.mkadvocates.ug';
  const directAccessLink = `${originUrl}/?email=${encodeURIComponent(user.email)}`;
  const password = user.password || 'MK@Law2026';
  const roleName = role?.name || user.roleTitle || 'Legal Counsel';
  const branchName = branch?.name || user.branchName || 'Kampala Central (Head Office)';

  const emailSubject = `Official Access Credentials: MK Case Catalogue & Litigation Portal`;

  const emailBody = `CONFIDENTIAL LEGAL PORTAL ONBOARDING
MK ADVOCATES & SOLICITORS

Dear ${user.name},

You have been provisioned as an authorized staff user on the centralized MK Case Catalogue & Litigation Management System.

==================================================
YOUR OFFICIAL ACCESS CREDENTIALS:
==================================================
• Portal Access URL: ${directAccessLink}
• Registered Login Email: ${user.email}
• Temporary Password: ${password}
• Assigned Access Role: ${roleName}
• Designated Station: ${branchName}

==================================================
FIRST-TIME LOGIN & PASSWORD SETUP:
==================================================
1. Click your Portal Access URL above (or navigate to ${originUrl}).
2. Enter your registered email address and temporary password (${password}).
3. The portal will prompt you immediately to establish your own permanent private password.
4. Once saved, your access is active across all firm computers, laptops, and mobile devices.

==================================================
FIRM SECURITY NOTICE:
==================================================
All client files, suit numbers, and court documents are strictly privileged and confidential under the Advocates Act. Do not share your login credentials with unauthorized personnel. Access logs and file movements are monitored.

If you require assistance or experience any login difficulties, contact the Managing Partner (infosightug@gmail.com).

Sincerely,
Managing Partner & Registry Management
MK Advocates & Solicitors`;

  const handleCopyEmail = () => {
    navigator.clipboard.writeText(`Subject: ${emailSubject}\n\n${emailBody}`);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(directAccessLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  const handleCopyPassword = () => {
    navigator.clipboard.writeText(password);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2500);
  };

  const handleOpenMailClient = () => {
    const mailtoUrl = `mailto:${encodeURIComponent(user.email)}?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`;
    window.location.href = mailtoUrl;
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-2xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[94vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 p-4 sm:p-5 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">Staff Welcome & Onboarding Package</h2>
                <span className="hidden sm:inline-block text-[10px] font-mono bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2 py-0.5 rounded-full font-semibold">
                  Credentials Active
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Official onboarding invitation and access link for {user.name}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 text-xs">
          {/* Quick Credential Summary Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
            <div>
              <span className="text-slate-400 text-[11px] block font-medium">Authorized Staff User:</span>
              <strong className="text-slate-900 text-sm font-semibold">{user.name}</strong>
              <div className="text-slate-500 text-[11px] mt-0.5">{user.email}</div>
            </div>

            <div>
              <span className="text-slate-400 text-[11px] block font-medium">Assigned Role & Station:</span>
              <div className="text-slate-900 font-medium">{roleName}</div>
              <div className="text-slate-500 text-[11px] flex items-center gap-1 mt-0.5">
                <Building2 className="w-3 h-3 text-slate-400" />
                <span>{branchName}</span>
              </div>
            </div>

            <div className="sm:col-span-2 pt-2 border-t border-slate-200/80 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Key className="w-4 h-4 text-amber-600" />
                <span className="text-slate-600">Temporary Password:</span>
                <code className="bg-amber-50 text-amber-900 border border-amber-200 px-2 py-0.5 rounded font-mono font-bold text-xs">
                  {password}
                </code>
              </div>
              <button
                type="button"
                onClick={handleCopyPassword}
                className="inline-flex items-center gap-1 text-[11px] text-slate-600 hover:text-slate-900 font-medium px-2 py-1 bg-white hover:bg-slate-100 rounded border border-slate-200 transition-colors"
              >
                {copiedPassword ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy Password</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Direct Access Link Box */}
          <div className="space-y-1.5">
            <label className="text-slate-700 font-bold flex items-center justify-between">
              <span>Direct Portal Access Link:</span>
              <span className="text-[11px] text-slate-400 font-normal">Pre-filled with staff login email</span>
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={directAccessLink}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono text-slate-800 select-all focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-medium transition-colors shrink-0 shadow-2xs"
              >
                {copiedLink ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Link Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Pre-Formatted Welcome Email Preview */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-slate-700 font-bold flex items-center gap-1.5">
                <Mail className="w-4 h-4 text-indigo-600" />
                <span>Official Welcome Email Notice (Ready to Send):</span>
              </label>
              <button
                type="button"
                onClick={handleCopyEmail}
                className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-semibold"
              >
                {copiedEmail ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedEmail ? 'Email Copied!' : 'Copy Full Email'}</span>
              </button>
            </div>

            <div className="bg-slate-900 text-slate-200 p-3.5 rounded-xl font-mono text-[11px] whitespace-pre-wrap leading-relaxed max-h-56 overflow-y-auto border border-slate-800 select-all">
              <div className="text-amber-300 font-bold mb-2 pb-1 border-b border-slate-800">
                Subject: {emailSubject}
              </div>
              {emailBody}
            </div>
          </div>

          {/* Security Notice */}
          <div className="p-3 bg-amber-50/80 border border-amber-200/80 rounded-xl text-amber-900 flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-[11px] leading-relaxed">
              <strong>Super Admin Control:</strong> This staff user has been stored in the central firm database. When they log in on any computer or mobile phone, their assigned permissions and branch matters are instantly applied.
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="bg-slate-50 p-3.5 sm:p-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2 shrink-0">
          <button
            type="button"
            onClick={handleOpenMailClient}
            className="inline-flex items-center gap-2 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs transition-colors"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Open in Email App (Send to {user.email})</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopyEmail}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-medium transition-colors"
            >
              {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedEmail ? 'Copied to Clipboard' : 'Copy Full Email'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
