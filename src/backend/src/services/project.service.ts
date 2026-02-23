import prisma from '../lib/prisma';
import { Prisma } from '@prisma/client';

interface CreateProjectInput {
  templateId: string;
  name?: string;
  userId: string;
}

interface UpdateProjectInput {
  slotFills?: Array<{ slotId: string; type: string; value: string }>;
  musicUrl?: string | null;
  name?: string;
  settings?: Record<string, unknown>;
}

interface ListProjectsInput {
  userId: string;
  page?: number;
  limit?: number;
  status?: string;
}

/**
 * Get template with full schema
 */
async function getTemplateWithSchema(templateId: string) {
  const template = await prisma.template.findUnique({
    where: { id: templateId },
  });

  if (!template) {
    return null;
  }

  // Parse the template schema JSON
  const schema = template.schema as any;

  return {
    id: template.id,
    name: template.name,
    slug: template.slug,
    category: template.category,
    tags: template.tags,
    schema,
    durationSeconds: template.durationSeconds,
    isPublished: template.isPublished,
    createdAt: template.createdAt,
    updatedAt: template.updatedAt,
  };
}

/**
 * Calculate filled slots and required slots
 */
function calculateSlotStatus(template: any, slotFills: any[]) {
  const slots = (template.schema?.slots as any[]) || [];
  const requiredSlots = slots.filter((s: any) => s.required).length;

  // Count filled required slots
  let filledSlots = 0;
  const fillMap = new Map(slotFills.map((f: any) => [f.slotId, f.value]));

  for (const slot of slots) {
    if (slot.required) {
      const value = fillMap.get(slot.id);
      if (value) {
        // Check if value is "filled" based on type
        const slotType = (slot as any).type;
        if (slotType === 'text') {
          if (typeof value === 'string' && value.trim().length > 0) {
            filledSlots++;
          }
        } else if (slotType === 'image' || slotType === 'video' || slotType === 'audio') {
          if (typeof value === 'string' && value.length > 0) {
            filledSlots++;
          }
        }
      }
    }
  }

  return { filledSlots, requiredSlots };
}

/**
 * Determine project status based on slot fills
 */
function determineStatus(filledSlots: number, requiredSlots: number): string {
  return filledSlots >= requiredSlots ? 'ready' : 'draft';
}

/**
 * Validate slot fills against template schema
 */
function validateSlotFills(template: any, slotFills: Array<{ slotId: string; type: string; value: string }>) {
  const slots = (template.schema?.slots as any[]) || [];
  const slotsMap = new Map<string, any>(slots.map((s: any) => [s.id, s]));

  const errors: Record<string, string> = {};

  for (let i = 0; i < slotFills.length; i++) {
    const fill = slotFills[i];
    const slot = slotsMap.get(fill.slotId) as any;

    // Check if slot exists
    if (!slot) {
      errors[`slotFills[${i}].slotId`] = `Slot '${fill.slotId}' does not exist in template`;
      continue;
    }

    // Check if type matches
    const slotType = slot.type;
    if (fill.type !== slotType) {
      errors[`slotFills[${i}].type`] = `Slot '${fill.slotId}' expects type '${slotType}', got '${fill.type}'`;
      continue;
    }

    // Validate value based on type
    if (fill.type === 'text') {
      if (typeof fill.value !== 'string' || fill.value.trim().length === 0) {
        errors[`slotFills[${i}].value`] = `Invalid value for slot '${fill.slotId}': expected non-empty string`;
      }
    } else if (fill.type === 'image' || fill.type === 'video' || fill.type === 'audio') {
      if (typeof fill.value !== 'string' || fill.value.length === 0) {
        errors[`slotFills[${i}].value`] = `Invalid value for slot '${fill.slotId}': expected non-empty URL`;
      }
      // Very basic URL validation
      if (!fill.value.startsWith('http://') && !fill.value.startsWith('https://') && !fill.value.startsWith('s3://')) {
        errors[`slotFills[${i}].value`] = `Invalid value for slot '${fill.slotId}': expected valid URL`;
      }
    }
  }

  return errors;
}

/**
 * Create a new project from a template
 */
