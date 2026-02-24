import { Router, Request, Response } from 'express';
import { z } from 'zod';
import {
  generateStateToken,
  verifyStateToken,
  getInstagramAuthUrl,
  getTikTokAuthUrl,
  exchangeInstagramCode,
  exchangeTikTokCode,
  getInstagramUserInfo,
  getTikTokUserInfo,
  saveSocialAccount,
  getActiveSocialAccount,
  disconnectAccount,
  listSocialAccounts,
} from '../services/auth.service';

const router = Router();

// OAuth config from environment
const INSTAGRAM_CONFIG = {
  platform: 'instagram' as const,
  clientId: process.env.INSTAGRAM_CLIENT_ID || '',
  clientSecret: process.env.INSTAGRAM_CLIENT_SECRET || '',
  redirectUri: process.env.INSTAGRAM_REDIRECT_URI || '',
};

const TIKTOK_CONFIG = {
  platform: 'tiktok' as const,
  clientId: process.env.TIKTOK_CLIENT_ID || '',
  clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
  redirectUri: process.env.TIKTOK_REDIRECT_URI || '',
};

/**
 * GET /api/social/auth/:platform
 * Get OAuth authorization URL
 */
router.get('/auth/:platform', async (req: Request, res: Response) => {
  try {
    const { platform } = req.params;

    if (!['instagram', 'tiktok'].includes(platform)) {
      return res.status(400).json({
        error: 'Platform not supported',
        code: 'INVALID_PLATFORM',
        details: { platform: "Must be 'instagram' or 'tiktok'" },
      });
    }

    const state = await generateStateToken();
    const config = platform === 'instagram' ? INSTAGRAM_CONFIG : TIKTOK_CONFIG;

    if (!config.clientId || !config.redirectUri) {
      return res.status(500).json({
        error: 'OAuth configuration incomplete',
        code: 'CONFIG_ERROR',
        details: {},
      });
    }

    const authUrl =
      platform === 'instagram'
        ? getInstagramAuthUrl(config, state)
        : getTikTokAuthUrl(config, state);

    res.json({ authUrl });
  } catch (error) {
    console.error('[AUTH-ROUTES] Error in GET /api/social/auth/:platform:', error);
    res.status(500).json({
      error: 'Failed to generate authorization URL',
      code: 'INTERNAL_ERROR',
      details: {},
    });
  }
});

/**
 * GET /api/social/callback/:platform
 * OAuth callback handler
 */
router.get('/callback/:platform', async (req: Request, res: Response) => {
  try {
    const { platform } = req.params;
    const { code, state, error } = req.query;

    if (error) {
      return res.redirect(`/auth/callback/error?error=${error}&platform=${platform}`);
    }

    if (!code || !state) {
      return res.redirect(
        `/auth/callback/error?error=missing_params&platform=${platform}`
      );
    }

    // Verify state token
    const stateValid = await verifyStateToken(state as string);
    if (!stateValid) {
      return res.redirect(
        `/auth/callback/error?error=invalid_state&platform=${platform}`
      );
    }

    // Get config
    const config = platform === 'instagram' ? INSTAGRAM_CONFIG : TIKTOK_CONFIG;

    if (!config.clientId || !config.clientSecret) {
      return res.redirect(
        `/auth/callback/error?error=config_error&platform=${platform}`
      );
    }

    // Exchange code for tokens
    let tokens;
    let userInfo;

    if (platform === 'instagram') {
      tokens = await exchangeInstagramCode(code as string, config);
      userInfo = await getInstagramUserInfo(tokens.accessToken);
    } else {
      tokens = await exchangeTikTokCode(code as string, config);
      userInfo = await getTikTokUserInfo(tokens.accessToken);
    }

    // Save to database
    // TODO: Extract userId from authenticated session
    const userId = (req as any).user?.id || 'test-user'; // Placeholder - implement user extraction
    const accountId = await saveSocialAccount(userId, platform as 'instagram' | 'tiktok', tokens, userInfo);

    res.redirect(
      `/auth/callback/success?platform=${platform}&username=${encodeURIComponent(userInfo.username)}`
    );
  } catch (error) {
    console.error('[AUTH-ROUTES] Error in GET /api/social/callback/:platform:', error);
    res.redirect(
      `/auth/callback/error?error=token_exchange_failed&platform=${req.params.platform}`
    );
  }
});

/**
 * GET /api/social/accounts
 * List connected social accounts
 */
router.get('/accounts', async (req: Request, res: Response) => {
  try {
    // TODO: Extract userId from authenticated request
    const userId = (req as any).user?.id || 'test-user';

    const accounts = await listSocialAccounts(userId);

    res.json({ accounts });
  } catch (error) {
    console.error('[AUTH-ROUTES] Error in GET /api/social/accounts:', error);
    res.status(500).json({
      error: 'Failed to list social accounts',
      code: 'INTERNAL_ERROR',
      details: {},
    });
  }
});

/**
 * DELETE /api/social/accounts/:id
 * Disconnect a social account
 */
router.delete('/accounts/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({
        error: 'Account ID is required',
        code: 'VALIDATION_ERROR',
        details: { id: 'id is required' },
      });
    }

    // Verify account ownership
    // TODO: Verify that authenticated user owns this account

    await disconnectAccount(id);

    res.json({ message: 'Account disconnected' });
  } catch (error) {
    console.error('[AUTH-ROUTES] Error in DELETE /api/social/accounts/:id:', error);

    if (error instanceof Error && error.message.includes('not found')) {
      return res.status(404).json({
        error: 'Account not found',
        code: 'NOT_FOUND',
        details: {},
      });
    }

    res.status(500).json({
      error: 'Failed to disconnect account',
      code: 'INTERNAL_ERROR',
      details: {},
    });
  }
});

export default router;
