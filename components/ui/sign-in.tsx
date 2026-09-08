"use client";
import { signIn, signOut } from "next-auth/react";
export function SignIn({
  loggedIn,
  configured,
}: {
  loggedIn: boolean;
  configured: boolean;
}) {
  return (
    <button
      disabled={!loggedIn && !configured}
      onClick={() => (loggedIn ? signOut() : signIn("github"))}
    >
      {loggedIn ? "退出登录" : "使用 GitHub 登录"}
    </button>
  );
}