export async function createProject(input: CreateProjectInput) {
  const { templateId, name, userId } = input;

  // Get template to validate it exists
  const template = await getTemplateWithSchema(templateId);
  if (!template) {
    throw {
      message: 'Template not found',
      code: 'TEMPLATE_NOT_FOUND',
      statusCode: 404,
    };
  }

  // Generate project name if not provided
  const projectName = name || `${template.name} - ${new Date().toISOString().split('T')[0]}`;

  // Create project
  const project = await prisma.project.create({
    data: {
      userId,
      templateId,
      name: projectName,
      slotFills: [],
      status: 'draft',
      settings: {},
    },
  });

  // Calculate slot status
  const { filledSlots, requiredSlots } = calculateSlotStatus(template, []);

  return {
    ...project,
    template,
    filledSlots,
    requiredSlots,
  };
}

/**
 * Get a project by ID
 */
export async function getProject(projectId: string, userId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project || project.userId !== userId) {
    throw {
      message: 'Project not found',
      code: 'NOT_FOUND',
      statusCode: 404,
    };
  }

  // Get template
  const template = await getTemplateWithSchema(project.templateId);
  if (!template) {
    throw {
      message: 'Associated template not found',
      code: 'TEMPLATE_NOT_FOUND',
      statusCode: 404,
    };
  }

  // Parse slot fills
  const slotFills = project.slotFills as any[];

  // Calculate slot status
  const { filledSlots, requiredSlots } = calculateSlotStatus(template, slotFills);

  return {
    ...project,
    template,
    filledSlots,
    requiredSlots,
  };
}

/**
 * Update a project
 */
export async function updateProject(projectId: string, userId: string, input: UpdateProjectInput) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
  });

  if (!project || project.userId !== userId) {
    throw {
      message: 'Project not found',
      code: 'NOT_FOUND',
      statusCode: 404,
    };
  }

  // Get template for validation
  const template = await getTemplateWithSchema(project.templateId);
  if (!template) {
    throw {
      message: 'Associated template not found',
      code: 'TEMPLATE_NOT_FOUND',
      statusCode: 404,
    };
  }

  // Validate slot fills if provided
  let slotFills = project.slotFills as any[];
  if (input.slotFills !== undefined) {
    const errors = validateSlotFills(template, input.slotFills);
    if (Object.keys(errors).length > 0) {
      throw {
        message: 'Validation failed',
        code: 'VALIDATION_ERROR',
        statusCode: 400,
        details: errors,
      };
    }
    slotFills = input.slotFills;
  }

  // Calculate new status
  const { filledSlots, requiredSlots } = calculateSlotStatus(template, slotFills);
  const newStatus = determineStatus(filledSlots, requiredSlots);

  // Update project
  const updateData: Prisma.ProjectUpdateInput = {};

  if (input.slotFills !== undefined) {
    updateData.slotFills = input.slotFills;
    updateData.status = newStatus;
  }

  if (input.musicUrl !== undefined) {
    updateData.musicUrl = input.musicUrl;
  }

  if (input.name !== undefined) {
    updateData.name = input.name;
  }

  if (input.settings !== undefined) {
    updateData.settings = input.settings as any;
  }

  const updatedProject = await prisma.project.update({
    where: { id: projectId },
    data: updateData,
  });

  return {
    ...updatedProject,
    template,
    filledSlots,
    requiredSlots,
  };
}

/**
 * List projects for a user
 */
export async function listProjects(input: ListProjectsInput) {
  const { userId, page = 1, limit = 20, status } = input;

  // Validate pagination
  if (page < 1) {
    throw {
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      details: { page: 'page must be >= 1' },
    };
  }

  if (limit < 1 || limit > 100) {
    throw {
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      details: { limit: 'limit must be between 1 and 100' },
    };
  }

  const skip = (page - 1) * limit;

  // Build where clause
  const where: Prisma.ProjectWhereInput = { userId };
  if (status) {
    where.status = status;
  }

  // Query
  const [projects, total] = await Promise.all([
    prisma.project.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.project.count({ where }),
  ]);

  // Get templates for all projects
  const templateIds = [...new Set(projects.map((p) => p.templateId))];
  const templates = await Promise.all(templateIds.map((id) => getTemplateWithSchema(id)));
  const templateMap = new Map(templates.map((t) => [t?.id, t]));

  // Enrich projects with templates and slot status
  const enrichedProjects = projects.map((project) => {
    const template = templateMap.get(project.templateId);
    if (!template) {
      return project;
    }

    const slotFills = project.slotFills as any[];
    const { filledSlots, requiredSlots } = calculateSlotStatus(template, slotFills);

    return {
      ...project,
      filledSlots,
      requiredSlots,
    };
  });

  const pages = Math.ceil(total / limit);

  return {
    data: enrichedProjects,
    total,
    page,
    limit,
    pages,
  };
}
