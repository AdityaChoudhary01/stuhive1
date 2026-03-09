import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import connectDB from "@/lib/db";
import User from "@/lib/models/User";
import Collection from "@/lib/models/Collection"; // 🚀 Added to sync bundle purchases
import bcrypt from "bcryptjs";
import { indexNewContent } from "@/lib/googleIndexing"; // 🚀 Imported the SEO Indexer

export const authOptions = {
  providers: [
    // 1. Google Provider
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    
    // 2. Credentials Provider
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        await connectDB();

        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const user = await User.findOne({ email: credentials.email });

        if (!user) {
          throw new Error("No user found with this email");
        }

        const isMatch = await user.matchPassword(credentials.password);

        if (!isMatch) {
          throw new Error("Invalid password");
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          image: user.avatar, // Maps DB 'avatar' to NextAuth 'image'
          avatar: user.avatar, // Explicitly pass avatar
          role: user.role,
          savedNotes: user.savedNotes?.map(id => id.toString()) || [], 
          purchasedNotes: user.purchasedNotes?.map(id => id.toString()) || [], // 🚀 Sync individual purchases
        };
      }
    })
  ],
  callbacks: {
    // 1. SignIn: Handle Google User Creation & Database Sync
    async signIn({ user, account }) {
      if (account.provider === "google") {
        await connectDB();
        try {
          let existingUser = await User.findOne({ email: user.email });
          
          if (!existingUser) {
            // Create new user if they don't exist
            existingUser = new User({
              name: user.name,
              email: user.email,
              avatar: user.image, // Save Google image as avatar
              role: 'user',
              savedNotes: [],
              purchasedNotes: [], // 🚀 Initialize empty purchases
            });
            await existingUser.save();

            // 🚀 SEO: Instantly ping Google to index the new public profile!
            // Notice we DO NOT 'await' this. It runs in the background.
            indexNewContent(existingUser._id.toString(), 'profile')
              .then(status => console.log(`[SEO] Profile indexed: ${status}`))
              .catch(err => console.error(`[SEO] Profile indexing failed:`, err));

          } else {
            // FIX: If user exists but has no avatar, sync it from Google!
            if (!existingUser.avatar && user.image) {
              existingUser.avatar = user.image;
              await existingUser.save();
            }
          }

          // FIX: explicitly attach the avatar and purchases to the NextAuth 'user' object
          // so it safely passes into the JWT callback below.
          user.id = existingUser._id.toString();
          user.role = existingUser.role;
          user.avatar = existingUser.avatar || user.image; 
          user.image = existingUser.avatar || user.image; 
          user.savedNotes = existingUser.savedNotes?.map(id => id.toString()) || [];
          user.purchasedNotes = existingUser.purchasedNotes?.map(id => id.toString()) || []; // 🚀 Attach to user object
          
          return true;
        } catch (error) {
          console.error("Error creating user from Google Login:", error);
          return false;
        }
      }
      return true; 
    },

    // 2. JWT: Persist User ID, Role, Avatar, and Purchases into the Token
    async jwt({ token, user, trigger, session }) {
      // Initial Sign In
      if (user) {
        token.id = user.id;
        token.role = user.role;
        // Prioritize our custom avatar field, fallback to default image
        token.picture = user.avatar || user.image; 
        token.savedNotes = user.savedNotes || []; 
        token.purchasedNotes = user.purchasedNotes || []; // 🚀 Persist purchases
      }
      
      // Handle Session Updates (Crucial for instant access after payment)
      if (trigger === "update" && session?.user) {
        if (session.user.image || session.user.avatar) {
            token.picture = session.user.avatar || session.user.image; 
        }
        if (session.user.name) {
          token.name = session.user.name;
        }
        if (session.user.savedNotes) {
          token.savedNotes = session.user.savedNotes;
        }
        if (session.user.purchasedNotes) {
          token.purchasedNotes = session.user.purchasedNotes; // 🚀 Update purchases in JWT
        }
      }
      
      return token;
    },

    // 3. Session: Expose User ID, Role, Avatar, and Purchases to the Client
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        // FIX: Map the token picture to BOTH image and avatar so your UI components 
        // can use session.user.avatar safely anywhere!
        session.user.image = token.picture; 
        session.user.avatar = token.picture; 
        session.user.savedNotes = token.savedNotes || []; 
        session.user.purchasedNotes = token.purchasedNotes || []; // 🚀 Expose to NoteCard
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
  trustHost: true, // 🚀 YOU MUST ADD THIS LINE HERE
};