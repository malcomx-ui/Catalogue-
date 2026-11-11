import React, { useState } from 'react';
import { BankHubPage } from '../BankHubPage';
import { BankWorkspace } from '../BankWorkspace';
import { useApp } from '../../context/AppContext';

export const MortgagesModule: React.FC = () => {
  const { currentUser } = useApp();
  const [selectedBank, setSelectedBank] = useState<string | null>(null);

  if (selectedBank) {
    return (
      <BankWorkspace
        bankName={selectedBank}
        currentUser={currentUser}
        onBack={() => setSelectedBank(null)}
      />
    );
  }

  return (
    <BankHubPage
      onSelectBank={(bankName) => {
        setSelectedBank(bankName);
      }}
    />
  );
};

export default MortgagesModule;
