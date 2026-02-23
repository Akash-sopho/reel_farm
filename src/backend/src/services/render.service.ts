import prisma from '../lib/prisma';
import { Queue } from 'bullmq';
import { HttpError } from '../middleware/error-handler';

interface TriggerRenderInput {
  projectId: string;
  userId: string;
}

/**
 * Trigger a render for a project
 * Validates project is ready, creates Render record, enqueues BullMQ job
 */
export async function triggerRender(input: TriggerRenderInput, queue: Queue) {
  const { projectId, userId } = input;

  // Get project with all required data
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: { template: true },
  });

  if (!project) {
    throw new HttpError(404, 'Project not found', 'NOT_FOUND', { projectId });
  }

  // Verify ownership
  if (project.userId !== userId) {
    throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED', { projectId });
  }

  // Validate project status
  if (project.status !== 'ready') {
    throw new HttpError(
      409,
      `Project must be in 'ready' status to render. Current status: ${project.status}`,
      'PROJECT_NOT_READY',
      {
        projectId,
        status: project.status,
      }
    );
  }

  // Check for existing active render
  const existingRender = await prisma.render.findFirst({
    where: {
      projectId,
      status: { in: ['PENDING', 'PROCESSING'] },
    },
  });

  if (existingRender) {
    throw new HttpError(
      409,
      'Project already has an active render in progress',
      'ALREADY_RENDERING',
      {
        projectId,
        activeRenderId: existingRender.id,
        activeRenderStatus: existingRender.status,
      }
    );
  }

  // Create Render record
  const render = await prisma.render.create({
    data: {
      projectId,
      userId,
      status: 'PENDING',
    },
  });

  // Enqueue BullMQ job
  const jobData = {
    renderId: render.id,
    projectId,
    userId,
    templateId: project.templateId,
    slotFills: project.slotFills,
    musicUrl: project.musicUrl,
    durationSeconds: project.template.durationSeconds,
    fps: 30, // Default FPS
  };

  const job = await queue.add('render', jobData, {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000, // 5 seconds initial
    },
    removeOnComplete: true,
    removeOnFail: false,
  });

  // Update render with jobId
  const updatedRender = await prisma.render.update({
    where: { id: render.id },
    data: { jobId: job.id ? job.id.toString() : undefined },
  });

  return {
    id: updatedRender.id,
    projectId: updatedRender.projectId,
    userId: updatedRender.userId,
    status: updatedRender.status,
    jobId: updatedRender.jobId,
    createdAt: updatedRender.createdAt,
    updatedAt: updatedRender.updatedAt,
  };
}

/**
 * Get render status
 */
export async function getRenderStatus(renderId: string, userId: string) {
  const render = await prisma.render.findUnique({
    where: { id: renderId },
  });

  if (!render) {
    throw new HttpError(404, 'Render not found', 'NOT_FOUND', { renderId });
  }

  // Verify ownership
  if (render.userId !== userId) {
    throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED', { renderId });
  }

  const response: any = {
    id: render.id,
    projectId: render.projectId,
    userId: render.userId,
    status: render.status,
  };

  if (render.jobId) {
    response.jobId = render.jobId;
  }

  if (render.startedAt) {
    response.startedAt = render.startedAt;
  }

  if (render.status === 'DONE' && render.minioKey) {
    response.minioKey = render.minioKey;
    response.outputUrl = render.outputUrl;
    if (render.fileSizeBytes) {
      response.fileSizeBytes = render.fileSizeBytes;
    }
  }

  if (render.status === 'FAILED') {
    response.errorMessage = render.errorMessage;
    response.errorCode = render.errorCode;
  }

  if (render.completedAt) {
    response.completedAt = render.completedAt;
  }

  response.createdAt = render.createdAt;
  response.updatedAt = render.updatedAt;

  return response;
}

/**
 * Get download URL for a completed render
 */
export async function getDownloadUrl(
  renderId: string,
  userId: string,
  storageService: any
) {
  const render = await prisma.render.findUnique({
    where: { id: renderId },
  });

  if (!render) {
    throw new HttpError(404, 'Render not found', 'NOT_FOUND', { renderId });
  }

  // Verify ownership
  if (render.userId !== userId) {
    throw new HttpError(401, 'Unauthorized', 'UNAUTHORIZED', { renderId });
  }

  if (render.status !== 'DONE') {
    throw new HttpError(
      400,
      `Render is not complete. Current status: ${render.status}`,
      'RENDER_NOT_READY',
      { renderId, status: render.status }
    );
  }

  if (!render.minioKey) {
    throw new HttpError(
      500,
      'Render completed but MinIO key not found',
      'RENDER_INVALID_STATE',
      { renderId }
    );
  }

  // Generate presigned URL
  const downloadUrl = await storageService.getSignedDownloadUrl(render.minioKey, 3600);

  return {
    id: render.id,
    projectId: render.projectId,
    minioKey: render.minioKey,
    downloadUrl,
    expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour from now
    fileSizeBytes: render.fileSizeBytes,
    status: render.status,
  };
}
