
import React, { InputHTMLAttributes } from 'react';

const SecureInput: React.FC<InputHTMLAttributes<HTMLInputElement>> = (props) => {
  const handleAction = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
  };

  const baseClassName = "block w-full px-4 py-2 border border-slate-300 rounded-lg shadow-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition";
  
  return (
    <input
      {...props}
      onCopy={handleAction}
      onCut={handleAction}
      onPaste={handleAction}
      autoComplete="off"
      autoCorrect="off"
      autoCapitalize="off"
      spellCheck="false"
      className={`${baseClassName} ${props.className || ''}`}
    />
  );
};

export default SecureInput;
