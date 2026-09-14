import { redirect } from "next/navigation";

/** /explore merged into the home page — forward every old link, params intact. */
export function GET(request: Request): never {
  const url = new URL(request.url);
  redirect(`/${url.search}`);
}
