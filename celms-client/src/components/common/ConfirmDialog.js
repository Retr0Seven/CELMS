import React, { useState, useEffect, useCallback } from 'react';
import ReactDOM from 'react-dom';

/**
 * A reusable confirmation dialog component
 * @param {Object} props - Component props
 * @param {string} props.title - Dialog title
 * @param {string} props.message - Dialog message
 * @param {Function} props.onConfirm - Function to call on confirm
 * @param {Function} props.onCancel - Function to call on cancel
 * @param {string} props.confirmText - Text for confirm button
 * @param {string} props.cancelText - Text for cancel button
 * @param {string} props.confirmButtonClass - Class for confirm button
 * @param {string} props.cancelButtonClass - Class for cancel button
 * @param {boolean} props.isOpen - Whether the dialog is open
 * @param {boolean} props.backdrop - Whether to show a backdrop
 * @param {string} props.size - Dialog size: 'sm', 'lg', 'xl'
 */
const ConfirmDialog = ({
  title = 'Confirm Action',
  message = 'Are you sure you want to proceed?',
  onConfirm,
  onCancel,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  confirmButtonClass = 'btn-primary',
  cancelButtonClass = 'btn-secondary',
  isOpen = false,
  backdrop = true,
  size = '',
}) => {
  const [show, setShow] = useState(isOpen);

  // Update state when isOpen prop changes
  useEffect(() => {
    setShow(isOpen);
  }, [isOpen]);

  // Close the dialog
  const handleClose = useCallback(() => {
    setShow(false);
    if (onCancel) {
      onCancel();
    }
  }, [onCancel]);

  // Handle confirm action
  const handleConfirm = useCallback(() => {
    setShow(false);
    if (onConfirm) {
      onConfirm();
    }
  }, [onConfirm]);

  // Handle escape key press
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    if (show) {
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [show, handleClose]);

  // Don't render anything if the dialog is not open
  if (!show) {
    return null;
  }

  // Create the dialog element
  const dialogContent = (
    <div className={`modal fade ${show ? 'show d-block' : ''}`} tabIndex="-1" role="dialog">
      {backdrop && <div className="modal-backdrop fade show" onClick={handleClose}></div>}
      <div className="modal-dialog modal-dialog-centered" role="document">
        <div className={`modal-content ${size ? `modal-${size}` : ''}`}>
          <div className="modal-header">
            <h5 className="modal-title">{title}</h5>
            <button type="button" className="btn-close" aria-label="Close" onClick={handleClose}></button>
          </div>
          <div className="modal-body">
            <p>{message}</p>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className={`btn ${cancelButtonClass}`}
              onClick={handleClose}
            >
              {cancelText}
            </button>
            <button
              type="button"
              className={`btn ${confirmButtonClass}`}
              onClick={handleConfirm}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Create a portal and render the dialog
  return ReactDOM.createPortal(dialogContent, document.body);
};

/**
 * Hook for using confirmation dialogs
 * @returns {Object} Functions to show, confirm, and cancel the dialog
 * 
 * @example
 * const { confirm } = useConfirm();
 * 
 * const handleDelete = () => {
 *   confirm({
 *     title: 'Delete Item',
 *     message: 'Are you sure you want to delete this item?',
 *     confirmText: 'Delete',
 *     confirmButtonClass: 'btn-danger',
 *     onConfirm: () => {
 *       // Delete the item
 *     }
 *   });
 * };
 */
export const useConfirm = () => {
  const [config, setConfig] = useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => { },
    onCancel: () => { },
    confirmText: '',
    cancelText: '',
    confirmButtonClass: '',
    cancelButtonClass: '',
    backdrop: true,
    size: '',
  });

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setConfig({
        isOpen: true,
        ...options,
        onConfirm: () => {
          if (options.onConfirm) {
            options.onConfirm();
          }
          resolve(true);
        },
        onCancel: () => {
          if (options.onCancel) {
            options.onCancel();
          }
          resolve(false);
        },
      });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    config.onConfirm();
    setConfig({ ...config, isOpen: false });
  }, [config]);

  const handleCancel = useCallback(() => {
    config.onCancel();
    setConfig({ ...config, isOpen: false });
  }, [config]);

  return {
    confirm,
    handleConfirm,
    handleCancel,
    confirmDialog: (
      <ConfirmDialog
        {...config}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
    ),
  };
};

export default ConfirmDialog;