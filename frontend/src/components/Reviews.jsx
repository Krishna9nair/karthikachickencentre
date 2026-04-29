import React, { useEffect, useState } from 'react';
import { Star, MessageSquarePlus, Quote } from 'lucide-react';
import { api } from '../lib/api';
import ReviewDialog from './ReviewDialog';

const StarRow = ({ n }) => (
  <div className="flex gap-0.5" aria-label={`${n} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((i) => (
      <Star
        key={i}
        className={`w-3.5 h-3.5 ${i <= n ? 'text-[#F5A623] fill-[#F5A623]' : 'text-[#EADFCF]'}`}
      />
    ))}
  </div>
);

const Reviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const { data } = await api.get('/public/reviews');
      setReviews(data.reviews || []);
    } catch (_) {
      setReviews([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Re-fetch when the review dialog closes (in case user just submitted —
  // it won't appear yet since it's pending, but harmless and keeps things fresh)
  const handleDialogClose = () => {
    setOpen(false);
  };

  // Stable averages for the section header
  const avg =
    reviews.length > 0
      ? reviews.reduce((s, r) => s + Number(r.rating || 0), 0) / reviews.length
      : 0;

  return (
    <section
      id="reviews"
      className="py-16 md:py-20 px-5 md:px-8 bg-[#FAF4EC]"
      data-testid="reviews-section"
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <div className="text-[11px] tracking-[0.25em] font-semibold text-[#B93826]">
              CUSTOMER STORIES
            </div>
            <h2 className="font-serif text-3xl sm:text-4xl text-[#2A1A14] mt-2">
              What our customers say
            </h2>
            {reviews.length > 0 && (
              <div className="flex items-center gap-2 mt-2 text-sm text-[#7B5A48]">
                <StarRow n={Math.round(avg)} />
                <span className="font-semibold text-[#2A1A14]">{avg.toFixed(1)}</span>
                <span>· {reviews.length} review{reviews.length === 1 ? '' : 's'}</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setOpen(true)}
            data-testid="reviews-write-btn"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#B93826] hover:bg-[#A02E1F] text-white text-sm font-medium shadow-sm"
          >
            <MessageSquarePlus className="w-4 h-4" />
            Write a review
          </button>
        </div>

        {loading ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="h-44 rounded-2xl bg-white border border-[#EADFCF] animate-pulse"
              />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div
            className="rounded-2xl border-2 border-dashed border-[#EADFCF] bg-white p-10 text-center"
            data-testid="reviews-empty"
          >
            <Quote className="w-9 h-9 text-[#C47B4A] mx-auto mb-3" />
            <p className="font-serif text-xl text-[#2A1A14]">Be the first to review</p>
            <p className="text-sm text-[#7B5A48] mt-1 max-w-md mx-auto">
              Bought from us recently? Share how the chicken tasted — your feedback helps the shop and other neighbours.
            </p>
            <button
              onClick={() => setOpen(true)}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#B93826] hover:bg-[#A02E1F] text-white text-sm font-medium"
            >
              <MessageSquarePlus className="w-4 h-4" /> Write the first review
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="reviews-grid">
            {reviews.slice(0, 6).map((r) => (
              <article
                key={r.id}
                className="bg-white border border-[#EADFCF] rounded-2xl p-5 flex flex-col hover:border-[#B93826]/40 transition-colors"
                data-testid={`review-card-${r.id}`}
              >
                <Quote className="w-6 h-6 text-[#C47B4A] mb-2" />
                <p className="text-[#3B2416] text-sm leading-relaxed flex-1 line-clamp-5">
                  {r.comment}
                </p>
                <div className="mt-4 pt-4 border-t border-[#F3EADB] flex items-center justify-between">
                  <div>
                    <div className="font-serif text-base text-[#2A1A14] font-semibold">
                      {r.name}
                    </div>
                    <div className="text-[10px] text-[#7B5A48] uppercase tracking-wider mt-0.5">
                      {new Date(r.created_at).toLocaleDateString('en-IN', {
                        month: 'short',
                        year: 'numeric',
                      })}
                    </div>
                  </div>
                  <StarRow n={r.rating} />
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      <ReviewDialog open={open} onClose={handleDialogClose} />
    </section>
  );
};

export default Reviews;
