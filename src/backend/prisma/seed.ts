import { PrismaClient } from '@prisma/client';
import * as Minio from 'minio';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

// MinIO client for uploading music files
const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000', 10),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

const MINIO_BUCKET = process.env.MINIO_BUCKET || 'reelforge';

/**
 * Create a minimal MP3 file buffer (dummy audio file for development)
 * This is a valid MP3 header + minimal frame data, safe for testing
 */
function createDummyMP3(): Buffer {
  // MP3 frame header: 0xFF 0xFB (sync word + MPEG-1 Layer 3 + no CRC)
  // This creates a minimal valid MP3 file that can be recognized
  const header = Buffer.from([
    0xFF, 0xFB, 0x10, 0x00, // MP3 sync + bitrate info
    0x4C, 0x61, 0x6D, 0x65, // "Lame" encoder tag
  ]);
  // Pad with silence frames (minimal 1KB file)
  const padding = Buffer.alloc(1024, 0);
  return Buffer.concat([header, padding]);
}

/**
 * Ensure MinIO bucket exists
 */
async function ensureBucket(): Promise<void> {
  try {
    const exists = await minioClient.bucketExists(MINIO_BUCKET);
    if (!exists) {
      console.log(`Creating MinIO bucket: ${MINIO_BUCKET}`);
      await minioClient.makeBucket(MINIO_BUCKET, 'us-east-1');
    }
  } catch (error) {
    console.warn(`⚠ Could not ensure bucket exists (MinIO may not be running):`, error instanceof Error ? error.message : error);
  }
}

/**
 * Upload music file to MinIO
 */
