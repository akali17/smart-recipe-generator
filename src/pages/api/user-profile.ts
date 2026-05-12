import type { NextApiRequest, NextApiResponse } from 'next';
import { getServerSession } from 'next-auth';
import { authOptions } from './auth/[...nextauth]';
import { connectDB } from '../../lib/mongodb';
import UserProfile from '../../models/userProfile';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const session = await getServerSession(req, res, authOptions);
  if (!session?.user?.id) return res.status(401).json({ error: 'Unauthorized' });

  await connectDB();
  const userId = session.user.id;

  if (req.method === 'GET') {
    let profile = await UserProfile.findOne({ userId });
    if (!profile) profile = await UserProfile.create({ userId });
    return res.json(profile);
  }

  if (req.method === 'PUT') {
    const profile = await UserProfile.findOneAndUpdate(
      { userId },
      { $set: req.body },
      { new: true, upsert: true }
    );
    return res.json(profile);
  }

  res.status(405).json({ error: 'Method not allowed' });
}