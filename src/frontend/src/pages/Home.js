import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Link } from 'react-router-dom';
export const Home = () => {
    return (_jsx("div", { className: "min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100", children: _jsx("div", { className: "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20", children: _jsxs("div", { className: "text-center", children: [_jsx("h1", { className: "text-5xl font-bold text-gray-900 mb-6", children: "Welcome to ReelForge" }), _jsx("p", { className: "text-xl text-gray-600 mb-8 max-w-2xl mx-auto", children: "Create stunning Instagram Reels and TikTok videos from trending templates" }), _jsx(Link, { to: "/templates", className: "inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg transition duration-200", children: "Browse Templates" })] }) }) }));
};
