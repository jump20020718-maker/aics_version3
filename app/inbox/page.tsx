import { MOCK_SESSIONS } from "@/lib/mock-data";
import { InboxShell } from "@/components/inbox/InboxShell";

export const dynamic = "force-dynamic";

export default function InboxPage({
  searchParams
}: {
  searchParams: { session?: string };
}) {
  const initialId = searchParams.session ?? MOCK_SESSIONS[0].id;
  return <InboxShell sessions={MOCK_SESSIONS} initialSessionId={initialId} />;
}
