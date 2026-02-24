import { useState, useRef, useEffect } from 'react';
import { api, ApiError } from '@/utils/api';

interface TextSuggestionButtonProps {
  projectId: string;
  slotId: string;
  onSuggestionSelect: (suggestion: string) => void;
  hint?: string;
}

export const TextSuggestionButton: React.FC<TextSuggestionButtonProps> = ({
  projectId,
  slotId,
  onSuggestionSelect,
  hint,
}) => {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showPopover, setShowPopover] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target as Node) &&
        buttonRef.current &&
        !buttonRef.current.contains(e.target as Node)
      ) {
        setShowPopover(false);
      }
    };

    if (showPopover) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showPopover]);

  const handleSuggest = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await api.post<{
        suggestions: string[];
        assetId: string;
        tokensUsed: number;
        cost: number;
      }>('/ai/suggest/text', {
        projectId,
        slotId,
        hint: hint || undefined,
      });

      setSuggestions(response.suggestions);
      setShowPopover(true);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.statusCode === 429) {
          setError('Rate limit reached — try again in a moment');
        } else if (err.statusCode === 400) {
          setError('Invalid slot or project');
        } else if (err.statusCode === 404) {
          setError('Project or slot not found');
        } else {
          setError(err.message || 'Failed to generate suggestions');
        }
      } else {
        setError('Failed to generate suggestions');
      }
      setShowPopover(false);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    onSuggestionSelect(suggestion);
    setShowPopover(false);
    setSuggestions([]);
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleSuggest}
        disabled={loading}
        className="w-full py-2 px-3 text-sm bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded font-medium text-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {loading ? 'Generating...' : '✨ Suggest'}
      </button>

      {/* Error message */}
      {error && (
        <div className="absolute top-full left-0 right-0 mt-2 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700 z-50">
          {error}
        </div>
      )}

      {/* Suggestions popover */}
      {showPopover && suggestions.length > 0 && (
        <div
          ref={popoverRef}
          className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-50"
        >
          <p className="text-xs font-semibold text-gray-600 mb-2">Select a suggestion:</p>
          <div className="space-y-2">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectSuggestion(suggestion)}
                className="w-full text-left p-2 bg-gray-50 hover:bg-purple-50 border border-gray-200 rounded text-sm text-gray-700 hover:text-purple-700 transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
