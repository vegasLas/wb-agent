import { JWTPayload } from '@/middleware/auth.middleware';

declare global {
  namespace Express {
    interface Request {
      user?: JWTPayload;
    }
  }
}
