import React from 'react';
import { AbsoluteFill, Audio, Sequence, useVideoConfig } from 'remotion';
import type { TemplateSchema, SlotFill } from '../../shared/types/template';
import { COMPONENT_REGISTRY } from './components';

/**
 * Props for TemplateRenderer
 *
 * @prop template - The template schema defining scenes, components, and slot configuration
 * @prop slotFills - Array of slot fills mapping slot IDs to user-provided content values
 * @prop musicUrl - Optional URL to background music/audio to play throughout video
 */
export interface TemplateRendererProps {
  template: TemplateSchema;
  slotFills: SlotFill[];
  musicUrl?: string;
}

/**
 * Generic template renderer that converts TemplateSchema + slot fills into a complete Remotion composition.
 *
 * **How it works:**
 * 1. Converts slotFills array to a lookup map for O(1) resolution
 * 2. Iterates through template scenes, calculating frame positions
 * 3. For each scene, wraps content in a Remotion <Sequence> at the correct frame offset
 * 4. For each component:
 *    - Looks up component from registry by componentId
 *    - Resolves slot bindings (maps slot IDs to actual values from slotFills)
 *    - Merges resolved props with static props
 *    - Renders with proper z-index positioning
 * 5. If musicUrl provided, plays audio throughout video duration
 *
 * **Error Handling:**
 * - Missing components logged with warning, rendering continues
 * - Missing slots show placeholders from component implementations
 * - Invalid template shows error message on black background
 */
export const TemplateRenderer: React.FC<TemplateRendererProps> = ({
  template,
  slotFills,
  musicUrl,
}) => {
  const { fps } = useVideoConfig();

  // Validate template
  if (!template || !template.scenes || !Array.isArray(template.scenes)) {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: '#000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#FFFFFF',
          fontSize: 24,
          textAlign: 'center',
          padding: 40,
        }}
      >
        <div>Invalid template provided to TemplateRenderer</div>
      </AbsoluteFill>
    );
  }

  // Create lookup map from slotFills array for efficient slot value resolution
  // Maps slotId → value for O(1) lookups during component rendering
  const slotFillsMap = new Map<string, string>();
  slotFills.forEach((fill) => {
    slotFillsMap.set(fill.slotId, fill.value);
  });

  let currentFrameOffset = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: '#000000' }}>
      {/* Background music/audio if provided */}
      {musicUrl && <Audio src={musicUrl} volume={0.5} />}

      {/* Render each scene as a sequence */}
      {template.scenes.map((scene: any, sceneIndex: number) => {
        const sceneDurationFrames = Math.ceil(scene.durationSeconds * fps);
        const sceneStartFrame = currentFrameOffset;

        // Advance offset for next scene
        currentFrameOffset += sceneDurationFrames;

        return (
          <Sequence
            key={scene.id || `scene-${sceneIndex}`}
            from={sceneStartFrame}
            durationInFrames={sceneDurationFrames}
          >
            <AbsoluteFill style={{ backgroundColor: '#000000', position: 'relative' }}>
              {/* Render scene components sorted by zIndex */}
              {scene.components && scene.components.length > 0 ? (
                scene.components
                  .sort((a: any, b: any) => (a.zIndex || 0) - (b.zIndex || 0))
                  .map((sceneComponent: any, componentIndex: number) => {
                    // Look up component from registry
                    const ComponentClass = (COMPONENT_REGISTRY as Record<string, any>)[
                      sceneComponent.componentId
                    ];

                    if (!ComponentClass) {
                      console.warn(
                        `Component "${sceneComponent.componentId}" not found in COMPONENT_REGISTRY for scene "${scene.id}"`
                      );
                      return null;
                    }

                    // Build resolved props by merging slot bindings and static props
                    const resolvedProps: Record<string, any> = { ...sceneComponent.props };

                    // Resolve slot bindings: map slot IDs to actual values
                    if (sceneComponent.slotBindings) {
                      Object.entries(sceneComponent.slotBindings).forEach(
                        ([propName, slotId]) => {
                          const slotValue = slotFillsMap.get(slotId as string);
                          if (slotValue) {
                            resolvedProps[propName] = slotValue;
                          }
                          // If no value, component will use its default placeholder behavior
                        }
                      );
                    }

                    return (
                      <div
                        key={`component-${componentIndex}`}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          zIndex: sceneComponent.zIndex || 0,
                        }}
                      >
                        <ComponentClass {...resolvedProps} />
                      </div>
                    );
                  })
              ) : (
                // Empty scene - render black background
                <AbsoluteFill style={{ backgroundColor: '#1a1a1a' }} />
              )}
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
