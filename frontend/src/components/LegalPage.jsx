import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import Navbar from './Navbar';
import Footer from './Footer';

// LegalPage — Shared shell for Terms / Cancellation / Privacy. Keeps the
// markup consistent and accessible. `lastUpdated` shows under the title.
const LegalPage = ({ title, lastUpdated, children }) => {
  useEffect(() => {
    document.title = `${title} · ChickenCrew`;
    window.scrollTo(0, 0);
  }, [title]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <main className="flex-1">
        <article className="max-w-3xl mx-auto px-5 md:px-8 py-8 md:py-14">
          <Link
            to="/"
            className="inline-flex items-center gap-1 text-sm text-[#616161] hover:text-[#D32F2F]"
          >
            <ArrowLeft className="w-4 h-4" /> Back to home
          </Link>
          <header className="mt-3 mb-6 md:mb-8 pb-5 border-b border-[#E0E0E0]">
            <h1 className="font-bold text-3xl md:text-4xl text-[#212121] tracking-tight">{title}</h1>
            {lastUpdated && (
              <p className="mt-2 text-sm text-[#616161]">Last updated: {lastUpdated}</p>
            )}
          </header>
          <div className="prose-cc">{children}</div>
        </article>
      </main>
      <Footer />

      {/* Tailwind-friendly typography for the body. Tightens spacing and
          standardizes headings without depending on @tailwindcss/typography. */}
      <style>{`
        .prose-cc { color: #212121; font-size: 15px; line-height: 1.7; }
        .prose-cc h2 { font-family: 'Poppins', sans-serif; font-weight: 700; font-size: 22px; color: #212121; margin: 28px 0 8px; letter-spacing: -0.01em; }
        .prose-cc h3 { font-family: 'Poppins', sans-serif; font-weight: 600; font-size: 17px; color: #212121; margin: 20px 0 6px; }
        .prose-cc p { margin: 8px 0 14px; color: #212121; }
        .prose-cc ul { margin: 8px 0 16px; padding-left: 22px; list-style: disc; }
        .prose-cc ol { margin: 8px 0 16px; padding-left: 22px; list-style: decimal; }
        .prose-cc li { margin: 4px 0; }
        .prose-cc a { color: #D32F2F; font-weight: 600; }
        .prose-cc a:hover { text-decoration: underline; }
        .prose-cc strong { font-weight: 700; }
        .prose-cc .callout { background: #F5F5F5; border-left: 4px solid #D32F2F; padding: 12px 16px; margin: 16px 0; border-radius: 6px; font-size: 14px; }
        .prose-cc table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 14px; }
        .prose-cc th, .prose-cc td { padding: 10px 12px; border: 1px solid #E0E0E0; text-align: left; }
        .prose-cc th { background: #F5F5F5; font-weight: 700; }
      `}</style>
    </div>
  );
};

export default LegalPage;
