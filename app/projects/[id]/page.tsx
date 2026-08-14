'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { useAuthStore } from '@/lib/auth-store';
import DashboardShell from '@/components/dashboard-shell';
import { Button } from '@/components/ui/button';
import CommentThread from '@/components/comment-thread';

type ProjectImage = {
  id: string;
  cloudinaryUrl: string;
  category: string;
  originalName: string;
  order: number;
  createdAt: string;
};

type Project = {
  id: string;
  name: string;
  location: string | null;
  description: string | null;
  status: string;
  deadline: string | null;
  createdAt: string;
  images: ProjectImage[];
};

type ReviewLinkResponse = {
  id: string;
  token: string;
};

type Review = {
  id: string;
  understandingScore: number;
  confidenceScore: number;
  unclearAreas: string | null;
  preferredOption: string | null;
  requestedChanges: string | null;
  emojiReaction: string | null;
  createdAt: string;
  client: {
    id: string;
    fullName: string;
    email: string;
  };
};

type AccessLog = {
  id: string;
  reviewLinkId: string;
  ipAddress: string;
  device: string | null;
  browser: string | null;
  openedAt: string;
};

const CATEGORIES = [
  'FLOOR_PLAN_2D',
  'ELEVATION',
  'RENDER_3D',
  'MOOD_BOARD',
  'MATERIAL_BOARD',
  'FURNITURE',
];

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.5;

export default function ProjectDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [category, setCategory] = useState(CATEGORIES[2]); // default RENDER_3D

  // Review link (watermarked, no download, expires)
  const [linkPassword, setLinkPassword] = useState('');
  const [linkExpiresAt, setLinkExpiresAt] = useState('');
  const [generatedLink, setGeneratedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Full access link (no watermark, downloads allowed, no expiry)
  const [fullAccessPassword, setFullAccessPassword] = useState('');
  const [generatedFullAccessLink, setGeneratedFullAccessLink] = useState<string | null>(null);
  const [fullAccessCopied, setFullAccessCopied] = useState(false);

  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);
  const [reviewPendingDelete, setReviewPendingDelete] = useState<Review | null>(null);

  // Lightbox state
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);

  // Which image's comment thread is currently open
  const [activeCommentImageId, setActiveCommentImageId] = useState<string | null>(null);

  const { data: project, isLoading, error } = useQuery<Project>({
    queryKey: ['project', id],
    queryFn: async () => {
      const res = await apiClient.get(`/projects/${id}`);
      return res.data;
    },
    enabled: !!user && !!id,
  });

  const { data: reviews, isLoading: reviewsLoading } = useQuery<Review[]>({
    queryKey: ['reviews', id],
    queryFn: async () => {
      const res = await apiClient.get(`/reviews/project/${id}`);
      return res.data;
    },
    enabled: !!user && !!id,
  });

  const { data: accessLogs, isLoading: accessLogsLoading } = useQuery<AccessLog[]>({
    queryKey: ['access-logs', id],
    queryFn: async () => {
      const res = await apiClient.get(`/review-links/logs/project/${id}`);
      return res.data;
    },
    enabled: !!user && !!id,
  });

  const images = project?.images ?? [];
