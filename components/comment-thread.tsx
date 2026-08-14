'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

type CommentAuthor = {
  id: string;
  fullName: string;
  email: string;
};

type CommentItem = {
  id: string;
  content: string;
  isPinned: boolean;
  isResolved: boolean;
  createdAt: string;
  author: CommentAuthor;
  replies: CommentItem[];
};

type Props = {
  projectId: string;
  imageId: string;
  defaultOpen?: boolean;
  onClose?: () => void;
  isDesigner?: boolean;
};

export default function CommentThread({
  projectId,
  imageId,
  defaultOpen,
  onClose,
  isDesigner,
}: Props) {
  const queryClient = useQueryClient();

  const [isOpen, setIsOpen] = useState(!!defaultOpen);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [content, setContent] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');

  useEffect(() => {
    setIsOpen(!!defaultOpen);
  }, [defaultOpen, imageId]);

  const { data: comments, isLoading } = useQuery<CommentItem[]>({
    queryKey: ['comments', imageId],
    queryFn: async () => {
      const res = await apiClient.get(`/comments/image/${imageId}`);
      return res.data;
    },
    enabled: !!imageId && isOpen,
  });

  const totalCount =
    (comments?.length ?? 0) +
    (comments?.reduce((sum, c) => sum + (c.replies?.length ?? 0), 0) ?? 0);

  const postComment = useMutation({
    mutationFn: async (vars: { content: string; parentId?: string }) => {
      const res = await apiClient.post('/comments', {
        projectId,
        imageId,
        parentId: vars.parentId,
        content: vars.content,
        clientName: name,
        clientEmail: email,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', imageId] });
      setContent('');
      setReplyContent('');
      setReplyingTo(null);
    },
  });

  const togglePinMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const res = await apiClient.patch(`/comments/${commentId}/pin`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', imageId] });
    },
  });

  const toggleResolvedMutation = useMutation({
    mutationFn: async (commentId: string) => {
      const res = await apiClient.patch(`/comments/${commentId}/resolve`);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', imageId] });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !content.trim()) return;
    postComment.mutate({ content });
  };

  const handleReplySubmit = (e: React.FormEvent, parentId: string) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !replyContent.trim()) return;
    postComment.mutate({ content: replyContent, parentId });
  };

  const handleToggle = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (!next && onClose) {
      onClose();
    }
  };

  const handleCloseButton = () => {
    setIsOpen(false);
    if (onClose) {
      onClose();
    }
  };

  return (
    <div onClick={(e) => e.stopPropagation()} className="fixed bottom-6 right-6 z-[70]">
      {/* Chat window */}
      {isOpen && (
        <div className="mb-3 w-80 max-h-[60vh] bg-white rounded-lg shadow-2xl flex flex-col overflow-hidden border border-parchment/20">
          {/* Header */}
          <div className="bg-espresso text-parchment px-4 py-3 flex items-center justify-between shrink-0">
            <p className="text-sm font-medium">Comments</p>
            <button
              type="button"
              onClick={handleCloseButton}
              className="text-parchment text-xl leading-none w-7 h-7 flex items-center justify-center rounded-full hover:bg-parchment/20 transition-colors cursor-pointer"
              aria-label="Close comments"
            >
              &times;
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 min-h-[120px]">
            {isLoading && (
              <p className="text-xs text-espresso/60">Loading comments...</p>
            )}

            {!isLoading && (!comments || comments.length === 0) && (
              <p className="text-xs text-espresso/60">
                No comments yet on this image. Be the first to say something.
              </p>
            )}

            {comments?.map((comment) => (
              <div
                key={comment.id}
                className={`border rounded-lg p-2 ${
                  comment.isResolved
                    ? 'border-green-200 bg-green-50'
                    : 'border-parchment/20 bg-parchment/10'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="text-xs font-medium text-espresso">
                    {comment.author.fullName}
                    {comment.isPinned && <span className="ml-1">📌</span>}
                    {comment.isResolved && (
                      <span className="ml-1 text-green-600">✓</span>
                    )}
                  </p>
                  <p className="text-[10px] text-espresso/50">
                    {new Date(comment.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <p className="text-sm text-espresso mb-1">{comment.content}</p>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setReplyingTo(replyingTo === comment.id ? null : comment.id)
                    }
                    className="text-xs text-espresso/60 hover:text-espresso hover:underline transition-colors cursor-pointer"
                  >
                    Reply
                  </button>

                  {isDesigner && (
                    <>
                      <button
                        type="button"
                        onClick={() => togglePinMutation.mutate(comment.id)}
                        disabled={togglePinMutation.isPending}
                        className="text-xs text-espresso/60 hover:text-espresso hover:underline transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {comment.isPinned ? 'Unpin' : 'Pin'}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleResolvedMutation.mutate(comment.id)}
                        disabled={toggleResolvedMutation.isPending}
                        className="text-xs text-espresso/60 hover:text-espresso hover:underline transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {comment.isResolved ? 'Reopen' : 'Resolve'}
                      </button>
                    </>
                  )}
                </div>

                {comment.replies && comment.replies.length > 0 && (
                  <div className="mt-2 ml-3 space-y-2 border-l-2 border-parchment/30 pl-2">
                    {comment.replies.map((reply) => (
                      <div key={reply.id}>
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-medium text-espresso">
                            {reply.author.fullName}
                          </p>
                          <p className="text-[10px] text-espresso/50">
                            {new Date(reply.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <p className="text-sm text-espresso">{reply.content}</p>
                      </div>
                    ))}
                  </div>
                )}

                {replyingTo === comment.id && (
                  <form
                    onSubmit={(e) => handleReplySubmit(e, comment.id)}
                    className="mt-2 flex gap-1"
                  >
                    <input
                      type="text"
                      value={replyContent}
                      onChange={(e) => setReplyContent(e.target.value)}
                      placeholder="Write a reply..."
                      className="flex-1 min-w-0 border border-parchment/30 rounded px-2 py-1 text-xs"
                    />
                    <button
                      type="submit"
                      disabled={postComment.isPending}
                      className="bg-espresso text-parchment text-xs px-2 py-1 rounded hover:bg-espresso/80 transition-colors cursor-pointer disabled:opacity-50 shrink-0"
                    >
                      Send
                    </button>
                  </form>
                )}
              </div>
            ))}
          </div>

          {/* Name/email + composer */}
          <div className="border-t border-parchment/20 p-3 shrink-0 bg-parchment/5">
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                required
                className="flex-1 min-w-0 border border-parchment/30 rounded px-2 py-1 text-xs"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Your email"
                required
                className="flex-1 min-w-0 border border-parchment/30 rounded px-2 py-1 text-xs"
              />
            </div>
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Type a message..."
                required
                className="flex-1 min-w-0 border border-parchment/30 rounded px-3 py-2 text-sm"
              />
              <button
                type="submit"
                disabled={postComment.isPending}
                className="bg-espresso text-parchment text-sm px-3 py-2 rounded hover:bg-espresso/80 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shrink-0"
              >
                {postComment.isPending ? '...' : 'Send'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toggle bubble */}
      <button
        type="button"
        onClick={handleToggle}
        className="relative w-14 h-14 rounded-full bg-espresso text-parchment shadow-xl flex items-center justify-center hover:bg-espresso/80 transition-colors cursor-pointer"
        aria-label={isOpen ? 'Close comments' : 'Open comments'}
      >
        {isOpen ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path
              d="M21 11.5C21.0034 12.8199 20.6951 14.1219 20.1 15.3C19.3944 16.7118 18.3097 17.8992 16.9674 18.7293C15.6251 19.5594 14.0782 19.9994 12.5 20C11.1801 20.0035 9.87812 19.6951 8.7 19.1L3 21L4.9 15.3C4.30493 14.1219 3.99656 12.8199 4 11.5C4.00061 9.92179 4.44061 8.37488 5.27072 7.03258C6.10083 5.69028 7.28825 4.6056 8.7 3.90003C9.87812 3.30496 11.1801 2.99659 12.5 3.00003H13C15.0843 3.11502 17.053 3.99479 18.5291 5.47089C20.0052 6.94699 20.885 8.91568 21 11V11.5Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {!isOpen && totalCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-600 text-white text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
            {totalCount}
          </span>
        )}
      </button>
    </div>
  );
}