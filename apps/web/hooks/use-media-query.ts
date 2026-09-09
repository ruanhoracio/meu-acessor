"use client";

import { useEffect, useState } from "react";

/**
 * `true` quando a media query bate. Começa em `false` para o HTML do servidor
 * e do primeiro render do cliente coincidirem (sem erro de hidratação).
 */
export function useMediaQuery(query: string): boolean {
  const [bate, setBate] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    const atualizar = () => setBate(mql.matches);
    atualizar();
    mql.addEventListener("change", atualizar);
    return () => mql.removeEventListener("change", atualizar);
  }, [query]);

  return bate;
}
