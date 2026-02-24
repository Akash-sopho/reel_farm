import { useState } from 'react';
import { api, ApiError } from '@/utils/api';

interface ImageSuggestionModalProps {
  projectId: string;
  slotId: string;
  onImageSelect: (imageUrl: string) => void;
  onClose: () => void;
}

export const ImageSuggestionModal: React.FC<ImageSuggestionModalProps> = ({
  projectId,
  slotId,
  onImageSelect,
  onClose,
}) => {
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const response = await api.post<{
        imageUrl: string;
        assetId: string;
        cost: number;
      }>('/ai/suggest/image', {
        projectId,
        slotId,
        prompt: prompt.trim(),
      });

      setGeneratedImage(response.imageUrl);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.statusCode === 429) {
          setError('Rate limit reached — try again in a moment');
        } else if (err.statusCode === 400) {
          setError('Invalid slot or project');
        } else if (err.statusCode === 404) {
          setError('Project or slot not found');
        } else {
          setError(err.message || 'Failed to generate image');
        }
      } else {
        setError('Failed to generate image');
      }
      setGeneratedImage(null);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectImage = () => {
    if (generatedImage) {
      onImageSelect(generatedImage);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Generate Image</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none"
          >
            ×
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {!generatedImage ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Image Prompt
                </label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  disabled={loading}
                  placeholder="Describe the image you want to generate..."
                  maxLength={300}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                  rows={4}
                />
                <p className="text-xs text-gray-500 mt-1">
                  {prompt.length} / 300
                </p>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                  {error}
                </div>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleGenerate}
                  disabled={loading || !prompt.trim()}
                  className="flex-1 py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      Generating...
                    </>
                  ) : (
                    '✨ Generate'
                  )}
                </button>
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Generated Image
                </label>
                <img
                  src={generatedImage}
                  alt="Generated"
                  className="w-full rounded-lg border border-gray-300"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleSelectImage}
                  className="flex-1 py-2 px-4 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                >
                  ✓ Use This Image
                </button>
                <button
                  onClick={() => {
                    setGeneratedImage(null);
                    setPrompt('');
                  }}
                  className="flex-1 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={onClose}
                  className="py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold rounded-lg transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
