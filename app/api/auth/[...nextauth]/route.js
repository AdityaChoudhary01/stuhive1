export const runtime = "edge";

import { NextResponse } from "next/server";
import { auth } from "@/lib/auth"; // Auth.js v5

export async function GET(req) {
  try {
    const session = await auth();

    if (!session || !session.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const apiKey = process.env.ABLY_API_KEY;
    const [keyName, keySecret] = apiKey.split(':');

    // ⚡ Zero-dependency Ably Token Generation via Native Fetch (Edge Safe)
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