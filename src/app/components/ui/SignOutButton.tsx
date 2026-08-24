"use client";

import { signOut } from "next-auth/react";
import PrimaryButton from "@/app/components/ui/PrimaryButton";

export default function SignOutButton() {
  return (
    <PrimaryButton
      type="button"
      onClick={() => signOut({ callbackUrl: "/" })}
    >
      Sign out
    </PrimaryButton>
  );
}
