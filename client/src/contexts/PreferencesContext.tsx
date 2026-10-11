import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { trpc } from "@/lib/trpc";

export const languages = [
  { code: "en", label: "English" }, { code: "it", label: "Italian" }, { code: "de", label: "German" },
  { code: "fr", label: "French" }, { code: "es", label: "Spanish" }, { code: "bg", label: "Bulgarian" },
] as const;
export const currencies = [
  { code: "USD", label: "US Dollar" }, { code: "EUR", label: "Euro" }, { code: "GBP", label: "British Pound" },
  { code: "CAD", label: "Canadian Dollar" }, { code: "AUD", label: "Australian Dollar" }, { code: "NGN", label: "Nigerian Naira" }, { code: "BGN", label: "Bulgarian Lev" },
] as const;
type Language = typeof languages[number]["code"];
type Currency = typeof currencies[number]["code"];
type TranslationKey = "plans" | "about" | "contact" | "login" | "openAccount" | "language" | "currency";

const translations: Record<Language, Record<TranslationKey, string>> = {
  en: { plans: "Plans", about: "About", contact: "Contact", login: "Log in", openAccount: "Open account", language: "Language", currency: "Currency" },
  it: { plans: "Piani", about: "Chi siamo", contact: "Contatti", login: "Accedi", openAccount: "Apri un conto", language: "Lingua", currency: "Valuta" },
  de: { plans: "Pläne", about: "Über uns", contact: "Kontakt", login: "Anmelden", openAccount: "Konto eröffnen", language: "Sprache", currency: "Währung" },
  fr: { plans: "Plans", about: "À propos", contact: "Contact", login: "Connexion", openAccount: "Ouvrir un compte", language: "Langue", currency: "Devise" },
  es: { plans: "Planes", about: "Nosotros", contact: "Contacto", login: "Iniciar sesión", openAccount: "Abrir cuenta", language: "Idioma", currency: "Moneda" },
  bg: { plans: "Планове", about: "За нас", contact: "Контакти", login: "Вход", openAccount: "Отвори сметка", language: "Език", currency: "Валута" },
};

