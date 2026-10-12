import type { Metadata } from "next";
import { UsersAdmin } from "@/components/admin/users-admin";

export const metadata: Metadata = { title: "Accounts" };

export default function UsersPage() {
  return <UsersAdmin />;
}
