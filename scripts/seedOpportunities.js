require('dotenv').config({ path: '.env.local' });
const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("❌ MONGODB_URI is not defined in .env.local");
  process.exit(1);
}

const OpportunitySchema = new mongoose.Schema({
  title: String,
  slug: String,
  category: String,
  organization: String,
  advtNo: String,
  shortDescription: String,
  importantDates: [{ event: String, date: String }],
  applicationFee: [{ category: String, amount: String }],
  feeMode: String,
  ageLimit: { minimumAge: String, maximumAge: String, asOnDate: String, extraDetails: String },
  vacancyDetails: [{
    postName: String, ur: String, ews: String, obc: String, sc: String, st: String, totalPost: String, eligibility: String
  }],
  howToApply: [{ step: String }],
  selectionProcess: [{ step: String }],
  importantLinks: [{ label: String, url: String }],
  faqs: [{ question: String, answer: String }],
  isPublished: { type: Boolean, default: true }
}, { timestamps: true });

const Opportunity = mongoose.models.Opportunity || mongoose.model("Opportunity", OpportunitySchema);

const seedData = [
  {
    title: "Railway RRB Group D Online Form 2026 (22,195 Posts)",
    slug: "rrb-group-d-online-form-2026",
    category: "Latest Jobs",
    organization: "Railway Recruitment Boards (RRB)",
    advtNo: "CEN 09/2025",
    shortDescription: "Railway Recruitment Boards (RRB) has released the official notification for the recruitment of Group-D (Level-1) posts across various railway zones in India for 22,195 positions.",
    importantDates: [
      { event: "Notification Date", date: "30 January 2026" },
      { event: "Online Apply Start Date", date: "31 January 2026" },
      { event: "Online Apply Last Date", date: "02 March 2026" },
      { event: "Last Date For Fee Payment", date: "04 March 2026" },
      { event: "Correction Date", date: "05 - 14 March 2026" },
      { event: "Exam Date", date: "Notify Later" }
    ],
    applicationFee: [
      { category: "General / OBC", amount: "500" },
      { category: "SC / ST / EBC / Female", amount: "250" }
    ],
    feeMode: "Debit Card, Credit Card, Internet Banking, IMPS, Cash Card / Mobile Wallet",
    ageLimit: { 
        minimumAge: "18 Years", 
        maximumAge: "33 Years", 
        asOnDate: "01 January 2026", 
        extraDetails: "Age relaxation as per rules." 
    },
    vacancyDetails: [
      { postName: "Pointsman-B", totalPost: "5053", eligibility: "Class 10 High School / NAC from NCVT" },
      { postName: "Track Maintainer Gr. IV", totalPost: "11032", eligibility: "Class 10 High School / NAC from NCVT" },
      { postName: "Assistant (Track Machine)", totalPost: "597", eligibility: "Class 10 High School / NAC from NCVT" },
      { postName: "Assistant (C&W)", totalPost: "1000", eligibility: "Class 10 High School / NAC from NCVT" }
    ],
    howToApply: [
      { step: "Interested candidates can submit application online before 02 March 2026." },
      { step: "Visit official website of RRB to complete process." },
      { step: "Fill name, DOB exactly as per 10th marksheet." }
    ],
    selectionProcess: [
      { step: "Computer Based Test (CBT-1)" },
      { step: "Physical Efficiency Test (PET)" },
      { step: "Document Verification & Medical Exam" }
    ],
    importantLinks: [
      { label: "Apply Online", url: "https://indianrailways.gov.in/" },
      { label: "Check Official Notification", url: "https://indianrailways.gov.in/" }
    ],
    faqs: [
      { question: "What is the last date to apply?", answer: "02 March 2026" },
      { question: "How many total posts are there?", answer: "22,195 Posts" }
    ],
    isPublished: true
  },
  {
    title: "Indian Army Agniveer CEE Online Form 2026",
    slug: "indian-army-agniveer-cee-2026",
    category: "Latest Jobs",
    organization: "Join Indian Army (Bhartiya Sena)",
    shortDescription: "Indian Army has released a notification for the recruitment of Common Entrance Exam CEE for Agnipath Agniveers Post.",
    importantDates: [
      { event: "Online Apply Start Date", date: "13 February 2026" },
      { event: "Online Apply Last Date", date: "01 April 2026" },
      { event: "Exam Date", date: "01 - 16 June 2026" }
    ],
    applicationFee: [
      { category: "General / OBC / EWS", amount: "250" },
      { category: "SC / ST", amount: "250" }
    ],
    ageLimit: { 
        minimumAge: "17.5 Years", 
        maximumAge: "22-34 Years (Post Wise)", 
        asOnDate: "01 July 2026",
        extraDetails: "Agniveer GD/Tech: 17.5-22 | Sepoy Pharma: 19-25 | JCO: 27-34"
    },
    vacancyDetails: [
      { postName: "Agniveer General Duty (GD)", eligibility: "Class 10th Matric with 45% Marks." },
      { postName: "Agniveer Technical", eligibility: "10+2 Intermediate with Physics, Chemistry, Maths." },
      { postName: "Sepoy Pharma", eligibility: "10+2 with D.Pharma (55%) or B.Pharma (50%)." }
    ],
    howToApply: [
        { step: "Apply online via joinindianarmy.nic.in before 01 April 2026." }
    ],
    selectionProcess: [
      { step: "Written Examination (CEE)" },
      { step: "PET / PST" },
      { step: "Document Verification" }
    ],
    importantLinks: [
      { label: "Registration", url: "https://joinindianarmy.nic.in" },
      { label: "Login", url: "https://joinindianarmy.nic.in" }
    ],
    isPublished: true
  },
  {
    title: "DSSSB Various Post Online Form 2026",
    slug: "dsssb-various-post-2026",
    category: "Latest Jobs",
    organization: "Delhi Subordinate Services Selection Board (DSSSB)",
    advtNo: "02/2026",
    shortDescription: "DSSSB recruitment for Radiographer, Assistant Manager, Patwari & Other Various Posts for 216 positions.",
    importantDates: [
      { event: "Online Apply Start Date", date: "27 February 2026" },
      { event: "Online Apply Last Date", date: "28 March 2026" },
      { event: "Exam Date", date: "Notify Soon" }
    ],
    applicationFee: [
      { category: "General / OBC / EWS", amount: "100" },
      { category: "SC / ST / PH / Female", amount: "0" }
    ],
    ageLimit: { 
        minimumAge: "18 - 21 Years", 
        maximumAge: "27 - 32 Years", 
        asOnDate: "28 March 2026" 
    },
    vacancyDetails: [
      { postName: "Radiographer", totalPost: "96", eligibility: "10+2 with Science + Diploma/B.Sc in Radiography." },
      { postName: "Patwari", totalPost: "15", eligibility: "Graduate from any recognized university." },
      { postName: "Assistant Manager", totalPost: "18", eligibility: "MBA / Master's Degree in relevant field." }
    ],
    howToApply: [
      { step: "Submit application online via dsssb.delhi.gov.in" },
      { step: "Registration starts from 27 February 2026." }
    ],
    importantLinks: [
      { label: "Apply Online", url: "https://dsssb.delhi.gov.in/" },
      { label: "Official Website", url: "https://dsssb.delhi.gov.in/" }
    ],
    isPublished: true
  }
];

async function seed() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB...");
    
    // Deleting existing ones to avoid duplicates
    await Opportunity.deleteMany({ slug: { $in: seedData.map(d => d.slug) } });
    
    await Opportunity.insertMany(seedData);
    console.log("✅ Seeded 3 Major Job Updates Successfully!");
    process.exit();
  } catch (err) {
    console.error("❌ Seeding Error:", err);
    process.exit(1);
  }
}

seed();