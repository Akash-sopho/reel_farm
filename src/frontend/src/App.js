import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Home } from '@/pages/Home';
import { Templates } from '@/pages/Templates';
import { Editor } from '@/pages/Editor';
import { Collect } from '@/pages/Collect';
import { AuthCallback } from '@/pages/AuthCallback';
import { NotFound } from '@/pages/NotFound';
import '@/index.css';
function App() {
    return (_jsx(BrowserRouter, { children: _jsxs("div", { className: "flex flex-col min-h-screen", children: [_jsx(Navbar, {}), _jsx("main", { className: "flex-1", children: _jsxs(Routes, { children: [_jsx(Route, { path: "/", element: _jsx(Home, {}) }), _jsx(Route, { path: "/templates", element: _jsx(Templates, {}) }), _jsx(Route, { path: "/editor/:templateId", element: _jsx(Editor, {}) }), _jsx(Route, { path: "/collect", element: _jsx(Collect, {}) }), _jsx(Route, { path: "/auth/callback/success", element: _jsx(AuthCallback, {}) }), _jsx(Route, { path: "/auth/callback/error", element: _jsx(AuthCallback, {}) }), _jsx(Route, { path: "*", element: _jsx(NotFound, {}) })] }) })] }) }));
}
export default App;
