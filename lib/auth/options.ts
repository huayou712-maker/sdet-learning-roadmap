import type { NextAuthOptions } from "next-auth";
import GitHubProvider from "next-auth/providers/github";
export const authOptions: NextAuthOptions = {
  secret: process.env.AUTH_SECRET,
  session: { strategy: "jwt" },
  providers: [
    GitHubProvider({
      clientId: process.env.AUTH_GITHUB_ID || "",
      clientSecret: process.env.AUTH_GITHUB_SECRET || "",
      authorization: { params: { scope: "read:user" } },
    }),
  ],
  callbacks: {
    async jwt({ token, profile }) {
      if (profile && "login" in profile && typeof profile.login === "string")
        token.githubLogin = profile.login;
      return token;
    },
    async session({ session, token }) {
      return {
        ...session,
        githubLogin:
          typeof token.githubLogin === "string" ? token.githubLogin : null,
      };
    },
  },
  logger: {
    error() {
      /* Never serialize OAuth errors or secrets into logs. */
    },
    warn() {},
    debug() {},
  },
};
