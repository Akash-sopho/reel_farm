import React from 'react';
import { Composition } from 'remotion';
import { HelloComposition } from './compositions/HelloComposition';
import { TemplateRenderer } from './TemplateRenderer';
import {
  PhotoDump,
  QuoteCard,
  ProductShowcase,
  Listicle,
  TravelMontage,
  Motivational,
  BeforeAfter,
  DayInLife,
} from './templates';
import type { TemplateSchema, SlotFill } from '../../shared/types/template';

export const Root: React.FC = () => {
  return (
    <>
      <Composition
        id="HelloReelForge"
        component={HelloComposition}
        durationInFrames={450}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />

      {/* Phase 1 Template Compositions */}
      <Composition
        id="PhotoDump"
        component={PhotoDump}
        durationInFrames={15 * 30}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      <Composition
        id="QuoteCard"
        component={QuoteCard}
        durationInFrames={10 * 30}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      <Composition
        id="ProductShowcase"
        component={ProductShowcase}
        durationInFrames={12 * 30}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      <Composition
        id="Listicle"
        component={Listicle}
        durationInFrames={15 * 30}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      <Composition
        id="TravelMontage"
        component={TravelMontage}
        durationInFrames={20 * 30}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      <Composition
        id="Motivational"
        component={Motivational}
        durationInFrames={8 * 30}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      <Composition
        id="BeforeAfter"
        component={BeforeAfter}
        durationInFrames={12 * 30}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />
      <Composition
        id="DayInLife"
        component={DayInLife}
        durationInFrames={25 * 30}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{}}
      />

      {/* P1-T10: Generic Template Renderer - demonstrates JSON template rendering */}
      <TemplateRendererComposition />
    </>
  );
};

/**
 * Test composition for TemplateRenderer
 * Demonstrates rendering a template schema with slot fills and optional music
 */
const TemplateRendererComposition: React.FC = () => {
  // Photo Dump test template - matches seed template structure
  const photoDumpTemplate: TemplateSchema = {
    version: '1.0',
    slots: [
      {
        id: 'photo-1',
        type: 'image',
        label: 'Photo 1',
        required: true,
        constraints: { minWidth: 500, minHeight: 500 },
      },
      {
        id: 'photo-2',
        type: 'image',
        label: 'Photo 2',
        required: true,
        constraints: { minWidth: 500, minHeight: 500 },
      },
      {
        id: 'photo-3',
        type: 'image',
        label: 'Photo 3',
        required: true,
        constraints: { minWidth: 500, minHeight: 500 },
      },
      {
        id: 'photo-4',
        type: 'image',
        label: 'Photo 4',
        required: true,
        constraints: { minWidth: 500, minHeight: 500 },
      },
      {
        id: 'photo-5',
        type: 'image',
        label: 'Photo 5',
        required: true,
        constraints: { minWidth: 500, minHeight: 500 },
      },
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
          {
            componentId: 'FadeTransition',
            zIndex: 10,
            slotBindings: {},
            props: { durationInFrames: 15 },
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
          {
            componentId: 'FadeTransition',
            zIndex: 10,
            slotBindings: {},
            props: { durationInFrames: 15 },
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
          {
            componentId: 'FadeTransition',
            zIndex: 10,
            slotBindings: {},
            props: { durationInFrames: 15 },
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
          {
            componentId: 'FadeTransition',
            zIndex: 10,
            slotBindings: {},
            props: { durationInFrames: 15 },
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

  // Quote card test template - demonstrates mixed content (text + image)
  const quoteCardTemplate: TemplateSchema = {
    version: '1.0',
    slots: [
      {
        id: 'quote-text',
        type: 'text',
        label: 'Quote Text',
        required: true,
        placeholder: 'Enter your quote here',
        constraints: { maxLength: 150 },
      },
      {
        id: 'author-name',
        type: 'text',
        label: 'Author Name',
        required: false,
        placeholder: 'e.g., Steve Jobs',
        constraints: { maxLength: 50 },
      },
      {
        id: 'background-image',
        type: 'image',
        label: 'Background Image',
        required: false,
        constraints: { minWidth: 500, minHeight: 500 },
      },
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

  // Sample slot fills for Photo Dump - using placeholder URLs
  const photoDumpSlotFills: SlotFill[] = [
    {
      slotId: 'photo-1',
      type: 'image',
      value: 'https://images.unsplash.com/photo-1506905925346-21bda4d32df4?w=1080&h=1920&fit=crop',
    },
    {
      slotId: 'photo-2',
      type: 'image',
      value: 'https://images.unsplash.com/photo-1470252649378-9c29740ff023?w=1080&h=1920&fit=crop',
    },
    {
      slotId: 'photo-3',
      type: 'image',
      value: 'https://images.unsplash.com/photo-1486299967070-08de336d2cb4?w=1080&h=1920&fit=crop',
    },
    {
      slotId: 'photo-4',
      type: 'image',
      value: 'https://images.unsplash.com/photo-1501594907352-04cda38ebc29?w=1080&h=1920&fit=crop',
    },
    {
      slotId: 'photo-5',
      type: 'image',
      value: 'https://images.unsplash.com/photo-1495616811223-4d98c6e9c869?w=1080&h=1920&fit=crop',
    },
  ];

  // Sample slot fills for Quote Card
  const quoteCardSlotFills: SlotFill[] = [
    {
      slotId: 'quote-text',
      type: 'text',
      value: 'The only way to do great work is to love what you do.',
    },
    {
      slotId: 'author-name',
      type: 'text',
      value: '— Steve Jobs',
    },
    {
      slotId: 'background-image',
      type: 'image',
      value: 'https://images.unsplash.com/photo-1446776653964-20c1d3a81b06?w=1080&h=1920&fit=crop',
    },
  ];

  return (
    <>
      {/* Photo Dump Template Renderer */}
      <Composition
        id="TemplateRenderer-PhotoDump"
        component={TemplateRenderer}
        durationInFrames={15 * 30}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          template: photoDumpTemplate,
          slotFills: photoDumpSlotFills,
          musicUrl: undefined,
        }}
      />

      {/* Quote Card Template Renderer */}
      <Composition
        id="TemplateRenderer-QuoteCard"
        component={TemplateRenderer}
        durationInFrames={10 * 30}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          template: quoteCardTemplate,
          slotFills: quoteCardSlotFills,
          musicUrl: undefined,
        }}
      />
    </>
  );
};
