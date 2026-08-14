'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import CommentThread from '@/components/comment-thread';

type ProjectImage = {
  id: string;
  cloudinaryUrl: string;
  category: string;
  originalName: string;
  order: number;
};

type ReviewLinkData = {
  id: string;
  token: string;
  passwordHash: string | null;
  allowDownload: boolean;
  watermark: boolean;
  project: {
    id: string;
    name: string;
    location: string | null;
    description: string | null;
    images: ProjectImage[];
  };
};

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.5;

const EMOJI_OPTIONS = ['😍', '👍', '🤔', '👎'];

export default function ReviewPage() {
  const params = useParams();
  const token = params.token as string;

  const [passwordInput, setPasswordInput] = useState('');
  const [submittedPassword, setSubmittedPassword] = useState<string | undefined>(undefined);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);

  // Review form state
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [understandingScore, setUnderstandingScore] = useState(4);
  const [confidenceScore, setConfidenceScore] = useState(4);
  const [preferredOption, setPreferredOption] = useState('');
  const [requestedChanges, setRequestedChanges] = useState('');
  const [emojiReaction, setEmojiReaction] = useState('');

  const { data, isLoading, error } = useQuery<ReviewLinkData>({
    queryKey: ['review-link', token, submittedPassword],
    queryFn: async () => {
      const res = await apiClient.get(`/review-links/${token}`, {
        params: submittedPassword ? { password: submittedPassword } : {},
      });
      return res.data;
    },
    enabled: !!token,
    retry: false,
  });

  const isPasswordError =
    error && (error as any)?.response?.status === 401;

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittedPassword(passwordInput);
  };

  const images = data?.project.images ?? [];
  const showWatermark = data?.watermark ?? true;
  const allowDownload = data?.allowDownload ?? false;

  const openImage = (index: number) => {
    setSelectedIndex(index);
    setZoom(1);
  };

  const closeImage = () => {
    setSelectedIndex(null);
    setZoom(1);
  };

  const showPrev = () => {
    if (selectedIndex === null) return;
    setSelectedIndex((selectedIndex - 1 + images.length) % images.length);
    setZoom(1);
  };

  const showNext = () => {
    if (selectedIndex === null) return;
    setSelectedIndex((selectedIndex + 1) % images.length);
    setZoom(1);
  };

  const zoomIn = () => {
    setZoom((z) => Math.min(MAX_ZOOM, z + ZOOM_STEP));
  };

  const zoomOut = () => {
    setZoom((z) => Math.max(MIN_ZOOM, z - ZOOM_STEP));
  };

  const preventSave = (e: React.SyntheticEvent) => {
    if (!allowDownload) {
      e.preventDefault();
    }
  };

  const handleDownload = async (image: ProjectImage) => {
    const res = await fetch(image.cloudinaryUrl);
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = image.originalName || 'image.jpg';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  };

  const submitReviewMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post('/reviews', {
        reviewLinkToken: token,
        clientName,
        clientEmail,
        understandingScore,
        confidenceScore,
        preferredOption: preferredOption || undefined,
        requestedChanges: requestedChanges || undefined,
        emojiReaction: emojiReaction || undefined,
      });
      return res.data;
    },
  });

  const handleSubmitReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim() || !clientEmail.trim()) return;
    submitReviewMutation.mutate();
  };

  return (
    <div className="min-h-screen bg-parchment flex flex-col items-center py-12 px-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-espresso">
            Seyi-Luxe Interior
          </h1>
          <p className="text-sm text-espresso/60">Project Review</p>
        </div>

        {isLoading && (
          <p className="text-center text-sm text-espresso/60">Loading...</p>
        )}

        {isPasswordError && (
          <form
            onSubmit={handlePasswordSubmit}
            className="max-w-sm mx-auto border border-parchment/20 rounded p-6 bg-white"
          >
            <label className="block text-sm font-medium text-espresso mb-2">
              This project is password protected
            </label>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Enter password"
              className="w-full border border-parchment/30 rounded px-3 py-2 mb-3 text-espresso"
            />
            <button
              type="submit"
              className="w-full bg-espresso text-parchment rounded px-3 py-2 hover:bg-espresso/80 transition-colors cursor-pointer"
            >
              View Project
            </button>
          </form>
        )}

        {error && !isPasswordError && (
          <p className="text-center text-sm text-red-600">
            This review link is invalid or has expired.
          </p>
        )}

        {data && (
          <div>
            <div className="text-center mb-8">
              <h2 className="text-xl font-semibold text-espresso">
                {data.project.name}
              </h2>
              <p className="text-sm text-espresso/60">
                {data.project.location ?? ''}
              </p>
              {data.project.description && (
                <p className="text-espresso mt-2 max-w-lg mx-auto">
                  {data.project.description}
                </p>
              )}
            </div>

            {images.length === 0 && (
              <p className="text-center text-sm text-espresso/60">
                No visuals have been shared yet.
              </p>
            )}

            {images.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-10">
                {images.map((image, index) => (
                  <button
                    key={image.id}
                    onClick={() => openImage(index)}
                    className="relative border border-parchment/20 rounded overflow-hidden bg-white text-left hover:shadow-md hover:border-espresso/30 transition-all cursor-pointer"
                  >
                    <img
                      src={image.cloudinaryUrl}
                      alt={image.originalName}
                      onContextMenu={preventSave}
                      onDragStart={preventSave}
                      className="w-full h-48 object-cover select-none"
                    />
                    {showWatermark && (
                      <div className="absolute inset-0 pointer-events-none grid grid-cols-2 grid-rows-3 opacity-25">
                        {Array.from({ length: 6 }).map((_, i) => (
                          <div key={i} className="flex items-center justify-center">
                            <img
                              src="/logo.png"
                              alt=""
                              className="w-16 h-16 object-contain"
                            />
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="p-2">
                      <p className="text-xs text-espresso/60">
                        {image.category.replace(/_/g, ' ')}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Review submission form */}
            {images.length > 0 && !submitReviewMutation.isSuccess && (
              <div className="border border-parchment/20 rounded p-6 bg-white max-w-2xl mx-auto">
                <h3 className="text-lg font-semibold text-espresso mb-1">
                  Share Your Feedback
                </h3>
                <p className="text-sm text-espresso/60 mb-4">
                  Let us know what you think of the designs above.
                </p>

                <form onSubmit={handleSubmitReview} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-espresso mb-1">
                        Your name *
                      </label>
                      <input
                        type="text"
                        value={clientName}
                        onChange={(e) => setClientName(e.target.value)}
                        required
                        className="w-full border border-parchment/30 rounded px-3 py-2 text-espresso text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-espresso mb-1">
                        Your email *
                      </label>
                      <input
                        type="email"
                        value={clientEmail}
                        onChange={(e) => setClientEmail(e.target.value)}
                        required
                        className="w-full border border-parchment/30 rounded px-3 py-2 text-espresso text-sm"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-espresso mb-1">
                        How well do you understand the design? (1-5)
                      </label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setUnderstandingScore(n)}
                            className={`w-9 h-9 rounded border text-sm transition-colors cursor-pointer ${
                              understandingScore === n
                                ? 'bg-espresso text-parchment border-espresso'
                                : 'border-parchment/30 text-espresso hover:bg-espresso/10'
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-espresso mb-1">
                        How confident do you feel about it? (1-5)
                      </label>
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => setConfidenceScore(n)}
                            className={`w-9 h-9 rounded border text-sm transition-colors cursor-pointer ${
                              confidenceScore === n
                                ? 'bg-espresso text-parchment border-espresso'
                                : 'border-parchment/30 text-espresso hover:bg-espresso/10'
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-espresso mb-1">
                      Overall reaction
                    </label>
                    <div className="flex gap-2">
                      {EMOJI_OPTIONS.map((emoji) => (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => setEmojiReaction(emoji)}
                          className={`w-10 h-10 rounded-full border text-lg flex items-center justify-center transition-colors cursor-pointer ${
                            emojiReaction === emoji
                              ? 'bg-espresso/10 border-espresso'
                              : 'border-parchment/30 hover:bg-espresso/10'
                          }`}
                        >
                          {emoji}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-espresso mb-1">
                      Preferred option (optional)
                    </label>
                    <input
                      type="text"
                      value={preferredOption}
                      onChange={(e) => setPreferredOption(e.target.value)}
                      placeholder="e.g. Option A - Neutral palette"
                      className="w-full border border-parchment/30 rounded px-3 py-2 text-espresso text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-espresso mb-1">
                      Requested changes (optional)
                    </label>
                    <textarea
                      value={requestedChanges}
                      onChange={(e) => setRequestedChanges(e.target.value)}
                      rows={3}
                      placeholder="Anything you'd like adjusted?"
                      className="w-full border border-parchment/30 rounded px-3 py-2 text-espresso text-sm"
                    />
                  </div>

                  {submitReviewMutation.isError && (
                    <p className="text-sm text-red-600">
                      Something went wrong submitting your feedback. Please try again.
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={submitReviewMutation.isPending}
                    className="bg-espresso text-parchment rounded px-4 py-2 text-sm hover:bg-espresso/80 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {submitReviewMutation.isPending ? 'Submitting...' : 'Submit Feedback'}
                  </button>
                </form>
              </div>
            )}

            {submitReviewMutation.isSuccess && (
              <div className="border border-parchment/20 rounded p-6 bg-white max-w-2xl mx-auto text-center">
                <p className="text-espresso font-medium">Thank you for your feedback!</p>
                <p className="text-sm text-espresso/60 mt-1">
                  Seyi-Luxe Interior has received your review.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox for viewing a selected image larger */}
      {selectedIndex !== null && images[selectedIndex] && (
        <div
          onClick={closeImage}
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
        >
          <div className="relative">
            <img
              src={images[selectedIndex].cloudinaryUrl}
              alt={images[selectedIndex].originalName}
              onClick={(e) => e.stopPropagation()}
              onContextMenu={preventSave}
              onDragStart={preventSave}
              style={{ transform: `scale(${zoom})` }}
              className="max-w-full max-h-[80vh] rounded transition-transform duration-200 select-none"
            />
            {showWatermark && (
              <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-4 opacity-25">
                {Array.from({ length: 12 }).map((_, i) => (
                  <div key={i} className="flex items-center justify-center">
                    <img src="/logo.png" alt="" className="w-14 h-14 object-contain" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Close button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeImage();
            }}
            className="fixed top-4 right-4 text-white text-3xl leading-none w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors cursor-pointer z-[60]"
            aria-label="Close"
          >
            &times;
          </button>

          {/* Previous arrow */}
          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                showPrev();
              }}
              className="fixed left-4 top-1/2 -translate-y-1/2 text-white text-4xl leading-none w-12 h-12 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors cursor-pointer z-[60]"
              aria-label="Previous image"
            >
              &#8249;
            </button>
          )}

          {/* Next arrow */}
          {images.length > 1 && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                showNext();
              }}
              className="fixed right-4 top-1/2 -translate-y-1/2 text-white text-4xl leading-none w-12 h-12 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors cursor-pointer z-[60]"
              aria-label="Next image"
            >
              &#8250;
            </button>
          )}

          {/* Bottom controls: zoom + download */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2 bg-black/60 rounded-full px-2 py-1 z-[60]"
          >
            <button
              onClick={zoomOut}
              disabled={zoom <= MIN_ZOOM}
              className="text-white text-2xl leading-none w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Zoom out"
            >
              &minus;
            </button>
            <span className="text-white text-xs w-10 text-center select-none">
              {Math.round(zoom * 100)}%
            </span>
            <button
              onClick={zoomIn}
              disabled={zoom >= MAX_ZOOM}
              className="text-white text-2xl leading-none w-10 h-10 flex items-center justify-center rounded-full hover:bg-white/20 transition-colors cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              aria-label="Zoom in"
            >
              &#43;
            </button>

            {allowDownload && (
              <>
                <span className="w-px h-6 bg-white/30 mx-1" />
                <button
                  onClick={() => handleDownload(images[selectedIndex])}
                  className="text-white text-xs px-3 py-2 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
                >
                  Download
                </button>
              </>
            )}
          </div>

          {/* Comment thread for this image (floating chat widget, bottom-right) */}
          {data && (
            <CommentThread
              projectId={data.project.id}
              imageId={images[selectedIndex].id}
            />
          )}
        </div>
      )}
    </div>
  );
}