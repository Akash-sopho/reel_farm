import { Router, Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import prisma from '../lib/prisma';
import * as projectService from '../services/project.service';
import {
  CreateProjectSchema,
  UpdateProjectSchema,
  ListProjectsQuerySchema,
} from '../validation/project';

const router = Router();

/**
 * POST /api/projects
 * Create a new project from a template
 */
router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    let validatedBody;
    try {
      validatedBody = await CreateProjectSchema.parseAsync(req.body);
    } catch (error) {
      if (error instanceof ZodError) {
        const details: Record<string, string> = {};
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          details[path] = err.message;
        });

        return res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details,
        });
      }
      throw error;
    }

    // Extract user ID from auth (TODO: implement auth middleware)
    let userId = (req as any).userId;
    if (!userId) {
      // For development: get the test user from the database
      const testUser = await prisma.user.findUnique({
        where: { email: 'test@example.com' },
      });
      if (!testUser) {
        return res.status(500).json({
          error: 'Test user not found in database. Run seed script first.',
          code: 'USER_NOT_FOUND',
        });
      }
      userId = testUser.id;
    }

    // Create project
    const project = await projectService.createProject({
      templateId: validatedBody.templateId,
      name: validatedBody.name,
      userId,
    });

    return res.status(201).json(project);
  } catch (error: any) {
    if (error.statusCode === 404) {
      return res.status(404).json({
        error: error.message,
        code: error.code,
        details: error.details || {},
      });
    }
    next(error);
  }
});

/**
 * GET /api/projects/:id
 * Get a project by ID
 */
router.get('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extract user ID from auth (TODO: implement auth middleware)
    let userId = (req as any).userId;
    if (!userId) {
      const testUser = await prisma.user.findUnique({
        where: { email: 'test@example.com' },
      });
      if (!testUser) {
        return res.status(500).json({
          error: 'Test user not found in database',
          code: 'USER_NOT_FOUND',
        });
      }
      userId = testUser.id;
    }

    // Get project
    const project = await projectService.getProject(req.params.id, userId);

    return res.status(200).json(project);
  } catch (error: any) {
    if (error.statusCode === 404) {
      return res.status(404).json({
        error: error.message,
        code: error.code,
        details: error.details || {},
      });
    }
    next(error);
  }
});

/**
 * PATCH /api/projects/:id
 * Update a project
 */
router.patch('/:id', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate request body
    let validatedBody;
    try {
      validatedBody = await UpdateProjectSchema.parseAsync(req.body);
    } catch (error) {
      if (error instanceof ZodError) {
        const details: Record<string, string> = {};
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          details[path] = err.message;
        });

        return res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details,
        });
      }
      throw error;
    }

    // Extract user ID from auth (TODO: implement auth middleware)
    let userId = (req as any).userId;
    if (!userId) {
      const testUser = await prisma.user.findUnique({
        where: { email: 'test@example.com' },
      });
      if (!testUser) {
        return res.status(500).json({
          error: 'Test user not found in database',
          code: 'USER_NOT_FOUND',
        });
      }
      userId = testUser.id;
    }

    // Update project
    const project = await projectService.updateProject(req.params.id, userId, validatedBody);

    return res.status(200).json(project);
  } catch (error: any) {
    if (error.statusCode === 400) {
      return res.status(400).json({
        error: error.message,
        code: error.code,
        details: error.details || {},
      });
    }
    if (error.statusCode === 404) {
      return res.status(404).json({
        error: error.message,
        code: error.code,
        details: error.details || {},
      });
    }
    next(error);
  }
});

/**
 * GET /api/projects
 * List projects for the authenticated user
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Validate query params
    let validatedQuery;
    try {
      validatedQuery = await ListProjectsQuerySchema.parseAsync(req.query);
    } catch (error) {
      if (error instanceof ZodError) {
        const details: Record<string, string> = {};
        error.errors.forEach((err) => {
          const path = err.path.join('.');
          details[path] = err.message;
        });

        return res.status(400).json({
          error: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details,
        });
      }
      throw error;
    }

    // Extract user ID from auth (TODO: implement auth middleware)
    let userId = (req as any).userId;
    if (!userId) {
      const testUser = await prisma.user.findUnique({
        where: { email: 'test@example.com' },
      });
      if (!testUser) {
        return res.status(500).json({
          error: 'Test user not found in database',
          code: 'USER_NOT_FOUND',
        });
      }
      userId = testUser.id;
    }

    // List projects
    const result = await projectService.listProjects({
      userId,
      page: validatedQuery.page,
      limit: validatedQuery.limit,
      status: validatedQuery.status,
    });

    return res.status(200).json(result);
  } catch (error: any) {
    if (error.statusCode === 400) {
      return res.status(400).json({
        error: error.message,
        code: error.code,
        details: error.details || {},
      });
    }
    next(error);
  }
});

export default router;
