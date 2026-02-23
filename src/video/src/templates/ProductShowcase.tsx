import React from 'react';
import { TemplateComposition } from './TemplateComposition';

export const ProductShowcase: React.FC = () => {
  const template = {
    version: '1.0',
    slots: [
      { id: 'product-image', type: 'image', label: 'Product Image', required: true },
      { id: 'feature-1-text', type: 'text', label: 'Feature 1', required: true },
      { id: 'feature-2-text', type: 'text', label: 'Feature 2', required: true },
      { id: 'feature-3-text', type: 'text', label: 'Feature 3', required: true },
    ],
    scenes: [
      {
        id: 'scene-1',
        durationSeconds: 4,
        components: [
          {
            componentId: 'KenBurnsImage',
            zIndex: 0,
            slotBindings: { src: 'product-image' },
            props: { direction: 'in', scale: 1.1 },
          },
          {
            componentId: 'AnimatedText',
            zIndex: 1,
            slotBindings: { text: 'feature-1-text' },
            props: { fontSize: 44, color: '#FFFFFF', animationType: 'slide-up', delay: 10 },
          },
        ],
      },
      {
        id: 'scene-2',
        durationSeconds: 4,
        components: [
          {
            componentId: 'KenBurnsImage',
            zIndex: 0,
            slotBindings: { src: 'product-image' },
            props: { direction: 'out', scale: 1.08 },
          },
          {
            componentId: 'AnimatedText',
            zIndex: 1,
            slotBindings: { text: 'feature-2-text' },
            props: { fontSize: 44, color: '#FFEB3B', animationType: 'slide-up', delay: 10 },
          },
        ],
      },
      {
        id: 'scene-3',
        durationSeconds: 4,
        components: [
          {
            componentId: 'StaticImage',
            zIndex: 0,
            slotBindings: { src: 'product-image' },
            props: { objectFit: 'cover' },
          },
          {
            componentId: 'AnimatedText',
            zIndex: 1,
            slotBindings: { text: 'feature-3-text' },
            props: { fontSize: 44, color: '#4CAF50', animationType: 'fade', delay: 10 },
          },
        ],
      },
    ],
  };

  const sampleSlotFills = {
    'product-image': 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=1080&h=1920&fit=crop',
    'feature-1-text': 'Premium Quality',
    'feature-2-text': 'Best Price',
    'feature-3-text': 'Fast Shipping',
  };

  return <TemplateComposition template={template} slotFills={sampleSlotFills} />;
};
