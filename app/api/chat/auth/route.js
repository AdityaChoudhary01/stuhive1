export const runtime = "edge";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth"; // Use Auth.js v5 wrapper

export async function GET(req) {
  try {
    // 1. Edge-compatible session retrieval
    const session = await auth();

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.ABLY_API_KEY;
    if (!apiKey) {
      throw new Error("ABLY_API_KEY is not defined");
    }

    // 2. Extract key name for the Ably REST URL
    const [keyName, keySecret] = apiKey.split(':');

    // 3. ⚡ Zero-dependency Ably Token Generation via Native Fetch (Edge Safe)
    // Explicitly casting the session user ID to a String to match frontend
    const response = await fetch(`https://rest.ably.io/keys/${keyName}/requestToken`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${btoa(apiKey)}` // Basic auth using the API key
      },
      body: JSON.stringify({
        clientId: String(session.user.id),
      })
    });

    if (!response.ok) {
        throw new Error(`Ably responded with status: ${response.status}`);
    }

    const tokenRequestData = await response.json();
    return NextResponse.json(tokenRequestData);
    
  } catch (error) {
    console.error("Ably Auth Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}