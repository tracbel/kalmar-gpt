// import { useEffect, useState } from "react";
// import { Language } from "../i18n/translations";

// export function useLanguage(): Language {
//   const [language, setLanguage] = useState<Language>("pt");

//   useEffect(() => {
//     const params = new URLSearchParams(window.location.search);
//     const langParam = params.get("lang");
//     if (langParam === "en") {
//       setLanguage("en");
//     } else {
//       setLanguage("pt"); // fallback padrão
//     }
//   }, []);

//   return language;
// }

import { useEffect, useState } from "react";
import { Language } from "../i18n/translations";

export function useLanguage(): Language {
  const [language, setLanguage] = useState<Language>("pt");

  useEffect(() => {
    const path = window.location.pathname;
    const langFromPath = path.split("/")[1]; // pega "en" de "/en"

    if (langFromPath === "en") {
      setLanguage("en");
    } else {
      setLanguage("pt"); // fallback
    }
  }, []);

  return language;
}
