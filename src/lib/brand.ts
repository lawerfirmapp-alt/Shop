/** Shop logo, served from the app's own files so it works on any host. */
export const LOGO_SRC = "/brand/tsholo-r-fashion-house-logo.png";

/** Google sign-in goes through Lovable's sign-in service, which only exists on Lovable hosting. */
export function googleSignInAvailable(hostname: string) {
  return hostname === "localhost" || /(^|\.)lovable(project)?\.(app|dev|com)$/.test(hostname);
}
