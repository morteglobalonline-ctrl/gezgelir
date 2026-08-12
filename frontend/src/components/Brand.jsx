import React from "react";
import mascotImg from "../assets/brand/mascot.png";
import wordmarkImg from "../assets/brand/wordmark.png";
import logoFullImg from "../assets/brand/logo_full.png";

export function Wordmark({ className = "", style }) {
  return (
    <img
      src={wordmarkImg}
      alt="GezGelir"
      draggable="false"
      className={`select-none ${className}`}
      style={{ height: 28, width: "auto", maxWidth: "100%", objectFit: "contain", display: "block", ...style }}
    />
  );
}

export function Mascot({ size = 48, className = "", style }) {
  return (
    <img
      src={mascotImg}
      alt="GezGelir maskotu"
      draggable="false"
      className={`select-none ${className}`}
      style={{ height: size, width: "auto", ...style }}
    />
  );
}

export function LogoFull({ className = "", style }) {
  return (
    <img
      src={logoFullImg}
      alt="GezGelir — Hareket Et, Kazan"
      draggable="false"
      className={`select-none ${className}`}
      style={{ maxWidth: "100%", objectFit: "contain", display: "block", ...style }}
    />
  );
}
