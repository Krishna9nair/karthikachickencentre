import React, { useEffect, useState } from 'react';
import { Star, MessageSquarePlus, Quote } from 'lucide-react';
import { api } from '../lib/api';
import ReviewDialog from './ReviewDialog';

const StarRow = ({ n }) => (
  <div className="flex gap-0.5" aria-label={`${n} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map((i) => (
      <Star
        key={i}
        className={`w-3.5 h-3.5 ${i <= n ? 'text-[#F5A623] fill-[#F5A623]' : 'text-[#E0E0E0]'}`}
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
      className="py-14 md:py-20 px-5 md:px-8 bg-white"
      data-testid="reviews-section"
    >
      <div className="max-w-6xl mx-auto">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-8">
          <div>
            <div className="text-[11px] tracking-[0.25em] font-bold text-[#D32F2F]">
              CUSTOMER STORIES
            </div>
            <h2 className="font-bold text-3xl md:text-4xl text-[#212121] mt-2 tracking-tight">
              What our customers say
            </h2>
            {reviews.length > 0 && (
              <div className="flex items-center gap-2 mt-2 text-sm text-[#616161]">
                <StarRow n={Math.round(avg)} />
                <span className="font-bold text-[#212121]">{avg.toFixed(1)}</span>
                <span>· {reviews.length} review{reviews.length === 1 ? '' : 's'}</span>
              </div>
            )}
          </div>
          <button
            onClick={() => setOpen(true)}
            data-testid="reviews-write-btn"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-sm font-semibold shadow-sm"
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
                className="h-44 rounded-2xl bg-white border border-[#E0E0E0] animate-pulse"
              />
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <div
            className="rounded-xl border-2 border-dashed border-[#E0E0E0] bg-white p-10 text-center"
            data-testid="reviews-empty"
          >
            <Quote className="w-9 h-9 text-[#D32F2F] mx-auto mb-3" />
            <p className="font-bold text-xl text-[#212121]">Be the first to review</p>
            <p className="text-sm text-[#616161] mt-1 max-w-md mx-auto">
              Bought from us recently? Share how the chicken tasted — your feedback helps the shop and other neighbours.
            </p>
            <button
              onClick={() => setOpen(true)}
              className="mt-5 inline-flex items-center gap-2 px-5 py-2.5 rounded-lg bg-[#D32F2F] hover:bg-[#B71C1C] text-white text-sm font-semibold"
            >
              <MessageSquarePlus className="w-4 h-4" /> Write the first review
            </button>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4" data-testid="reviews-grid">
            {reviews.slice(0, 6).map((r) => (
              <article
                key={r.id}
                className="bg-white border border-[#E0E0E0] rounded-xl p-5 flex flex-col hover:border-[#D32F2F]/40 hover:shadow-md transition-all"
                data-testid={`review-card-${r.id}`}
              >
                <Quote className="w-6 h-6 text-[#D32F2F] mb-2" />
                <p className="text-[#212121] text-sm leading-relaxed flex-1 line-clamp-5">
                  {r.comment}
                </p>
                <div className="mt-4 pt-4 border-t border-[#F5F5F5] flex items-center justify-between">
                  <div>
                    <div className="font-bold text-[15px] text-[#212121]">
                      {r.name}
                    </div>
                    <div className="text-[10px] text-[#616161] uppercase tracking-wider mt-0.5">
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
