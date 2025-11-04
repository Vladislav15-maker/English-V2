
import React from 'react';

interface ModalProps {
  isVisible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isVisible, onClose, title, children }) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">&times;</button>
        </div>
        <div>{children}</div>
      </div>
    </div>
  );
};

export default Modal;
