import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, Lock, User, ArrowRight, Eye, EyeOff, Sparkles } from "lucide-react";
import { useAuth } from "../context/Auth";
import { LogoFull, Mascot } from "../components/Brand";
import { Button } from "../components/ui/Primitives";
import { formatApiError } from "../lib/api";

function Field({ icon: Icon, ...props }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gg-line bg-white px-4 h-[52px] focus-within:border-gg-green transition-colors">
      <Icon size={18} className="text-gg-ink-3 shrink-0" />
      <input
        className="flex-1 min-w-0 bg-transparent outline-none text-[15px] text-gg-ink placeholder:text-gg-ink-3"
        {...props}
      />
    </div>
  );
}

export default function Auth() {
  const { login, register } = useAuth();
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const isLogin = mode === "login";

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);
    try {
      if (isLogin) await login(email.trim(), password);
      else await register({ email: email.trim(), password, first_name: firstName.trim(), last_name: lastName.trim() });
    } catch (err) {
      setError(formatApiError(err.response?.data?.detail) || err.message);
    } finally {
      setBusy(false);
    }
  };

  const useDemo = () => {
    setMode("login");
    setEmail("demo@gezgelir.com");
    setPassword("demo1234");
  };

  return (
    <div className="absolute inset-0 z-40 mesh-canvas overflow-y-auto no-scrollbar" data-testid="auth-screen">
      <div className="safe-top min-h-full flex flex-col px-6 pt-6 pb-10">
        <div className="flex flex-col items-center text-center mt-4 mb-7">
          <LogoFull style={{ height: 58 }} />
          <p className="mt-4 font-display font-700 tracking-label text-[11px] text-gg-ink-2">
            HAREKET ET, KAZAN
          </p>
        </div>

        <div className="card p-6">
          <h1 className="font-display font-800 text-[22px] text-gg-ink">
            {isLogin ? "Tekrar hoş geldin 👋" : "GezGelir'e katıl 🚗"}
          </h1>
          <p className="text-[14px] text-gg-ink-2 mt-1 mb-5">
            {isLogin ? "Kazancını görmek için giriş yap." : "Hesabını oluştur, gezdikçe kazanmaya başla."}
          </p>

          <form onSubmit={submit} className="space-y-3">
            <AnimatePresence mode="popLayout">
              {!isLogin && (
                <motion.div
                  key="names"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="grid grid-cols-2 gap-3 overflow-hidden"
                >
                  <Field icon={User} placeholder="Ad" value={firstName}
                    onChange={(e) => setFirstName(e.target.value)} required data-testid="auth-firstname" />
                  <Field icon={User} placeholder="Soyad" value={lastName}
                    onChange={(e) => setLastName(e.target.value)} data-testid="auth-lastname" />
                </motion.div>
              )}
            </AnimatePresence>

            <Field icon={Mail} type="email" placeholder="E-posta" value={email}
              onChange={(e) => setEmail(e.target.value)} required data-testid="auth-email" />

            <div className="relative">
              <Field icon={Lock} type={show ? "text" : "password"} placeholder="Şifre" value={password}
                onChange={(e) => setPassword(e.target.value)} required data-testid="auth-password" />
              <button type="button" onClick={() => setShow((s) => !s)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gg-ink-3">
                {show ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {error && (
              <p className="text-[13px] font-600 text-red-500 bg-red-50 rounded-xl px-3 py-2" data-testid="auth-error">
                {error}
              </p>
            )}

            <Button full size="lg" type="submit" icon={ArrowRight} disabled={busy} data-testid="auth-submit">
              {busy ? "Lütfen bekle..." : isLogin ? "Giriş Yap" : "Hesap Oluştur"}
            </Button>
          </form>

          <button
            onClick={useDemo}
            className="mt-3 w-full flex items-center justify-center gap-2 text-[13px] font-700 text-gg-green-700 h-11 rounded-2xl bg-gg-mint active:scale-[0.98] transition-transform"
            data-testid="auth-demo"
          >
            <Sparkles size={15} /> Demo hesabıyla dene
          </button>
        </div>

        <div className="mt-5 text-center">
          <button
            onClick={() => { setError(""); setMode(isLogin ? "register" : "login"); }}
            className="text-[14px] text-gg-ink-2"
            data-testid="auth-toggle"
          >
            {isLogin ? (
              <>Hesabın yok mu? <span className="font-800 text-gg-green-700">Kayıt ol</span></>
            ) : (
              <>Zaten hesabın var mı? <span className="font-800 text-gg-green-700">Giriş yap</span></>
            )}
          </button>
        </div>

        <div className="flex-1" />
        <div className="mt-8 flex justify-center opacity-70">
          <Mascot size={44} />
        </div>
      </div>
    </div>
  );
}
