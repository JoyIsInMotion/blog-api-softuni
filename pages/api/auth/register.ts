import { db } from '@/db';
import { users } from '@/db/schema';
import { hash } from 'bcrypt';
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ message: 'Method Not Allowed' });
  }

  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Email and password are required' });
    }

    const hashedPassword = await hash(password, 10);

    const newUser = await db
      .insert(users)
      .values({ email, passwordHash: hashedPassword })
      .returning({
        id: users.id,
        email: users.email,
        createdAt: users.createdAt,
      });

    res.status(201).json(newUser[0]);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
