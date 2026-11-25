import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    "coverage/**",
  ]),
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "warn",
      // Treat unused variables and imports as errors to keep dead code out.
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
        },
      ],
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/purity": "warn",
      "react/no-unescaped-entities": "warn",
      "prefer-const": "warn",
    },
  },
  ...architectureRules(),
  ...designTokenRules(),
]);

/** Use design tokens from src/shared/theme for colors, font sizes, radii and shadows. Use route constants for paths. */
function designTokenRules() {
  const arbitrary = String.raw`(?:-\[#[0-9A-Fa-f]{3,8}\]|text-\[[0-9.]+px\]|rounded(?:-[trblse]{1,2})?-\[[0-9.]+px\]|shadow-\[[^\]]*rgba)`;
  const hexLiteral = String.raw`^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$`;
  const classMessage = "Dùng design token (vd text-primary, text-2xs, rounded-panel, shadow-card) thay vì giá trị Tailwind viết cứng.";
  const hexMessage = "Dùng colors.* (src/shared/theme/tokens.ts) hoặc palettes.ts thay vì mã màu viết cứng.";
  const tokenSelectors = [
    { selector: `Literal[value=/${arbitrary}/]`, message: classMessage },
    { selector: `TemplateElement[value.raw=/${arbitrary}/]`, message: classMessage },
    { selector: `Literal[value=/${hexLiteral}/]`, message: hexMessage },
  ];
  // Accented Vietnamese letters, excluding the multiplication and division signs in the same Unicode range.
  const vietnamese = "[À-ÖØ-öø-ỹĐđ]";
  const textMessage = "Đưa text giao diện vào messages/vi.json và dùng useTranslations()/getTranslations() thay vì viết thẳng trong component.";
  const textSelectors = [
    { selector: `JSXText[value=/${vietnamese}/]`, message: textMessage },
    { selector: `Literal[value=/${vietnamese}/]`, message: textMessage },
    { selector: `TemplateElement[value.raw=/${vietnamese}/]`, message: textMessage },
  ];
  // Page, API and asset paths come from src/shared/config/routes.ts.
  const routeLiteral = String.raw`^\x2F(api\x2F|login|register|forgot-password|setup\x2F|dashboard|diary|budget|calendar|chat|nutrition|tasks|water|chatbot-star)`;
  // ESLint selectors require the slash in this regex to be written as \x2F.
  const routeMessage = "Dùng ROUTES / API_ROUTES / ASSETS và withQuery() từ @/shared/config/routes thay vì viết cứng đường dẫn.";
  tokenSelectors.push(
    { selector: `Literal[value=/${routeLiteral}/]`, message: routeMessage },
    { selector: `TemplateLiteral > TemplateElement:first-child[value.raw=/${routeLiteral}/]`, message: routeMessage },
  );
  const ignores = [
    "src/shared/theme/**", "src/shared/infrastructure/email.ts", "**/*.test.ts", "**/*.test.tsx",
    "src/shared/config/routes.ts",
    // Next.js requires a literal config.matcher for static analysis.
    "src/proxy.ts",
  ];
  const uiFiles = ["src/features/*/presentation/**/*.tsx", "src/shared/ui/**/*.tsx"];
  // Only the last matching no-restricted-syntax rule applies, so UI files need both sets of restrictions.
  return [
    { files: ["src/**/*.{ts,tsx}"], ignores, rules: { "no-restricted-syntax": ["error", ...tokenSelectors] } },
    { files: uiFiles, ignores, rules: { "no-restricted-syntax": ["error", ...tokenSelectors, ...textSelectors] } },
  ];
}

/**
 * Dependency rules for the feature-based architecture:
 * Presentation calls application, which calls domain. Only infrastructure accesses the database. Shared code is independent of features.
 * Only the last matching no-restricted-imports rule applies to each file. More specific groups come last
 * and include the patterns from broader groups.
 */
function architectureRules() {
  const dbOnlyInInfrastructure = {
    group: ["@/shared/infrastructure/db", "**/infrastructure/db"],
    message: "Chỉ tầng infrastructure (repository) được import db.",
  };
  const sharedIsFeatureAgnostic = {
    group: ["@/features/*", "@/features/**"],
    message: "shared/ không được phụ thuộc vào feature.",
  };
  const noPresentation = {
    group: ["**/presentation/**", "next/*", "next"],
    message: "application/domain không được phụ thuộc vào presentation hay Next.js.",
  };
  const domainIsPure = {
    group: ["**/application/**", "**/infrastructure/**", "@prisma/client"],
    message: "domain chỉ chứa logic thuần, không phụ thuộc tầng khác hay Prisma.",
  };
  const clientIsNotServer = {
    group: ["**/infrastructure/**", "**/application/*UseCases", "**/application/*UseCases.ts"],
    message: "Code giao diện (client) gọi API qua fetch, không import use case/infrastructure phía server.",
  };
  const rule = (...patterns) => ["error", { patterns }];
  const tests = ["**/*.test.ts", "**/*.test.tsx"];

  return [
    { files: ["src/**/*.{ts,tsx}"], ignores: ["src/**/infrastructure/**", ...tests],
      rules: { "no-restricted-imports": rule(dbOnlyInInfrastructure) } },
    { files: ["src/shared/**/*.{ts,tsx}"], ignores: ["src/shared/infrastructure/**", ...tests],
      rules: { "no-restricted-imports": rule(dbOnlyInInfrastructure, sharedIsFeatureAgnostic) } },
    { files: ["src/features/*/application/**"], ignores: tests,
      rules: { "no-restricted-imports": rule(dbOnlyInInfrastructure, noPresentation) } },
    { files: ["src/shared/application/**"], ignores: tests,
      rules: { "no-restricted-imports": rule(dbOnlyInInfrastructure, noPresentation, sharedIsFeatureAgnostic) } },
    { files: ["src/features/*/domain/**"], ignores: tests,
      rules: { "no-restricted-imports": rule(dbOnlyInInfrastructure, noPresentation, domainIsPure) } },
    { files: ["src/shared/domain/**"], ignores: tests,
      rules: { "no-restricted-imports": rule(dbOnlyInInfrastructure, noPresentation, domainIsPure, sharedIsFeatureAgnostic) } },
    { files: ["src/features/*/presentation/**/*.tsx", "src/features/*/presentation/*.ts"], ignores: tests,
      rules: { "no-restricted-imports": rule(dbOnlyInInfrastructure, clientIsNotServer) } },
    { files: ["src/shared/ui/**", "src/shared/client/**"], ignores: tests,
      rules: { "no-restricted-imports": rule(dbOnlyInInfrastructure, sharedIsFeatureAgnostic, clientIsNotServer) } },
  ];
}

export default eslintConfig;
