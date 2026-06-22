/**
 * Map Clerk user fields to local User profile fields (name, email, imageUrl only).
 * @param {import("@clerk/nextjs/server").User | null | undefined} clerkUser
 */
export function clerkProfileFromUser(clerkUser) {
  if (!clerkUser) {
    return { name: null, email: null, imageUrl: null };
  }

  const first = clerkUser.firstName ?? "";
  const last = clerkUser.lastName ?? "";
  const name =
    `${first} ${last}`.trim() ||
    clerkUser.username ||
    clerkUser.emailAddresses?.[0]?.emailAddress?.split("@")[0] ||
    "User";

  const primaryEmail = clerkUser.emailAddresses?.find(
    (e) => e.id === clerkUser.primaryEmailAddressId
  );
  const email =
    primaryEmail?.emailAddress ??
    clerkUser.emailAddresses?.[0]?.emailAddress ??
    null;

  const imageUrl = clerkUser.imageUrl ?? null;

  return { name, email, imageUrl };
}

/**
 * Build a Prisma update patch only for changed Clerk-sourced fields.
 * @param {Pick<import("@prisma/client").User, "name" | "email" | "imageUrl">} dbUser
 * @param {{ name: string | null; email: string | null; imageUrl: string | null }} clerkProfile
 */
export function clerkProfilePatch(dbUser, clerkProfile) {
  /** @type {import("@prisma/client").Prisma.UserUpdateInput} */
  const patch = {};

  if (clerkProfile.name && dbUser.name !== clerkProfile.name) {
    patch.name = clerkProfile.name;
  }

  if (clerkProfile.email && dbUser.email !== clerkProfile.email) {
    patch.email = clerkProfile.email;
  }

  const dbImage = dbUser.imageUrl ?? null;
  const clerkImage = clerkProfile.imageUrl ?? null;
  if (clerkImage !== dbImage) {
    patch.imageUrl = clerkImage;
  }

  return patch;
}

/**
 * @param {import("@prisma/client").Prisma.UserUpdateArgs} [updateArgs]
 */
export function hasClerkProfilePatch(patch) {
  return patch && Object.keys(patch).length > 0;
}
