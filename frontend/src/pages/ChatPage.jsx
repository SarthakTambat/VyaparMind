import React, { useEffect, useRef, useState } from "react";
import { api } from "lib/api";
import { useLanguage } from "lib/i18n";
import { Microphone, Camera, PaperPlaneTilt, Lightning, Stop, Robot, ClockCounterClockwise, CaretDown, CaretUp, SpeakerHigh } from "@phosphor-icons/react";
import { toast } from "sonner";

export default function ChatPage() {
  const [msgs, setMsgs] = useState([]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [recording, setRecording] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const scrollRef = useRef(null);
  const fileRef = useRef(null);
  const { t } = useLanguage();

  // Text-to-Speech helper — speaks AI reply aloud
  const speakReply = (text) => {
    if (!window.speechSynthesis || !text) return;
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    // Try to find a Hindi voice, fall back to default
    const voices = window.speechSynthesis.getVoices();
    const hindiVoice = voices.find(v => v.lang.startsWith("hi")) || voices.find(v => v.lang.startsWith("en-IN")) || voices[0];
    if (hindiVoice) utterance.voice = hindiVoice;
    utterance.lang = "hi-IN";
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  const loadHistory = async () => {
    if (history.length > 0) return; // already loaded
    setHistoryLoading(true);
    try {
      const { data } = await api.get("/api/conversations?limit=50");
      setHistory(data.items || []);
    } catch { /* ignore */ }
    finally { setHistoryLoading(false); }
  };

  const toggleHistory = () => {
    if (!showHistory) loadHistory();
    setShowHistory(!showHistory);
  };

  const push = (m) => setMsgs((prev) => [...prev, { id: crypto.randomUUID(), ...m }]);

  const handleSend = async () => {
    const t = text.trim();
    if (!t || busy) return;
    push({ side: "user", text: t });
    setText("");
    setBusy(true);
    try {
      const { data } = await api.post("/api/chat/text", { text: t });
      push({ side: "ai", text: data.parsed?.reply || "Got it.", actions: data.actions });
    } catch (e) {
      push({ side: "ai", text: "Couldn't reach the AI. Try again in a moment.", error: true });
    } finally { setBusy(false); }
  };

  const startRec = async () => {
    // Use Web Speech API for real-time transcription (works offline, supports Hindi/English)
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      toast.error("Speech recognition not supported in this browser. Try Chrome.");
      return;
    }
    try {
      const recognition = new SpeechRecognition();
      recognition.lang = "hi-IN"; // Hindi + English mixed (supports Hinglish)
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;
      recognition.continuous = true; // Keep listening until user manually stops

      // Accumulate transcript pieces as user speaks
      let fullTranscript = "";

      recognition.onresult = (event) => {
        // Collect all new results (continuous mode fires multiple times)
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            fullTranscript += event.results[i][0].transcript + " ";
          }
        }
      };

      recognition.onerror = (event) => {
        setRecording(false);
        if (event.error === "not-allowed") {
          toast.error("Microphone access denied. Please allow microphone permissions.");
        } else if (event.error === "no-speech") {
          push({ side: "ai", text: "No speech detected. Please try again.", error: true });
        } else if (event.error !== "aborted") {
          push({ side: "ai", text: `Voice error: ${event.error}. Try typing instead.`, error: true });
        }
      };

      // When user stops recording, process the full transcript
      recognition.onend = async () => {
        setRecording(false);
        const transcript = fullTranscript.trim();
        if (!transcript) {
          push({ side: "ai", text: "Couldn't understand the voice. Please try again.", error: true });
          return;
        }
        push({ side: "user", text: `\ud83c\udfa4 "${transcript}"` });
        setBusy(true);
        try {
          const { data } = await api.post("/api/chat/text", { text: transcript });
          const reply = data.parsed?.reply || "Got it.";
          push({ side: "ai", text: reply, actions: data.actions, spoken: true });
          speakReply(reply);
        } catch (e) {
          push({ side: "ai", text: "Couldn't reach the AI. Try again.", error: true });
        } finally { setBusy(false); }
      };

      recognition.start();
      recRef.current = recognition;
      setRecording(true);
    } catch (e) {
      toast.error("Microphone access denied");
    }
  };

  const stopRec = () => {
    if (recRef.current) {
      recRef.current.stop();
    }
    setRecording(false);
  };

  const handlePhoto = async (file) => {
    if (!file) return;
    push({ side: "user", text: "\ud83d\udcf7 Bill photo", img: URL.createObjectURL(file) });
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("note", "Extract transactions from this bill/receipt.");
      const { data } = await api.post("/api/chat/photo", fd, { headers: { "Content-Type": "multipart/form-data" } });
      push({ side: "ai", text: data.parsed?.reply || "Got it.", actions: data.actions });
    } catch (e) {
      push({ side: "ai", text: "Photo analysis failed.", error: true });
    } finally { setBusy(false); }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-display font-black text-xl tracking-tight text-slate-900">{t("chat.title")}</h1>
            <p className="text-sm text-slate-500">{t("chat.placeholder")}</p>
          </div>
          <button onClick={toggleHistory} className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-bold tracking-widest uppercase text-signal hover:bg-emerald-50 transition-colors" style={{ borderRadius: 4 }}>
            <ClockCounterClockwise size={16} /> History {showHistory ? <CaretUp size={12} /> : <CaretDown size={12} />}
          </button>
        </div>
      </div>

      {/* Chat History Panel (hidden by default) */}
      {showHistory && (
        <div className="border-b border-slate-200 bg-slate-50 max-h-64 overflow-y-auto">
          <div className="px-6 py-3">
            <div className="label-tiny text-slate-500 mb-2">Past conversations</div>
            {historyLoading ? (
              <div className="text-sm text-slate-400 py-2">Loading...</div>
            ) : history.length === 0 ? (
              <div className="text-sm text-slate-400 py-2">No past conversations yet.</div>
            ) : (
              <ul className="space-y-1.5">
                {history.map((h) => (
                  <li key={h.id} className="flex items-start gap-2.5 p-2.5 bg-white border border-slate-200 text-sm" style={{ borderRadius: 4 }}>
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-slate-700 font-medium">{h.raw_input}</div>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] text-slate-400 tracking-wider uppercase">
                          {new Date(h.created_at).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" })}
                        </span>
                        <span className="text-[10px] font-bold text-signal tracking-wider uppercase">
                          {h.actions_count} action{h.actions_count === 1 ? "" : "s"}
                        </span>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-3">
        {msgs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <Robot size={48} className="text-slate-300 mb-4" />
            <p className="text-slate-400 text-sm">Send your first message {"\u2014"} try: {"\"sold 2kg tomato \u20B980 to Amit\""}</p>
          </div>
        )}
        {msgs.map((m) => <Bubble key={m.id} m={m} />)}
        {busy && (
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Lightning weight="fill" size={14} className="text-signal animate-pulse" /> {"AI is thinking\u2026"}
          </div>
        )}
      </div>

      {/* Input */}
      <div className="px-6 py-4 border-t border-slate-200 bg-white">
        <div className="flex items-center gap-2">
          <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={(e) => { handlePhoto(e.target.files?.[0]); e.target.value = ""; }} />
          <button onClick={() => fileRef.current?.click()} className="p-2.5 text-slate-400 hover:text-signal transition-colors" title="Attach a photo">
            <Camera size={22} />
          </button>
          {recording ? (
            <button onClick={stopRec} className="p-2.5 text-rose-600" title="Stop recording">
              <Stop weight="fill" size={22} />
            </button>
          ) : (
            <button onClick={startRec} className="p-2.5 text-slate-400 hover:text-signal transition-colors" title="Voice note">
              <Microphone size={22} />
            </button>
          )}
          <input
            type="text"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={t("chat.placeholder")}
            className="flex-1 px-4 py-2.5 border border-slate-200 bg-slate-50 text-sm outline-none focus:ring-1 focus:ring-signal focus:border-signal"
            style={{ borderRadius: 4 }}
            disabled={busy}
          />
          <button
            onClick={handleSend}
            disabled={!text.trim() || busy}
            className="p-2.5 bg-signal text-white hover:bg-[#008F6F] transition-colors disabled:opacity-50"
            style={{ borderRadius: 4 }}
          >
            <PaperPlaneTilt weight="fill" size={18} />
          </button>
        </div>
        {recording && (
          <div className="mt-2 text-xs text-rose-600 tracking-widest uppercase font-bold flex items-center gap-2">
            <span className="w-2 h-2 bg-rose-600 rounded-full animate-pulse" /> {"recording \u2014 tap stop when done"}
          </div>
        )}
      </div>
    </div>
  );
}

function Bubble({ m }) {
  if (m.side === "user-transcript") {
    return (
      <div className="flex justify-end">
        <div className="text-[11px] text-slate-500 italic">{m.text}</div>
      </div>
    );
  }
  const isUser = m.side === "user";
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[80%] px-3.5 py-2.5 text-sm leading-relaxed ${
          isUser ? "bg-slate-900 text-white" : m.error ? "bg-rose-50 border border-rose-200 text-rose-900" : "bg-emerald-50 border border-emerald-100 text-slate-800"
        }`}
        style={{ borderRadius: 4 }}
      >
        {m.img && <img src={m.img} alt="upload" className="mb-2 max-h-40 object-cover" style={{ borderRadius: 3 }} />}
        {m.audio && <audio src={m.audio} controls className="mb-2 max-w-full" />}
        <div className="whitespace-pre-wrap">{m.text}</div>
        {!isUser && !m.error && (
          <button
            onClick={() => {
              if (!window.speechSynthesis) return;
              window.speechSynthesis.cancel();
              const u = new SpeechSynthesisUtterance(m.text);
              const voices = window.speechSynthesis.getVoices();
              const v = voices.find(v => v.lang.startsWith("hi")) || voices.find(v => v.lang.startsWith("en-IN")) || voices[0];
              if (v) u.voice = v;
              u.lang = "hi-IN";
              window.speechSynthesis.speak(u);
            }}
            className="mt-1.5 text-[10px] text-slate-400 hover:text-signal flex items-center gap-1 transition-colors"
            title="Listen to reply"
          >
            <SpeakerHigh size={12} /> Listen
          </button>
        )}
        {m.actions?.length > 0 && (
          <div className="mt-2.5 pt-2.5 border-t border-emerald-200 space-y-1">
            {m.actions.map((a, i) => <ActionChip key={i} a={a} />)}
          </div>
        )}
      </div>
    </div>
  );
}

function ActionChip({ a }) {
  if (a.kind === "transaction") {
    const d = a.data;
    return <div className="text-[11px] tracking-wider uppercase font-bold text-emerald-800">{"\u2713"} {d.type}: {"\u20B9"}{Math.round(d.amount)} {"\u00B7"} {d.category}{d.party_name ? ` \u00b7 ${d.party_name}` : ""}</div>;
  }
  if (a.kind === "inventory") {
    return <div className="text-[11px] tracking-wider uppercase font-bold text-emerald-800">{"\u2713"} inventory: {a.data.name} {"\u2192"} {a.data.quantity}{a.data.unit || ""}</div>;
  }
  if (a.kind === "insight") {
    return <div className="text-[11px] tracking-wider uppercase font-bold text-amber-700">{"\ud83d\udca1"} {a.data.title}</div>;
  }
  return null;
}
