import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Standard Tailwind Class Merger
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

/**
 * Formats dates for standard UI display (e.g., Jan 12, 2024)
 */
export function formatDate(dateString) {
  if (!dateString) return "Unknown Date";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

/**
 * 🚀 NEW: Checks if the "Consistent Learner" badge is still valid (48h window)
 * Used in Public Profiles and Dashboards.
 */
export function checkConsistentBadge(user) {
  // If no badge data exists, or it's explicitly inactive
  if (!user?.badges?.consistentLearner?.isActive || !user?.badges?.consistentLearner?.earnedAt) {
    return false;
  }

  const earnedAt = new Date(user.badges.consistentLearner.earnedAt);
  const now = new Date();
  
  // Calculate difference in hours
  const diffInHours = (now - earnedAt) / (1000 * 60 * 60);
  
  // Logic: Badge is active for 48 hours (2 days) after the last streak completion
  return diffInHours <= 48;
}

/**
 * 🚀 NEW: Calculates how many hours are left before the badge expires
 * Useful for "Keep your streak alive!" warnings.
 */
export function getBadgeExpiryProgress(earnedAtDate) {
  if (!earnedAtDate) return 0;
  
  const earnedAt = new Date(earnedAtDate);
  const now = new Date();
  const totalWindowHours = 48;
  
  const diffInHours = (now - earnedAt) / (1000 * 60 * 60);
  const remainingHours = totalWindowHours - diffInHours;
  
  // Return percentage of time remaining (for a progress bar)
  const percentage = (remainingHours / totalWindowHours) * 100;
  return Math.max(0, percentage);
}

/**
 * Helper to generate initials for avatars (e.g., "Aditya Kumar" -> "AK")
 */
export function getInitials(name) {
  if (!name) return "U";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
}