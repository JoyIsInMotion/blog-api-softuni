import { db } from '@/db';
import { users } from '@/db/schema';
import { hash } from 'bcrypt';
import jwt from 'jsonwebtoken';
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

    const token = jwt.sign(
      { userId: newUser[0].id },
      process.env.JWT_SECRET!,
      { expiresIn: '1h' },
    );

    res.status(201).json({ token });
  } catch (error) {
    console.error(error);
    if (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      (error as { code: string }).code === '23505'
    ) {
      return res.status(409).json({ message: 'Email already in use' });
    }
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
