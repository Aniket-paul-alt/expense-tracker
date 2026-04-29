import React from 'react';

const ConfirmModal = ({ isOpen, title, message, onConfirm, onCancel, confirmText = "Delete", cancelText = "Cancel", type = "danger" }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm transition-opacity">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden border border-gray-100 dark:border-gray-800 transform transition-all">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">
            {title}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {message}
          </p>
        </div>
        
        <div className="flex gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-800">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-xl transition-all shadow-sm
              ${type === 'danger' 
                ? 'bg-red-500 hover:bg-red-600 shadow-red-200 dark:shadow-none' 
                : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200 dark:shadow-none'
              }`}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
