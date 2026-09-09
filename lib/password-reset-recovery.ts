export const PASSWORD_RECOVERY_COOKIE = "artimenu_password_recovery";
export const PASSWORD_RECOVERY_COOKIE_MAX_AGE_SECONDS = 15 * 60;

export type PasswordResetAttempt = {
  email: string | null;
  error: boolean;
  userId: string | null;
};

type PasswordResetActions = {
  updatePassword: (password: string) => Promise<PasswordResetAttempt>;
  verifyPassword: (email: string, password: string) => Promise<PasswordResetAttempt>;
};

export type PasswordResetResult =
  | { ok: true; userId: string }
  | { ok: false; reason: "update-failed" | "verification-failed" };

export async function updateAndVerifyPassword(
  actions: PasswordResetActions,
  password: string,
): Promise<PasswordResetResult> {
  try {
    const updated = await actions.updatePassword(password);

    if (updated.error || !updated.userId || !updated.email) {
      return { ok: false, reason: "update-failed" };
    }

    const verified = await actions.verifyPassword(updated.email, password);

    if (verified.error || verified.userId !== updated.userId) {
      return { ok: false, reason: "verification-failed" };
    }

    return { ok: true, userId: updated.userId };
  } catch {
    return { ok: false, reason: "verification-failed" };
  }
}
