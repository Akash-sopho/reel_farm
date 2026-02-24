import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

export const AuthCallback: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Processing authentication...');

  useEffect(() => {
    const errorCode = searchParams.get('error_code');
    const errorMessage = searchParams.get('message');
    const platform = searchParams.get('platform');
    const username = searchParams.get('username');

    if (errorCode) {
      setStatus('error');
      setMessage(`Authentication failed: ${errorMessage || errorCode}`);
      setTimeout(() => {
        navigate('/editor', { replace: true });
      }, 3000);
    } else if (platform && username) {
      setStatus('success');
      setMessage(`Successfully connected @${username} on ${platform}!`);
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 2000);
    } else {
      setStatus('error');
      setMessage('Authentication response missing required parameters');
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 3000);
    }
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <div className="flex justify-center mb-4">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
            <p className="text-gray-700 font-semibold">{message}</p>
          </>
        )}

        {status === 'success' && (
          <>
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-green-100 p-3">
                <svg
                  className="w-8 h-8 text-green-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
            <p className="text-green-700 font-semibold text-lg">{message}</p>
            <p className="text-gray-600 text-sm mt-4">Redirecting you back...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="flex justify-center mb-4">
              <div className="rounded-full bg-red-100 p-3">
                <svg
                  className="w-8 h-8 text-red-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
            </div>
            <p className="text-red-700 font-semibold text-lg">{message}</p>
            <p className="text-gray-600 text-sm mt-4">Redirecting you back...</p>
          </>
        )}
      </div>
    </div>
  );
};
