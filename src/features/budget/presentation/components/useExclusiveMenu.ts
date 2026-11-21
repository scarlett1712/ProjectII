import { useCallback, useState } from "react";

/** Keep only one dropdown open at a time within a form. */
export function useExclusiveMenu<K extends string>() {
  const [openMenu, setOpenMenu] = useState<K | null>(null);

  const menuProps = (key: K) => ({
    open: openMenu === key,
    onOpenChange: (open: boolean) =>
      setOpenMenu((current) => (open ? key : current === key ? null : current)),
  });

  const closeMenus = useCallback(() => setOpenMenu(null), []);

  return { menuProps, closeMenus };
}
