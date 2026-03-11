import { sqliteTable, text, integer, real, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

// ==========================================
// 1. CORE ENTITIES
// ==========================================

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  password: text('password'),
  
  avatar: text('avatar').default(''),
  avatarKey: text('avatar_key').default(''),
  bio: text('bio').default(''),
  university: text('university').default(''),
  location: text('location').default(''),
  
  walletBalance: real('wallet_balance').default(0),
  pendingBalance: real('pending_balance').default(0),
  payoutSchedule: text('payout_schedule', { mode: 'json' }).default('[]'),
  payoutDetails: text('payout_details', { mode: 'json' }).default('{"upiId":"","bankName":"","accountNumber":"","ifscCode":""}'),
  
  isVerifiedEducator: integer('is_verified_educator', { mode: 'boolean' }).default(false),
  role: text('role', { enum: ['user', 'admin'] }).default('user'),
  
  lastSeen: integer('last_seen', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  showLastSeen: integer('show_last_seen', { mode: 'boolean' }).default(true),
  
  noteCount: integer('note_count').default(0),
  blogCount: integer('blog_count').default(0),
  hivePoints: integer('hive_points').default(0),
  badges: text('badges', { mode: 'json' }).default('{"list":[], "consistentLearner":{"earnedAt":null, "isActive":false}}'),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  emailIdx: uniqueIndex('user_email_idx').on(table.email),
  hivePointsIdx: index('user_hive_points_idx').on(table.hivePoints)
}));

export const notes = sqliteTable('notes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  category: text('category', { enum: ['University', 'School', 'Competitive Exams', 'Other'] }).default('University'),
  
  isPaid: integer('is_paid', { mode: 'boolean' }).default(false),
  price: real('price').default(0),
  previewPages: integer('preview_pages').default(3),
  isArchived: integer('is_archived', { mode: 'boolean' }).default(false),
  salesCount: integer('sales_count').default(0),
  
  description: text('description').notNull(),
  university: text('university').notNull(),
  course: text('course').notNull(),
  subject: text('subject').notNull(),
  year: text('year').notNull(),
  
  fileName: text('file_name').notNull(),
  fileType: text('file_type').notNull(),
  fileSize: real('file_size').notNull(),
  fileKey: text('file_key').notNull(),
  thumbnailKey: text('thumbnail_key'),
  previewKey: text('preview_key'),
  filePath: text('file_path'), 
  
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  rating: real('rating').default(0),
  numReviews: integer('num_reviews').default(0),
  downloadCount: integer('download_count').default(0),
  viewCount: integer('view_count').default(0),
  isFeatured: integer('is_featured', { mode: 'boolean' }).default(false),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  slugIdx: uniqueIndex('note_slug_idx').on(table.slug),
  categoryIdx: index('note_category_idx').on(table.category)
}));

export const blogs = sqliteTable('blogs', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  summary: text('summary').notNull(),
  content: text('content').notNull(),
  slug: text('slug').notNull().unique(),
  authorId: text('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  
  tags: text('tags', { mode: 'json' }).default('[]'),
  coverImage: text('cover_image').default(''),
  coverImageKey: text('cover_image_key').default(''),
  
  rating: real('rating').default(0),
  numReviews: integer('num_reviews').default(0),
  viewCount: integer('view_count').default(0),
  readTime: integer('read_time').default(1),
  isFeatured: integer('is_featured', { mode: 'boolean' }).default(false),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  slugIdx: uniqueIndex('blog_slug_idx').on(table.slug),
}));

export const collections = sqliteTable('collections', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  category: text('category', { enum: ['University', 'School', 'Competitive Exams', 'Other'] }).default('University'),
  university: text('university').default(''),
  slug: text('slug').notNull().unique(),
  visibility: text('visibility', { enum: ['public', 'private'] }).default('private'),
  description: text('description').default(''),
  
  isPremium: integer('is_premium', { mode: 'boolean' }).default(false),
  price: real('price').default(0),
  isArchived: integer('is_archived', { mode: 'boolean' }).default(false),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  userCollectionNameIdx: uniqueIndex('user_collection_name_idx').on(table.userId, table.name),
  slugIdx: uniqueIndex('collection_slug_idx').on(table.slug),
  premiumIdx: index('collection_premium_idx').on(table.isPremium)
}));

