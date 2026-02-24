import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { TemplateCard } from '@/components/templates';
export const Templates = () => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('all');
    const [categories, setCategories] = useState([]);
    useEffect(() => {
        fetchTemplates();
    }, [selectedCategory]);
    const fetchTemplates = async () => {
        try {
            setLoading(true);
            setError(null);
            const queryParams = new URLSearchParams();
            if (selectedCategory !== 'all') {
                queryParams.append('category', selectedCategory);
            }
            const response = await fetch(`/api/templates?${queryParams.toString()}`);
            if (!response.ok) {
                throw new Error('Failed to fetch templates');
            }
            const data = await response.json();
            setTemplates(data.data);
            // Extract unique categories from all templates on first load
            if (categories.length === 0 && selectedCategory === 'all') {
                const uniqueCategories = Array.from(new Set(data.data.map((t) => t.category))).sort();
                setCategories(uniqueCategories);
            }
        }
        catch (err) {
            setError(err instanceof Error ? err.message : 'An error occurred');
            setTemplates([]);
        }
        finally {
            setLoading(false);
        }
    };
    const handleRetry = () => {
        fetchTemplates();
    };
    return (_jsx("div", { className: "min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8", children: _jsxs("div", { className: "max-w-7xl mx-auto", children: [_jsxs("div", { className: "mb-8", children: [_jsx("h1", { className: "text-4xl font-bold text-gray-900 mb-2", children: "Templates" }), _jsx("p", { className: "text-gray-600", children: "Choose a template to create your video" })] }), _jsxs("div", { className: "mb-8 flex flex-wrap gap-2", children: [_jsx("button", { onClick: () => setSelectedCategory('all'), className: `px-4 py-2 rounded-lg font-semibold transition-colors duration-200 ${selectedCategory === 'all'
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'}`, children: "All" }), categories.map((category) => (_jsx("button", { onClick: () => setSelectedCategory(category), className: `px-4 py-2 rounded-lg font-semibold transition-colors duration-200 capitalize ${selectedCategory === category
                                ? 'bg-blue-600 text-white'
                                : 'bg-white text-gray-700 hover:bg-gray-100 border border-gray-300'}`, children: category }, category)))] }), loading ? (_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", children: [...Array(8)].map((_, i) => (_jsxs("div", { className: "bg-white rounded-lg shadow animate-pulse", children: [_jsx("div", { className: "w-full aspect-video bg-gray-200" }), _jsxs("div", { className: "p-4 space-y-3", children: [_jsx("div", { className: "h-4 bg-gray-200 rounded w-3/4" }), _jsx("div", { className: "h-3 bg-gray-200 rounded w-1/2" }), _jsx("div", { className: "h-10 bg-gray-200 rounded" })] })] }, i))) })) : error ? (
                /* Error State */
                _jsxs("div", { className: "bg-red-50 border border-red-200 rounded-lg p-8 text-center", children: [_jsx("svg", { className: "w-12 h-12 text-red-600 mx-auto mb-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 2, d: "M12 8v4m0 4v.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" }) }), _jsx("h3", { className: "text-lg font-semibold text-red-800 mb-2", children: "Error Loading Templates" }), _jsx("p", { className: "text-red-700 mb-4", children: error }), _jsx("button", { onClick: handleRetry, className: "bg-red-600 hover:bg-red-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200", children: "Try Again" })] })) : templates.length === 0 ? (
                /* Empty State */
                _jsxs("div", { className: "bg-white rounded-lg shadow p-12 text-center", children: [_jsx("svg", { className: "w-16 h-16 text-gray-400 mx-auto mb-4", fill: "none", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", strokeWidth: 1.5, d: "M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" }) }), _jsx("h3", { className: "text-lg font-semibold text-gray-900 mb-2", children: "No Templates Found" }), _jsx("p", { className: "text-gray-600 mb-6", children: selectedCategory !== 'all'
                                ? `No templates found in the "${selectedCategory}" category. Try another category.`
                                : 'No templates available yet. Check back later.' }), selectedCategory !== 'all' && (_jsx("button", { onClick: () => setSelectedCategory('all'), className: "bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors duration-200", children: "View All Templates" }))] })) : (
                /* Templates Grid */
                _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6", children: templates.map((template) => (_jsx(TemplateCard, { template: template }, template.id))) }))] }) }));
};
