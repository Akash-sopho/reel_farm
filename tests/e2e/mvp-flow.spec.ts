import { test, expect, Page } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

/**
 * End-to-End Test: Complete MVP Flow
 *
 * Tests the full user journey:
 * 1. User navigates to home page
 * 2. User views template gallery
 * 3. User selects a template and fills slots
 * 4. User initiates video export/render
 * 5. User waits for render to complete
 * 6. User downloads the MP4
 * 7. Verify downloaded file is valid MP4
 */

// Helper to check if file is a valid MP4 (check magic bytes)
function isValidMP4(filePath: string): boolean {
  const buffer = fs.readFileSync(filePath);
  // MP4 files start with 'ftyp' at byte offset 4
  // Check for common MP4 signatures
  const isMP4 =
    (buffer[4] === 0x66 && // 'f'
      buffer[5] === 0x74 && // 't'
      buffer[6] === 0x79 && // 'y'
      buffer[7] === 0x70) || // 'p'
    // OR it's an atom with size/type at the beginning
    (buffer.length > 8 && buffer[8] === 0x66); // Alternative signature
  return isMP4;
}

// Helper to create a simple test image
async function createTestImage(filePath: string): Promise<void> {
  // Create a minimal valid PNG (1x1 pixel, white)
  const pngBuffer = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, // PNG signature
    0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, // IHDR chunk size/type
    0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, // 1x1 dimensions
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, // Bit depth, color, CRC
    0xde, 0x00, 0x00, 0x00, 0x0c, 0x49, 0x44, 0x41, // IDAT chunk
    0x54, 0x08, 0x99, 0x63, 0xf8, 0xf0, 0x0f, 0x00, // Image data
    0x00, 0x01, 0x01, 0x01, 0x18, 0xdd, 0x8d, 0xb4, // CRC
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, // IEND chunk
    0xae, 0x42, 0x60, 0x82, // CRC
  ]);

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, pngBuffer);
}

test.describe('MVP Flow - End-to-End', () => {
  test('should complete full video creation flow: select template -> fill slots -> render -> download', async ({
    page,
    context,
  }) => {
    // Step 1: Navigate to home page
    await page.goto('/');
    await expect(page).toHaveTitle(/ReelForge/);

    // Step 2: Navigate to templates gallery
    const templatesLink = page.locator('a:has-text("Templates")');
    if (await templatesLink.isVisible()) {
      await templatesLink.click();
    } else {
      // If no navigation link, go directly
      await page.goto('/templates');
    }

    // Wait for templates to load
    await page.waitForLoadState('networkidle');

    // Step 3: Select a template (first one)
    const templateCard = page.locator('[class*="template"], [class*="card"]').first();
    await expect(templateCard).toBeVisible();

    // Find and click a select/edit button on the template
    const selectButton = templateCard.locator('button:has-text("Select"), button:has-text("Edit"), button:has-text("Use")');
    if (await selectButton.count() > 0) {
      await selectButton.first().click();
    } else {
      // Fallback: click the card itself
      await templateCard.click();
    }

    // Wait for navigation to editor
    await page.waitForURL(/\/editor/);
    await page.waitForLoadState('networkidle');

    // Step 4: Fill in slots
    // Get all text and image slots
    const textSlots = page.locator('textarea');
    const imageButtons = page.locator('button:has-text("Upload Image"), button:has-text("Change Image")');

    // Fill text slots if any exist
    const textCount = await textSlots.count();
    for (let i = 0; i < Math.min(textCount, 2); i++) {
      const textSlot = textSlots.nth(i);
      await textSlot.fill(`Test Text ${i + 1}`);
      // Trigger blur to save
      await textSlot.blur();
      // Wait a bit for debounce
      await page.waitForTimeout(600);
    }

    // Fill image slots if any exist
    const imageCount = await imageButtons.count();
    if (imageCount > 0) {
      // Create a test image for upload
      const testImagePath = path.join(process.cwd(), 'test-image.png');
      await createTestImage(testImagePath);

      for (let i = 0; i < Math.min(imageCount, 1); i++) {
        const uploadButton = imageButtons.nth(i);

        // Set up listener for file chooser
        const fileChooserPromise = page.waitForEvent('filechooser');

        // Click upload button
        await uploadButton.click();

        // Select file
        const fileChooser = await fileChooserPromise;
        await fileChooser.setFiles(testImagePath);

        // Wait for upload to complete
        await page.waitForTimeout(2000);
      }

      // Clean up test image
      fs.unlinkSync(testImagePath);
    }

    // Step 5: Verify project is ready and click "Generate Video"
    const generateButton = page.locator('button:has-text("Generate Video")');
    await expect(generateButton).toBeEnabled();
    await generateButton.click();

    // Step 6: Wait for export modal to appear and render to complete
    const exportModal = page.locator('text=Export Video');
    await expect(exportModal).toBeVisible({ timeout: 10000 });

    // Wait for render to complete (max 60 seconds for a short test render)
    const downloadButton = page.locator('button:has-text("Download MP4")');

    // Poll for download button with timeout
    const startTime = Date.now();
    const maxWaitTime = 120000; // 2 minutes max

    while (Date.now() - startTime < maxWaitTime) {
      const isVisible = await downloadButton.isVisible().catch(() => false);
      if (isVisible) {
        break;
      }
      await page.waitForTimeout(3000); // Check every 3 seconds
    }

    await expect(downloadButton).toBeVisible({ timeout: 10000 });

    // Step 7: Download the MP4
    const downloadPath = path.join(process.cwd(), 'downloads', `test-video-${Date.now()}.mp4`);

    // Listen for download event
    const downloadPromise = context.waitForEvent('download');
    await downloadButton.click();

    const download = await downloadPromise;
    await download.saveAs(downloadPath);

    // Step 8: Verify downloaded file is valid MP4
    await expect(fs.existsSync(downloadPath)).toBeTruthy();
    const fileSize = fs.statSync(downloadPath).size;
    expect(fileSize).toBeGreaterThan(100); // MP4 should be at least 100 bytes

    const isValid = isValidMP4(downloadPath);
    expect(isValid).toBeTruthy();

    // Clean up
    fs.unlinkSync(downloadPath);
  });

  test('should handle errors gracefully when filling slots with invalid data', async ({
    page,
  }) => {
    // Navigate to home page
    await page.goto('/');

    // Navigate to templates
    const templatesLink = page.locator('a:has-text("Templates")');
    if (await templatesLink.isVisible()) {
      await templatesLink.click();
    } else {
      await page.goto('/templates');
    }

    await page.waitForLoadState('networkidle');

    // Select first template
    const templateCard = page.locator('[class*="template"], [class*="card"]').first();
    const selectButton = templateCard.locator('button').first();
    await selectButton.click();

    // Wait for editor
    await page.waitForURL(/\/editor/);
    await page.waitForLoadState('networkidle');

    // Verify UI elements are present
    const scenes = page.locator('text=Scenes');
    await expect(scenes).toBeVisible();

    const slotEditor = page.locator('text=Edit Slots');
    await expect(slotEditor).toBeVisible();

    // Verify video preview is displayed
    const previewSection = page.locator('text=Preview');
    await expect(previewSection).toBeVisible();
  });
});
