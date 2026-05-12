import { useCallback, useEffect, useMemo, useState } from "react";
import HeroGraphic from "./HeroGraphic";
import StatusBanner from "./StatusBanner";
import HistoryView from "./HistoryView";
import AdminLoginModal from "./AdminLoginModal";
import { formatApiError, postSendmail, sendSuccess } from "../api/sendmail";
import { adminMe, getStoredToken, storeToken } from "../api/admin";
import { parseExcelEmailsFromFile } from "../lib/parseExcelEmails";

export default function BulkMailApp() {
  const [subject, setSubject] = useState("");
  const [msg, setMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [emailList, setEmailList] = useState([]);
  const [fileName, setFileName] = useState("");
  const [status, setStatus] = useState(null);
  const [view, setView] = useState("compose");
  const initialToken = useMemo(() => getStoredToken(), []);
  const [adminToken, setAdminToken] = useState(initialToken);
  const [showLogin, setShowLogin] = useState(false);
  const [authChecked, setAuthChecked] = useState(() => !initialToken);

  const dismissStatus = useCallback(() => setStatus(null), []);

  const setAuth = useCallback((token) => {
    storeToken(token || "");
    setAdminToken(token || "");
  }, []);

  useEffect(() => {
    if (!adminToken) return undefined;
    let cancelled = false;
    adminMe(adminToken)
      .then((res) => {
        if (cancelled) return;
        if (!res.data?.ok) setAuth("");
      })
      .catch((err) => {
        if (cancelled) return;
        if (err?.response?.status === 401) setAuth("");
      })
      .finally(() => {
        if (!cancelled) setAuthChecked(true);
      });
    return () => {
      cancelled = true;
    };
  }, [adminToken, setAuth]);

  const isLoggedIn = Boolean(adminToken);

  function handleSend() {
    setStatus(null);
    const trimmedMsg = msg.trim();
    if (!trimmedMsg) {
      setStatus({ kind: "error", message: "Please enter an email body before sending." });
      return;
    }
    if (emailList.length === 0) {
      setStatus({ kind: "error", message: "Upload an Excel file with recipient emails first." });
      return;
    }

    setSending(true);
    postSendmail({ subject: subject.trim(), msg: trimmedMsg, emailList })
      .then((res) => {
        if (sendSuccess(res.data)) {
          const n = res.data?.sent ?? emailList.length;
          setStatus({
            kind: "success",
            message: `Email sent successfully to ${n} recipient${n === 1 ? "" : "s"}.`,
          });
        } else {
          setStatus({
            kind: "error",
            message: "Send failed — unexpected response. Check backend logs.",
          });
        }
      })
      .catch((err) => {
        console.error(err);
        setStatus({ kind: "error", message: formatApiError(err) });
      })
      .finally(() => setSending(false));
  }

  async function handleFile(evt) {
    const file = evt.target.files?.[0];
    if (!file) return;
    try {
      const emails = await parseExcelEmailsFromFile(file);
      setEmailList(emails);
      setFileName(file.name);
      setStatus(
        emails.length
          ? {
              kind: "info",
              message: `Loaded ${emails.length} email${emails.length === 1 ? "" : "s"} from "${file.name}".`,
            }
          : {
              kind: "error",
              message: `No emails found in column A of "${file.name}".`,
            },
      );
    } catch (err) {
      console.error(err);
      setStatus({ kind: "error", message: "Could not read that Excel file." });
    }
    evt.target.value = "";
  }

  function handleHistoryClick() {
    if (isLoggedIn) setView("history");
    else setShowLogin(true);
  }

  function handleLogout() {
    setAuth("");
    setView("compose");
    setStatus({ kind: "info", message: "Signed out of admin." });
  }

  const navItems = useMemo(
    () => [
      { id: "compose", label: "Compose" },
      { id: "history", label: "History" },
    ],
    [],
  );

  return (
    <div className="min-h-[100dvh] min-h-screen bg-[#06142b] relative overflow-hidden flex flex-col lg:items-center lg:justify-center px-4 sm:px-6 pt-[max(1rem,env(safe-area-inset-top,0px))] pb-[max(1rem,env(safe-area-inset-bottom,0px))] lg:pb-[max(3rem,env(safe-area-inset-bottom,0px))]">
      <div className="absolute top-[-60px] sm:top-[-120px] left-[-60px] sm:left-[-120px] w-[220px] h-[220px] sm:w-[350px] sm:h-[350px] bg-blue-500/20 blur-3xl rounded-full pointer-events-none" />
      <div className="absolute bottom-[-60px] sm:bottom-[-120px] right-[-60px] sm:right-[-120px] w-[220px] h-[220px] sm:w-[350px] sm:h-[350px] bg-cyan-400/20 blur-3xl rounded-full pointer-events-none" />

      <main className="relative w-full max-w-6xl mx-auto lg:mx-0 mt-4 mb-8 lg:my-0 flex-1 flex flex-col min-h-0 bg-white/10 backdrop-blur-xl border border-white/10 rounded-2xl sm:rounded-3xl shadow-[0_20px_80px_rgba(0,0,0,0.45)] overflow-hidden">
        <div className="border-b border-white/10 px-4 sm:px-8 md:px-12 py-5 sm:py-7 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-white tracking-tight">
              Bulk Mail
            </h1>
            <p className="text-blue-100/70 mt-1 sm:mt-2 text-xs sm:text-sm md:text-base leading-snug">
              Upload Excel files and launch email campaigns instantly
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
            <nav className="inline-flex bg-white/10 border border-white/10 rounded-full p-1 text-xs sm:text-sm">
              {navItems.map((item) => {
                const active = view === item.id;
                const onClick =
                  item.id === "history" ? handleHistoryClick : () => setView(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={onClick}
                    className={`px-3 sm:px-4 py-1.5 rounded-full transition-colors ${
                      active
                        ? "bg-white text-[#06142b] font-semibold shadow"
                        : "text-white/80 hover:text-white"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </nav>
            {isLoggedIn ? (
              <button
                type="button"
                onClick={handleLogout}
                className="text-xs sm:text-sm text-white/70 hover:text-white border border-white/20 rounded-full px-3 py-1.5 transition-colors"
              >
                Sign out
              </button>
            ) : null}
            <div className="flex items-center gap-2 bg-white/10 px-3 sm:px-4 py-1.5 sm:py-2 rounded-full border border-white/10">
              <div
                className={`w-2 h-2 rounded-full shrink-0 ${sending ? "bg-amber-400 animate-pulse" : "bg-green-400"}`}
              />
              <span className="text-white text-xs sm:text-sm whitespace-nowrap">
                {sending ? "Sending…" : "Ready"}
              </span>
            </div>
          </div>
        </div>

        {view === "compose" ? (
          <ComposeView
            subject={subject}
            setSubject={setSubject}
            msg={msg}
            setMsg={setMsg}
            emailList={emailList}
            fileName={fileName}
            sending={sending}
            status={status}
            onDismissStatus={dismissStatus}
            onFile={handleFile}
            onSend={handleSend}
          />
        ) : (
          <HistoryView
            token={adminToken}
            onUnauthorized={() => {
              setAuth("");
              setShowLogin(true);
              setView("compose");
              setStatus({ kind: "error", message: "Session expired. Please sign in again." });
            }}
            authChecked={authChecked}
            onBack={() => setView("compose")}
          />
        )}
      </main>

      {showLogin ? (
        <AdminLoginModal
          onClose={() => setShowLogin(false)}
          onSuccess={(token) => {
            setAuth(token);
            setShowLogin(false);
            setView("history");
            setStatus({ kind: "success", message: "Signed in as admin." });
          }}
        />
      ) : null}
    </div>
  );
}

function ComposeView({
  subject,
  setSubject,
  msg,
  setMsg,
  emailList,
  fileName,
  sending,
  status,
  onDismissStatus,
  onFile,
  onSend,
}) {
  return (
    <div className="grid lg:grid-cols-2 gap-6 lg:gap-10 p-4 sm:p-8 md:p-12 lg:items-center">
      <div className="flex flex-col gap-5 sm:gap-6 min-w-0">
        <div className="min-w-0">
          <div className="inline-flex items-center gap-2 bg-blue-500/10 border border-blue-400/20 text-blue-200 px-3 py-1.5 sm:px-4 sm:py-2 rounded-full text-xs sm:text-sm mb-3 sm:mb-5 max-w-full">
            <span className="truncate">⚡ Smart Email Campaign</span>
          </div>
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white leading-tight tracking-tight">
            Send thousands of emails with a beautiful workflow
          </h2>
          <p className="text-white/60 mt-3 sm:mt-4 leading-relaxed text-sm sm:text-base lg:text-lg">
            Upload your Excel contacts, write your subject and message, and deliver personalized
            campaigns effortlessly.
          </p>
        </div>

        {status ? <StatusBanner status={status} onDismiss={onDismissStatus} /> : null}

        <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-3 sm:p-4 backdrop-blur-md">
          <label htmlFor="subjectInput" className="block">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2 sm:mb-3">
              <p className="text-white font-medium text-sm sm:text-base">Subject</p>
              <span className="text-[11px] sm:text-xs text-white/40">
                Optional — defaults to “Bulk mail”
              </span>
            </div>
            <input
              id="subjectInput"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Spring product launch — early access"
              autoComplete="off"
              maxLength={250}
              className="w-full bg-transparent text-white text-base placeholder:text-white/35 outline-none rounded-xl focus-visible:ring-2 focus-visible:ring-cyan-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white/5"
            />
          </label>
        </div>

        <div className="bg-white/5 border border-white/10 rounded-2xl sm:rounded-3xl p-3 sm:p-4 backdrop-blur-md">
          <label htmlFor="messageInput" className="block">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 mb-2 sm:mb-3">
              <p className="text-white font-medium text-sm sm:text-base">Email Content</p>
              <span className="text-[11px] sm:text-xs text-white/40">
                Plain text — min 16px on mobile
              </span>
            </div>
            <textarea
              id="messageInput"
              onChange={(e) => setMsg(e.target.value)}
              value={msg}
              rows={6}
              className="w-full min-h-[10rem] sm:min-h-[13rem] sm:h-52 bg-transparent text-white text-base leading-relaxed placeholder:text-white/35 outline-none resize-none rounded-xl focus-visible:ring-2 focus-visible:ring-cyan-400/40 focus-visible:ring-offset-2 focus-visible:ring-offset-white/5"
              placeholder="Write your campaign email here..."
              autoComplete="off"
            />
          </label>
        </div>

        <label
          htmlFor="fileInput"
          className="group relative border border-dashed border-blue-400/30 bg-blue-500/5 rounded-2xl sm:rounded-3xl p-6 sm:p-10 flex flex-col items-center justify-center cursor-pointer transition-colors hover:bg-blue-500/10 active:bg-blue-500/15 overflow-hidden min-h-[140px] sm:min-h-0 touch-manipulation"
        >
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-blue-500/10 to-cyan-400/10" />
          <input
            onChange={onFile}
            type="file"
            id="fileInput"
            accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
          />
          <div className="relative z-10 text-4xl sm:text-6xl mb-3 sm:mb-4 select-none" aria-hidden>
            📂
          </div>
          <p className="relative z-10 text-base sm:text-xl font-semibold text-white text-center px-2">
            Upload Excel File
          </p>
          <span className="relative z-10 text-xs sm:text-sm text-white/50 mt-2 text-center px-2">
            {fileName ? `Loaded: ${fileName}` : "Tap to browse (Excel)"}
          </span>
          <div className="relative z-10 mt-4 sm:mt-5 bg-white/10 border border-white/10 px-4 py-2 rounded-full text-xs sm:text-sm text-blue-100">
            Total emails in file: {emailList.length}
          </div>
        </label>

        <button
          type="button"
          onClick={onSend}
          disabled={sending}
          className="group relative overflow-hidden bg-gradient-to-r from-blue-600 to-cyan-500 enabled:hover:scale-[1.01] enabled:active:scale-[0.99] transition-transform duration-200 text-white min-h-[48px] py-4 sm:py-5 rounded-2xl sm:rounded-3xl text-base sm:text-lg font-semibold shadow-[0_10px_40px_rgba(59,130,246,0.45)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-[#06142b] disabled:opacity-70 disabled:cursor-not-allowed touch-manipulation"
        >
          <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition" />
          <span className="relative z-10 flex items-center justify-center gap-3">
            {sending ? "Sending…" : "🚀 Send Bulk Emails"}
          </span>
        </button>
      </div>

      <div className="relative flex items-center justify-center lg:pb-0 max-h-[32vh] sm:max-h-[40vh] lg:max-h-none overflow-hidden lg:overflow-visible">
        <div className="absolute w-[200px] h-[200px] sm:w-[320px] sm:h-[320px] bg-cyan-400/20 blur-3xl rounded-full pointer-events-none" />
        <div className="absolute top-2 right-2 sm:top-6 sm:right-4 bg-white/10 backdrop-blur-md border border-white/10 px-3 py-2 sm:px-5 sm:py-4 rounded-xl sm:rounded-2xl shadow-xl lg:hidden text-right">
          <p className="text-white text-[10px] sm:text-xs font-medium">Emails out</p>
          <p className="text-xl sm:text-2xl font-bold text-cyan-300">12.4K</p>
        </div>
        <div className="absolute top-6 right-4 bg-white/10 backdrop-blur-md border border-white/10 px-5 py-4 rounded-2xl shadow-xl hidden lg:block">
          <p className="text-white text-sm font-medium">Emails Delivered</p>
          <h3 className="text-3xl font-bold text-cyan-300 mt-1">12.4K</h3>
        </div>
        <div
          className="relative z-10 w-full max-w-[16rem] sm:max-w-md lg:max-w-lg mx-auto max-h-[28vh] sm:max-h-[38vh] lg:max-h-none drop-shadow-[0_25px_50px_rgba(0,0,0,0.45)]"
          role="img"
          aria-label="Illustration representing bulk email delivery"
        >
          <HeroGraphic className="w-full h-auto max-h-[inherit]" />
        </div>
      </div>
    </div>
  );
}
