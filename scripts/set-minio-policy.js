const Minio = require('minio');

const minioClient = new Minio.Client({
  endPoint: process.env.MINIO_ENDPOINT || 'localhost',
  port: parseInt(process.env.MINIO_PORT || '9000'),
  useSSL: process.env.MINIO_USE_SSL === 'true',
  accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
  secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
});

const BUCKET = process.env.MINIO_BUCKET || 'reelforge';

// Public read policy
const policy = {
  Version: '2012-10-17',
  Statement: [
    {
      Effect: 'Allow',
      Principal: { AWS: '*' },
      Action: 's3:GetObject',
      Resource: `arn:aws:s3:::${BUCKET}/*`,
    },
  ],
};

minioClient.setBucketPolicy(BUCKET, JSON.stringify(policy), (err) => {
  if (err) {
    console.error('❌ Error setting policy:', err);
    process.exit(1);
  }
  console.log('✅ Bucket policy set to public read');
});
