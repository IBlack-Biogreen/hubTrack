const { S3Client, PutObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const fs = require('fs');
const path = require('path');

// Configure AWS
const s3Client = new S3Client({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
    }
});

const BUCKET_NAME = process.env.S3_BUCKET_NAME || 'bgtrackimages';

// Function to upload an image to S3
async function uploadImageToS3(localFilePath, s3Key) {
    try {
        const fileContent = fs.readFileSync(localFilePath);
        
        const command = new PutObjectCommand({
            Bucket: BUCKET_NAME,
            Key: s3Key,
            Body: fileContent,
            ContentType: 'image/jpeg'
        });

        const result = await s3Client.send(command);
        const s3Url = `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || 'us-east-1'}.amazonaws.com/${s3Key}`;
        console.log(`Image uploaded successfully to ${s3Url}`);
        return s3Url;
    } catch (error) {
        console.error('Error uploading image to S3:', error);
        throw error;
    }
}

// Function to update feed status after S3 upload
async function updateFeedStatus(db, feedId, s3Url) {
    try {
        const result = await db.collection('localFeeds').updateOne(
            { _id: feedId },
            {
                $set: {
                    imageStatus: 'synced',
                    syncStatus: 'synced',
                    s3Url: s3Url,
                    lastUpdated: new Date()
                }
            }
        );
        
        if (result.modifiedCount === 1) {
            console.log(`Feed ${feedId} status updated successfully`);
            return true;
        } else {
            console.log(`No feed found with ID ${feedId}`);
            return false;
        }
    } catch (error) {
        console.error('Error updating feed status:', error);
        throw error;
    }
}

// Function to sync pending images to S3
async function syncPendingImages(db) {
    try {
        // Find all feeds with pending image status
        const pendingFeeds = await db.collection('localFeeds')
            .find({ 
                imageStatus: 'pending',
                imageFilename: { $exists: true }
            })
            .toArray();

        console.log(`Found ${pendingFeeds.length} feeds with pending images`);

        for (const feed of pendingFeeds) {
            try {
                const documentsPath = process.env.DOCUMENTS_PATH || path.join(process.env.USERPROFILE || process.env.HOME, 'Documents');
                const imagesDir = path.join(documentsPath, 'hubtrack_images');
                const localFilePath = path.join(imagesDir, feed.imageFilename);

                if (!fs.existsSync(localFilePath)) {
                    console.log(`Image file not found: ${localFilePath}`);
                    continue;
                }

                // Upload to S3
                const s3Key = `${feed.deviceLabel}/${feed.imageFilename}`;
                const s3Url = await uploadImageToS3(localFilePath, s3Key);

                // Update feed status
                await updateFeedStatus(db, feed._id, s3Url);

                console.log(`Successfully synced image for feed ${feed._id}`);
            } catch (error) {
                console.error(`Error syncing image for feed ${feed._id}:`, error);
                // Continue with next feed even if this one fails
                continue;
            }
        }
    } catch (error) {
        console.error('Error in syncPendingImages:', error);
        throw error;
    }
}

module.exports = {
    uploadImageToS3,
    updateFeedStatus,
    syncPendingImages
}; 