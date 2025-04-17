import { Request, Response, NextFunction } from 'express';
import { config } from '../config';

export const authMiddleware = (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'No authorization header' });
  }

  const token = authHeader.split(' ')[1];

  if (token !== config.security.apiKey) {
    return res.status(401).json({ error: 'Invalid API key' });
  }

  next();
}; 