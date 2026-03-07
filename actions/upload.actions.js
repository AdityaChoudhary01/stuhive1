"use server";

import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import crypto from "crypto";
import { generateUploadUrl } from "@/lib/r2"; // ✅ Your R2 helper

export async function getUploadUrl(fileName, fileType, requestThumbnail = false, requestPreview = false) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: "Unauthorized" };

    const timestamp = Date.now();
    const randomString = crypto.randomBytes(4).toString("hex");
    
    // ✅ Extract extension to ensure it's always at the end of the key
    const extension = fileName.split('.').pop();
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "_");
    
    // Create the Main File Key (e.g., notes/user123/17000000-abcd-My_Note.docx)
    const fileKey = `notes/${session.user.id}/${timestamp}-${randomString}-${nameWithoutExt}.${extension}`;
    
    // ✅ This generates the R2 URL - it works for ANY fileType passed from frontend
    const uploadUrl = await generateUploadUrl(fileKey, fileType);

    let thumbUrl = null;
    let thumbKey = null;

    if (requestThumbnail) {
        // Thumbnails remain WebP regardless of the main file type
        thumbKey = `thumbnails/${session.user.id}/${timestamp}-${randomString}-thumb.webp`;
        thumbUrl = await generateUploadUrl(thumbKey, "image/webp");
    }

    // 🚀 NEW: Generate R2 URL for the Secure 3-Page Preview PDF
    let previewUploadUrl = null;
    let previewKey = null;

    if (requestPreview) {
        // Previews are always strictly PDFs
        previewKey = `previews/${session.user.id}/${timestamp}-${randomString}-preview.pdf`;
        previewUploadUrl = await generateUploadUrl(previewKey, "application/pdf");
    }

    return { 
        success: true,
        uploadUrl, 
        fileKey,
        thumbUrl,   
        thumbKey,
        previewUploadUrl, // 🚀 Return preview URL to frontend
        previewKey        // 🚀 Return preview Key to save in DB
    };

  } catch (error) {
    console.error("R2 Note Presigned URL Error:", error);
    return { error: "Failed to generate upload authorization for R2" };
  }
}

/**
 * 2. GET URL FOR AVATAR UPLOADS
 * Forces the file to be saved as a tiny WebP image.
 */
export async function getAvatarUploadUrlAction() {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: "Unauthorized" };

    const timestamp = Date.now();
    const fileKey = `avatars/${session.user.id}/${timestamp}-avatar.webp`;
    
    // Generate URL expecting a WebP image from the browser
    const uploadUrl = await generateUploadUrl(fileKey, "image/webp");

    return { success: true, uploadUrl, fileKey };
  } catch (error) {
    console.error("R2 Avatar URL Error:", error);
    return { error: "Failed to generate avatar upload link" };
  }
}

/**
 * 3. GET URL FOR BLOG COVER UPLOADS
 */
export async function getBlogCoverUploadUrlAction(fileType = "image/webp") {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return { error: "Unauthorized" };

    const timestamp = Date.now();
    const randomString = crypto.randomBytes(4).toString("hex");
    const fileKey = `blogs/${session.user.id}/${timestamp}-${randomString}-cover`;
    
    const uploadUrl = await generateUploadUrl(fileKey, fileType);

    return { success: true, uploadUrl, fileKey };
  } catch (error) {
    console.error("R2 Blog Cover URL Error:", error);
    return { error: "Failed to generate blog cover upload link" };
  }
}