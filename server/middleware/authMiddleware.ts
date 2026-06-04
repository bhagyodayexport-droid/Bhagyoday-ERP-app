import { Request, Response, NextFunction } from 'express';
import { getAdminAuth } from '../lib/firebaseAdmin';
import logger from '../lib/logger';

/**
 * Authentication Middleware Layer
 * ------------------------------
 * Intercepts incoming API requests to validate the Firebase ID Token.
 * Responsible for:
 * 1. Extracting the Bearer token from headers.
 * 2. Authenticating against Firebase Admin SDK.
 * 3. Enforcing security policies (e.g. email verification).
 * 4. Providing granular Role-Based Access Control (RBAC).
 */

export interface AuthRequest extends Request {
  user?: any; // DecodedIdToken type from firebase-admin
}

/**
 * Standard token verification middleware.
 * Attaches decoded user claims to req.user on success.
 */
export const verifyToken = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Authentication failed: Missing or malformed credentials'
    });
  }

  const rawToken = authHeader.split('Bearer ')[1];

  try {
    const authService = getAdminAuth();
    if (!authService) {
      logger.error('Security Breach: Auth service not reachable during validation attempt.');
      return res.status(503).json({
        success: false,
        message: 'Security handshake failed. Please try again.'
      });
    }

    // Validate the JWT against Firebase infrastructure
    const decodedClaims = await authService.verifyIdToken(rawToken);
    
    // Data Integrity: Require verified email for production environments
    const isProduction = process.env.NODE_ENV === 'production';
    if (!decodedClaims.email_verified && isProduction) {
      return res.status(403).json({
        success: false,
        message: 'Restricted Access: Identity verification (email) required.'
      });
    }

    // Persist claims for the current request lifecycle
    req.user = decodedClaims;
    next();
  } catch (err: any) {
    logger.warn({ errorMessage: err.message, errorCode: err.code }, 'Request Identity Rejected');
    return res.status(401).json({
      success: false,
      message: 'Invalid session. Authentication required.',
      details: err.code
    });
  }
};

/**
 * Authorization Wrapper (RBAC)
 * ---------------------------
 * Restricts access to routes based on user role assignments.
 */
export const requireRole = (allowedRoles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Identity context missing' });
    }

    const currentRole = (req.user.role as string) || 'guest';
    const isMasterAdmin = req.user.email === 'bhagyoday.export@gmail.com';
    
    // Grant access for direct role match or super-admin override
    if (allowedRoles.includes(currentRole) || isMasterAdmin) {
      return next();
    }

    logger.info({ uid: req.user.uid, role: currentRole }, 'Unauthorized Role Access Attempt');
    return res.status(403).json({
      success: false,
      message: 'Access denied. You do not have the required permissions for this resource.'
    });
  };
};
