import { randomBytes } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { Role } from '@prisma/client';
import { RequestHandler } from 'express';
import { db } from './db.js';
import { config } from './config.js';
import { ApiError, hash } from './domain.js';
declare global { namespace Express { interface Request { user?: {id:string; role:Role}; } } }
export const authenticate: RequestHandler = async (req,_res,next) => {
  try {
    const token=req.headers.authorization?.replace(/^Bearer /,'');
    if(!token) throw new ApiError(401,'AUTH_REQUIRED','Please sign in.');
    let sub: string;
    try { const payload=jwt.verify(token,config.JWT_SECRET,{algorithms:['HS256'],issuer:'pula-api',audience:'pula-client'}); if(typeof payload==='string'||!payload.sub) throw new Error(); sub=payload.sub; }
    catch { throw new ApiError(401,'INVALID_TOKEN','Your session has expired.'); }
    const user=await db.user.findUnique({where:{id:sub}});
    if(!user?.active) throw new ApiError(401,'ACCOUNT_DISABLED','Account unavailable.');
    req.user={id:user.id,role:user.role}; next();
  } catch(e) { next(e); }
};
export const roles=(...allowed:Role[]):RequestHandler=>(req,_res,next)=> { if(!req.user||!allowed.includes(req.user.role)) next(new ApiError(403,'FORBIDDEN','This action is not permitted.')); else next(); };
export function accessToken(userId: string) { return jwt.sign({},config.JWT_SECRET,{subject:userId,expiresIn:'15m',issuer:'pula-api',audience:'pula-client',algorithm:'HS256'}); }
export function refreshValue() { return randomBytes(48).toString('base64url'); }
export async function tokens(userId: string) {
  const refreshToken=refreshValue(); await db.refreshToken.create({data:{hash:hash(refreshToken),userId,expiresAt:new Date(Date.now()+7*86400000)}});
  return {accessToken:accessToken(userId),refreshToken};
}
