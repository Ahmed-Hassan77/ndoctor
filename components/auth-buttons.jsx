"use client";

import { SignInButton, UserButton, useUser } from "@clerk/nextjs";
import { Button } from "./ui/button";
import { useLocale } from "@/components/locale-provider";

export default function AuthSection() {
  const { isSignedIn } = useUser();
  const { t } = useLocale();

  return (
    <>
      {!isSignedIn ? (
        <SignInButton mode="modal">
          <Button variant="secondary" size="sm">
            {t("nav.signIn")}
          </Button>
        </SignInButton>
      ) : (
        <UserButton
          appearance={{
            elements: {
              avatarBox: "w-10 h-10",
              userButtonPopoverCard: "shadow-xl",
              userPreviewMainIdentifier: "font-semibold",
            },
          }}
          afterSignOutUrl="/"
        />
      )}
    </>
  );
}
