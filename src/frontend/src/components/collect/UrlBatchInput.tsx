import { useState } from 'react';

interface UrlBatchInputProps {
  onSubmit: (urls: string[]) => Promise<void>;
  loading: boolean;
}

/**
 * UrlBatchInput Component
 *
 * Left panel form for submitting Instagram/TikTok URLs
 */
export const UrlBatchInput = ({ onSubmit, loading }: UrlBatchInputProps) => {
  const [input, setInput] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Parse URLs from input (one per line)
    const urls = input
      .split('\n')
      .map((url) => url.trim())
      .filter((url) => url.length > 0);

    if (urls.length === 0) {
      setError('Please enter at least one URL');
      return;
    }

    if (urls.length > 20) {
      setError('Maximum 20 URLs per batch');
      return;
    }

    try {
      await onSubmit(urls);
      setInput(''); // Clear input on success
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to submit URLs');
    }
  };

  return (
    <div className="p-4">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Submit URLs</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="urls" className="block text-sm font-semibold text-gray-700 mb-2">
            Instagram / TikTok URLs
          </label>
          <textarea
            id="urls"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="https://www.instagram.com/reel/ABC123/&#10;https://www.tiktok.com/@user/video/123456789&#10;..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 resize-none"
            rows={8}
          />
          <p className="text-xs text-gray-500 mt-2">
            One URL per line. Max 20 URLs per batch.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2 px-4 rounded-lg font-semibold transition-colors ${
            loading
              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
              : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
          }`}
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Submitting...
            </span>
          ) : (
            'Submit URLs'
          )}
        </button>
      </form>

      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">Supported Platforms</h3>
        <div className="space-y-2 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
            <span>Instagram Reels & Posts</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 bg-red-400 rounded-full"></span>
            <span>TikTok Videos</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UrlBatchInput;
