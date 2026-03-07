import { 
    S3Client, 
    PutObjectCommand, 
    DeleteObjectCommand, 
    GetObjectCommand 
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const BUCKET_NAME = process.env.R2_BUCKET_NAME;

// Initialize the S3 Client pointed at Cloudflare R2
export const r2Client = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

/**
 * 1. Generate Upload URL
 * Used by the browser to upload files directly to R2.
 */
export async function generateUploadUrl(key, contentType) {
    const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        ContentType: contentType,
    });

    return await getSignedUrl(r2Client, command, { expiresIn: 300 }); 
}

/**
 * 2. 🚀 HYBRID LOGIC: Public URL for Assets
 * Use this for Thumbnails, Avatars, and Blog Covers.
 * These files remain public on cdn.stuhive.in for speed and SEO.
 */
export function getR2PublicUrl(key) {
    if (!key) return null;
    
    // Ensure this domain cdn.stuhive.in is active in Cloudflare R2 settings
    // This keeps Note Cards and Profile Pics working without signing every link.
    return `https://cdn.stuhive.in/${key}`;
}

/**
 * 3. 🚀 SECURE LOGIC: Signed URL for Documents
 * Use this for the actual Note files (PDF/Office) and Previews.
 * These links expire after 1 hour and cannot be shared.
 */
export async function generateReadUrl(key, fileName = "document", forceDownload = false) {
    if (!key) return null;

    const safeName = fileName.replace(/[^a-zA-Z0-9.-]/g, '_');
    const params = {
        Bucket: BUCKET_NAME,
        Key: key,
    };

    const disposition = forceDownload ? 'attachment' : 'inline';
    params.ResponseContentDisposition = `${disposition}; filename="${encodeURIComponent(safeName)}"`;

    const command = new GetObjectCommand(params);

    return await getSignedUrl(r2Client, command, { expiresIn: 3600 });
}

/**
 * 4. Delete File
 */
export async function deleteFileFromR2(key) {
    if (!key) return false;
    
    try {
        const command = new DeleteObjectCommand({
            Bucket: BUCKET_NAME,
            Key: key,
        });
        
        await r2Client.send(command);
        console.log(`Successfully deleted ${key} from R2`);
        return true;
    } catch (error) {
        console.error(`Error deleting file ${key} from R2:`, error);
        return false;
    }
}