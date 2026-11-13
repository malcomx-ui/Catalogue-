import React from 'react';
import MortgageCaseForm from './MortgageCaseForm';

export interface MortgageEntryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  defaultBank?: string;
}

export const MortgageEntryModal: React.FC<MortgageEntryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  defaultBank = 'Centenary Bank',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative">
        <MortgageCaseForm
          defaultBank={defaultBank}
          onClose={onClose}
          onSuccess={() => {
            if (onSuccess) onSuccess();
            onClose();
          }}
        />
      </div>
    </div>
  );
};

export default MortgageEntryModal;