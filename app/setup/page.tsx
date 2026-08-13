import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import SetupForm from "./setup-form";

// Never cached: the decision depends on live row counts.
export const dynamic = "force-dynamic";

// First-run screen. Creates the first admin account. Once any user exists it
// redirects to the login page, so it cannot be used to add further users.
export default async function SetupPage() {
  const userCount = await prisma.appUser.count();
  if (userCount > 0) {
    redirect("/login");
  }

  return <SetupForm />;
}
