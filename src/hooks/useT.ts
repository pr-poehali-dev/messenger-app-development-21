import { useEffect, useState, useCallback } from "react";
import { getLang, setLang, subscribeLang, t as tRaw, type Lang } from "@/lib/i18n";

/**
 * Хук для перевода текстов и переключения языка.
 * Возвращает t(key) и setLang(lang). Перерисовывает компонент при смене языка.
 */
export function useT() {
  const [lang, setLangState] = useState<Lang>(getLang());

  useEffect(() => {
    return subscribeLang(() => setLangState(getLang()));
  }, []);

  const t = useCallback((key: string) => tRaw(key, lang), [lang]);

  return { t, lang, setLang };
}

export default useT;
