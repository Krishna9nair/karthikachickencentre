import React, { useState } from 'react';
import { X, Star, Loader2, CheckCircle2 } from 'lucide-react';
import { api } from '../lib/api';
import { useToast } from '../hooks/use-toast';

/**
 * Customer review submission dialog.
 *
 * Props:
 *  - open       : bool
 *  - onClose    : fn
 *  - orderId    : string|null  — pre-attached when opened from the Bill
 *  - prefillName: string|null
 *  - phone      : string|null
 */
const ReviewDialog = ({ open, onClose, orderId = null, prefillName = '', phone = null }) => {
  const { toast } = useToast();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [name, setName] = useState(prefillName || '');
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!rating) {
      toast({ title: 'Pick a rating', description: 'Tap a star from 1 to 5.' });
      return;
    }
    if (name.trim().length < 2 || comment.trim().length < 4) {
      toast({ title: 'A bit more please', description: 'Name and a short comment are required.' });
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/reviews', {
        name: name.trim(),
        phone: phone || null,
        rating,
        comment: comment.trim(),
        order_id: orderId || null,
      });
      setSubmitted(true);
    } catch (err) {
      toast({
        title: 'Could not submit',
        description: err?.response?.data?.detail || err.message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDone = () => {
    setRating(0);
    setName(prefillName || '');
    setComment('');
    setSubmitted(false);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4"
      onClick={onClose}
      data-testid="review-dialog"
    >
      <div
        className="bg-[#FAF4EC] rounded-2xl w-full max-w-md shadow-2xl border border-[#EADFCF] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#EADFCF]">
          <h3 className="font-serif text-xl font-bold text-[#2A1A14]">
            {submitted ? 'Thank you!' : 'Leave a review'}
          </h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-[#EADFCF] text-[#3B2416]">
            <X className="w-4 h-4" />
          </button>
        </div>

        {submitted ? (
          <div className="p-7 flex flex-col items-center text-center">
            <div className="w-14 h-14 rounded-full bg-emerald-50 flex items-center justify-center">
              <CheckCircle2 className="w-9 h-9 text-emerald-600" />
            </div>
            <p className="mt-4 font-serif text-lg text-[#2A1A14]">Review submitted</p>
            <p className="mt-1 text-sm text-[#7B5A48] max-w-xs">
              Your review will appear on the site once the shop owner approves it. Thanks for the feedback!
            </p>
            <button
              onClick={handleDone}
              data-testid="review-done-btn"
              className="mt-5 w-full py-3 rounded-full bg-[#B93826] hover:bg-[#A02E1F] text-white font-medium"
            >
              Done
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-5 space-y-4">
            {/* Star rating */}
            <div className="text-center">
              <div className="text-xs font-medium text-[#7B5A48] mb-2">How was your meat?</div>
              <div
                className="inline-flex gap-1 select-none"
                onMouseLeave={() => setHover(0)}
                data-testid="review-rating-stars"
              >
                {[1, 2, 3, 4, 5].map((n) => {
                  const filled = (hover || rating) >= n;
                  return (
                    <button
                      key={n}
                      type="button"
                      onMouseEnter={() => setHover(n)}
                      onClick={() => setRating(n)}
                      data-testid={`review-star-${n}`}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        className={`w-9 h-9 ${
                          filled ? 'text-[#F5A623] fill-[#F5A623]' : 'text-[#EADFCF]'
                        }`}
                      />
                    </button>
                  );
                })}
              </div>
              {rating > 0 && (
                <div className="text-xs text-[#7B5A48] mt-1">
                  {['', 'Awful', 'Not great', 'Okay', 'Good', 'Excellent'][rating]}
                </div>
              )}
            </div>

            <div>
              <label className="text-xs font-medium text-[#7B5A48]">Your name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full px-3 py-2.5 rounded-lg border border-[#EADFCF] bg-white focus:outline-none focus:border-[#B93826] text-sm"
                placeholder="What should we call you?"
                data-testid="review-name-input"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-[#7B5A48]">Comment *</label>
              <textarea
                rows={4}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                maxLength={600}
                className="mt-1 w-full px-3 py-2.5 rounded-lg border border-[#EADFCF] bg-white focus:outline-none focus:border-[#B93826] text-sm resize-none"
                placeholder="Was the chicken fresh? On time? Friendly delivery?"
                data-testid="review-comment-input"
              />
              <div className="text-[10px] text-[#7B5A48] mt-1 text-right">{comment.length}/600</div>
            </div>

            <button
              type="submit"
              disabled={submitting}
              data-testid="review-submit-btn"
              className="w-full py-3 rounded-full bg-[#B93826] hover:bg-[#A02E1F] text-white font-medium flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Star className="w-4 h-4 fill-white" />}
              Submit review
            </button>
            <p className="text-[11px] text-center text-[#7B5A48]">
              Reviews appear after the shop owner approves them.
            </p>
          </form>
        )}
      </div>
    </div>
  );
};

export default ReviewDialog;
