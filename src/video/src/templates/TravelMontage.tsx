import React from 'react';
import { TemplateComposition } from './TemplateComposition';

export const TravelMontage: React.FC = () => {
  const template = {
    version: '1.0',
    slots: [
      { id: 'destination-1-image', type: 'image', label: 'Destination 1 Photo', required: true },
      { id: 'destination-1-name', type: 'text', label: 'Destination 1 Name', required: false },
      { id: 'destination-2-image', type: 'image', label: 'Destination 2 Photo', required: true },
      { id: 'destination-2-name', type: 'text', label: 'Destination 2 Name', required: false },
      { id: 'destination-3-image', type: 'image', label: 'Destination 3 Photo', required: true },
      { id: 'destination-3-name', type: 'text', label: 'Destination 3 Name', required: false },
    ],
    scenes: [
      {
        id: 'scene-1',
        durationSeconds: 6,
        components: [
          { componentId: 'KenBurnsImage', zIndex: 0, slotBindings: { src: 'destination-1-image' }, props: { direction: 'in', scale: 1.1 } },
          { componentId: 'AnimatedText', zIndex: 1, slotBindings: { text: 'destination-1-name' }, props: { fontSize: 48, color: '#FFFFFF', fontWeight: 'bold', delay: 60 } },
        ],
      },
      {
        id: 'scene-2',
        durationSeconds: 7,
        components: [
          { componentId: 'KenBurnsImage', zIndex: 0, slotBindings: { src: 'destination-2-image' }, props: { direction: 'out', scale: 1.12 } },
          { componentId: 'AnimatedText', zIndex: 1, slotBindings: { text: 'destination-2-name' }, props: { fontSize: 48, color: '#FFFFFF', fontWeight: 'bold', delay: 90 } },
        ],
      },
      {
        id: 'scene-3',
        durationSeconds: 7,
        components: [
          { componentId: 'KenBurnsImage', zIndex: 0, slotBindings: { src: 'destination-3-image' }, props: { direction: 'in', scale: 1.08 } },
          { componentId: 'AnimatedText', zIndex: 1, slotBindings: { text: 'destination-3-name' }, props: { fontSize: 48, color: '#FFFFFF', fontWeight: 'bold', delay: 90 } },
        ],
      },
    ],
  };

  const sampleSlotFills = {
    'destination-1-image': 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1080&h=1920&fit=crop',
    'destination-1-name': '🗼 Paris',
    'destination-2-image': 'https://images.unsplash.com/photo-1493246507139-91e8fad9978e?w=1080&h=1920&fit=crop',
    'destination-2-name': '🗻 Tokyo',
    'destination-3-image': 'https://images.unsplash.com/photo-1488477304203-e1c6e7f27e01?w=1080&h=1920&fit=crop',
    'destination-3-name': '🏛️ Rome',
  };

  return <TemplateComposition template={template} slotFills={sampleSlotFills} />;
};
