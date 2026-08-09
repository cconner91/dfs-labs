import { generateAppIcon } from "@/lib/pwa-icon";

export function GET() {
  return generateAppIcon(180);
}
