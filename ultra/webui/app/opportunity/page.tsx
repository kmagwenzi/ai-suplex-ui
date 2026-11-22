import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/** The Mapper is the front door now; this path stays alive for old links. */
export default function OpportunityAlias() {
  redirect("/");
}
