const AWS = require('aws-sdk');
const fs = require('fs');
const path = require('path');

// Get current directory
const __filename = path.basename(__filename);
const __dirname = path.dirname(__filename);

// Configure AWS
const configureAWS = () => {
  return new AWS.S3({
    accessKeyId: 'AKIAXGWWQTJ5YWWLNQNM',
    secretAccessKey: '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',
    region: 'ap-southeast-1', // Singapore region
    endpoint: 'https://s3.ap-southeast-1.amazonaws.com',
    s3ForcePathStyle: true,
    signatureVersion: 'v4'
  });
};

// Initialize S3 client
const s3 = configureAWS();

// Read CORS configuration from file
const corsConfigPath = path.join(__dirname, '..', 'cors.json');
const corsConfig = JSON.parse(fs.readFileSync(corsConfigPath, 'utf8'));

// Apply CORS configuration to bucket
async function applyCorsConfig() {
  try {
    const params = {
      Bucket: 'catatai-audio-file',
      CORSConfiguration: {
        CORSRules: corsConfig
      }
    };

    const result = await s3.putBucketCors(params).promise();
    console.log('Successfully applied CORS configuration to S3 bucket');
    console.log('CORS configuration:', JSON.stringify(corsConfig, null, 2));
    return result;
  } catch (error) {
    console.error('Error applying CORS configuration:', error);
    throw error;
  }
}

// Check current CORS configuration
async function checkCorsConfig() {
  try {
    const params = {
      Bucket: 'catatai-audio-file'
    };

    const result = await s3.getBucketCors(params).promise();
    console.log('Current CORS configuration:');
    console.log(JSON.stringify(result.CORSRules, null, 2));
    return result;
  } catch (error) {
    if (error.code === 'NoSuchCORSConfiguration') {
      console.log('No CORS configuration found on bucket');
    } else {
      console.error('Error checking CORS configuration:', error);
    }
    return null;
  }
}

// Run the script
async function run() {
  console.log('Checking current CORS configuration...');
  await checkCorsConfig();
  
  console.log('\nApplying new CORS configuration...');
  await applyCorsConfig();
  
  console.log('\nVerifying new CORS configuration...');
  await checkCorsConfig();
}

run().catch(console.error);
