#!/bin/bash

# Set bucket policy to allow public read access
mc alias set minio http://localhost:9000 minioadmin minioadmin

# Set public read policy for the bucket
mc policy set public minio/reelforge

echo "✅ Bucket policy updated for public read access"

# Verify by trying to access an image
echo "🔍 Testing image access..."
curl -s http://localhost:9000/reelforge/thumbnails/photo-dump.png > /dev/null && echo "✅ Image is accessible" || echo "❌ Image still not accessible"
