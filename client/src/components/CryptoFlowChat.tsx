import { useState } from "react";
import { MessageCircle, Send, Sparkles, UserRound } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { usePreferences } from "../contexts/PreferencesContext";

type ChatMessage = { role: "user" | "assistant"; content: string };

export function CryptoFlowChat() {
  const { language } = usePreferences();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const chat = trpc.dashboard.cryptoChat.useMutation({ onSuccess: response => setMessages(current => [...current, response]), onError: error => setMessages(current => [...current, { role: "assistant", content: error.message }]) });
  const submit = (event: React.FormEvent) => { event.preventDefault(); const content = input.trim(); if (!content || chat.isPending) return; const next = [...messages, { role: "user" as const, content }]; setMessages(next); setInput(""); chat.mutate({ language, messages: next }); };
  return <div className="crypto-flow-chat"><div className="crypto-chat-head"><div className="crypto-chat-title"><span className="crypto-chat-icon"><MessageCircle size={17}/></span><div><strong>Crypto Flow Chat</strong><small>Guidance for your next move</small></div></div><span className="live-chip"><i/> Secure</span></div><div className="crypto-chat-messages">{!messages.length ? <div className="crypto-chat-empty"><Sparkles size={25}/><strong>Ask about your crypto flow</strong><p>Get clear guidance on deposits, withdrawals, plans, balance, and market context.</p><div className="crypto-chat-prompts"><button type="button" onClick={() => setInput("How do I make a deposit?")}>How do I deposit?</button><button type="button" onClick={() => setInput("Explain the investment plans")}>Explain the plans</button><button type="button" onClick={() => setInput("What is the BTC price?")}>BTC price</button></div></div> : messages.map((message, index) => <div className={`crypto-chat-message ${message.role}`} key={`${message.role}-${index}`}>{message.role === "assistant" && <span className="crypto-chat-avatar"><Sparkles size={13}/></span>}<p>{message.content}</p>{message.role === "user" && <span className="crypto-chat-avatar user"><UserRound size={13}/></span>}</div>)}{chat.isPending && <div className="crypto-chat-message assistant"><span className="crypto-chat-avatar"><Sparkles size={13}/></span><p className="typing-dots">Thinking…</p></div>}</div><form className="crypto-chat-form" onSubmit={submit}><input value={input} onChange={event => setInput(event.target.value)} placeholder="Type your message…" aria-label="Type your message"/><button type="submit" disabled={!input.trim() || chat.isPending} aria-label="Send"><Send size={15}/></button></form></div>;
}
