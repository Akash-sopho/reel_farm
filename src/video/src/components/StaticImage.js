import { jsx as _jsx } from "react/jsx-runtime";
import { AbsoluteFill, Img } from 'remotion';
/**
 * StaticImage component - renders a full-bleed image
 */
export const StaticImage = ({ src, objectFit = 'cover', opacity = 1, }) => {
    // Show placeholder if no src provided
    if (!src) {
        return (_jsx(AbsoluteFill, { style: {
                backgroundColor: '#cccccc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                opacity,
            }, children: _jsx("div", { style: { color: '#999', fontSize: 24 }, children: "No image provided" }) }));
    }
    return (_jsx(AbsoluteFill, { style: { opacity }, children: _jsx(Img, { src: src, style: {
                width: '100%',
                height: '100%',
                objectFit: objectFit,
            } }) }));
};
