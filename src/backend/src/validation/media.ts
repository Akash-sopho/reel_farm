import { z } from 'zod';

// Max file size: 10MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Allowed MIME types
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const PresignedUrlQuerySchema = z.object({
  filename: z
    .string()
    .min(1, 'Filename is required')
    .max(255, 'Filename must be less than 255 characters'),
  contentType: z
    .string()
    .refine((ct) => ALLOWED_MIME_TYPES.includes(ct), {
      message: `Content type must be one of: ${ALLOWED_MIME_TYPES.join(', ')}`,
    }),
});

export const ConfirmUploadSchema = z.object({
  key: z.string().min(1, 'Storage key is required'),
});

export const FileUploadValidationSchema = z.object({
  filename: z.string().min(1),
  mimetype: z.string().refine((mt) => ALLOWED_MIME_TYPES.includes(mt), {
    message: `Unsupported file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
  }),
  size: z.number().refine((s) => s <= MAX_FILE_SIZE, {
    message: `File size must not exceed ${MAX_FILE_SIZE / (1024 * 1024)}MB`,
  }),
});

export type PresignedUrlQuery = z.infer<typeof PresignedUrlQuerySchema>;
export type ConfirmUpload = z.infer<typeof ConfirmUploadSchema>;
export type FileUploadValidation = z.infer<typeof FileUploadValidationSchema>;
