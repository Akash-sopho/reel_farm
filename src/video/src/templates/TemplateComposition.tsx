import React from 'react';
import { AbsoluteFill, Sequence, useVideoConfig } from 'remotion';
import { COMPONENT_REGISTRY } from '../components';

interface TemplateCompositionProps {
  template: Record<string, any>;
  slotFills?: Record<string, string>;
}

/**
 * Generic template composition renderer
 * Renders all scenes from a template schema with proper timing
 * This is a placeholder - P1-T10 will implement the full TemplateRenderer
 */
export const TemplateComposition: React.FC<TemplateCompositionProps> = ({
  template,
  slotFills = {},
}) => {
  const { durationInFrames, fps } = useVideoConfig();

  if (!template || !template.scenes) {
    return (
      <AbsoluteFill
        style={{
          backgroundColor: '#000000',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ color: '#FFFFFF', fontSize: 32 }}>Invalid template</div>
      </AbsoluteFill>
    );
  }

  let currentFrame = 0;

  return (
    <AbsoluteFill style={{ backgroundColor: '#1a1a1a' }}>
      {template.scenes.map((scene: any, sceneIndex: number) => {
        const sceneDurationFrames = Math.ceil(scene.durationSeconds * fps);
        const startFrame = currentFrame;

        // Increment for next scene
        currentFrame += sceneDurationFrames;

        return (
          <Sequence
            key={scene.id || sceneIndex}
            from={startFrame}
            durationInFrames={sceneDurationFrames}
          >
            <AbsoluteFill style={{ backgroundColor: '#1a1a1a', position: 'relative' }}>
              {scene.components &&
                scene.components
                  .sort((a: any, b: any) => a.zIndex - b.zIndex)
                  .map((component: any, componentIndex: number) => {
                    const ComponentClass = (COMPONENT_REGISTRY as any)[component.componentId];

                    if (!ComponentClass) {
                      console.warn(
                        `Component ${component.componentId} not found in registry for scene ${scene.id}`
                      );
                      return null;
                    }

                    // Resolve slot bindings to values
                    const resolvedProps: any = { ...component.props };

                    if (component.slotBindings) {
                      Object.entries(component.slotBindings).forEach(([propName, slotId]) => {
                        const slotValue = slotFills[(slotId as string) || ''];
                        if (slotValue) {
                          resolvedProps[propName] = slotValue;
                        }
                      });
                    }

                    return (
                      <div
                        key={componentIndex}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          zIndex: component.zIndex || 0,
                        }}
                      >
                        <ComponentClass {...resolvedProps} />
                      </div>
                    );
                  })}
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
