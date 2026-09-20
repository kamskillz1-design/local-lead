import React, { createContext, useContext, useMemo, useState } from "react";

const STRINGS = {
  en: {
    "nav.dashboard": "Dashboard",
    "nav.contacts": "Contacts",
    "nav.leads": "Leads",
    "nav.inbox": "Inbox",
    "nav.tasks": "Tasks",
    "nav.calendar": "Calendar",
    "nav.reports": "Reports",
    "nav.settings": "Settings",
    "nav.help": "Help",
    "common.search": "Search",
    "common.loading": "Loading…",
    "action.sign_out": "Sign out",
    "action.add_lead": "Add lead",
    "notifications.title": "Notifications",
    "notifications.mark_read": "Mark all read",
    "notifications.empty": "No notifications",
  },
};

const I18nContext = createContext(null);

export function getSupportedLanguages() {
  return ["en", "es", "eu"];
}

export function I18nProvider({ children }) {
  const [lang, setLang] = useState("en");
  const value = useMemo(
    () => ({
      lang,
      setLang,
      t: (key) => (STRINGS.en && STRINGS.en[key]) || key,
    }),
    [lang]
  );
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (ctx) return ctx;
  return {
    lang: "en",
    setLang: () => {},
    t: (key) => (STRINGS.en && STRINGS.en[key]) || key,
  };
}
