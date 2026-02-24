import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
/**
 * TypewriterText component - text revealed character by character
 */
export const TypewriterText = ({ text = '', fontSize = 48, color = '#ffffff', delay = 0, }) => {
    const frame = useCurrentFrame();
    const { durationInFrames } = useVideoConfig();
    // Don't render if no text
    if (!text) {
        return null;
    }
    // Calculate how many characters to show
    const effectiveFrame = Math.max(0, frame - delay);
    const charsPerFrame = text.length / (durationInFrames - delay);
    const charsToShow = Math.ceil(effectiveFrame * charsPerFrame);
    const displayText = text.slice(0, Math.min(charsToShow, text.length));
    return (_jsx(AbsoluteFill, { style: {
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
        }, children: _jsxs("div", { style: {
                fontSize,
                color,
                fontWeight: 'bold',
                textAlign: 'center',
                maxWidth: '90%',
                wordWrap: 'break-word',
                fontFamily: 'monospace',
            }, children: [displayText, charsToShow < text.length && (_jsx("span", { style: { animation: 'blink 0.5s infinite' }, children: "|" }))] }) }));
};
