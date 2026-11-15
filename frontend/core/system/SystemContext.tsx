"use client";

import {
  createContext,
  ReactNode,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  getSystemState,
  SystemState,
} from "./systemState";

import {
  obterEstadoSimulado,
} from "./systemSimulation";

import {
  carregarConfiguracaoDoServidor,
} from "@/core/operation/scheduleService";

interface SystemContextValue {
  systemState: SystemState;
  atualizarEstado: () => void;
}

const SystemContext =
  createContext<SystemContextValue | undefined>(
    undefined,
  );

interface SystemProviderProps {
  children: ReactNode;
}

function obterEstadoReal(): SystemState {
  return getSystemState();
}

function aplicarSimulacao(
  estadoReal: SystemState,
): SystemState {
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
  /*
   * O primeiro estado é sempre calculado sem
   * acessar recursos exclusivos do navegador.
   *
   * Isso garante que o HTML inicial produzido
   * pelo servidor seja compatível com a hidratação
   * no cliente.
   */
  const [systemState, setSystemState] =
    useState<SystemState>(() =>
      obterEstadoReal(),
    );

  function atualizarEstado() {
    const estadoReal =
      obterEstadoReal();

    setSystemState(
      aplicarSimulacao(estadoReal),
    );
  }

  useEffect(() => {
    /*
     * Depois da hidratação podemos aplicar
     * a simulação baseada na URL (?sim=...).
     */
    atualizarEstado();

    // Os horários gravados no banco (Configurações → Horários) chegam ao abrir
    // o sistema e a cada minuto; o estado é recalculado a cada segundo.
    async function buscarHorarios() {
      await carregarConfiguracaoDoServidor();

      atualizarEstado();
    }

    void buscarHorarios();

    const intervalo = setInterval(
      atualizarEstado,
      1000,
    );

    const intervaloDosHorarios = setInterval(
      () => void buscarHorarios(),
      60000,
    );

    return () => {
      clearInterval(intervalo);

      clearInterval(intervaloDosHorarios);
    };
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
      "useSystem deve ser utilizado dentro de SystemProvider.",
    );
  }

  return context;
}