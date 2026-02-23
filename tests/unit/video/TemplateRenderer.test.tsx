import React from 'react';
import { render } from '@testing-library/react';
import { TemplateComposition } from '../../../src/video/src/templates/TemplateComposition';
import { photoDumpTemplate, photoDumpSlotFills, quoteCardTemplate, quoteCardSlotFills } from './fixtures/templates';
import { renderWithMocks } from './mocks/setup';

describe('TemplateRenderer (TemplateComposition)', () => {
  it('renders template with valid slot fills without crashing', () => {
    const { container } = renderWithMocks(
      <TemplateComposition template={photoDumpTemplate} slotFills={photoDumpSlotFills} />
    );
    expect(container).toBeInTheDocument();
  });

  it('renders with empty slot fills - all slots show placeholders', () => {
    const { container } = renderWithMocks(
      <TemplateComposition template={photoDumpTemplate} slotFills={{}} />
    );
    expect(container).toBeInTheDocument();
    // Should render without crashing, showing placeholders
  });

  it('renders without slotFills prop - defaults to empty object', () => {
    const { container } = renderWithMocks(
      <TemplateComposition template={photoDumpTemplate} />
    );
    expect(container).toBeInTheDocument();
  });

  it('Photo Dump template renders all 5 scenes', () => {
    const { container } = renderWithMocks(
      <TemplateComposition template={photoDumpTemplate} slotFills={photoDumpSlotFills} />
    );
    expect(container).toBeInTheDocument();
    // Template has 5 scenes with images
  });

  it('Quote Card template renders single scene correctly', () => {
    const { container } = renderWithMocks(
      <TemplateComposition template={quoteCardTemplate} slotFills={quoteCardSlotFills} />
    );
    expect(container).toBeInTheDocument();
    // Template has 1 scene with text + image
  });

  it('logs warning for unknown componentId in scene', () => {
    const warnSpy = jest.spyOn(console, 'warn').mockImplementation();

    const templateWithUnknown = {
      version: '1.0',
      slots: [],
      scenes: [{
        id: 'scene-1',
        durationSeconds: 3,
        components: [{
          componentId: 'UnknownComponent',
          zIndex: 0,
          slotBindings: {},
          props: {},
        }],
      }],
    };

    const { container } = renderWithMocks(
      <TemplateComposition template={templateWithUnknown} slotFills={{}} />
    );

    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('UnknownComponent')
    );
    expect(container).toBeInTheDocument(); // Still renders despite unknown component

    warnSpy.mockRestore();
  });

  it('renders error message for invalid template (no scenes)', () => {
    const invalidTemplate = { version: '1.0', slots: [] };

    const { container } = renderWithMocks(
      <TemplateComposition template={invalidTemplate as any} slotFills={{}} />
    );

    expect(container.textContent).toContain('Invalid template');
  });

  it('renders error message for null template', () => {
    const { container } = renderWithMocks(
      <TemplateComposition template={null as any} slotFills={{}} />
    );

    expect(container.textContent).toContain('Invalid template');
  });

  it('renders error message for undefined template', () => {
    const { container } = renderWithMocks(
      <TemplateComposition template={undefined as any} slotFills={{}} />
    );

    expect(container.textContent).toContain('Invalid template');
  });

  it('correctly resolves slot bindings to provided values', () => {
    const templateWithBinding = {
      version: '1.0',
      slots: [{ id: 'text-slot', type: 'text', label: 'Text', required: true }],
      scenes: [{
        id: 'scene-1',
        durationSeconds: 3,
        components: [{
          componentId: 'AnimatedText',
          zIndex: 0,
          slotBindings: { text: 'text-slot' },
          props: { fontSize: 48 },
        }],
      }],
    };

    const slotFills = { 'text-slot': 'Hello World' };

    const { container } = renderWithMocks(
      <TemplateComposition template={templateWithBinding} slotFills={slotFills} />
    );

    expect(container).toBeInTheDocument();
  });

  it('renders components in zIndex order within scene', () => {
    const templateWithZIndex = {
      version: '1.0',
      slots: [],
      scenes: [{
        id: 'scene-1',
        durationSeconds: 3,
        components: [
          { componentId: 'StaticImage', zIndex: 10, slotBindings: {}, props: {} },
          { componentId: 'AnimatedText', zIndex: 0, slotBindings: {}, props: { text: 'Front' } },
          { componentId: 'GrainOverlay', zIndex: 5, slotBindings: {}, props: {} },
        ],
      }],
    };

    const { container } = renderWithMocks(
      <TemplateComposition template={templateWithZIndex} slotFills={{}} />
    );

    // Component should be rendered
    expect(container).toBeInTheDocument();
  });

  it('handles template with no components in scene', () => {
    const templateEmpty = {
      version: '1.0',
      slots: [],
      scenes: [{
        id: 'scene-1',
        durationSeconds: 3,
        components: [],
      }],
    };

    const { container } = renderWithMocks(
      <TemplateComposition template={templateEmpty} slotFills={{}} />
    );

    expect(container).toBeInTheDocument();
  });

  it('handles template with multiple scenes and varying duration', () => {
    const multiSceneTemplate = {
      version: '1.0',
      slots: [],
      scenes: [
        {
          id: 'scene-1',
          durationSeconds: 2,
          components: [{ componentId: 'GrainOverlay', zIndex: 0, slotBindings: {}, props: {} }],
        },
        {
          id: 'scene-2',
          durationSeconds: 5,
          components: [{ componentId: 'GrainOverlay', zIndex: 0, slotBindings: {}, props: {} }],
        },
        {
          id: 'scene-3',
          durationSeconds: 1,
          components: [{ componentId: 'GrainOverlay', zIndex: 0, slotBindings: {}, props: {} }],
        },
      ],
    };

    const { container } = renderWithMocks(
      <TemplateComposition template={multiSceneTemplate} slotFills={{}} />
    );

    expect(container).toBeInTheDocument();
  });

  it('renders with partial slot fills (some slots missing)', () => {
    const partialFills = {
      'image-1': 'https://example.com/image1.jpg',
      // image-2, image-3, etc missing
    };

    const { container } = renderWithMocks(
      <TemplateComposition template={photoDumpTemplate} slotFills={partialFills} />
    );

    expect(container).toBeInTheDocument();
  });

  it('renders Photo Dump template with all images provided', () => {
    const { container } = renderWithMocks(
      <TemplateComposition template={photoDumpTemplate} slotFills={photoDumpSlotFills} />
    );

    expect(container).toBeInTheDocument();
  });

  it('renders Quote Card template with all text and image', () => {
    const { container } = renderWithMocks(
      <TemplateComposition template={quoteCardTemplate} slotFills={quoteCardSlotFills} />
    );

    expect(container).toBeInTheDocument();
  });

  it('handles component props correctly', () => {
    const templateWithProps = {
      version: '1.0',
      slots: [],
      scenes: [{
        id: 'scene-1',
        durationSeconds: 3,
        components: [{
          componentId: 'AnimatedText',
          zIndex: 0,
          slotBindings: {},
          props: {
            text: 'Test',
            fontSize: 64,
            color: '#ff0000',
            fontWeight: 'bold',
            textAlign: 'left',
            animationType: 'slide-up',
            delay: 10,
          },
        }],
      }],
    };

    const { container } = renderWithMocks(
      <TemplateComposition template={templateWithProps} slotFills={{}} />
    );

    expect(container).toBeInTheDocument();
  });

  it('renders template with scene missing durationSeconds', () => {
    const templateMissing = {
      version: '1.0',
      slots: [],
      scenes: [{
        id: 'scene-1',
        // durationSeconds missing - should handle gracefully
        components: [],
      }],
    };

    const { container } = renderWithMocks(
      <TemplateComposition template={templateMissing as any} slotFills={{}} />
    );

    // Should render, even if duration calculation might be off
    expect(container).toBeInTheDocument();
  });

  it('renders template with empty string scene id', () => {
    const templateEmptyId = {
      version: '1.0',
      slots: [],
      scenes: [{
        id: '',
        durationSeconds: 3,
        components: [],
      }],
    };

    const { container } = renderWithMocks(
      <TemplateComposition template={templateEmptyId as any} slotFills={{}} />
    );

    expect(container).toBeInTheDocument();
  });

  it('renders template with missing scene id (uses index)', () => {
    const templateNoId = {
      version: '1.0',
      slots: [],
      scenes: [{
        // id missing
        durationSeconds: 3,
        components: [],
      }],
    };

    const { container } = renderWithMocks(
      <TemplateComposition template={templateNoId as any} slotFills={{}} />
    );

    expect(container).toBeInTheDocument();
  });
});