const pageCopy: Record<string, Partial<Record<Language, string>>> = {};
function add(source: string, values: [string, string, string, string, string]) {
  pageCopy[source] = { it: values[0], de: values[1], fr: values[2], es: values[3], bg: values[4] };
}
// Shared navigation, shell, dashboard, and common action copy. Dynamic values remain untouched.
[
  ["Overview", "Panoramica", "Übersicht", "Aperçu", "Resumen", "Общ преглед"], ["Deposit", "Deposito", "Einzahlung", "Dépôt", "Depósito", "Депозит"], ["Invest", "Investi", "Investieren", "Investir", "Invertir", "Инвестиране"], ["Withdraw", "Preleva", "Auszahlung", "Retrait", "Retirar", "Теглене"], ["Transactions", "Transazioni", "Transaktionen", "Transactions", "Transacciones", "Транзакции"], ["Inbox", "Posta in arrivo", "Posteingang", "Boîte de réception", "Bandeja de entrada", "Входящи"], ["Settings", "Impostazioni", "Einstellungen", "Paramètres", "Configuración", "Настройки"], ["Control center", "Centro di controllo", "Kontrollzentrum", "Centre de contrôle", "Centro de control", "Контролен център"], ["Users", "Utenti", "Benutzer", "Utilisateurs", "Usuarios", "Потребители"], ["Deposits", "Depositi", "Einzahlungen", "Dépôts", "Depósitos", "Депозити"], ["Withdrawals", "Prelievi", "Auszahlungen", "Retraits", "Retiros", "Тегления"], ["Deposit addresses", "Indirizzi di deposito", "Einzahlungsadressen", "Adresses de dépôt", "Direcciones de depósito", "Адреси за депозит"], ["Email management", "Gestione email", "E-Mail-Verwaltung", "Gestión de correo", "Gestión de email", "Управление на имейли"], ["Activity log", "Registro attività", "Aktivitätsprotokoll", "Journal d’activité", "Registro de actividad", "Дневник на активността"], ["User portal", "Portale utente", "Benutzerportal", "Portail utilisateur", "Portal de usuario", "Потребителски портал"], ["Sign out", "Esci", "Abmelden", "Se déconnecter", "Cerrar sesión", "Изход"], ["Admin control center", "Centro di controllo admin", "Admin-Kontrollzentrum", "Centre de contrôle admin", "Centro de control admin", "Админ контролен център"], ["Personal vault", "Il tuo vault", "Persönlicher Vault", "Bóveda personal", "Bóveda personal", "Личен трезор"], ["Loading session", "Caricamento sessione", "Sitzung wird geladen", "Chargement de la session", "Cargando sesión", "Зареждане на сесия"], ["Collapse", "Comprimi", "Einklappen", "Réduire", "Contraer", "Свий"], ["Expand", "Espandi", "Erweitern", "Développer", "Expandir", "Разшири"],
  ["Available balance", "Saldo disponibile", "Verfügbares Guthaben", "Solde disponible", "Saldo disponible", "Наличен баланс"], ["Active investments", "Investimenti attivi", "Aktive Investitionen", "Investissements actifs", "Inversiones activas", "Активни инвестиции"], ["Total profit", "Profitto totale", "Gesamtgewinn", "Profit total", "Beneficio total", "Обща печалба"], ["Pending withdrawals", "Prelievi in sospeso", "Ausstehende Auszahlungen", "Retraits en attente", "Retiros pendientes", "Чакащи тегления"], ["Ready to allocate", "Pronto da investire", "Bereit zur Anlage", "Prêt à investir", "Listo para invertir", "Готово за инвестиране"], ["Plans in motion", "Piani attivi", "Laufende Pläne", "Plans en cours", "Planes activos", "Активни планове"], ["Recorded returns", "Rendimenti registrati", "Erfasste Renditen", "Rendements enregistrés", "Rendimientos registrados", "Отчетени доходи"], ["Awaiting review", "In attesa di revisione", "Warten auf Prüfung", "En attente d’examen", "Pendiente de revisión", "В очакване на преглед"], ["Capital pulse", "Stato del capitale", "Kapitalübersicht", "État du capital", "Estado del capital", "Състояние на капитала"], ["Next best move", "Prossimo passo", "Nächster Schritt", "Siguiente paso", "Следващ ход", "Следващ ход"], ["Recent activity", "Attività recenti", "Letzte Aktivitäten", "Activité récente", "Actividad reciente", "Последна активност"], ["View all", "Vedi tutto", "Alle anzeigen", "Tout voir", "Ver todo", "Виж всички"], ["Your ledger is quiet", "Il tuo registro è vuoto", "Dein Ledger ist leer", "Votre registre est calme", "Tu registro está vacío", "Вашият регистър е празен"], ["Crypto Flow Chat", "Chat Crypto Flow", "Crypto-Flow-Chat", "Chat Crypto Flow", "Chat Crypto Flow", "Crypto Flow чат"], ["Ask about your crypto journey", "Chiedi del tuo percorso crypto", "Frage zu deiner Krypto-Reise", "Pregunta sobre tu recorrido cripto", "Pregunta sobre tu camino cripto", "Попитай за своя крипто път"], ["Send", "Invia", "Senden", "Envoyer", "Enviar", "Изпрати"], ["Type your message…", "Scrivi il tuo messaggio…", "Nachricht eingeben…", "Écrivez votre message…", "Escribe tu mensaje…", "Въведете съобщение…"], ["Start a conversation", "Inizia una conversazione", "Gespräch starten", "Démarrer une conversation", "Iniciar una conversación", "Започнете разговор"], ["Prices refresh every minute", "I prezzi si aggiornano ogni minuto", "Preise werden jede Minute aktualisiert", "Les prix se mettent à jour chaque minute", "Los precios se actualizan cada minuto", "Цените се обновяват всяка минута"], ["Live market rail", "Mercato in tempo reale", "Live-Markt", "Marché en direct", "Mercado en vivo", "Пазар на живо"], ["Loading your vault…", "Caricamento del tuo vault…", "Dein Vault wird geladen…", "Chargement de votre vault…", "Cargando tu bóveda…", "Зареждане на вашия трезор…"], ["Put capital to work", "Metti il capitale al lavoro", "Kapital einsetzen", "Pon tu capital a trabajar", "Постави капитала в действие", "Поставете капитала в действие"], ["Server-verified account · balance changes are audited", "Account verificato dal server · le variazioni sono auditate", "Servergeprüftes Konto · Änderungen werden protokolliert", "Compte vérifié par le serveur · mouvements audités", "Cuenta verificada por servidor · cambios auditados", "Профилът е проверен от сървъра · промените се одитират"], ["Approved deposits and investments will appear here.", "Qui appariranno depositi e investimenti approvati.", "Genehmigte Einzahlungen und Investitionen erscheinen hier.", "Les dépôts et investissements approuvés apparaîtront ici.", "Aquí aparecerán depósitos e inversiones aprobados.", "Одобрените депозити и инвестиции ще се появят тук."],
].forEach(([source, it, de, fr, es, bg]) => add(source, [it, de, fr, es, bg]));

