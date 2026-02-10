import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, Check } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export function MobileSelect({ value, onValueChange, options, placeholder, disabled, className }) {
  const [open, setOpen] = useState(false);

  const selectedOption = options.find(opt => opt.value === value);

  const handleSelect = (optionValue) => {
    onValueChange(optionValue);
    setOpen(false);
  };

  return (
    <>
      <Button
        variant="outline"
        onClick={() => !disabled && setOpen(true)}
        disabled={disabled}
        className={`w-full justify-between h-11 dark:bg-gray-700 dark:border-gray-600 dark:text-white select-none ${className || ''}`}
      >
        <span className={selectedOption ? 'text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'}>
          {selectedOption?.label || placeholder || 'Select...'}
        </span>
        <ChevronDown className="w-4 h-4 opacity-50" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md dark:bg-gray-800 dark:border-gray-700 bottom-0 top-auto translate-y-0 data-[state=open]:slide-in-from-bottom-full">
          <DialogHeader>
            <DialogTitle className="dark:text-white">{placeholder || 'Select an option'}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto" style={{ overscrollBehavior: 'contain' }}>
            {options.map((option) => (
              <button
                key={option.value}
                onClick={() => handleSelect(option.value)}
                className={`w-full flex items-center justify-between px-4 py-4 text-left hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors min-h-[44px] select-none ${
                  value === option.value ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                }`}
              >
                <span className="text-base dark:text-white">{option.label}</span>
                {value === option.value && (
                  <Check className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                )}
              </button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}