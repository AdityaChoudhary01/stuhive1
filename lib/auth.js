import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { getDb } from "@/lib/db";
import { users, userBookmarks, purchases } from "@/db/schema";
import { eq } from "drizzle-orm";
import { compare } from "bcrypt-ts"; // 🚀 Edge-compatible bcrypt
import { indexNewContent } from "@/lib/googleIndexing";

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers: [
    // 1. Google Provider
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    
    // 2. Credentials Provider
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        const db = getDb();

        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const dbUsers = await db.select().from(users).where(eq(users.email, credentials.email));
        const user = dbUsers[0];

        if (!user) {
          throw new Error("No user found with this email");
        }

        const isMatch = await compare(credentials.password, user.password);

        if (!isMatch) {
          throw new Error("Invalid password");
        }

        // Fetch relational data (Bookmarks and Purchases)
        const bookmarks = await db.select({ noteId: userBookmarks.noteId })
                                  .from(userBookmarks)
                                  .where(eq(userBookmarks.userId, user.id));
                                  
        const userPurchases = await db.select({ itemId: purchases.itemId })
                                      .from(purchases)
                                      .where(eq(purchases.userId, user.id));

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.avatar, 
          avatar: user.avatar, 
          role: user.role,
          savedNotes: bookmarks.map(b => b.noteId), 
          purchasedNotes: userPurchases.map(p => p.itemId), 
        };
      }
    })
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        const db = getDb();
        try {
          const dbUsers = await db.select().from(users).where(eq(users.email, user.email));
          let existingUser = dbUsers[0];
          
          if (!existingUser) {
            const newUserId = crypto.randomUUID();
            
            // Create new user
            await db.insert(users).values({
              id: newUserId,
              name: user.name,
              email: user.email,
              avatar: user.image,
              role: 'user',
            });

            existingUser = { id: newUserId, role: 'user', avatar: user.image };

            // 🚀 SEO: Background index trigger
            indexNewContent(newUserId, 'profile')
              .then(status => console.log(`[SEO] Profile indexed: ${status}`))
              .catch(err => console.error(`[SEO] Profile indexing failed:`, err));

          } else if (!existingUser.avatar && user.image) {
            await db.update(users).set({ avatar: user.image }).where(eq(users.id, existingUser.id));
            existingUser.avatar = user.image;
          }

          // Fetch relations
          const bookmarks = await db.select({ noteId: userBookmarks.noteId }).from(userBookmarks).where(eq(userBookmarks.userId, existingUser.id));
          const userPurchases = await db.select({ itemId: purchases.itemId }).from(purchases).where(eq(purchases.userId, existingUser.id));

          user.id = existingUser.id;
          user.role = existingUser.role;
          user.avatar = existingUser.avatar || user.image; 
          user.image = existingUser.avatar || user.image; 
          user.savedNotes = bookmarks.map(b => b.noteId);
          user.purchasedNotes = userPurchases.map(p => p.itemId);
          
          return true;
        } catch (error) {
          console.error("Error creating user from Google Login:", error);
          return false;
        }
      }
      return true; 
    },

    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.picture = user.avatar || user.image; 
        token.savedNotes = user.savedNotes || []; 
        token.purchasedNotes = user.purchasedNotes || []; 
      }
      
      if (trigger === "update" && session?.user) {
        if (session.user.image || session.user.avatar) {
            token.picture = session.user.avatar || session.user.image; 
        }
        if (session.user.name) token.name = session.user.name;
        if (session.user.savedNotes) token.savedNotes = session.user.savedNotes;
        if (session.user.purchasedNotes) token.purchasedNotes = session.user.purchasedNotes;
      }
      
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.image = token.picture; 
        session.user.avatar = token.picture; 
        session.user.savedNotes = token.savedNotes || []; 
        session.user.purchasedNotes = token.purchasedNotes || []; 
      }
      return session;
    },
  },
  pages: {
    signIn: '/login',
    error: '/auth/error',
  },
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 Days
  },
  secret: process.env.NEXTAUTH_SECRET,
  trustHost: true,
});