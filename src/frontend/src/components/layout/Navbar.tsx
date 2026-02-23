import { Link } from 'react-router-dom';

export const Navbar: React.FC = () => {
  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0">
            <Link to="/" className="text-2xl font-bold text-blue-600">
              ReelForge
            </Link>
          </div>

          {/* Navigation Links */}
          <div className="hidden md:flex space-x-8">
            <Link
              to="/templates"
              className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium"
            >
              Templates
            </Link>
            <Link
              to="/collect"
              className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium"
            >
              Collect
            </Link>
            <Link
              to="/projects"
              className="text-gray-700 hover:text-blue-600 px-3 py-2 text-sm font-medium"
            >
              My Projects
            </Link>
          </div>

          {/* Mobile menu button (placeholder) */}
          <div className="md:hidden">
            <button className="text-gray-700 hover:text-blue-600">
              <svg
                className="h-6 w-6"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};
