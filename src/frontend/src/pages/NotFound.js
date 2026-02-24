import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
export const NotFound = () => {
    return (_jsx("div", { className: "min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center px-4", children: _jsxs("div", { className: "text-center", children: [_jsx("h1", { className: "text-6xl font-bold text-gray-900 mb-4", children: "404" }), _jsx("p", { className: "text-2xl text-gray-600 mb-8", children: "Page not found" }), _jsx("p", { className: "text-gray-500 mb-8 max-w-md", children: "The page you're looking for doesn't exist or has been moved." }), _jsx(Link, { to: "/", className: "inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition duration-200", children: "Go Home" })] }) }));
};
