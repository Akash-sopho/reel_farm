import { TemplateSchema } from '../../../../src/shared/types/template';

/**
 * Photo Dump Template Fixture
 * 5 scenes with image slots - tests basic image carousel functionality
 */
export const photoDumpTemplate: TemplateSchema = {
  version: '1.0',
  slots: [
    { id: 'image-1', type: 'image', label: 'Image 1', required: true },
    { id: 'image-2', type: 'image', label: 'Image 2', required: true },
    { id: 'image-3', type: 'image', label: 'Image 3', required: true },
    { id: 'image-4', type: 'image', label: 'Image 4', required: true },
    { id: 'image-5', type: 'image', label: 'Image 5', required: true },
  ],
  scenes: [
    {
      id: 'scene-1',
      durationSeconds: 3,
      components: [
        {
          componentId: 'StaticImage',
          zIndex: 0,
          slotBindings: { src: 'image-1' },
          props: { objectFit: 'cover', opacity: 1 },
        },
        {
          componentId: 'FadeTransition',
          zIndex: 10,
          slotBindings: {},
          props: { durationInFrames: 30 },
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
          slotBindings: { src: 'image-2' },
          props: { objectFit: 'cover', opacity: 1 },
        },
        {
          componentId: 'FadeTransition',
          zIndex: 10,
          slotBindings: {},
          props: { durationInFrames: 30 },
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
          slotBindings: { src: 'image-3' },
          props: { objectFit: 'cover', opacity: 1 },
        },
        {
          componentId: 'FadeTransition',
          zIndex: 10,
          slotBindings: {},
          props: { durationInFrames: 30 },
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
          slotBindings: { src: 'image-4' },
          props: { objectFit: 'cover', opacity: 1 },
        },
        {
          componentId: 'FadeTransition',
          zIndex: 10,
          slotBindings: {},
          props: { durationInFrames: 30 },
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
          slotBindings: { src: 'image-5' },
          props: { objectFit: 'cover', opacity: 1 },
        },
        {
          componentId: 'FadeTransition',
          zIndex: 10,
          slotBindings: {},
          props: { durationInFrames: 30 },
        },
      ],
    },
  ],
};

/**
 * Photo Dump Slot Fills
 */
export const photoDumpSlotFills = {
  'image-1': 'https://example.com/image1.jpg',
  'image-2': 'https://example.com/image2.jpg',
  'image-3': 'https://example.com/image3.jpg',
  'image-4': 'https://example.com/image4.jpg',
  'image-5': 'https://example.com/image5.jpg',
};

/**
 * Quote Card Template Fixture
 * 1 scene with background image + 2 animated text elements
 */
export const quoteCardTemplate: TemplateSchema = {
  version: '1.0',
  slots: [
    { id: 'background', type: 'image', label: 'Background', required: true },
    { id: 'quote-text', type: 'text', label: 'Quote', required: true },
    { id: 'attribution', type: 'text', label: 'Attribution', required: false },
  ],
  scenes: [
    {
      id: 'scene-1',
      durationSeconds: 6,
      components: [
        {
          componentId: 'StaticImage',
          zIndex: 0,
          slotBindings: { src: 'background' },
          props: { objectFit: 'cover', opacity: 0.6 },
        },
        {
          componentId: 'AnimatedText',
          zIndex: 10,
          slotBindings: { text: 'quote-text' },
          props: {
            fontSize: 48,
            color: '#ffffff',
            fontWeight: 'bold',
            textAlign: 'center',
            animationType: 'fade',
            delay: 0,
          },
        },
        {
          componentId: 'AnimatedText',
          zIndex: 15,
          slotBindings: { text: 'attribution' },
          props: {
            fontSize: 24,
            color: '#cccccc',
            fontWeight: 'normal',
            textAlign: 'center',
            animationType: 'fade',
            delay: 30,
          },
        },
      ],
    },
  ],
};

/**
 * Quote Card Slot Fills
 */
export const quoteCardSlotFills = {
  background: 'https://example.com/background.jpg',
  'quote-text': 'The only way to do great work is to love what you do.',
  attribution: '— Steve Jobs',
};
