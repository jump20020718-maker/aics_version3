import { MOCK_HANDOFFS } from "@/lib/mock-data";
import { HandoffShell } from "@/components/handoff/HandoffShell";

export default function HandoffPage() {
  return <HandoffShell cases={MOCK_HANDOFFS} />;
}
