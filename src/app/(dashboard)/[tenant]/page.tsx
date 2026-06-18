import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ tenant: string }>;
}

export default async function TenantRootPage({ params }: Props) {
  const { tenant } = await params;
  redirect(`/${tenant}/dashboard`);
}
