import React from "react";
import { AbsoluteFill } from "remotion";
import { SAFE_AREA } from "../config";

// Garante que todo o texto fique fora das faixas de topo/base reservadas
// pela interface do Instagram Reels.
export const SafeArea: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <AbsoluteFill
      style={{
        paddingTop: SAFE_AREA.top,
        paddingBottom: SAFE_AREA.bottom,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "100%",
          padding: "0 88px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};
