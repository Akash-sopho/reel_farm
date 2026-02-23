import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clear existing data (optional - for development)
  // await prisma.$executeRawUnsafe('TRUNCATE TABLE "User" CASCADE;');

  // Create test user
  const testUser = await prisma.user.create({
    data: {
      email: 'test@example.com',
      name: 'Test User',
    },
  });
  console.log(`✓ Created test user: ${testUser.email}`);

  // Create placeholder templates
  const photoTemplate = await prisma.template.create({
    data: {
      name: 'Photo Dump',
      slug: 'photo-dump',
      category: 'photo-dump',
      tags: ['trending', 'instagram', 'photos'],
      description: 'A fast-paced sequence of photos with transitions and text overlays.',
      thumbnailUrl: null,
      durationSeconds: 15,
      isPublished: true,
      schema: {
        version: '1.0',
        slots: [
          {
            id: 'photo-1',
            type: 'image',
            label: 'Photo 1',
            required: true,
            constraints: {
              minWidth: 1080,
              minHeight: 1920,
              accept: ['image/jpeg', 'image/png', 'image/webp'],
            },
          },
          {
            id: 'photo-2',
            type: 'image',
            label: 'Photo 2',
            required: true,
            constraints: {
              minWidth: 1080,
              minHeight: 1920,
              accept: ['image/jpeg', 'image/png', 'image/webp'],
            },
          },
          {
            id: 'photo-3',
            type: 'image',
            label: 'Photo 3',
            required: true,
            constraints: {
              minWidth: 1080,
              minHeight: 1920,
              accept: ['image/jpeg', 'image/png', 'image/webp'],
            },
          },
          {
            id: 'title-text',
            type: 'text',
            label: 'Title Text',
            required: false,
            placeholder: 'Enter title text',
            constraints: { maxLength: 100 },
          },
        ],
        scenes: [
          {
            id: 'scene-1',
            durationSeconds: 5,
            components: [
              {
                componentId: 'StaticImage',
                zIndex: 0,
                slotBindings: { image: 'photo-1' },
                props: {},
              },
            ],
          },
          {
            id: 'scene-2',
            durationSeconds: 5,
            components: [
              {
                componentId: 'StaticImage',
                zIndex: 0,
                slotBindings: { image: 'photo-2' },
                props: {},
              },
            ],
          },
          {
            id: 'scene-3',
            durationSeconds: 5,
            components: [
              {
                componentId: 'StaticImage',
                zIndex: 0,
                slotBindings: { image: 'photo-3' },
                props: {},
              },
            ],
          },
        ],
        transitions: ['FadeTransition'],
        audioTags: ['upbeat', 'energetic'],
      },
    },
  });
  console.log(`✓ Created template: ${photoTemplate.name}`);

  const quoteTemplate = await prisma.template.create({
    data: {
      name: 'Quote Card',
      slug: 'quote-card',
      category: 'quote-card',
      tags: ['trending', 'quotes', 'motivation'],
      description: 'An animated quote displayed on a beautiful gradient background with smooth transitions.',
      thumbnailUrl: null,
      durationSeconds: 8,
      isPublished: true,
      schema: {
        version: '1.0',
        slots: [
          {
            id: 'quote-text',
            type: 'text',
            label: 'Quote Text',
            required: true,
            placeholder: 'Enter quote text',
            constraints: { maxLength: 200 },
          },
          {
            id: 'author-text',
            type: 'text',
            label: 'Author Name',
            required: false,
            placeholder: 'Enter author name',
            constraints: { maxLength: 100 },
          },
          {
            id: 'background-image',
            type: 'image',
            label: 'Background Image',
            required: false,
            constraints: {
              minWidth: 1080,
              minHeight: 1920,
              accept: ['image/jpeg', 'image/png', 'image/webp'],
            },
          },
        ],
        scenes: [
          {
            id: 'scene-1',
            durationSeconds: 8,
            components: [
              {
                componentId: 'StaticImage',
                zIndex: 0,
                slotBindings: { image: 'background-image' },
                props: { opacity: 0.7 },
              },
              {
                componentId: 'AnimatedText',
                zIndex: 1,
                slotBindings: { text: 'quote-text' },
                props: { fontSize: 48, color: '#FFFFFF', duration: 8 },
              },
              {
                componentId: 'AnimatedText',
                zIndex: 2,
                slotBindings: { text: 'author-text' },
                props: { fontSize: 24, color: '#CCCCCC', duration: 8, delay: 4 },
              },
            ],
          },
        ],
        audioTags: ['calm', 'inspirational', 'motivational'],
      },
    },
  });
  console.log(`✓ Created template: ${quoteTemplate.name}`);

  const storiesTemplate = await prisma.template.create({
    data: {
      name: 'Stories Carousel',
      slug: 'stories-carousel',
      category: 'stories',
      tags: ['trending', 'stories', 'carousel', 'instagram'],
      description: 'A carousel of story-style content with swipe transitions.',
      thumbnailUrl: null,
      durationSeconds: 20,
      isPublished: true,
      schema: {
        version: '1.0',
        slots: [
          {
            id: 'story-1-image',
            type: 'image',
            label: 'Story 1 Image',
            required: true,
            constraints: {
              minWidth: 1080,
              minHeight: 1920,
              accept: ['image/jpeg', 'image/png', 'image/webp'],
            },
          },
          {
            id: 'story-2-image',
            type: 'image',
            label: 'Story 2 Image',
            required: true,
            constraints: {
              minWidth: 1080,
              minHeight: 1920,
              accept: ['image/jpeg', 'image/png', 'image/webp'],
            },
          },
          {
            id: 'story-1-text',
            type: 'text',
            label: 'Story 1 Caption',
            required: false,
            placeholder: 'Enter caption',
            constraints: { maxLength: 150 },
          },
          {
            id: 'story-2-text',
            type: 'text',
            label: 'Story 2 Caption',
            required: false,
            placeholder: 'Enter caption',
            constraints: { maxLength: 150 },
          },
        ],
        scenes: [
          {
            id: 'scene-1',
            durationSeconds: 10,
            components: [
              {
                componentId: 'StaticImage',
                zIndex: 0,
                slotBindings: { image: 'story-1-image' },
                props: {},
              },
              {
                componentId: 'AnimatedText',
                zIndex: 1,
                slotBindings: { text: 'story-1-text' },
                props: { fontSize: 36, color: '#FFFFFF' },
              },
            ],
          },
          {
            id: 'scene-2',
            durationSeconds: 10,
            components: [
              {
                componentId: 'StaticImage',
                zIndex: 0,
                slotBindings: { image: 'story-2-image' },
                props: {},
              },
              {
                componentId: 'AnimatedText',
                zIndex: 1,
                slotBindings: { text: 'story-2-text' },
                props: { fontSize: 36, color: '#FFFFFF' },
              },
            ],
          },
        ],
        transitions: ['FadeTransition'],
        audioTags: ['upbeat', 'trending'],
      },
    },
  });
  console.log(`✓ Created template: ${storiesTemplate.name}`);

  // Create music tracks
  const track1 = await prisma.musicTrack.create({
    data: {
      title: 'Upbeat Summer',
      artist: 'The Beats',
      url: 's3://reelforge-music/upbeat-summer.mp3',
      durationSeconds: 120,
      bpm: 128,
      mood: 'energetic',
      genre: 'pop',
      tags: ['trending', 'upbeat', 'summer'],
      isActive: true,
    },
  });
  console.log(`✓ Created music track: ${track1.title}`);

  const track2 = await prisma.musicTrack.create({
    data: {
      title: 'Chill Lo-Fi Beats',
      artist: 'Lo-Fi Vibes',
      url: 's3://reelforge-music/chill-lofi.mp3',
      durationSeconds: 180,
      bpm: 90,
      mood: 'calm',
      genre: 'lo-fi',
      tags: ['lo-fi', 'chill', 'study'],
      isActive: true,
    },
  });
  console.log(`✓ Created music track: ${track2.title}`);

  const track3 = await prisma.musicTrack.create({
    data: {
      title: 'Motivational Strings',
      artist: 'Orchestral Dreams',
      url: 's3://reelforge-music/motivational-strings.mp3',
      durationSeconds: 150,
      bpm: 110,
      mood: 'inspirational',
      genre: 'orchestral',
      tags: ['motivational', 'inspirational', 'epic'],
      isActive: true,
    },
  });
  console.log(`✓ Created music track: ${track3.title}`);

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