const statusMutation = useMutation({
  mutationFn: (status: string) =>
    apiClient.patch(`/projects/${id}/status`, { status }),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: ['project', id] });
  },
});
  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile) return;
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('projectId', id);
      formData.append('category', category);
      formData.append('order', '0');

      const res = await apiClient.post('/images/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      setSelectedFile(null);
    },
  });

  const handleUpload = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    uploadMutation.mutate();
  };

  const generateLinkMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<ReviewLinkResponse>('/review-links', {
        projectId: id,
        password: linkPassword || undefined,
        expiresAt: linkExpiresAt
          ? new Date(linkExpiresAt).toISOString()
          : undefined,
        allowDownload: false,
        watermark: true,
      });
      return res.data;
    },
    onSuccess: (data) => {
      const url = `${window.location.origin}/review/${data.token}`;
      setGeneratedLink(url);
      setCopied(false);
    },
  });

  const handleGenerateLink = (e: React.FormEvent) => {
    e.preventDefault();
    generateLinkMutation.mutate();
  };

  const handleCopyLink = async () => {
    if (!generatedLink) return;
    await navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const generateFullAccessLinkMutation = useMutation({
    mutationFn: async () => {
      const res = await apiClient.post<ReviewLinkResponse>('/review-links', {
        projectId: id,
        password: fullAccessPassword || undefined,
        allowDownload: true,
        watermark: false,
      });
      return res.data;
    },
    onSuccess: (data) => {
      const url = `${window.location.origin}/review/${data.token}`;
      setGeneratedFullAccessLink(url);
      setFullAccessCopied(false);
    },
  });

  const handleGenerateFullAccessLink = (e: React.FormEvent) => {
    e.preventDefault();
    generateFullAccessLinkMutation.mutate();
  };

  const handleCopyFullAccessLink = async () => {
    if (!generatedFullAccessLink) return;
    await navigator.clipboard.writeText(generatedFullAccessLink);
    setFullAccessCopied(true);
    setTimeout(() => setFullAccessCopied(false), 2000);
  };

  const deleteReviewMutation = useMutation({
    mutationFn: async (reviewId: string) => {
      await apiClient.delete(`/reviews/${reviewId}`);
    },
    onMutate: (reviewId: string) => {
      setDeletingReviewId(reviewId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reviews', id] });
      setReviewPendingDelete(null);
    },
    onSettled: () => {
      setDeletingReviewId(null);
    },
  });

  const handleConfirmDelete = () => {
    if (!reviewPendingDelete) return;
    deleteReviewMutation.mutate(reviewPendingDelete.id);
  };

  const handleOpenComments = (imageId: string) => {
    setActiveCommentImageId(imageId);
  };

  const handleCloseComments = () => {
    setActiveCommentImageId(null);
  };

  // Lightbox handlers
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

  const formatOpenedAt = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  };

  return (
    <DashboardShell>
      {isLoading && <p className="text-sm text-espresso/60">Loading project...</p>}

      {error && (
        <p className="text-sm text-red-600">
          Couldn't load this project. It may not exist, or the API may be down.
        </p>
      )}

      {project && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <h1 className="text-2xl font-semibold text-espresso">{project.name}</h1>
            <select
          value={project.status}
          onChange={(e) => statusMutation.mutate(e.target.value)}
          disabled={statusMutation.isPending}
          className="text-xs px-2 py-1 rounded bg-espresso/10 text-espresso border-none cursor-pointer"
        >
          <option value="DRAFT">DRAFT</option>
          <option value="ACTIVE">ACTIVE</option>
          <option value="IN_REVIEW">IN_REVIEW</option>
          <option value="APPROVED">APPROVED</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </select>
          </div>
          <p className="text-sm text-espresso/60 mb-6">
            {project.location ?? 'No location set'}
          </p>

          {project.description && (
            <p className="text-espresso mb-6">{project.description}</p>
          )}

          {project.deadline && (
            <p className="text-sm text-espresso/60 mb-6">
              Deadline: {new Date(project.deadline).toLocaleDateString()}
            </p>
          )}

          {/* Upload form */}
          <form
            onSubmit={handleUpload}
            className="border border-parchment/20 rounded p-4 mb-6 flex flex-wrap items-end gap-3"
          >
            <div>
              <label className="block text-sm font-medium text-espresso mb-1">
                Image file
              </label>
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                className="text-sm text-espresso file:mr-3 file:py-2 file:px-3 file:rounded file:border file:border-espresso/30 file:bg-transparent file:text-espresso file:cursor-pointer hover:file:bg-espresso/10 file:transition-colors cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-espresso mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="border border-parchment/30 rounded px-3 py-2 bg-white text-espresso text-sm"
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            <Button type="submit" disabled={!selectedFile || uploadMutation.isPending}>
              {uploadMutation.isPending ? 'Uploading...' : 'Upload'}
            </Button>

            {uploadMutation.isError && (
              <p className="text-sm text-red-600 w-full">
                Upload failed. Please try again.
              </p>
            )}
          </form>

          {/* Share for Review (watermarked, expires, no download) */}
          <div className="border border-parchment/20 rounded p-4 mb-6">
            <h2 className="text-sm font-medium text-espresso mb-1">
              Share for Review
            </h2>
            <p className="text-xs text-espresso/60 mb-3">
              Watermarked, no downloads. Use the expiry to gate access until payment.
            </p>

            <form onSubmit={handleGenerateLink} className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-sm font-medium text-espresso mb-1">
                  Password (optional)
                </label>
                <input
                  type="text"
                  value={linkPassword}
                  onChange={(e) => setLinkPassword(e.target.value)}
                  placeholder="Leave blank for no password"
                  className="border border-parchment/30 rounded px-3 py-2 bg-white text-espresso text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-espresso mb-1">
                  Expires (optional)
                </label>
                <input
                  type="datetime-local"
                  value={linkExpiresAt}
                  onChange={(e) => setLinkExpiresAt(e.target.value)}
                  className="border border-parchment/30 rounded px-3 py-2 bg-white text-espresso text-sm"
                />
              </div>

              <Button type="submit" disabled={generateLinkMutation.isPending}>
                {generateLinkMutation.isPending ? 'Generating...' : 'Generate Review Link'}
              </Button>

              {generateLinkMutation.isError && (
                <p className="text-sm text-red-600 w-full">
                  Couldn't generate the link. Please try again.
                </p>
              )}
            </form>

            {generatedLink && (
              <div className="mt-4 flex flex-wrap items-center gap-2 border border-parchment/20 rounded p-3 bg-parchment/10">
                <input
                  type="text"
                  readOnly
                  value={generatedLink}
                  className="flex-1 min-w-0 border border-parchment/30 rounded px-3 py-2 bg-white text-espresso text-sm"
                  onFocus={(e) => e.target.select()}
                />
                <Button type="button" variant="outline" onClick={handleCopyLink}>
                  {copied ? 'Copied!' : 'Copy Link'}
                </Button>
              </div>
            )}
          </div>

          {/* Full Access Link (no watermark, downloads allowed, never expires) */}
          <div className="border border-espresso/30 rounded p-4 mb-6 bg-espresso/5">
            <h2 className="text-sm font-medium text-espresso mb-1">
              Full Access Link
            </h2>
            <p className="text-xs text-espresso/60 mb-3">
              No watermark, downloads allowed, never expires. Generate once payment is confirmed.
            </p>

            <form onSubmit={handleGenerateFullAccessLink} className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-sm font-medium text-espresso mb-1">
                  Password (optional)
                </label>
                <input
                  type="text"
                  value={fullAccessPassword}
                  onChange={(e) => setFullAccessPassword(e.target.value)}
                  placeholder="Leave blank for no password"
                  className="border border-parchment/30 rounded px-3 py-2 bg-white text-espresso text-sm"
                />
              </div>

              <Button type="submit" disabled={generateFullAccessLinkMutation.isPending}>
                {generateFullAccessLinkMutation.isPending ? 'Generating...' : 'Generate Full Access Link'}
              </Button>

              {generateFullAccessLinkMutation.isError && (
                <p className="text-sm text-red-600 w-full">
                  Couldn't generate the link. Please try again.
                </p>
              )}
            </form>

            {generatedFullAccessLink && (
              <div className="mt-4 flex flex-wrap items-center gap-2 border border-parchment/20 rounded p-3 bg-white">
                <input
                  type="text"
                  readOnly
                  value={generatedFullAccessLink}
                  className="flex-1 min-w-0 border border-parchment/30 rounded px-3 py-2 bg-white text-espresso text-sm"
                  onFocus={(e) => e.target.select()}
                />
                <Button type="button" variant="outline" onClick={handleCopyFullAccessLink}>
                  {fullAccessCopied ? 'Copied!' : 'Copy Link'}
                </Button>
              </div>
            )}
          </div>

          {/* Access History */}
          <div className="border border-parchment/20 rounded p-4 mb-6">
            <h2 className="text-sm font-medium text-espresso mb-1">
              Access History
            </h2>
            <p className="text-xs text-espresso/60 mb-3">
              Every time a review link for this project has been opened.
            </p>

            {accessLogsLoading && (
              <p className="text-sm text-espresso/60">Loading access history...</p>
            )}

            {!accessLogsLoading && (!accessLogs || accessLogs.length === 0) && (
              <p className="text-sm text-espresso/60">
                No one has opened a review link for this project yet.
              </p>
            )}

            {accessLogs && accessLogs.length > 0 && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-espresso/50 border-b border-parchment/20">
                      <th className="py-2 pr-4 font-medium">Opened</th>
                      <th className="py-2 pr-4 font-medium">Device</th>
                      <th className="py-2 pr-4 font-medium">Browser</th>
                      <th className="py-2 font-medium">IP Address</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accessLogs.map((log) => (
                      <tr
                        key={log.id}
                        className="border-b border-parchment/10 hover:bg-parchment/10 transition-colors"
                      >
                        <td className="py-2 pr-4 text-espresso">
                          {formatOpenedAt(log.openedAt)}
                        </td>
                        <td className="py-2 pr-4 text-espresso/80">
                          {log.device ?? 'Unknown'}
                        </td>
                        <td className="py-2 pr-4 text-espresso/80">
                          {log.browser ?? 'Unknown'}
                        </td>
                        <td className="py-2 text-espresso/60">{log.ipAddress}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Client Feedback */}
          <div className="border border-parchment/20 rounded p-4 mb-6">
            <h2 className="text-sm font-medium text-espresso mb-3">
              Client Feedback
            </h2>

            {reviewsLoading && (
              <p className="text-sm text-espresso/60">Loading feedback...</p>
            )}

            {!reviewsLoading && (!reviews || reviews.length === 0) && (
              <p className="text-sm text-espresso/60">
                No feedback submitted yet.
              </p>
            )}

            {reviews && reviews.length > 0 && (
              <div className="space-y-3">
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="border border-parchment/20 rounded p-3 hover:bg-parchment/10 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-medium text-espresso">
                        {review.client.fullName}{' '}
                        {review.emojiReaction && (
                          <span className="ml-1">{review.emojiReaction}</span>
                        )}
                      </p>
                      <div className="flex items-center gap-3">
                        <p className="text-xs text-espresso/50">
                          {new Date(review.createdAt).toLocaleDateString()}
                        </p>
                        <button
                          type="button"
                          onClick={() => setReviewPendingDelete(review)}
                          className="text-xs text-red-600 hover:text-red-800 hover:underline transition-colors cursor-pointer"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-espresso/60 mb-2">
                      {review.client.email}
                    </p>
                    <div className="flex gap-4 text-xs text-espresso/70 mb-2">
                      <span>Understanding: {review.understandingScore}/5</span>
                      <span>Confidence: {review.confidenceScore}/5</span>
                    </div>
                    {review.preferredOption && (
                      <p className="text-sm text-espresso mb-1">
                        <span className="font-medium">Preferred:</span>{' '}
                        {review.preferredOption}
                      </p>
                    )}
                    {review.requestedChanges && (
                      <p className="text-sm text-espresso">
                        <span className="font-medium">Requested changes:</span>{' '}
                        {review.requestedChanges}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Gallery */}
          {(!project.images || project.images.length === 0) && (
            <div className="border border-parchment/20 rounded p-8 text-center text-espresso/60">
              No visuals uploaded yet.
            </div>
          )}

          {images.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {images.map((image, index) => (
                <div
                  key={image.id}
                  className="border border-parchment/20 rounded overflow-hidden hover:shadow-md hover:border-espresso/30 transition-all"
                >
                  <button
                    type="button"
                    onClick={() => openImage(index)}
                    className="block w-full cursor-pointer"
                  >
                    <img
                      src={image.cloudinaryUrl}
                      alt={image.originalName}
                      className="w-full h-48 object-cover"
                    />
                  </button>
                  <div className="p-2 flex items-center justify-between">
                    <p className="text-xs text-espresso/60">
                      {image.category.replace(/_/g, ' ')}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleOpenComments(image.id)}
                      className="text-xs text-espresso hover:text-espresso/70 hover:underline transition-colors cursor-pointer"
                    >
                      Comments
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Centered delete confirmation modal */}
      {reviewPendingDelete && (
        <div
          onClick={() => setReviewPendingDelete(null)}
          className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-lg p-6 max-w-sm w-full shadow-xl"
          >
            <h3 className="text-base font-semibold text-espresso mb-2">
              Delete this feedback?
            </h3>
            <p className="text-sm text-espresso/60 mb-6">
              Feedback from {reviewPendingDelete.client.fullName} will be permanently removed. This cannot be undone.
            </p>
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => setReviewPendingDelete(null)}
                disabled={deleteReviewMutation.isPending}
              >
                Cancel
              </Button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={deleteReviewMutation.isPending}
                className="bg-red-600 text-white text-sm px-4 py-2 rounded hover:bg-red-700 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteReviewMutation.isPending ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Image lightbox */}
      {selectedIndex !== null && images[selectedIndex] && (
        <div
          onClick={closeImage}
          className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50"
        >
          <img
            src={images[selectedIndex].cloudinaryUrl}
            alt={images[selectedIndex].originalName}
            onClick={(e) => e.stopPropagation()}
            style={{ transform: `scale(${zoom})` }}
            className="max-w-full max-h-[80vh] rounded transition-transform duration-200 select-none"
          />

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

          {/* Bottom controls: zoom + comments */}
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

            <span className="w-px h-6 bg-white/30 mx-1" />
            <button
              onClick={() => handleOpenComments(images[selectedIndex].id)}
              className="text-white text-xs px-3 py-2 rounded-full hover:bg-white/20 transition-colors cursor-pointer"
            >
              Comments
            </button>
          </div>
        </div>
      )}

      {/* Floating comment chat widget for the active image */}
      {project && activeCommentImageId && (
        <CommentThread
          key={activeCommentImageId}
          projectId={project.id}
          imageId={activeCommentImageId}
          defaultOpen
          onClose={handleCloseComments}
          isDesigner
        />
      )}
    </DashboardShell>
  );
}