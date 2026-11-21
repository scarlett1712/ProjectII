import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin({
  requestConfig: "./src/shared/i18n/request.ts",
  experimental: {
    // Generate messages/vi.d.json.ts so TypeScript also checks ICU arguments such as {title} and {count}.
    createMessagesDeclaration: "./messages/vi.json",
  },
});

const nextConfig: NextConfig = {};

export default withNextIntl(nextConfig);
