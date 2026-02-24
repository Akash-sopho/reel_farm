import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from 'react';
import { ImageSuggestionModal } from './ImageSuggestionModal';
export const ImageSuggestionButton = ({ projectId, slotId, onImageSelect, }) => {
    const [showModal, setShowModal] = useState(false);
    return (_jsxs(_Fragment, { children: [_jsx("button", { onClick: () => setShowModal(true), className: "w-full py-2 px-3 text-sm bg-purple-50 hover:bg-purple-100 border border-purple-200 rounded font-medium text-purple-700 transition-colors", children: "\u2728 Generate Image" }), showModal && (_jsx(ImageSuggestionModal, { projectId: projectId, slotId: slotId, onImageSelect: onImageSelect, onClose: () => setShowModal(false) }))] }));
};