async function uploadMusicFile(trackId: string, title: string): Promise<boolean> {
  try {
    const minioKey = `music/${trackId}.mp3`;
    const mp3Buffer = createDummyMP3();

    await minioClient.putObject(MINIO_BUCKET, minioKey, mp3Buffer, mp3Buffer.length, {
      'Content-Type': 'audio/mpeg',
    });

    console.log(`  ↳ Uploaded to MinIO: ${minioKey}`);
    return true;
  } catch (error) {
    console.warn(`  ⚠ Could not upload ${title} to MinIO:`, error instanceof Error ? error.message : error);
    return false;
  }
}

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing templates and music tracks (for development)
  // await prisma.template.deleteMany({});
  // await prisma.musicTrack.deleteMany({});

  // Create test user
  const testUser = await prisma.user.upsert({
    where: { email: 'test@example.com' },
    update: {},
    create: {
      email: 'test@example.com',
      name: 'Test User',
    },
  });
  console.log(`✓ Created/Updated test user: ${testUser.email}`);

  // 1. Photo Dump Template
  const photoTemplate = await prisma.template.upsert({
    where: { slug: 'photo-dump' },
    update: {},
    create: {
      name: 'Photo Dump',
      slug: 'photo-dump',
      category: 'photo-dump',
      tags: ['trending', 'instagram', 'photos', 'fast-paced'],
      description: 'A fast-paced sequence of 5 photos with transitions. Perfect for showcasing multiple moments in 15 seconds.',
      thumbnailUrl: null,
      durationSeconds: 15,
      isPublished: true,
      schema: {
        version: '1.0',
        slots: [
          { id: 'photo-1', type: 'image', label: 'Photo 1', required: true, constraints: { minWidth: 500, minHeight: 500, accept: ['image/jpeg', 'image/png', 'image/webp'] } },
          { id: 'photo-2', type: 'image', label: 'Photo 2', required: true, constraints: { minWidth: 500, minHeight: 500, accept: ['image/jpeg', 'image/png', 'image/webp'] } },
          { id: 'photo-3', type: 'image', label: 'Photo 3', required: true, constraints: { minWidth: 500, minHeight: 500, accept: ['image/jpeg', 'image/png', 'image/webp'] } },
          { id: 'photo-4', type: 'image', label: 'Photo 4', required: true, constraints: { minWidth: 500, minHeight: 500, accept: ['image/jpeg', 'image/png', 'image/webp'] } },
          { id: 'photo-5', type: 'image', label: 'Photo 5', required: true, constraints: { minWidth: 500, minHeight: 500, accept: ['image/jpeg', 'image/png', 'image/webp'] } },
        ],
        scenes: [
          { id: 'scene-1', durationSeconds: 3, components: [{ componentId: 'StaticImage', zIndex: 0, slotBindings: { src: 'photo-1' }, props: { objectFit: 'cover' } }, { componentId: 'FadeTransition', zIndex: 10, slotBindings: {}, props: { durationInFrames: 15 } }] },
          { id: 'scene-2', durationSeconds: 3, components: [{ componentId: 'StaticImage', zIndex: 0, slotBindings: { src: 'photo-2' }, props: { objectFit: 'cover' } }, { componentId: 'FadeTransition', zIndex: 10, slotBindings: {}, props: { durationInFrames: 15 } }] },
          { id: 'scene-3', durationSeconds: 3, components: [{ componentId: 'StaticImage', zIndex: 0, slotBindings: { src: 'photo-3' }, props: { objectFit: 'cover' } }, { componentId: 'FadeTransition', zIndex: 10, slotBindings: {}, props: { durationInFrames: 15 } }] },
          { id: 'scene-4', durationSeconds: 3, components: [{ componentId: 'StaticImage', zIndex: 0, slotBindings: { src: 'photo-4' }, props: { objectFit: 'cover' } }, { componentId: 'FadeTransition', zIndex: 10, slotBindings: {}, props: { durationInFrames: 15 } }] },
          { id: 'scene-5', durationSeconds: 3, components: [{ componentId: 'StaticImage', zIndex: 0, slotBindings: { src: 'photo-5' }, props: { objectFit: 'cover' } }] },
        ],
        audioTags: ['upbeat', 'energetic', 'trendy'],
      },
    },
  });
  console.log(`✓ Template: ${photoTemplate.name}`);

  // 2. Quote Card Template
  const quoteTemplate = await prisma.template.upsert({
    where: { slug: 'quote-card' },
    update: {},
    create: {
      name: 'Quote Card',
      slug: 'quote-card',
      category: 'quote',
      tags: ['trending', 'quotes', 'motivation', 'text'],
      description: 'An inspiring quote with smooth fade-in animation on a background image. Perfect for motivational content.',
      thumbnailUrl: null,
      durationSeconds: 10,
      isPublished: true,
      schema: {
        version: '1.0',
        slots: [
          { id: 'quote-text', type: 'text', label: 'Quote Text', required: true, placeholder: 'Enter your quote here', constraints: { maxLength: 150 } },
          { id: 'author-name', type: 'text', label: 'Author Name', required: false, placeholder: 'e.g., Steve Jobs', constraints: { maxLength: 50 } },
          { id: 'background-image', type: 'image', label: 'Background Image', required: false, constraints: { minWidth: 500, minHeight: 500, accept: ['image/jpeg', 'image/png', 'image/webp'] } },
        ],
        scenes: [
          {
            id: 'scene-1',
            durationSeconds: 10,
            components: [
              { componentId: 'StaticImage', zIndex: 0, slotBindings: { src: 'background-image' }, props: { opacity: 0.6, objectFit: 'cover' } },
              { componentId: 'AnimatedText', zIndex: 1, slotBindings: { text: 'quote-text' }, props: { fontSize: 52, color: '#FFFFFF', fontWeight: 'bold', animationType: 'fade', delay: 15 } },
              { componentId: 'AnimatedText', zIndex: 2, slotBindings: { text: 'author-name' }, props: { fontSize: 28, color: '#E0E0E0', fontWeight: 'normal', animationType: 'fade', delay: 75 } },
            ],
          },
        ],
        audioTags: ['calm', 'inspirational', 'motivational', 'deep'],
      },
    },
  });
  console.log(`✓ Template: ${quoteTemplate.name}`);

  // 3. Product Showcase Template
  const productTemplate = await prisma.template.upsert({
    where: { slug: 'product-showcase' },
    update: {},
    create: {
      name: 'Product Showcase',
      slug: 'product-showcase',
      category: 'product',
      tags: ['trending', 'product', 'ecommerce', 'promotion'],
      description: 'Showcase a product with 3 feature scenes. Each scene highlights a different aspect with text overlay.',
      thumbnailUrl: null,
      durationSeconds: 12,
      isPublished: true,
      schema: {
        version: '1.0',
        slots: [
          { id: 'product-image', type: 'image', label: 'Product Image', required: true, constraints: { minWidth: 500, minHeight: 500, accept: ['image/jpeg', 'image/png', 'image/webp'] } },
          { id: 'feature-1-text', type: 'text', label: 'Feature 1', required: true, placeholder: 'e.g., Premium Quality', constraints: { maxLength: 50 } },
          { id: 'feature-2-text', type: 'text', label: 'Feature 2', required: true, placeholder: 'e.g., Best Price', constraints: { maxLength: 50 } },
          { id: 'feature-3-text', type: 'text', label: 'Feature 3', required: true, placeholder: 'e.g., Fast Shipping', constraints: { maxLength: 50 } },
          { id: 'cta-text', type: 'text', label: 'Call-to-Action', required: false, placeholder: 'e.g., Shop Now', constraints: { maxLength: 40 } },
        ],
        scenes: [
          {
            id: 'scene-1',
            durationSeconds: 4,
            components: [
              { componentId: 'KenBurnsImage', zIndex: 0, slotBindings: { src: 'product-image' }, props: { direction: 'in', scale: 1.1 } },
              { componentId: 'AnimatedText', zIndex: 1, slotBindings: { text: 'feature-1-text' }, props: { fontSize: 44, color: '#FFFFFF', animationType: 'slide-up', delay: 10 } },
            ],
          },
          {
            id: 'scene-2',
            durationSeconds: 4,
            components: [
              { componentId: 'KenBurnsImage', zIndex: 0, slotBindings: { src: 'product-image' }, props: { direction: 'out', scale: 1.08 } },
              { componentId: 'AnimatedText', zIndex: 1, slotBindings: { text: 'feature-2-text' }, props: { fontSize: 44, color: '#FFEB3B', animationType: 'slide-up', delay: 10 } },
            ],
          },
          {
            id: 'scene-3',
            durationSeconds: 4,
            components: [
              { componentId: 'StaticImage', zIndex: 0, slotBindings: { src: 'product-image' }, props: { objectFit: 'cover' } },
              { componentId: 'AnimatedText', zIndex: 1, slotBindings: { text: 'feature-3-text' }, props: { fontSize: 44, color: '#4CAF50', animationType: 'fade', delay: 10 } },
              { componentId: 'AnimatedText', zIndex: 2, slotBindings: { text: 'cta-text' }, props: { fontSize: 36, color: '#FFFFFF', fontWeight: 'bold', animationType: 'fade', delay: 45 } },
            ],
          },
        ],
        audioTags: ['upbeat', 'promotional', 'trendy', 'energetic'],
      },
    },
  });
  console.log(`✓ Template: ${productTemplate.name}`);

  // 4. Listicle Template
  const listicleTemplate = await prisma.template.upsert({
    where: { slug: 'listicle' },
    update: {},
    create: {
      name: 'Listicle - Top 5',
      slug: 'listicle',
      category: 'listicle',
      tags: ['trending', 'list', 'top5', 'education'],
      description: 'A numbered listicle with 5 items. Each item gets its own scene with animated text reveal.',
      thumbnailUrl: null,
      durationSeconds: 15,
      isPublished: true,
      schema: {
        version: '1.0',
        slots: [
          { id: 'title-text', type: 'text', label: 'Title', required: true, placeholder: 'e.g., Top 5 Tips', constraints: { maxLength: 50 } },
          { id: 'item-1', type: 'text', label: 'Item 1', required: true, placeholder: 'First item', constraints: { maxLength: 80 } },
          { id: 'item-2', type: 'text', label: 'Item 2', required: true, placeholder: 'Second item', constraints: { maxLength: 80 } },
          { id: 'item-3', type: 'text', label: 'Item 3', required: true, placeholder: 'Third item', constraints: { maxLength: 80 } },
          { id: 'item-4', type: 'text', label: 'Item 4', required: false, placeholder: 'Fourth item', constraints: { maxLength: 80 } },
          { id: 'item-5', type: 'text', label: 'Item 5', required: false, placeholder: 'Fifth item', constraints: { maxLength: 80 } },
        ],
        scenes: [
          {
            id: 'title-scene',
            durationSeconds: 3,
            components: [
              { componentId: 'AnimatedText', zIndex: 0, slotBindings: { text: 'title-text' }, props: { fontSize: 60, color: '#FFFFFF', fontWeight: 'bold', animationType: 'fade' } },
            ],
          },
          {
            id: 'item-1-scene',
            durationSeconds: 2.4,
            components: [
              { componentId: 'TypewriterText', zIndex: 0, slotBindings: { text: 'item-1' }, props: { fontSize: 40, color: '#FF6B6B' } },
            ],
          },
          {
            id: 'item-2-scene',
            durationSeconds: 2.4,
            components: [
              { componentId: 'TypewriterText', zIndex: 0, slotBindings: { text: 'item-2' }, props: { fontSize: 40, color: '#4ECDC4' } },
            ],
          },
          {
            id: 'item-3-scene',
            durationSeconds: 2.4,
            components: [
              { componentId: 'TypewriterText', zIndex: 0, slotBindings: { text: 'item-3' }, props: { fontSize: 40, color: '#45B7D1' } },
            ],
          },
          {
            id: 'item-4-scene',
            durationSeconds: 2.4,
            components: [
              { componentId: 'TypewriterText', zIndex: 0, slotBindings: { text: 'item-4' }, props: { fontSize: 40, color: '#FFA07A' } },
            ],
          },
          {
            id: 'item-5-scene',
            durationSeconds: 2.4,
            components: [
              { componentId: 'TypewriterText', zIndex: 0, slotBindings: { text: 'item-5' }, props: { fontSize: 40, color: '#98D8C8' } },
            ],
          },
        ],
        audioTags: ['upbeat', 'educational', 'informative', 'energetic'],
      },
    },
  });
  console.log(`✓ Template: ${listicleTemplate.name}`);

  // 5. Travel Montage Template
  const travelTemplate = await prisma.template.upsert({
    where: { slug: 'travel-montage' },
    update: {},
    create: {
      name: 'Travel Montage',
      slug: 'travel-montage',
      category: 'travel',
      tags: ['trending', 'travel', 'adventure', 'lifestyle'],
      description: 'A scenic travel montage with 5 destination photos and location names. Perfect for travel vlogging.',
      thumbnailUrl: null,
      durationSeconds: 20,
      isPublished: true,
      schema: {
        version: '1.0',
        slots: [
          { id: 'destination-1-image', type: 'image', label: 'Destination 1 Photo', required: true, constraints: { minWidth: 500, minHeight: 500, accept: ['image/jpeg', 'image/png', 'image/webp'] } },
          { id: 'destination-1-name', type: 'text', label: 'Destination 1 Name', required: false, placeholder: 'e.g., Paris, France', constraints: { maxLength: 50 } },
          { id: 'destination-2-image', type: 'image', label: 'Destination 2 Photo', required: true, constraints: { minWidth: 500, minHeight: 500, accept: ['image/jpeg', 'image/png', 'image/webp'] } },
          { id: 'destination-2-name', type: 'text', label: 'Destination 2 Name', required: false, placeholder: 'e.g., Tokyo, Japan', constraints: { maxLength: 50 } },
          { id: 'destination-3-image', type: 'image', label: 'Destination 3 Photo', required: true, constraints: { minWidth: 500, minHeight: 500, accept: ['image/jpeg', 'image/png', 'image/webp'] } },
          { id: 'destination-3-name', type: 'text', label: 'Destination 3 Name', required: false, placeholder: 'e.g., Rome, Italy', constraints: { maxLength: 50 } },
        ],
        scenes: [
          {
            id: 'scene-1',
            durationSeconds: 6,
            components: [
              { componentId: 'KenBurnsImage', zIndex: 0, slotBindings: { src: 'destination-1-image' }, props: { direction: 'in', scale: 1.1 } },
              { componentId: 'AnimatedText', zIndex: 1, slotBindings: { text: 'destination-1-name' }, props: { fontSize: 48, color: '#FFFFFF', fontWeight: 'bold', animationType: 'slide-up', delay: 60 } },
            ],
          },
          {
            id: 'scene-2',
            durationSeconds: 7,
            components: [
              { componentId: 'KenBurnsImage', zIndex: 0, slotBindings: { src: 'destination-2-image' }, props: { direction: 'out', scale: 1.12 } },
              { componentId: 'AnimatedText', zIndex: 1, slotBindings: { text: 'destination-2-name' }, props: { fontSize: 48, color: '#FFFFFF', fontWeight: 'bold', animationType: 'fade', delay: 90 } },
            ],
          },
          {
            id: 'scene-3',
            durationSeconds: 7,
            components: [
              { componentId: 'KenBurnsImage', zIndex: 0, slotBindings: { src: 'destination-3-image' }, props: { direction: 'in', scale: 1.08 } },
              { componentId: 'AnimatedText', zIndex: 1, slotBindings: { text: 'destination-3-name' }, props: { fontSize: 48, color: '#FFFFFF', fontWeight: 'bold', animationType: 'slide-up', delay: 90 } },
            ],
          },
        ],
        audioTags: ['cinematic', 'travel', 'relaxing', 'inspiring'],
      },
    },
  });
  console.log(`✓ Template: ${travelTemplate.name}`);

  // 6. Motivational Template
  const motivationalTemplate = await prisma.template.upsert({
    where: { slug: 'motivational' },
    update: {},
    create: {
      name: 'Motivational Impact',
      slug: 'motivational',
      category: 'motivational',
      tags: ['trending', 'motivation', 'inspiration', 'text'],
      description: 'A powerful single-screen motivational message with a background image and film grain effect.',
      thumbnailUrl: null,
      durationSeconds: 8,
      isPublished: true,
      schema: {
        version: '1.0',
        slots: [
          { id: 'message-text', type: 'text', label: 'Motivational Message', required: true, placeholder: 'Enter your message', constraints: { maxLength: 100 } },
          { id: 'background-image', type: 'image', label: 'Background Image', required: false, constraints: { minWidth: 500, minHeight: 500, accept: ['image/jpeg', 'image/png', 'image/webp'] } },
        ],
        scenes: [
          {
            id: 'scene-1',
            durationSeconds: 8,
            components: [
              { componentId: 'StaticImage', zIndex: 0, slotBindings: { src: 'background-image' }, props: { opacity: 0.5, objectFit: 'cover' } },
              { componentId: 'AnimatedText', zIndex: 1, slotBindings: { text: 'message-text' }, props: { fontSize: 56, color: '#FFFFFF', fontWeight: 'bold', textAlign: 'center', animationType: 'fade', delay: 30 } },
              { componentId: 'GrainOverlay', zIndex: 100, slotBindings: {}, props: { opacity: 0.15, size: 2 } },
            ],
          },
        ],
        audioTags: ['motivational', 'inspiring', 'powerful', 'epic'],
      },
    },
  });
  console.log(`✓ Template: ${motivationalTemplate.name}`);

  // 7. Before & After Template
  const beforeAfterTemplate = await prisma.template.upsert({
    where: { slug: 'before-after' },
    update: {},
    create: {
      name: 'Before & After',
      slug: 'before-after',
      category: 'before-after',
      tags: ['trending', 'transformation', 'comparison', 'results'],
      description: 'A split-screen transformation video showing before and after with text labels.',
      thumbnailUrl: null,
      durationSeconds: 12,
      isPublished: true,
      schema: {
        version: '1.0',
        slots: [
          { id: 'before-image', type: 'image', label: 'Before Image', required: true, constraints: { minWidth: 500, minHeight: 500, accept: ['image/jpeg', 'image/png', 'image/webp'] } },
          { id: 'after-image', type: 'image', label: 'After Image', required: true, constraints: { minWidth: 500, minHeight: 500, accept: ['image/jpeg', 'image/png', 'image/webp'] } },
          { id: 'before-label', type: 'text', label: 'Before Label', required: false, placeholder: 'Before', constraints: { maxLength: 30 } },
          { id: 'after-label', type: 'text', label: 'After Label', required: false, placeholder: 'After', constraints: { maxLength: 30 } },
        ],
        scenes: [
          {
            id: 'before-scene',
            durationSeconds: 6,
            components: [
              { componentId: 'StaticImage', zIndex: 0, slotBindings: { src: 'before-image' }, props: { objectFit: 'cover' } },
              { componentId: 'AnimatedText', zIndex: 1, slotBindings: { text: 'before-label' }, props: { fontSize: 44, color: '#FFFFFF', fontWeight: 'bold', animationType: 'fade', delay: 30 } },
            ],
          },
          {
            id: 'after-scene',
            durationSeconds: 6,
            components: [
              { componentId: 'StaticImage', zIndex: 0, slotBindings: { src: 'after-image' }, props: { objectFit: 'cover' } },
              { componentId: 'AnimatedText', zIndex: 1, slotBindings: { text: 'after-label' }, props: { fontSize: 44, color: '#4CAF50', fontWeight: 'bold', animationType: 'fade', delay: 30 } },
            ],
          },
        ],
        audioTags: ['upbeat', 'transformational', 'inspiring', 'promotional'],
      },
    },
  });
  console.log(`✓ Template: ${beforeAfterTemplate.name}`);

  // 8. Day in My Life Template
  const dayInLifeTemplate = await prisma.template.upsert({
    where: { slug: 'day-in-life' },
    update: {},
    create: {
      name: 'Day in My Life',
      slug: 'day-in-life',
      category: 'lifestyle',
      tags: ['trending', 'lifestyle', 'daily', 'vlog'],
      description: 'A lifestyle vlog showing 5 moments in a day with time labels and descriptions.',
      thumbnailUrl: null,
      durationSeconds: 25,
      isPublished: true,
      schema: {
        version: '1.0',
        slots: [
          { id: 'morning-image', type: 'image', label: 'Morning Activity', required: true, constraints: { minWidth: 500, minHeight: 500, accept: ['image/jpeg', 'image/png', 'image/webp'] } },
          { id: 'morning-text', type: 'text', label: 'Morning Description', required: false, placeholder: 'e.g., 6:00 AM - Morning Workout', constraints: { maxLength: 60 } },
          { id: 'midday-image', type: 'image', label: 'Midday Activity', required: true, constraints: { minWidth: 500, minHeight: 500, accept: ['image/jpeg', 'image/png', 'image/webp'] } },
          { id: 'midday-text', type: 'text', label: 'Midday Description', required: false, placeholder: 'e.g., 12:00 PM - Lunch Break', constraints: { maxLength: 60 } },
          { id: 'evening-image', type: 'image', label: 'Evening Activity', required: true, constraints: { minWidth: 500, minHeight: 500, accept: ['image/jpeg', 'image/png', 'image/webp'] } },
          { id: 'evening-text', type: 'text', label: 'Evening Description', required: false, placeholder: 'e.g., 5:00 PM - Creative Time', constraints: { maxLength: 60 } },
        ],
        scenes: [
          {
            id: 'morning-scene',
            durationSeconds: 8,
            components: [
              { componentId: 'KenBurnsImage', zIndex: 0, slotBindings: { src: 'morning-image' }, props: { direction: 'in', scale: 1.08 } },
              { componentId: 'AnimatedText', zIndex: 1, slotBindings: { text: 'morning-text' }, props: { fontSize: 40, color: '#FFFFFF', animationType: 'slide-up', delay: 45 } },
            ],
          },
          {
            id: 'midday-scene',
            durationSeconds: 8,
            components: [
              { componentId: 'KenBurnsImage', zIndex: 0, slotBindings: { src: 'midday-image' }, props: { direction: 'out', scale: 1.1 } },
              { componentId: 'AnimatedText', zIndex: 1, slotBindings: { text: 'midday-text' }, props: { fontSize: 40, color: '#FFEB3B', animationType: 'fade', delay: 45 } },
            ],
          },
          {
            id: 'evening-scene',
            durationSeconds: 9,
            components: [
              { componentId: 'KenBurnsImage', zIndex: 0, slotBindings: { src: 'evening-image' }, props: { direction: 'in', scale: 1.09 } },
              { componentId: 'AnimatedText', zIndex: 1, slotBindings: { text: 'evening-text' }, props: { fontSize: 40, color: '#9C27B0', animationType: 'slide-up', delay: 50 } },
            ],
          },
        ],
        audioTags: ['lifestyle', 'vlog', 'relaxing', 'inspiring'],
      },
    },
  });
  console.log(`✓ Template: ${dayInLifeTemplate.name}`);

  // Ensure MinIO bucket exists
  await ensureBucket();

  // Seed 20 music tracks (4 per mood, distributed across genres)
  const musicTracks = [
    // Happy (4 tracks): pop, pop, acoustic, acoustic
    { title: 'Summer Vibes', artist: 'The Sunshine Band', durationSeconds: 180, bpm: 120, mood: 'happy', genre: 'pop', tags: ['upbeat', 'summer', 'positive'] },
    { title: 'Golden Hour', artist: 'Bright Melodies', durationSeconds: 195, bpm: 115, mood: 'happy', genre: 'pop', tags: ['upbeat', 'feel-good', 'trending'] },
    { title: 'Acoustic Sunrise', artist: 'Folk Harmony', durationSeconds: 240, bpm: 100, mood: 'happy', genre: 'acoustic', tags: ['upbeat', 'acoustic', 'peaceful'] },
    { title: 'Gentle Guitar Days', artist: 'Acoustic Dreams', durationSeconds: 210, bpm: 95, mood: 'happy', genre: 'acoustic', tags: ['happy', 'acoustic', 'relaxing'] },

    // Sad (4 tracks): cinematic, cinematic, acoustic, ambient
    { title: 'Lost in Time', artist: 'Cinematic Waves', durationSeconds: 240, bpm: 70, mood: 'sad', genre: 'cinematic', tags: ['cinematic', 'emotional', 'dramatic'] },
    { title: 'Rain and Reflections', artist: 'Emotional Strings', durationSeconds: 210, bpm: 65, mood: 'sad', genre: 'cinematic', tags: ['sad', 'emotional', 'introspective'] },
    { title: 'Melancholy Echoes', artist: 'Acoustic Sadness', durationSeconds: 180, bpm: 60, mood: 'sad', genre: 'acoustic', tags: ['sad', 'acoustic', 'melancholic'] },
    { title: 'Deep Blue Dreams', artist: 'Ambient Sorrow', durationSeconds: 300, bpm: 55, mood: 'sad', genre: 'ambient', tags: ['sad', 'ambient', 'meditative'] },

    // Energetic (4 tracks): electronic, hip-hop, pop, hip-hop
    { title: 'Electric Energy', artist: 'Synth Pulse', durationSeconds: 210, bpm: 135, mood: 'energetic', genre: 'electronic', tags: ['energetic', 'electronic', 'hype'] },
    { title: 'Beat Drop', artist: 'Hip Hop Masters', durationSeconds: 180, bpm: 95, mood: 'energetic', genre: 'hip-hop', tags: ['energetic', 'hip-hop', 'hype'] },
    { title: 'High Octane Rush', artist: 'Electric Pop', durationSeconds: 195, bpm: 140, mood: 'energetic', genre: 'pop', tags: ['energetic', 'pop', 'action'] },
    { title: 'Turbo Flow', artist: 'Hip Hop Beats', durationSeconds: 200, bpm: 100, mood: 'energetic', genre: 'hip-hop', tags: ['energetic', 'hip-hop', 'trendy'] },

    // Calm (4 tracks): ambient, ambient, acoustic, ambient
    { title: 'Peaceful Waters', artist: 'Ambient Zen', durationSeconds: 300, bpm: 50, mood: 'calm', genre: 'ambient', tags: ['calm', 'ambient', 'relaxing'] },
    { title: 'Gentle Breeze', artist: 'Serenity Sounds', durationSeconds: 280, bpm: 60, mood: 'calm', genre: 'ambient', tags: ['calm', 'ambient', 'soothing'] },
    { title: 'Acoustic Tranquility', artist: 'Folk Serenity', durationSeconds: 240, bpm: 75, mood: 'calm', genre: 'acoustic', tags: ['calm', 'acoustic', 'peaceful'] },
    { title: 'Meditative Spaces', artist: 'Zen Ambient', durationSeconds: 350, bpm: 45, mood: 'calm', genre: 'ambient', tags: ['calm', 'ambient', 'meditation'] },

    // Neutral (4 tracks): electronic, ambient, acoustic, pop
    { title: 'Neutral Ground', artist: 'Electronic Muse', durationSeconds: 200, bpm: 110, mood: 'neutral', genre: 'electronic', tags: ['neutral', 'electronic', 'background'] },
    { title: 'Background Vibes', artist: 'Ambient Neutral', durationSeconds: 280, bpm: 70, mood: 'neutral', genre: 'ambient', tags: ['neutral', 'ambient', 'background'] },
    { title: 'Acoustic Standard', artist: 'Folk Standard', durationSeconds: 210, bpm: 100, mood: 'neutral', genre: 'acoustic', tags: ['neutral', 'acoustic', 'standard'] },
    { title: 'Pop Standard', artist: 'Pop Vibes', durationSeconds: 180, bpm: 120, mood: 'neutral', genre: 'pop', tags: ['neutral', 'pop', 'standard'] },
  ];

  console.log('🎵 Seeding 20 music tracks...');
  for (const trackData of musicTracks) {
    const track = await prisma.musicTrack.upsert({
      where: { title: trackData.title },
      update: {},
      create: {
        title: trackData.title,
        artist: trackData.artist,
        url: `music/${trackData.title.toLowerCase().replace(/\s+/g, '-')}.mp3`,
        durationSeconds: trackData.durationSeconds,
        bpm: trackData.bpm,
        mood: trackData.mood,
        genre: trackData.genre,
        tags: trackData.tags,
        isActive: true,
      },
    });

    // Upload to MinIO
    await uploadMusicFile(track.id, track.title);
  }

  console.log('✅ Database seeded successfully with 8 templates and 20 music tracks!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
