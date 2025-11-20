import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Check } from 'lucide-react';

interface ModelSearchDropdownProps {
  value: string;
  onChange: (value: string) => void;
  models: string[];
  placeholder?: string;
  disabled?: boolean;
}

export const ModelSearchDropdown: React.FC<ModelSearchDropdownProps> = ({
  value,
  onChange,
  models,
  placeholder = 'Search for a model...',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Filter models based on search term
  const filteredModels = models.filter((model) =>
    model.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Reset highlighted index when filtered models change
  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchTerm]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex((prev) =>
          prev < filteredModels.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : 0));
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredModels[highlightedIndex]) {
          handleSelectModel(filteredModels[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setIsOpen(false);
        break;
    }
  };

  const handleSelectModel = (model: string) => {
    onChange(model);
    setSearchTerm('');
    setIsOpen(false);
    inputRef.current?.blur();
  };

  const handleClear = () => {
    onChange('');
    setSearchTerm('');
    setIsOpen(false);
  };

  return (
    <div ref={dropdownRef} className="relative">
      {/* Input Field */}
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search size={18} className="text-gray-400" />
        </div>
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? searchTerm : value}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder}
          className="input pl-10 pr-20"
        />
        <div className="absolute inset-y-0 right-0 flex items-center pr-2 gap-1">
          {value && !disabled && (
            <button
              onClick={handleClear}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
              title="Clear selection"
            >
              <X size={16} className="text-gray-500" />
            </button>
          )}
          {value && (
            <div className="px-2 py-1 bg-green-100 rounded text-xs font-medium text-green-700">
              Selected
            </div>
          )}
        </div>
      </div>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-80 overflow-auto">
          {filteredModels.length === 0 ? (
            <div className="px-4 py-6 text-center">
              <p className="text-gray-700 text-sm font-medium mb-2">No popular models match "{searchTerm}"</p>
              <p className="text-xs text-gray-600 mb-3">
                You can still use any Hugging Face model by typing its full ID
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-left">
                <p className="text-xs font-medium text-blue-900 mb-1">Examples:</p>
                <code className="text-xs text-blue-700 block">meta-llama/Llama-3.1-70B-Instruct</code>
                <code className="text-xs text-blue-700 block mt-1">mistralai/Mistral-7B-Instruct-v0.3</code>
              </div>
              {searchTerm && (
                <button
                  onClick={() => {
                    onChange(searchTerm);
                    setIsOpen(false);
                  }}
                  className="mt-3 px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Use "{searchTerm}" as custom model
                </button>
              )}
            </div>
          ) : (
            <div className="py-1">
              {filteredModels.map((model, index) => {
                const isSelected = model === value;
                const isHighlighted = index === highlightedIndex;

                return (
                  <button
                    key={model}
                    onClick={() => handleSelectModel(model)}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`
                      w-full px-4 py-2.5 text-left text-sm flex items-center justify-between gap-2
                      transition-colors duration-150
                      ${
                        isHighlighted
                          ? 'bg-blue-50 text-blue-900'
                          : 'text-gray-700 hover:bg-gray-50'
                      }
                      ${isSelected ? 'font-semibold' : ''}
                    `}
                  >
                    <span className="truncate">{model}</span>
                    {isSelected && (
                      <Check size={16} className="text-blue-600 flex-shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          )}
          <div className="border-t border-gray-200 px-4 py-3 bg-gradient-to-r from-blue-50 to-indigo-50">
            <p className="text-xs font-medium text-gray-700 mb-1">
              ✨ Access 100,000+ Hugging Face models
            </p>
            <p className="text-xs text-gray-600">
              Just type any model ID from <a href="https://huggingface.co/models" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">huggingface.co/models</a>
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
