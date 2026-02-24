import { jsx as _jsx } from "react/jsx-runtime";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
/**
 * AnimatedText component - text with fade-in or slide-up animation
 */
export const AnimatedText = ({ text = '', fontSize = 48, color = '#ffffff', fontWeight = 'bold', textAlign = 'center', animationType = 'fade', delay = 0, }) => {
    const frame = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();
    // Don't render if no text
    if (!text) {
        return null;
    }
    // Animation duration: 30 frames for fade-in
    const animationDuration = 30;
    const effectiveFrame = Math.max(0, frame - delay);
    // Opacity animation
    const opacity = interpolate(effectiveFrame, [0, animationDuration], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
    });
    // Slide-up animation (translateY)
    const translateY = animationType === 'slide-up'
        ? interpolate(effectiveFrame, [0, animationDuration], [50, 0], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
        })
        : 0;
    return (_jsx(AbsoluteFill, { style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
        }, children: _jsx("div", { style: {
                fontSize,
                color,
                fontWeight,
                textAlign: textAlign,
                opacity,
                transform: `translateY(${translateY}px)`,
                maxWidth: '90%',
                wordWrap: 'break-word',
            }, children: text }) }));
};
