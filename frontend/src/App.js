import React, { useState } from "react";
import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { AuthProvider, useAuth } from "./context/Auth";
import { AppDataProvider } from "./context/AppData";
import Splash from "./components/Splash";
import Onboarding from "./components/Onboarding";
import Auth from "./screens/Auth";
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
    <motion.div variants={pageVariants} initial={ENTER_INITIAL} animate="animate" exit="exit">
      {children}
    </motion.div>
  );
}

function Shell() {
  const location = useLocation();
  if (location.pathname === "/surus") {
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

function Root() {
  const { user, checking } = useAuth();
  const skip = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("skip") === "1";
  const [splashDone, setSplashDone] = useState(skip);
  const [onboarded, setOnboarded] = useState(
    () => skip || localStorage.getItem("gg_onboarded") === "1"
  );

  const finishOnboarding = () => {
    localStorage.setItem("gg_onboarded", "1");
    setOnboarded(true);
  };

  const showSplash = !splashDone || checking;

  return (
    <div className="app-shell">
      <AnimatePresence>
        {showSplash && <Splash key="splash" onDone={() => setSplashDone(true)} />}
      </AnimatePresence>

      {!showSplash && !user && <Auth />}

      {!showSplash && user && !onboarded && <Onboarding onDone={finishOnboarding} />}

      {!showSplash && user && onboarded && (
        <AppDataProvider>
          <Shell />
        </AppDataProvider>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Root />
      </AuthProvider>
    </BrowserRouter>
  );
}
