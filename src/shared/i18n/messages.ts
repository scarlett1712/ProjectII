import vi from "../../../messages/vi.json";
import type { AppLocale } from "./locales";

/** Message catalogs by language. messages/vi.json defines the keys required in every locale. */
export const messagesByLocale: Record<AppLocale, typeof vi> = { vi };
