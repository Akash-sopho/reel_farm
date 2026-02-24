import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Navbar } from '@/components/layout/Navbar';
import { Home } from '@/pages/Home';
import { Templates } from '@/pages/Templates';
import { Editor } from '@/pages/Editor';
import { Collect } from '@/pages/Collect';
import { TemplateDrafts } from '@/pages/TemplateDrafts';
import { AuthCallback } from '@/pages/AuthCallback';
import { NotFound } from '@/pages/NotFound';
import '@/index.css';

function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col min-h-screen">
        <Navbar />
        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/templates" element={<Templates />} />
            <Route path="/templates/drafts" element={<TemplateDrafts />} />
            <Route path="/editor/:templateId" element={<Editor />} />
            <Route path="/collect" element={<Collect />} />
            <Route path="/auth/callback/success" element={<AuthCallback />} />
            <Route path="/auth/callback/error" element={<AuthCallback />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
