import { redirect } from "next/navigation";

interface Props {
  params: Promise<{ tenant: string }>;
}

export default async function SettingsIndexPage({ params }: Props) {
  const { tenant } = await params;
  redirect(`/${tenant}/settings/profile`);
}
