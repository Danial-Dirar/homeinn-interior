"use client";

import type { AuthUser } from "@homeinn/types";
import { createContext, useContext } from "react";

export interface AdminContextValue {
  user: AuthUser;
}

export const AdminContext = createContext<AdminContextValue | null>(null);

/** The signed-in person. Only rendered inside `AdminShell`, after the session is confirmed. */
export function useAdmin(): AdminContextValue {
  const value = useContext(AdminContext);
  if (!value) throw new Error("useAdmin() outside AdminShell");
  return value;
}
