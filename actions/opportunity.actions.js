"use server";

import connectDB from "@/lib/db";
import Opportunity from "@/lib/models/Opportunity";

// Inside actions/opportunity.actions.js
export async function getCategorizedOpportunities() {
  await connectDB();
  try {
    const opportunities = await Opportunity.find({ isPublished: true })
      .sort({ createdAt: -1 })
      .select('title slug category updatedAt')
      .lean();

    // Group them into all 6 buckets
    const results = opportunities.filter(o => o.category === 'Result');
    const admitCards = opportunities.filter(o => o.category === 'Admit Card');
    const latestJobs = opportunities.filter(o => o.category === 'Latest Jobs');
    const admissions = opportunities.filter(o => o.category === 'Admission');
    const syllabuses = opportunities.filter(o => o.category === 'Syllabus');
    const answerKeys = opportunities.filter(o => o.category === 'Answer Key');

    return { 
      success: true, 
      data: {
        results: JSON.parse(JSON.stringify(results)),
        admitCards: JSON.parse(JSON.stringify(admitCards)),
        latestJobs: JSON.parse(JSON.stringify(latestJobs)),
        admissions: JSON.parse(JSON.stringify(admissions)),
        syllabuses: JSON.parse(JSON.stringify(syllabuses)),
        answerKeys: JSON.parse(JSON.stringify(answerKeys))
      }
    };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// Fetch a single opportunity by its slug for the details page
export async function getOpportunityBySlug(slug) {
  await connectDB();
  try {
    const opportunity = await Opportunity.findOne({ slug, isPublished: true }).lean();
    return { success: true, opportunity: JSON.parse(JSON.stringify(opportunity)) };
  } catch (error) {
    return { success: false, opportunity: null };
  }
}