'use server';

import { getDb } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { hash } from "bcrypt-ts"; // 🚀 Edge-compatible bcrypt
import { indexNewContent } from "@/lib/googleIndexing"; 
import { pingIndexNow } from "@/lib/indexnow"; 

const APP_URL = process.env.NEXTAUTH_URL || "https://www.stuhive.in";

export async function registerUser(formData) {
  try {
    const { name, email, password } = formData;

    if (!name || !email || !password) {
      return { success: false, error: "All fields are required" };
    }

    // 🚀 ADMIN IMPERSONATION PROTECTION (Strict Check)
    if (name.toLowerCase().includes('admin')) {
      if (email !== process.env.NEXT_PUBLIC_MAIN_ADMIN_EMAIL) {
        return { 
          success: false, 
          error: "The term 'Admin' is reserved and cannot be used in your name." 
        };
      }
    }

    const db = getDb();

    // Check if user already exists
    const existingUsers = await db.select().from(users).where(eq(users.email, email));
    if (existingUsers.length > 0) {
      return { success: false, error: "Email is already registered" };
    }

    // 🚀 Explicitly hash the password before inserting (Replaces Mongoose pre-save hook)
    const hashedPassword = await hash(password, 10);
    const newUserId = crypto.randomUUID();

    // Insert the new user
    await db.insert(users).values({
      id: newUserId,
      name,
      email,
      password: hashedPassword,
      role: 'user', // Default role
    });

    // 🚀 SEO: Instantly ping Google & IndexNow to index the new public profile!
    // Notice we DO NOT 'await' these. They run in the background.
    
    // 1. Google Ping
    indexNewContent(newUserId, 'profile')
      .then(status => console.log(`[SEO] Google Profile Ping: ${status ? 'DELIVERED' : 'FAILED'}`))
      .catch(err => console.error(`[SEO] Google Profile Ping Error:`, err));
    
    // 2. IndexNow Ping (Bing, Yahoo, Yandex, etc.)
    pingIndexNow([`${APP_URL}/profile/${newUserId}`])
      .then(status => console.log(`[SEO] IndexNow Profile Ping: ${status ? 'DELIVERED' : 'FAILED'}`))
      .catch(err => console.error(`[SEO] IndexNow Profile Ping Error:`, err));
    
    return { success: true };
  } catch (error) {
    console.error("Registration Error:", error);
    return { success: false, error: "Something went wrong during registration" };
  }
}