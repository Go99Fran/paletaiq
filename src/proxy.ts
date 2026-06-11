import createProxy from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createProxy(routing);

export const config = {
  // Todo menos /api, archivos estáticos e internals de Next
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
