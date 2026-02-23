import React from 'react';
import { TemplateComposition } from './TemplateComposition';

export const DayInLife: React.FC = () => {
  const template = {
    version: '1.0',
    slots: [
      { id: 'morning-image', type: 'image', label: 'Morning Activity', required: true },
      { id: 'morning-text', type: 'text', label: 'Morning Description', required: false },
      { id: 'midday-image', type: 'image', label: 'Midday Activity', required: true },
      { id: 'midday-text', type: 'text', label: 'Midday Description', required: false },
      { id: 'evening-image', type: 'image', label: 'Evening Activity', required: true },
      { id: 'evening-text', type: 'text', label: 'Evening Description', required: false },
    ],
    scenes: [
      {
        id: 'morning-scene',
        durationSeconds: 8,
        components: [
          { componentId: 'KenBurnsImage', zIndex: 0, slotBindings: { src: 'morning-image' }, props: { direction: 'in', scale: 1.08 } },
          { componentId: 'AnimatedText', zIndex: 1, slotBindings: { text: 'morning-text' }, props: { fontSize: 40, color: '#FFFFFF', animationType: 'slide-up', delay: 45 } },
        ],
      },
      {
        id: 'midday-scene',
        durationSeconds: 8,
        components: [
          { componentId: 'KenBurnsImage', zIndex: 0, slotBindings: { src: 'midday-image' }, props: { direction: 'out', scale: 1.1 } },
          { componentId: 'AnimatedText', zIndex: 1, slotBindings: { text: 'midday-text' }, props: { fontSize: 40, color: '#FFEB3B', animationType: 'fade', delay: 45 } },
        ],
      },
      {
        id: 'evening-scene',
        durationSeconds: 9,
        components: [
          { componentId: 'KenBurnsImage', zIndex: 0, slotBindings: { src: 'evening-image' }, props: { direction: 'in', scale: 1.09 } },
          { componentId: 'AnimatedText', zIndex: 1, slotBindings: { text: 'evening-text' }, props: { fontSize: 40, color: '#9C27B0', animationType: 'slide-up', delay: 50 } },
        ],
      },
    ],
  };

  const sampleSlotFills = {
    'morning-image': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1080&h=1920&fit=crop',
    'morning-text': '6:00 AM Morning Workout',
    'midday-image': 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=1080&h=1920&fit=crop',
    'midday-text': '12:00 PM Lunch Break',
    'evening-image': 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1080&h=1920&fit=crop',
    'evening-text': '5:00 PM Creative Time',
  };

  return <TemplateComposition template={template} slotFills={sampleSlotFills} />;
};
