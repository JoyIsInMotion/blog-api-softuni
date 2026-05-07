import { db } from '@/db';
import { posts } from '@/db/schema';
import { eq } from 'drizzle-orm';
import jwt from 'jsonwebtoken';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { id } = req.query;
  const postId = parseInt(id as string);

  if (isNaN(postId)) {
    return res.status(400).json({ message: 'Invalid post ID' });
  }

  switch (req.method) {
    case 'GET':
      return getPostById(req, res, postId);
    case 'PATCH':
      return updatePost(req, res, postId);
    case 'DELETE':
      return deletePost(req, res, postId);
    default:
      return res.status(405).json({ message: 'Method Not Allowed' });
  }
}

async function getPostById(
  req: NextApiRequest,
  res: NextApiResponse,
  postId: number
) {
  try {
    const post = await db.query.posts.findFirst({
      where: eq(posts.id, postId),
      with: {
        author: {
          columns: {
            email: true,
          },
        },
      },
    });

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    res.status(200).json(post);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

async function updatePost(
  req: NextApiRequest,
  res: NextApiResponse,
  postId: number
) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: number;
    };
    const userId = decoded.userId;

    const { title, contentHtml } = req.body;
    if (!title && !contentHtml) {
      return res
        .status(400)
        .json({ message: 'Title or content is required for update' });
    }

    const post = await db.query.posts.findFirst({
      where: eq(posts.id, postId),
    });

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.authorId !== userId) {
      return res
        .status(403)
        .json({ message: 'You are not authorized to edit this post' });
    }

    const updatedPost = await db
      .update(posts)
      .set({
        title: title || post.title,
        contentHtml: contentHtml || post.contentHtml,
      })
      .where(eq(posts.id, postId))
      .returning();

    res.status(200).json(updatedPost[0]);
  } catch (error) {
    console.error(error);
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

async function deletePost(
  req: NextApiRequest,
  res: NextApiResponse,
  postId: number
) {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: number;
    };
    const userId = decoded.userId;

    const post = await db.query.posts.findFirst({
      where: eq(posts.id, postId),
    });

    if (!post) {
      return res.status(404).json({ message: 'Post not found' });
    }

    if (post.authorId !== userId) {
      return res
        .status(403)
        .json({ message: 'You are not authorized to delete this post' });
    }

    await db.delete(posts).where(eq(posts.id, postId));

    res.status(204).end();
  } catch (error) {
    console.error(error);
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
