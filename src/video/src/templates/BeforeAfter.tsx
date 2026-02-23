import React from 'react';
import { TemplateComposition } from './TemplateComposition';

export const BeforeAfter: React.FC = () => {
  const template = {
    version: '1.0',
    slots: [
      { id: 'before-image', type: 'image', label: 'Before Image', required: true },
      { id: 'after-image', type: 'image', label: 'After Image', required: true },
      { id: 'before-label', type: 'text', label: 'Before Label', required: false },
      { id: 'after-label', type: 'text', label: 'After Label', required: false },
    ],
    scenes: [
      {
        id: 'before-scene',
        durationSeconds: 6,
        components: [
          { componentId: 'StaticImage', zIndex: 0, slotBindings: { src: 'before-image' }, props: { objectFit: 'cover' } },
          { componentId: 'AnimatedText', zIndex: 1, slotBindings: { text: 'before-label' }, props: { fontSize: 44, color: '#FFFFFF', fontWeight: 'bold', animationType: 'fade', delay: 30 } },
        ],
      },
      {
        id: 'after-scene',
        durationSeconds: 6,
        components: [
          { componentId: 'StaticImage', zIndex: 0, slotBindings: { src: 'after-image' }, props: { objectFit: 'cover' } },
          { componentId: 'AnimatedText', zIndex: 1, slotBindings: { text: 'after-label' }, props: { fontSize: 44, color: '#4CAF50', fontWeight: 'bold', animationType: 'fade', delay: 30 } },
        ],
      },
    ],
  };

  const sampleSlotFills = {
    'before-image': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1080&h=1920&fit=crop',
    'after-image': 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1080&h=1920&fit=crop',
    'before-label': 'Before',
    'after-label': 'After',
  };

  return <TemplateComposition template={template} slotFills={sampleSlotFills} />;
};
