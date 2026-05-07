import { db } from '@/db';
import { posts } from '@/db/schema';
import jwt from 'jsonwebtoken';
import { NextApiRequest, NextApiResponse } from 'next';
import { asc, eq } from 'drizzle-orm';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  switch (req.method) {
    case 'GET':
      return getPosts(req, res);
    case 'POST':
      return createPost(req, res);
    default:
      return res.status(405).json({ message: 'Method Not Allowed' });
  }
}

async function getPosts(req: NextApiRequest, res: NextApiResponse) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const offset = (page - 1) * limit;

    const allPosts = await db.query.posts.findMany({
      limit,
      offset,
      orderBy: [asc(posts.createdAt)],
      with: {
        author: {
          columns: {
            email: true,
          },
        },
      },
    });
    res.status(200).json(allPosts);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}

async function createPost(req: NextApiRequest, res: NextApiResponse) {
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
    if (!title || !contentHtml) {
      return res
        .status(400)
        .json({ message: 'Title and content are required' });
    }

    const newPost = await db
      .insert(posts)
      .values({ title, contentHtml, authorId: userId })
      .returning();

    res.status(201).json(newPost[0]);
  } catch (error) {
    console.error(error);
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
