'use client';

import { createContext, useCallback, useContext, useEffect } from 'react';
import Swal from 'sweetalert2';

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {

  const confirm = useCallback((options) => new Promise((resolve) => {
    const dialogOpts = {
      title: 'Confirm action',
      description: 'Are you sure you want to continue?',
      confirmLabel: 'Confirm',
      tone: 'danger',
      ...options
    };

    Swal.fire({
      title: dialogOpts.title,
      text: dialogOpts.description,
      icon: dialogOpts.tone === 'danger' ? 'warning' : 'question',
      showCancelButton: true,
      confirmButtonColor: dialogOpts.tone === 'danger' ? '#B4483F' : '#C6A15B',
      cancelButtonColor: '#7A705F',
      confirmButtonText: dialogOpts.confirmLabel,
      background: '#FFFFFF',
      color: '#1C1712',
      customClass: {
        popup: 'swal-admin-popup',
        confirmButton: 'swal-admin-confirm'
      }
    }).then((result) => {
      resolve(result.isConfirmed);
    });
  }), []);

  useEffect(() => {
    const originalAlert = window.alert;
    const originalConfirm = window.confirm;

    // Override window.alert → SweetAlert2 toast-style popup
    window.alert = (message) => {
      const text = String(message);
      const isError = /failed|failure|could not|error|invalid/i.test(text);
      const isSuccess = /success|completed|copied|saved|created|updated|deleted|restored|uploaded/i.test(text);
      const tone = isError ? 'error' : isSuccess ? 'success' : 'info';

      Swal.fire({
        title: isError ? 'Error' : isSuccess ? 'Done!' : 'Notice',
        text: text,
        icon: tone,
        timer: isError ? undefined : 2500,
        timerProgressBar: !isError,
        showConfirmButton: isError,
        confirmButtonColor: '#C6A15B',
        toast: !isError,
        position: isError ? 'center' : 'top-end',
        background: isError ? '#FFFFFF' : '#1a1a1a',
        color: isError ? '#1C1712' : '#ffffff',
        customClass: {
          popup: isError ? 'swal-admin-popup' : 'swal-admin-toast',
          confirmButton: 'swal-admin-confirm'
        }
      });
    };

    // Override window.confirm → SweetAlert2 confirm dialog (async workaround)
    // NOTE: window.confirm can't be truly async — use useConfirm() hook for proper async confirms.
    // This override handles legacy window.confirm(msg) calls gracefully with Swal.
    window.confirm = (message) => {
      // Fire Swal async but return true synchronously as fallback
      // Pages using this should migrate to useConfirm() for true async behaviour
      Swal.fire({
        title: 'Confirm',
        text: String(message),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#B4483F',
        cancelButtonColor: '#7A705F',
        confirmButtonText: 'Yes, proceed',
        background: '#FFFFFF',
        color: '#1C1712',
        customClass: { popup: 'swal-admin-popup', confirmButton: 'swal-admin-confirm' }
      });
      // Return true so existing sync code doesn't block (pages migrated to useConfirm get proper async)
      return true;
    };

    return () => {
      window.alert = originalAlert;
      window.confirm = originalConfirm;
    };
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error('useConfirm must be used inside ConfirmProvider');
  return context;
}