const originalText = new WeakMap<Text, string>();
const originalAttributes = new WeakMap<Element, Record<string, string>>();
function translateDocument(language: Language) {
  if (typeof document === "undefined") return;
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const text = node as Text;
    if (!text.parentElement || ["SCRIPT", "STYLE", "TEXTAREA"].includes(text.parentElement.tagName)) continue;
    const source = originalText.get(text) ?? text.nodeValue ?? "";
    originalText.set(text, source);
    const trimmed = source.trim();
    const translated = language === "en" ? trimmed : pageCopy[trimmed]?.[language];
    if (!translated) continue;
    const leading = source.match(/^\s*/)?.[0] ?? "";
    const trailing = source.match(/\s*$/)?.[0] ?? "";
    const next = `${leading}${translated}${trailing}`;
    if (text.nodeValue !== next) text.nodeValue = next;
  }
  document.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>("input,textarea,select,[aria-label]").forEach(element => {
    const attrs = originalAttributes.get(element) ?? {};
    ["placeholder", "aria-label", "title"].forEach(attribute => {
      const current = element.getAttribute(attribute);
      if (current && attrs[attribute] === undefined) attrs[attribute] = current;
      const source = attrs[attribute];
      const translated = source && language !== "en" ? pageCopy[source]?.[language] : source;
      if (translated) element.setAttribute(attribute, translated);
    });
    originalAttributes.set(element, attrs);
  });
}

type PreferencesValue = { language: Language; currency: Currency; setLanguage: (language: Language) => void; setCurrency: (currency: Currency) => void; t: (key: TranslationKey) => string };
const PreferencesContext = createContext<PreferencesValue | null>(null);
function stored<T extends string>(key: string, fallback: T, allowed: readonly { code: T }[]) { const value = window.localStorage.getItem(key) as T | null; return value && allowed.some(item => item.code === value) ? value : fallback; }
export function PreferencesProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => stored("vaultora-language", "en", languages));
  const [currency, setCurrencyState] = useState<Currency>(() => stored("vaultora-currency", "USD", currencies));
  const rates = trpc.currency.rates.useQuery(undefined, { staleTime: 15 * 60_000, refetchInterval: 15 * 60_000 });
  useEffect(() => { window.localStorage.setItem("vaultora-language", language); document.documentElement.lang = language; translateDocument(language); const observer = new MutationObserver(() => translateDocument(language)); observer.observe(document.body, { subtree: true, childList: true }); return () => observer.disconnect(); }, [language]);
  useEffect(() => { window.localStorage.setItem("vaultora-currency", currency); }, [currency]);
  useEffect(() => { (window as any).__vaultoraRates = rates.data ?? { USD: 1 }; }, [rates.data]);
  const value = useMemo(() => ({ language, currency, setLanguage: setLanguageState, setCurrency: setCurrencyState, t: (key: TranslationKey) => translations[language][key] }), [language, currency]);
  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}
export function usePreferences() { const value = useContext(PreferencesContext); if (!value) throw new Error("usePreferences must be used inside PreferencesProvider"); return value; }
export function PreferenceSelectors() { const { language, currency, setLanguage, setCurrency, t } = usePreferences(); return <div className="preference-controls"><label><span>{t("language")}</span><select value={language} onChange={event => setLanguage(event.target.value as Language)} aria-label={t("language")}>{languages.map(item => <option key={item.code} value={item.code}>{item.label}</option>)}</select></label><label><span>{t("currency")}</span><select value={currency} onChange={event => setCurrency(event.target.value as Currency)} aria-label={t("currency")}>{currencies.map(item => <option key={item.code} value={item.code}>{item.code} — {item.label}</option>)}</select></label></div>; }
