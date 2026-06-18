import { auth, currentUser } from "@clerk/nextjs/server";
import { cache } from "react";
import { db } from "./prisma";
import { databaseErrorCode, logDatabaseIssue } from "./db-safe";
import {
  clerkProfileFromUser,
  clerkProfilePatch,
  hasClerkProfilePatch,
} from "./clerk-profile-sync";

const userWithMonthlyTransactions = {
  transactions: {
    where: {
      type: "CREDIT_PURCHASE",
      createdAt: {
        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
      },
    },
    orderBy: { createdAt: "desc" },
    take: 1,
  },
};

/**
 * Clerk Backend API (used by currentUser). Failures must not crash the app shell.
 * @returns {Promise<import("@clerk/nextjs/server").User | null>}
 */
async function fetchClerkUserSafe() {
  try {
    return await currentUser();
  } catch (error) {
    const clerkMsg =
      error?.errors?.[0]?.message ??
      error?.message ??
      (typeof error === "string" ? error : "unknown");
    console.warn(
      "[checkUser] Clerk Backend API unavailable; using session + database only:",
      clerkMsg
    );
    return null;
  }
}

/**
 * Load the signed-in user from DB, creating on first sign-in when Clerk API is reachable.
 * Uses auth() for session (no Backend API). Syncs profile from Clerk when the API responds.
 * Cached per request so header + page share one lookup.
 */
export const checkUser = cache(async () => {
  const { userId } = await auth();
  if (!userId) {
    return null;
  }

  try {
    const loggedInUser = await db.user.findUnique({
      where: { clerkUserId: userId },
      include: userWithMonthlyTransactions,
    });

    const clerkUser = await fetchClerkUserSafe();

    if (loggedInUser) {
      if (!clerkUser) {
        return loggedInUser;
      }

      const clerkProfile = clerkProfileFromUser(clerkUser);
      const patch = clerkProfilePatch(loggedInUser, clerkProfile);

      if (hasClerkProfilePatch(patch)) {
        return db.user.update({
          where: { id: loggedInUser.id },
          data: patch,
          include: userWithMonthlyTransactions,
        });
      }

      return loggedInUser;
    }

    if (!clerkUser) {
      console.warn(
        "[checkUser] Signed-in session but no DB user and Clerk API unavailable — complete onboarding after connectivity is restored."
      );
      return null;
    }

    const clerkProfile = clerkProfileFromUser(clerkUser);

    const newUser = await db.user.create({
      data: {
        clerkUserId: userId,
        name: clerkProfile.name ?? "User",
        imageUrl: clerkProfile.imageUrl,
        email: clerkProfile.email ?? "",
        transactions: {
          create: {
            type: "CREDIT_PURCHASE",
            packageId: "free_user",
            amount: 0,
          },
        },
      },
      include: userWithMonthlyTransactions,
    });

    return newUser;
  } catch (error) {
    logDatabaseIssue("checkUser", error);
    if (databaseErrorCode(error)) {
      return null;
    }
    if (process.env.NODE_ENV === "development") {
      console.warn("checkUser failed:", error?.message ?? error);
    }
    return null;
  }
});
