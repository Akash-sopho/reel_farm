import React from 'react';
import { TemplateComposition } from './TemplateComposition';

export const Listicle: React.FC = () => {
  const template = {
    version: '1.0',
    slots: [
      { id: 'title-text', type: 'text', label: 'Title', required: true },
      { id: 'item-1', type: 'text', label: 'Item 1', required: true },
      { id: 'item-2', type: 'text', label: 'Item 2', required: true },
      { id: 'item-3', type: 'text', label: 'Item 3', required: true },
    ],
    scenes: [
      {
        id: 'title-scene',
        durationSeconds: 3,
        components: [
          {
            componentId: 'AnimatedText',
            zIndex: 0,
            slotBindings: { text: 'title-text' },
            props: { fontSize: 60, color: '#FFFFFF', fontWeight: 'bold', animationType: 'fade' },
          },
        ],
      },
      {
        id: 'item-1-scene',
        durationSeconds: 4,
        components: [
          {
            componentId: 'TypewriterText',
            zIndex: 0,
            slotBindings: { text: 'item-1' },
            props: { fontSize: 40, color: '#FF6B6B' },
          },
        ],
      },
      {
        id: 'item-2-scene',
        durationSeconds: 4,
        components: [
          {
            componentId: 'TypewriterText',
            zIndex: 0,
            slotBindings: { text: 'item-2' },
            props: { fontSize: 40, color: '#4ECDC4' },
          },
        ],
      },
      {
        id: 'item-3-scene',
        durationSeconds: 4,
        components: [
          {
            componentId: 'TypewriterText',
            zIndex: 0,
            slotBindings: { text: 'item-3' },
            props: { fontSize: 40, color: '#45B7D1' },
          },
        ],
      },
    ],
  };

  const sampleSlotFills = {
    'title-text': 'Top 3 Tips',
    'item-1': '✨ Stay Focused',
    'item-2': '🎯 Set Goals',
    'item-3': '💪 Keep Going',
  };

  return <TemplateComposition template={template} slotFills={sampleSlotFills} />;
};