// ==========================================
// 2. ADDITIONAL ENTITIES (New Models)
// ==========================================

export const universities = sqliteTable('universities', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique(),
  description: text('description').default(''),
  logo: text('logo').default(''),
  coverImage: text('cover_image').default(''),
  location: text('location').default(''),
  website: text('website').default(''),
  
  metaTitle: text('meta_title').default(''),
  metaDescription: text('meta_description').default(''),
  keywords: text('keywords', { mode: 'json' }).default('[]'),
  isActive: integer('is_active', { mode: 'boolean' }).default(true),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const opportunities = sqliteTable('opportunities', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  category: text('category', { enum: ['Latest Jobs', 'Admit Card', 'Result', 'Admission', 'Syllabus', 'Answer Key'] }).notNull(),
  organization: text('organization').notNull(),
  advtNo: text('advt_no'),
  shortDescription: text('short_description'),
  
  importantDates: text('important_dates', { mode: 'json' }).default('[]'),
  applicationFee: text('application_fee', { mode: 'json' }).default('[]'),
  feeMode: text('fee_mode'),
  ageLimit: text('age_limit', { mode: 'json' }).default('{}'),
  vacancyDetails: text('vacancy_details', { mode: 'json' }).default('[]'),
  howToApply: text('how_to_apply', { mode: 'json' }).default('[]'),
  selectionProcess: text('selection_process', { mode: 'json' }).default('[]'),
  importantLinks: text('important_links', { mode: 'json' }).default('[]'),
  faqs: text('faqs', { mode: 'json' }).default('[]'),
  
  isPublished: integer('is_published', { mode: 'boolean' }).default(false),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  publishIdx: index('opp_publish_idx').on(table.category, table.isPublished)
}));

export const requests = sqliteTable('requests', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull(),
  description: text('description').notNull(),
  university: text('university').notNull(),
  subject: text('subject').notNull(),
  requesterId: text('requester_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  status: text('status', { enum: ['pending', 'fulfilled'] }).default('pending'),
  
  fulfilledById: text('fulfilled_by_id').references(() => users.id, { onDelete: 'set null' }),
  fulfillmentNoteId: text('fulfillment_note_id').references(() => notes.id, { onDelete: 'set null' }),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const studyEvents = sqliteTable('study_events', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  slug: text('slug').notNull().unique(),
  examDate: integer('exam_date', { mode: 'timestamp' }).notNull(),
  category: text('category', { enum: ['University', 'School', 'Competitive Exams', 'General'] }).default('University'),
  
  resources: text('resources', { mode: 'json' }).default('[]'),
  progress: integer('progress').default(0),
  isPublic: integer('is_public', { mode: 'boolean' }).default(false),
  clones: integer('clones').default(0),
  isCompleted: integer('is_completed', { mode: 'boolean' }).default(false),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  publicIdx: index('study_event_public_idx').on(table.isPublic),
  userIdx: index('study_event_user_idx').on(table.userId)
}));

// ==========================================
// 3. INTERACTIONS, REPORTS & ANALYTICS
// ==========================================

