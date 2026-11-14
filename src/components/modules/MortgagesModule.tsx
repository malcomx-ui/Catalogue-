import React, { useState } from 'react';
import { BankHubPage } from '../BankHubPage';
import { BankWorkspace } from '../BankWorkspace';
import { useApp } from '../../context/AppContext';

export const MortgagesModule: React.FC = () => {
  const { currentUser, mortgageAction, mortgageActionNonce } = useApp();
  const [selectedBank, setSelectedBank] = useState<string | null>(null);

  return (
    <div className="w-full min-w-0 h-full min-h-[500px] flex flex-col">
      {!selectedBank ? (
        <BankHubPage
          externalAction={mortgageAction}
          externalActionNonce={mortgageActionNonce}
          onSelectBank={(bankName) => {
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

