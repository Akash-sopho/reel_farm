import { useState } from 'react';
import { ImageSuggestionModal } from './ImageSuggestionModal';

interface ImageSuggestionButtonProps {
  projectId: string;
  slotId: string;
  onImageSelect: (imageUrl: string) => void;
}

export const ImageSuggestionButton: React.FC<ImageSuggestionButtonProps> = ({
  projectId,
  slotId,
  onImageSelect,
}) => {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="w-full py-2 px-3 text-sm bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded font-medium text-purple-700 transition-colors"
      >
        ✨ Generate Image
      </button>

      {showModal && (
        <ImageSuggestionModal
          projectId={projectId}
          slotId={slotId}
          onImageSelect={onImageSelect}
          onClose={() => setShowModal(false)}
        />
      )}
    </>
  );
};
