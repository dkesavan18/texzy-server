/** Format a value compatible with existing `timetz` columns. */
export function dbTimetzNow(): string {
  return new Date().toTimeString().split(' ')[0];
}

export function sanitizeUser(user: {
  userId: string;
  email: string | null;
  phone: string | null;
  roleId: number | null;
  isActive: boolean | null;
  isCustomer: boolean | null;
  loginProvider: string | null;
  googleId: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  passwordHash?: string | null;
}) {
  return {
    userId: user.userId,
    email: user.email,
    phone: user.phone,
    roleId: user.roleId,
    isActive: user.isActive,
    isCustomer: user.isCustomer,
    loginProvider: user.loginProvider,
    hasGoogleLinked: Boolean(user.googleId),
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}