export const noteReviews = sqliteTable('note_reviews', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  noteId: text('note_id').notNull().references(() => notes.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  rating: integer('rating').default(0),
  comment: text('comment').notNull(),
  parentReviewId: text('parent_review_id'), 
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const blogReviews = sqliteTable('blog_reviews', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  blogId: text('blog_id').notNull().references(() => blogs.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  rating: integer('rating').default(0),
  comment: text('comment').notNull(),
  parentReviewId: text('parent_review_id'), 
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const reports = sqliteTable('reports', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  reporterId: text('reporter_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  targetNoteId: text('target_note_id').references(() => notes.id, { onDelete: 'cascade' }),
  targetBundleId: text('target_bundle_id').references(() => collections.id, { onDelete: 'cascade' }),
  reason: text('reason', { enum: ['Empty Content', 'Incorrect Subject', 'Copyright/Plagiarism', 'Poor Quality', 'Spam'] }).notNull(),
  details: text('details').notNull(),
  status: text('status', { enum: ['pending', 'investigating', 'resolved', 'dismissed'] }).default('pending'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const notifications = sqliteTable('notifications', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  recipientId: text('recipient_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  actorId: text('actor_id').references(() => users.id, { onDelete: 'set null' }),
  type: text('type', { enum: ['REQUEST_FULFILLED', 'FEATURED', 'MILESTONE', 'SYSTEM', 'PURCHASE'] }).notNull(),
  message: text('message').notNull(),
  link: text('link'),
  isRead: integer('is_read', { mode: 'boolean' }).default(false),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const userAnalytics = sqliteTable('user_analytics', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  date: text('date').notNull(),
  views: integer('views').default(0),
  downloads: integer('downloads').default(0),
}, (table) => ({
  userDateIdx: uniqueIndex('analytics_user_date_idx').on(table.userId, table.date)
}));

export const siteAnalytics = sqliteTable('site_analytics', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  path: text('path').notNull(),
  date: text('date').notNull(),
  views: integer('views').default(0),
}, (table) => ({
  pathDateIdx: uniqueIndex('site_analytics_path_date_idx').on(table.path, table.date)
}));

// ==========================================
// 4. CHAT SYSTEM
// ==========================================

export const conversations = sqliteTable('conversations', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  lastMessageId: text('last_message_id'), // Kept as loose text to prevent circular reference conflicts in Drizzle
  pinnedMessageId: text('pinned_message_id'),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const messages = sqliteTable('messages', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  senderId: text('sender_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  content: text('content'),
  
  imageUrl: text('image_url'),
  fileUrl: text('file_url'),
  fileName: text('file_name'),
  replyTo: text('reply_to', { mode: 'json' }),
  reactions: text('reactions', { mode: 'json' }).default('[]'),
  
  edited: integer('edited', { mode: 'boolean' }).default(false),
  deletedForEveryone: integer('deleted_for_everyone', { mode: 'boolean' }).default(false),
  pinned: integer('pinned', { mode: 'boolean' }).default(false),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

// ==========================================
// 5. COMMERCE & TRANSACTIONS
// ==========================================

export const transactions = sqliteTable('transactions', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  buyerId: text('buyer_id').notNull().references(() => users.id),
  sellerId: text('seller_id').notNull().references(() => users.id),
  noteId: text('note_id').references(() => notes.id, { onDelete: 'set null' }),
  bundleId: text('bundle_id').references(() => collections.id, { onDelete: 'set null' }),
  
  amount: real('amount').notNull(),
  adminFee: real('admin_fee').notNull(),
  sellerEarnings: real('seller_earnings').notNull(),
  
  razorpayOrderId: text('razorpay_order_id').notNull(),
  razorpayPaymentId: text('razorpay_payment_id'),
  status: text('status', { enum: ['pending', 'completed', 'failed'] }).default('pending'),
  
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer('updated_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

export const purchases = sqliteTable('purchases', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  itemId: text('item_id').notNull(), // Can be Note ID or Collection ID
  itemType: text('item_type', { enum: ['note', 'collection'] }).notNull(),
  amount: real('amount').notNull(),
  notesSnapshot: text('notes_snapshot', { mode: 'json' }).default('[]'),
  purchasedAt: integer('purchased_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
});

// ==========================================
// 6. RELATIONAL JUNCTION TABLES
// ==========================================

export const userBookmarks = sqliteTable('user_bookmarks', {
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  noteId: text('note_id').notNull().references(() => notes.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  pk: uniqueIndex('bookmark_pk').on(table.userId, table.noteId)
}));

export const userFollows = sqliteTable('user_follows', {
  followerId: text('follower_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  followingId: text('following_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: integer('created_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  pk: uniqueIndex('follow_pk').on(table.followerId, table.followingId)
}));

export const collectionNotes = sqliteTable('collection_notes', {
  collectionId: text('collection_id').notNull().references(() => collections.id, { onDelete: 'cascade' }),
  noteId: text('note_id').notNull().references(() => notes.id, { onDelete: 'cascade' }),
  addedAt: integer('added_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  pk: uniqueIndex('collection_note_pk').on(table.collectionId, table.noteId)
}));

export const conversationParticipants = sqliteTable('conversation_participants', {
  conversationId: text('conversation_id').notNull().references(() => conversations.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
}, (table) => ({
  pk: uniqueIndex('conv_participant_pk').on(table.conversationId, table.userId)
}));

export const messageReads = sqliteTable('message_reads', {
  messageId: text('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  readAt: integer('read_at', { mode: 'timestamp' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => ({
  pk: uniqueIndex('message_read_pk').on(table.messageId, table.userId)
}));