import * as crypto from 'crypto';
import prisma from '../lib/prisma';
import { getRedisClient } from '../lib/redis';

/**
 * Auth Service - Handles OAuth authentication for Instagram and TikTok
 * Manages token encryption, storage, and refresh
 */

const ENCRYPTION_KEY = Buffer.from(process.env.ENCRYPTION_KEY || '0'.repeat(64), 'hex');
const STATE_TOKEN_TTL = 600; // 10 minutes

export interface OAuthConfig {
  platform: 'instagram' | 'tiktok';
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface TokenResponse {
  accessToken: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface DecryptedTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt?: Date;
}

/**
 * Type-safe Prisma client with SocialAccount
 */
const db = prisma as any;

/**
 * Encrypt sensitive data using AES-256-GCM
 */
export function encryptToken(plaintext: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);

  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Return: iv:encrypted:authTag
  return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
}

/**
 * Decrypt tokens
 */
export function decryptToken(encrypted: string): string {
  const [ivHex, encryptedHex, authTagHex] = encrypted.split(':');

  if (!ivHex || !encryptedHex || !authTagHex) {
    throw new Error('Invalid encrypted token format');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Generate OAuth state token for CSRF protection
 */
export async function generateStateToken(): Promise<string> {
  const state = crypto.randomBytes(32).toString('hex');

  // Store in Redis with 10-minute TTL
  const redis = getRedisClient();
  if (redis) {
    await redis.setEx(`oauth-state:${state}`, STATE_TOKEN_TTL, '1');
  }

  return state;
}

/**
 * Verify OAuth state token
 */
export async function verifyStateToken(state: string): Promise<boolean> {
  const redis = getRedisClient();
  if (!redis) return false;

  const exists = await redis.get(`oauth-state:${state}`);
  if (exists) {
    // Delete after verification
    await redis.del(`oauth-state:${state}`);
    return true;
  }

  return false;
}

/**
 * Get Instagram OAuth authorization URL
 */
export function getInstagramAuthUrl(config: OAuthConfig, state: string): string {
  const params = new URLSearchParams({
    client_id: config.clientId,
    redirect_uri: config.redirectUri,
    scope: 'instagram_business_basic,instagram_business_manage_messages,pages_read_engagement,pages_manage_metadata',
    response_type: 'code',
    state,
  });

  return `https://api.instagram.com/oauth/authorize?${params.toString()}`;
}

/**
 * Get TikTok OAuth authorization URL
 */
export function getTikTokAuthUrl(config: OAuthConfig, state: string): string {
  const params = new URLSearchParams({
    client_key: config.clientId,
    redirect_uri: config.redirectUri,
    scope: 'user.info.basic,video.upload',
    response_type: 'code',
    state,
  });

  return `https://www.tiktok.com/v1/oauth/authorize?${params.toString()}`;
}

/**
 * Exchange OAuth code for tokens (Instagram)
 */
export async function exchangeInstagramCode(
  code: string,
  config: OAuthConfig
): Promise<TokenResponse> {
  const params = new URLSearchParams({
    client_id: config.clientId,
    client_secret: config.clientSecret,
    grant_type: 'authorization_code',
    redirect_uri: config.redirectUri,
    code,
  });

  const response = await fetch('https://graph.instagram.com/v18.0/access_token', {
    method: 'POST',
    body: params,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  if (!response.ok) {
    const error = (await response.json()) as any;
    throw new Error(`Instagram OAuth error: ${error.error?.message || 'Unknown error'}`);
  }

  const data = (await response.json()) as any;
  return {
    accessToken: data.access_token,
    expiresIn: data.expires_in,
  };
}

/**
 * Exchange OAuth code for tokens (TikTok)
 */
export async function exchangeTikTokCode(
  code: string,
  config: OAuthConfig
): Promise<TokenResponse> {
  const response = await fetch('https://open.tiktokapis.com/v1/oauth/token/', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_key: config.clientId,
      client_secret: config.clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: config.redirectUri,
    }),
  });

  if (!response.ok) {
    const error = (await response.json()) as any;
    throw new Error(`TikTok OAuth error: ${error.error || 'Unknown error'}`);
  }

  const data = (await response.json()) as any;
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

/**
 * Fetch user info from Instagram
 */
export async function getInstagramUserInfo(accessToken: string): Promise<{
  userId: string;
  username: string;
}> {
  const response = await fetch(
    `https://graph.instagram.com/v18.0/me?fields=id,username&access_token=${accessToken}`
  );

  if (!response.ok) {
    throw new Error('Failed to fetch Instagram user info');
  }

  const data = (await response.json()) as any;
  return {
    userId: data.id,
    username: `@${data.username}`,
  };
}

/**
 * Fetch user info from TikTok
 */
export async function getTikTokUserInfo(accessToken: string): Promise<{
  userId: string;
  username: string;
}> {
  const response = await fetch('https://open.tiktokapis.com/v1/user/info/', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch TikTok user info');
  }

  const data = (await response.json()) as any;
  return {
    userId: data.data.user.id,
    username: `@${data.data.user.display_name}`,
  };
}

/**
 * Save social account to database
 */
export async function saveSocialAccount(
  userId: string,
  platform: 'instagram' | 'tiktok',
  tokens: TokenResponse,
  userInfo: { userId: string; username: string }
): Promise<string> {
  const tokenExpiresAt = tokens.expiresIn
    ? new Date(Date.now() + tokens.expiresIn * 1000)
    : null;

  const account = await db.socialAccount.upsert({
    where: {
      userId_platform: {
        userId,
        platform,
      },
    },
    create: {
      userId,
      platform,
      encryptedAccessToken: encryptToken(tokens.accessToken),
      encryptedRefreshToken: tokens.refreshToken ? encryptToken(tokens.refreshToken) : null,
      tokenExpiresAt,
      platformUserId: userInfo.userId,
      platformUsername: userInfo.username,
      isActive: true,
    },
    update: {
      encryptedAccessToken: encryptToken(tokens.accessToken),
      encryptedRefreshToken: tokens.refreshToken ? encryptToken(tokens.refreshToken) : null,
      tokenExpiresAt,
      platformUserId: userInfo.userId,
      platformUsername: userInfo.username,
      isActive: true,
      updatedAt: new Date(),
    },
  });

  return account.id;
}

/**
 * Get active social account
 */
export async function getActiveSocialAccount(
  userId: string,
  platform: 'instagram' | 'tiktok'
): Promise<{ id: string; platformUsername: string; tokens: DecryptedTokens } | null> {
  const account = await db.socialAccount.findUnique({
    where: {
      userId_platform: {
        userId,
        platform,
      },
    },
  });

  if (!account || !account.isActive) {
    return null;
  }

  return {
    id: account.id,
    platformUsername: account.platformUsername,
    tokens: {
      accessToken: decryptToken(account.encryptedAccessToken),
      refreshToken: account.encryptedRefreshToken
        ? decryptToken(account.encryptedRefreshToken)
        : undefined,
      expiresAt: account.tokenExpiresAt ?? undefined,
    },
  };
}

/**
 * Refresh access token if expired
 */
export async function refreshAccessTokenIfNeeded(
  socialAccountId: string,
  config: OAuthConfig
): Promise<string> {
  const account = await db.socialAccount.findUnique({
    where: { id: socialAccountId },
  });

  if (!account) {
    throw new Error('Social account not found');
  }

  // Check if token expired or about to expire (within 1 hour)
  const expiryMargin = 3600000; // 1 hour
  if (account.tokenExpiresAt && account.tokenExpiresAt.getTime() > Date.now() + expiryMargin) {
    // Token still valid
    return decryptToken(account.encryptedAccessToken);
  }

  // Attempt refresh
  if (!account.encryptedRefreshToken) {
    throw new Error('No refresh token available');
  }

  const refreshToken = decryptToken(account.encryptedRefreshToken);

  try {
    if (account.platform === 'instagram') {
      // Instagram uses long-lived tokens, might not have refresh token
      // For now, just return existing token
      return decryptToken(account.encryptedAccessToken);
    } else {
      // TikTok refresh
      const response = await fetch('https://open.tiktokapis.com/v1/oauth/token/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_key: config.clientId,
          client_secret: config.clientSecret,
          grant_type: 'refresh_token',
          refresh_token: refreshToken,
        }),
      });

      if (!response.ok) {
        throw new Error('Token refresh failed');
      }

      const data = (await response.json()) as any;
      const newAccessToken: string = data.access_token;
      const newRefreshToken: string = data.refresh_token;
      const expiresIn: number = data.expires_in;

      // Update account with new tokens
      await db.socialAccount.update({
        where: { id: socialAccountId },
        data: {
          encryptedAccessToken: encryptToken(newAccessToken),
          encryptedRefreshToken: encryptToken(newRefreshToken),
          tokenExpiresAt: new Date(Date.now() + expiresIn * 1000),
          updatedAt: new Date(),
        },
      });

      return newAccessToken;
    }
  } catch (error) {
    console.error('[AUTH-SERVICE] Token refresh failed:', error);
    throw new Error('TOKEN_EXPIRED');
  }
}

/**
 * Disconnect account
 */
export async function disconnectAccount(accountId: string): Promise<void> {
  await db.socialAccount.update({
    where: { id: accountId },
    data: { isActive: false },
  });
}

/**
 * List user's social accounts
 */
export async function listSocialAccounts(userId: string) {
  const accounts = await db.socialAccount.findMany({
    where: {
      userId,
      isActive: true,
    },
    select: {
      id: true,
      platform: true,
      platformUsername: true,
      platformUserId: true,
      createdAt: true,
    },
  });

  return accounts;
}
