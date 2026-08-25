"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

import {
  getSystemState,
  SystemState,
} from "./systemState";

import {
  obterEstadoSimulado,
} from "./systemSimulation";

interface SystemContextValue {
  systemState: SystemState;
  atualizarEstado: () => void;
}

const SystemContext =
  createContext<SystemContextValue | undefined>(
    undefined
  );

interface SystemProviderProps {
  children: ReactNode;
}

function obterEstadoAtual(): SystemState {
  const estadoReal = getSystemState();

  const estadoSimulado =
    obterEstadoSimulado();

  if (!estadoSimulado) {
    return estadoReal;
  }

  return {
    ...estadoReal,
    operation: estadoSimulado,
  };
}

export function SystemProvider({
  children,
}: SystemProviderProps) {
  const [systemState, setSystemState] =
    useState<SystemState>(() =>
      obterEstadoAtual()
    );

  function atualizarEstado() {
    setSystemState(
      obterEstadoAtual()
    );
  }

  useEffect(() => {
    atualizarEstado();

    const intervalo = setInterval(
      atualizarEstado,
      1000
    );

    return () =>
      clearInterval(intervalo);
  }, []);

  return (
    <SystemContext.Provider
      value={{
        systemState,
        atualizarEstado,
      }}
    >
      {children}
    </SystemContext.Provider>
  );
}

export function useSystem() {
  const context =
    useContext(SystemContext);

  if (!context) {
    throw new Error(
      "useSystem deve ser utilizado dentro de SystemProvider."
    );
  }

  return context;
}