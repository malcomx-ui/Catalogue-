import React from 'react';
import { isSuperAdminUser, ActiveUser } from '../lib/hrSupabase';
import { HrModuleEntry, BirthdayWidget } from './HrModuleBundle';

/**
 * Renders the HR module ONLY for Super Admins during development/testing.
 */
export function LockedHrModule({ currentUser }: { currentUser: ActiveUser | null }) {
  if (!isSuperAdminUser(currentUser)) {
    return null;
  }

  // gateForSuperAdmin={true} ensures staff tabs never mount even if called directly
  return <HrModuleEntry currentUser={currentUser} gateForSuperAdmin={true} />;
}

/**
 * Renders the Birthday widget ONLY for Super Admins until rollout is approved.
 */
export function LockedBirthdayWidget({
  currentUser,
  onOpenHrModule,
}: {
  currentUser: ActiveUser | null;
  onOpenHrModule?: () => void;
}) {
  if (!isSuperAdminUser(currentUser) || !currentUser?.id) {
    return null;
  }

  return <BirthdayWidget currentUserId={currentUser.id} onOpenHrModule={onOpenHrModule} />;
}
