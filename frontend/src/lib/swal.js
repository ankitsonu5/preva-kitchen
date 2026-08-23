import Swal from 'sweetalert2';

const baseOptions = {
  confirmButtonColor: '#c5a059',
  background: '#11110f',
  color: '#f7f1e5',
  buttonsStyling: false,
  customClass: {
    popup: 'swal-premium-popup',
    title: 'swal-premium-title',
    htmlContainer: 'swal-premium-copy',
    confirmButton: 'swal-premium-confirm'
  }
};

export const showAlert = (title, text, icon = 'info', options = {}) => {
  if (typeof window === 'undefined') return Promise.resolve();
  return Swal.fire({
    ...baseOptions,
    title,
    text,
    icon,
    confirmButtonText: 'Done',
    ...options,
    customClass: { ...baseOptions.customClass, ...(options.customClass || {}) }
  });
};

export const showSuccess = (title, text, options) => showAlert(title, text, 'success', options);
export const showError = (title, text, options) => showAlert(title, text, 'error', options);
export const showWarning = (title, text, options) => showAlert(title, text, 'warning', options);
export const showInfo = (title, text, options) => showAlert(title, text, 'info', options);

export const showToast = (title, icon = 'success') => {
  if (typeof window === 'undefined') return Promise.resolve();
  return Swal.fire({
    ...baseOptions,
    toast: true,
    position: 'top-end',
    title,
    icon,
    showConfirmButton: false,
    timer: 2400,
    timerProgressBar: true,
    customClass: { ...baseOptions.customClass, popup: 'swal-premium-popup swal-premium-toast' }
  });
};
