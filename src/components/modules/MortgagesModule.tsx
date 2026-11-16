import React, { useState, useEffect } from 'react';
import { BankHubPage } from '../BankHubPage';
import { BankWorkspace } from '../BankWorkspace';
import { useApp } from '../../context/AppContext';
import { getEffectiveUser, isStrictSuperAdmin } from '../../lib/supabase';
import { isSuperAdminOnlyBank } from '../mortgages/banks/bankConfigs';

export const MortgagesModule: React.FC = () => {
  const { currentUser, mortgageAction, mortgageActionNonce } = useApp();
  const [selectedBank, setSelectedBank] = useState<string | null>(null);
  const canSeeRestrictedBanks = isStrictSuperAdmin(getEffectiveUser(currentUser));

  useEffect(() => {
    if (selectedBank && isSuperAdminOnlyBank(selectedBank) && !canSeeRestrictedBanks) {
      setSelectedBank(null);
    }
  }, [selectedBank, canSeeRestrictedBanks]);

  return (
    <div className="w-full min-w-0 h-full min-h-[500px] flex flex-col">
      {!selectedBank ? (
        <BankHubPage
          externalAction={mortgageAction}
          externalActionNonce={mortgageActionNonce}
          onSelectBank={(bankName) => {
            if (isSuperAdminOnlyBank(bankName) && !canSeeRestrictedBanks) return;
            setSelectedBank(bankName);
          }}
        />
      ) : (
        <BankWorkspace
          bankName={selectedBank}
          currentUser={currentUser}
          externalAction={mortgageAction}
          externalActionNonce={mortgageActionNonce}
          onBack={() => {
            setSelectedBank(null);
          }}
        />
      )}
    </div>
  );
};

export default MortgagesModule;

