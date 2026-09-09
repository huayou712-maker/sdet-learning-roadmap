import { identity } from "@/lib/auth/session";
import { isOwner } from "@/lib/github/authz";
import { authConfiguration } from "@/lib/auth/configuration";
import { Header } from "./header";
export async function Nav() {
  const session = await identity();
  return (
    <Header
      login={session?.login || null}
      owner={isOwner(session)}
      configured={authConfiguration().configured}
    />
  );
}
