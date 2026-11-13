import React, { useState } from 'react';
import { BankHubPage } from '../BankHubPage';
import { BankWorkspace } from '../BankWorkspace';
import { useApp } from '../../context/AppContext';

export const MortgagesModule: React.FC = () => {
  const { currentUser } = useApp();
  const [selectedBank, setSelectedBank] = useState<string | null>(null);

  return (
    <div className="w-full min-w-0 h-full min-h-[500px] flex flex-col">
      {!selectedBank ? (
        <BankHubPage
          onSelectBank={(bankName) => {
            console.log('[MortgagesModule] Bank selected:', bankName);
            setSelectedBank(bankName);
          }}
        />
      ) : (
        <BankWorkspace
          bankName={selectedBank}
          currentUser={currentUser}
          onBack={() => {
            console.log('[MortgagesModule] Returned back to portfolio list');
            setSelectedBank(null);
          }}
        />
      )}
    </div>
  );
};

export default MortgagesModule;
