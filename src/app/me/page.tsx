import { redirect } from "next/navigation";

export default async function StudentHomePage() {
  redirect("/student/profile");
}
