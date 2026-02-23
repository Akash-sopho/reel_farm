import React from 'react';
import { TemplateComposition } from './TemplateComposition';

export const PhotoDump: React.FC = () => {
  const template = {
    version: '1.0',
    slots: [
      { id: 'photo-1', type: 'image', label: 'Photo 1', required: true },
      { id: 'photo-2', type: 'image', label: 'Photo 2', required: true },
      { id: 'photo-3', type: 'image', label: 'Photo 3', required: true },
      { id: 'photo-4', type: 'image', label: 'Photo 4', required: true },
      { id: 'photo-5', type: 'image', label: 'Photo 5', required: true },
    ],
    scenes: [
      {
        id: 'scene-1',
        durationSeconds: 3,
        components: [
          {
            componentId: 'StaticImage',
            zIndex: 0,
            slotBindings: { src: 'photo-1' },
            props: { objectFit: 'cover' },
          },
        ],
      },
      {
        id: 'scene-2',
        durationSeconds: 3,
        components: [
          {
            componentId: 'StaticImage',
            zIndex: 0,
            slotBindings: { src: 'photo-2' },
            props: { objectFit: 'cover' },
          },
        ],
      },
      {
        id: 'scene-3',
        durationSeconds: 3,
        components: [
          {
            componentId: 'StaticImage',
            zIndex: 0,
            slotBindings: { src: 'photo-3' },
            props: { objectFit: 'cover' },
          },
        ],
      },
      {
        id: 'scene-4',
        durationSeconds: 3,
        components: [
          {
            componentId: 'StaticImage',
            zIndex: 0,
            slotBindings: { src: 'photo-4' },
            props: { objectFit: 'cover' },
          },
        ],
      },
      {
        id: 'scene-5',
        durationSeconds: 3,
        components: [
          {
            componentId: 'StaticImage',
            zIndex: 0,
            slotBindings: { src: 'photo-5' },
            props: { objectFit: 'cover' },
          },
        ],
      },
    ],
  };

  const sampleSlotFills = {
    'photo-1': 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1080&h=1920&fit=crop',
    'photo-2': 'https://images.unsplash.com/photo-1464207687429-7505649dae38?w=1080&h=1920&fit=crop',
    'photo-3': 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=1080&h=1920&fit=crop',
    'photo-4': 'https://images.unsplash.com/photo-1495521821757-a1efb6729352?w=1080&h=1920&fit=crop',
    'photo-5': 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1080&h=1920&fit=crop',
  };

  return <TemplateComposition template={template} slotFills={sampleSlotFills} />;
};
