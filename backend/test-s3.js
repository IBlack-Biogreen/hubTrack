const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

// Configure AWS
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'bgtrackimages';

async function testS3Connection() {
    try {
        console.log('Testing S3 connection...');
        console.log('Bucket:', BUCKET_NAME);
        console.log('Region:', process.env.AWS_REGION);

        // List objects in the bucket
        const command = new ListObjectsV2Command({
            Bucket: BUCKET_NAME,
            MaxKeys: 10
        });

        const data = await s3Client.send(command);
        console.log('\nSuccessfully connected to S3!');
        console.log('Objects in bucket:', data.Contents ? data.Contents.length : 0);
        
        if (data.Contents && data.Contents.length > 0) {
            console.log('\nFirst 10 objects:');
            data.Contents.forEach(obj => {
                console.log(`- ${obj.Key} (${obj.Size} bytes)`);
            });
        }

    } catch (error) {
        console.error('Error testing S3 connection:', error);
        if (error.name === 'NoSuchBucket') {
            console.error('The bucket does not exist. Please create it first.');
        } else if (error.name === 'InvalidAccessKeyId') {
            console.error('Invalid AWS access key ID. Please check your credentials.');
        } else if (error.name === 'SignatureDoesNotMatch') {
            console.error('Invalid AWS secret access key. Please check your credentials.');
        }
    }
}

testS3Connection(); 