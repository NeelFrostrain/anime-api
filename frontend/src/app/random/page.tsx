import { redirect } from "next/navigation";
import { api } from "@/lib/api";

export default async function RandomPage() {
  try {
    const res = await api.getRandomAnime();
    if (res?.id) {
      redirect(`/anime/${res.id}`);
    }
  } catch {}
  redirect("/trending");
}
