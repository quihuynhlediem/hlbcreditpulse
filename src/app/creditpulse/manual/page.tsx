import { redirect } from "next/navigation";
/** The manual tier was replaced by customer-requested appeals (R-25, D-78). */
export default function Page() { redirect("/creditpulse/appeals"); }
