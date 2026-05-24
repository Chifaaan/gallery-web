// app/page.tsx — redirect ke /search
import { redirect } from "next/navigation";
export default function Home() { redirect("/search"); }
