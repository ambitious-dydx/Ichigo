import type { ReactNode } from "react";
import { ProductShell } from "../../src/components/product-app";
import { requireCurrentUser } from "../../src/server/auth";

export const dynamic = "force-dynamic";

export default async function ProductLayout({ children }: { children: ReactNode }) {
  const currentUser = await requireCurrentUser();

  return <ProductShell currentUser={currentUser}>{children}</ProductShell>;
}
