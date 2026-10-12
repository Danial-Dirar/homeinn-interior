import type { Metadata } from "next";
import { AccountForm } from "@/components/admin/account-form";

export const metadata: Metadata = { title: "Your password" };

export default function AccountPage() {
  return <AccountForm />;
}
