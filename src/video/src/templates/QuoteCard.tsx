import React from 'react';
import { TemplateComposition } from './TemplateComposition';

export const QuoteCard: React.FC = () => {
  const template = {
    version: '1.0',
    slots: [
      { id: 'quote-text', type: 'text', label: 'Quote Text', required: true },
      { id: 'author-name', type: 'text', label: 'Author Name', required: false },
      { id: 'background-image', type: 'image', label: 'Background Image', required: false },
    ],
    scenes: [
      {
        id: 'scene-1',
        durationSeconds: 10,
        components: [
          {
            componentId: 'StaticImage',
            zIndex: 0,
            slotBindings: { src: 'background-image' },
            props: { opacity: 0.6, objectFit: 'cover' },
          },
          {
            componentId: 'AnimatedText',
            zIndex: 1,
            slotBindings: { text: 'quote-text' },
            props: { fontSize: 52, color: '#FFFFFF', fontWeight: 'bold', animationType: 'fade', delay: 15 },
          },
          {
            componentId: 'AnimatedText',
            zIndex: 2,
            slotBindings: { text: 'author-name' },
            props: { fontSize: 28, color: '#E0E0E0', fontWeight: 'normal', animationType: 'fade', delay: 75 },
          },
        ],
      },
    ],
  };

  const sampleSlotFills = {
    'quote-text': 'The only way to do great work is to love what you do.',
    'author-name': '— Steve Jobs',
    'background-image': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1080&h=1920&fit=crop',
  };

  return <TemplateComposition template={template} slotFills={sampleSlotFills} />;
};
