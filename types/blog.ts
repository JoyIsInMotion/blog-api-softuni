export type BlogUser = {
  id: number;
  email: string;
  createdAt: string;
};

export type BlogAuthor = {
  email: string;
};

export type BlogPost = {
  id: number;
  authorId: number;
  title: string;
  contentHtml: string;
  coverImageUrl: string | null;
  tags: string[] | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string | null;
  author?: BlogAuthor;
};

export type BlogPostSummary = BlogPost;

export type ApiError = {
  message?: string;
};