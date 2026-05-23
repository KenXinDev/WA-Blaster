import { NextAuthOptions, getServerSession as nextAuthGetServerSession } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

export const authOptions: NextAuthOptions = {
  // Use JWT strategy — no database needed
  session: {
    strategy: "jwt",
  },

  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID as string,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      // On first sign-in, user object is available
      if (user) {
        token.id = user.id ?? token.sub ?? token.email ?? "";
      }
      return token;
    },

    async session({ session, token }) {
      if (session.user) {
        // Use sub (Google ID) as the stable user ID
        session.user.id = (token.id as string) ?? (token.sub as string) ?? "";
      }
      return session;
    },

    async signIn({ user }) {
      if (!user.email) return false;
      return true;
    },
  },

  pages: {
    signIn: "/",
    error: "/",
  },
};

export async function getServerSession() {
  return nextAuthGetServerSession(authOptions);
}
