import React from 'react';
import { TemplateComposition } from './TemplateComposition';

export const Motivational: React.FC = () => {
  const template = {
    version: '1.0',
    slots: [
      { id: 'message-text', type: 'text', label: 'Motivational Message', required: true },
      { id: 'background-image', type: 'image', label: 'Background Image', required: false },
    ],
    scenes: [
      {
        id: 'scene-1',
        durationSeconds: 8,
        components: [
          { componentId: 'StaticImage', zIndex: 0, slotBindings: { src: 'background-image' }, props: { opacity: 0.5, objectFit: 'cover' } },
          { componentId: 'AnimatedText', zIndex: 1, slotBindings: { text: 'message-text' }, props: { fontSize: 56, color: '#FFFFFF', fontWeight: 'bold', textAlign: 'center', animationType: 'fade', delay: 30 } },
          { componentId: 'GrainOverlay', zIndex: 100, slotBindings: {}, props: { opacity: 0.15, size: 2 } },
        ],
      },
    ],
  };

  const sampleSlotFills = {
    'message-text': 'You are capable of amazing things',
    'background-image': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1080&h=1920&fit=crop',
  };

  return <TemplateComposition template={template} slotFills={sampleSlotFills} />;
};
