import React, { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AppDataProvider } from "./context/AppData";
import Splash from "./components/Splash";
import Onboarding from "./components/Onboarding";
import BottomNav from "./components/BottomNav";
import Home from "./screens/Home";
import Trips from "./screens/Trips";
import Earnings from "./screens/Earnings";
import Wallet from "./screens/Wallet";
import Profile from "./screens/Profile";
import DriveSession from "./screens/DriveSession";
import { pageVariants, ENTER_INITIAL } from "./lib/motion";

function Page({ children }) {
  return (
    <motion.div
      variants={pageVariants}
      initial={ENTER_INITIAL}
      animate="animate"
      exit="exit"
    >
      {children}
    </motion.div>
  );
}

function Shell() {
  const location = useLocation();
  const isDrive = location.pathname === "/surus";

  if (isDrive) {
    return (
      <Routes location={location}>
        <Route path="/surus" element={<DriveSession />} />
      </Routes>
    );
  }

  return (
    <>
      <div className="screen-scroll">
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Page><Home /></Page>} />
            <Route path="/surusler" element={<Page><Trips /></Page>} />
            <Route path="/kazanc" element={<Page><Earnings /></Page>} />
            <Route path="/cuzdan" element={<Page><Wallet /></Page>} />
            <Route path="/profil" element={<Page><Profile /></Page>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </div>
      <BottomNav />
    </>
  );
}

export default function App() {
  const [phase, setPhase] = useState(
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("skip") === "1"
      ? "app"
      : "splash"
  );

  useEffect(() => {
    if (phase !== "app") return;
  }, [phase]);

  const finishSplash = () => {
    const onboarded = localStorage.getItem("gg_onboarded") === "1";
    setPhase(onboarded ? "app" : "onboarding");
  };

  const finishOnboarding = () => {
    localStorage.setItem("gg_onboarded", "1");
    setPhase("app");
  };

  return (
    <BrowserRouter>
      <AppDataProvider>
        <div className="app-shell">
          <AnimatePresence>
            {phase === "splash" && <Splash key="splash" onDone={finishSplash} />}
          </AnimatePresence>

          {phase === "onboarding" && <Onboarding onDone={finishOnboarding} />}

          {phase === "app" && <Shell />}
        </div>
      </AppDataProvider>
    </BrowserRouter>
  );
}
