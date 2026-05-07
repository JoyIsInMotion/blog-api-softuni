'use client';

import { useState } from 'react';
import Image from 'next/image';

export default function PostForm({
  title,
  initialTitle = '',
  initialContent = '',
  initialCoverImageUrl = '',
  submitLabel,
  onSubmit,
  loading,
  error,
  token,
}: {
  title: string;
  initialTitle?: string;
  initialContent?: string;
  initialCoverImageUrl?: string | null;
  submitLabel: string;
  onSubmit: (values: { title: string; content: string; coverImageUrl?: string }) => Promise<void>;
  loading: boolean;
  error: string | null;
  token?: string;
}) {
  const [coverImageUrl, setCoverImageUrl] = useState<string>(initialCoverImageUrl || '');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!token) {
      setImageError('You must be authenticated to upload images');
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setImageError('Please select an image file');
      return;
    }

    // Validate file size (10MB max)
    if (file.size > 10 * 1024 * 1024) {
      setImageError('Image must be smaller than 10MB');
      return;
    }

    setUploadingImage(true);
    setImageError(null);

    try {
      const reader = new FileReader();
      reader.onload = async (e) => {
        const base64 = (e.target?.result as string).split(',')[1];

        const response = await fetch('/api/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            file: base64,
            filename: file.name,
          }),
        });

        if (!response.ok) {
          const data = await response.json();
          throw new Error(data.error || 'Failed to upload image');
        }

        const data = await response.json();
        setCoverImageUrl(data.url);
      };
      reader.readAsDataURL(file);
    } catch (err) {
      setImageError(err instanceof Error ? err.message : 'Failed to upload image');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setCoverImageUrl('');
  };

  return (
    <div className="rounded-[2rem] border border-white/10 bg-slate-900/80 p-8 shadow-2xl shadow-slate-950/30 backdrop-blur">
      <div className="mb-8">
        <p className="text-sm uppercase tracking-[0.3em] text-sky-300/80">Post editor</p>
        <h1 className="mt-3 text-3xl font-bold text-white">{title}</h1>
      </div>

      <form
        className="space-y-4"
        onSubmit={async (event) => {
          event.preventDefault();
          const formData = new FormData(event.currentTarget);
          await onSubmit({
            title: String(formData.get('title') || ''),
            content: String(formData.get('content') || ''),
            coverImageUrl: coverImageUrl === '' ? '' : coverImageUrl,
          });
        }}
      >
        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-300">Title</span>
          <input
            name="title"
            type="text"
            required
            defaultValue={initialTitle}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400"
            placeholder="A strong blog title"
          />
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-300">Cover Image</span>
          <div className="space-y-3">
            {coverImageUrl && (
              <div className="relative h-48 w-full overflow-hidden rounded-2xl bg-slate-950/50">
                <Image
                  src={coverImageUrl}
                  alt="Cover preview"
                  fill
                  className="object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  className="absolute right-2 top-2 rounded-xl bg-rose-500/90 px-3 py-1 text-sm font-semibold text-white transition hover:bg-rose-500"
                >
                  Remove
                </button>
              </div>
            )}
            {!coverImageUrl && (
              <input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploadingImage}
                className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white file:cursor-pointer file:border-0 file:bg-sky-500 file:px-3 file:py-2 file:font-semibold file:text-white hover:file:bg-sky-400 disabled:opacity-60"
              />
            )}
            {uploadingImage && (
              <p className="text-sm text-sky-300">Uploading image...</p>
            )}
            {imageError && (
              <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
                {imageError}
              </p>
            )}
          </div>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-slate-300">Content</span>
          <textarea
            name="content"
            required
            minLength={30}
            defaultValue={initialContent}
            rows={10}
            className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-sky-400"
            placeholder="Write the article body here..."
          />
        </label>

        {error ? (
          <p className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {error}
          </p>
        ) : null}

        <button
          type="submit"
          disabled={loading || uploadingImage}
          className="rounded-2xl bg-sky-500 px-5 py-3 font-semibold text-white transition hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? 'Saving...' : submitLabel}
        </button>
      </form>
    </div>
  );
}