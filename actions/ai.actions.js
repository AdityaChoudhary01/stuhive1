"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

// Check if user is admin
async function isAdmin() {
  const session = await getServerSession(authOptions);
  return session?.user?.role === "admin";
}

export async function parseSarkariText(rawText) {
  if (!(await isAdmin())) return { success: false, error: "Unauthorized" };
  if (!rawText || rawText.length < 50) return { success: false, error: "Text too short to parse." };

  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    
    const model = genAI.getGenerativeModel({ 
        model: "gemini-3.1-flash-lite-preview", 
        generationConfig: {
            responseMimeType: "application/json", 
        }
    });

    const prompt = `
      You are an expert data entry assistant for a "Sarkari Result" style job portal.
      Extract the job notification details from the following raw text.
      Return ONLY a valid JSON object matching the exact structure below. 
      If a specific detail is not found in the text, leave it as an empty string "" or empty array [].
      Do not invent information.

      CRITICAL INSTRUCTION FOR LINKS: 
      Locate the "SOME USEFUL IMPORTANT LINKS" section (or similar). You MUST extract EVERY SINGLE link label mentioned in that list. 
      Examples of labels to extract: "Check Tier-II Exam Date Notice", "Download Tier-I Result", "Download Answer Key", "Apply Online Link", etc. 
      Do not skip any items in the list. Since the raw text often just says "Click Here" instead of showing the URL, capture the descriptive text as the "label" and leave the "url" string empty.

      Required JSON Structure:
      {
        "title": "Main title of the exam/admit card (e.g., UP Police SI Admit Card 2026)",
        "organization": "Name of the organizing body (e.g., UPPRPB)",
        "category": "Must be exactly one of: 'Latest Jobs', 'Admit Card', 'Result', 'Admission', 'Syllabus', 'Answer Key'",
        "advtNo": "Advertisement Number if any",
        "shortDescription": "A highly SEO optimized 2-3 sentence summary of the notification",
        "feeMode": "How to pay fees (e.g., Debit Card, Net Banking)",
        "ageLimit": {
          "minimumAge": "e.g., 21 Years",
          "maximumAge": "e.g., 28 Years",
          "asOnDate": "e.g., 01/07/2025",
          "extraDetails": "e.g., Age relaxation as per rules"
        },
        "importantDates": [
          { "event": "Event name (e.g., Apply Start Date)", "date": "Date value" }
        ],
        "applicationFee": [
          { "category": "e.g., General / OBC", "amount": "e.g., ₹500" }
        ],
        "vacancyDetails": [
          { "postName": "Name of post", "totalPost": "Total number", "ur": "", "ews": "", "obc": "", "sc": "", "st": "", "eligibility": "Eligibility criteria" }
        ],
        "howToApply": [
          { "step": "Step 1 text..." }
        ],
        "selectionProcess": [
          { "step": "Phase 1: Written Exam..." }
        ],
        "importantLinks": [
          { "label": "Descriptive name of the link (e.g., Download Tier-I Admit Card)", "url": "" }
        ],
        "faqs": [
          { "question": "e.g., When is the exam?", "answer": "" }
        ]
      }

      Raw Text to Parse:
      """
      ${rawText}
      """
    `;

    const result = await model.generateContent(prompt);
    
    if (!result.response) {
        throw new Error("No response from AI model.");
    }

    const responseText = result.response.text();
    
    if (!responseText) throw new Error("AI returned an empty response.");

    const parsedData = JSON.parse(responseText);

    return { success: true, data: parsedData };
  } catch (error) {
    console.error("AI Parsing Error:", error);
    
    if (error.message && error.message.includes("404")) {
        return { success: false, error: "Model not found. Please check if gemini-3.1-flash-lite-preview is enabled in your Google AI Console." };
    }
    
    return { success: false, error: "AI failed to parse the text. Try copying a smaller, cleaner section of the page." };
  }
}