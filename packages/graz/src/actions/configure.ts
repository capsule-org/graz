import type { ChainInfo } from "@keplr-wallet/types";
import CapsuleWeb from "@usecapsule/react-sdk";

import type { CapsuleConfig, ChainConfig, GrazInternalStore, IframeOptions } from "../store";
import { useGrazInternalStore } from "../store";
import type { WalletType } from "../types/wallet";

export interface ConfigureGrazArgs {
  defaultWallet?: WalletType;
  chains: ChainInfo[];
  chainsConfig?: Record<string, ChainConfig>;
  capsuleConfig?: CapsuleConfig;
  capsule?: CapsuleWeb;
  onNotFound?: () => void;
  onReconnectFailed?: () => void;
  walletConnect?: GrazInternalStore["walletConnect"];
  walletDefaultOptions?: GrazInternalStore["walletDefaultOptions"];
  /**
   * default to true
   */
  autoReconnect?: boolean;
  /**
   * Graz will use this number to determine how many concurrent requests to make when using `multiChain` args in hooks.
   * Defaults to 3.
   */
  multiChainFetchConcurrency?: number;
  /**
   * Options to enable iframe wallet connection.
   */
  iframeOptions?: IframeOptions;
}

export const configureGraz = (args: ConfigureGrazArgs): ConfigureGrazArgs => {
  useGrazInternalStore.setState((prev) => ({
    iframeOptions: args.iframeOptions || prev.iframeOptions,
    walletConnect: args.walletConnect || prev.walletConnect,
    walletType: args.defaultWallet || prev.walletType,
    capsuleConfig: args.capsuleConfig || prev.capsuleConfig,
    capsuleEmbedded: args.capsule || prev.capsuleEmbedded,
    walletDefaultOptions: args.walletDefaultOptions || prev.walletDefaultOptions,
    chains: args.chains,
    chainsConfig: args.chainsConfig || prev.chainsConfig,
    multiChainFetchConcurrency: args.multiChainFetchConcurrency || prev.multiChainFetchConcurrency,
    _notFoundFn: args.onNotFound || prev._notFoundFn,
    _onReconnectFailed: args.onReconnectFailed || prev._onReconnectFailed,
    _reconnect: args.autoReconnect === undefined ? true : args.autoReconnect || prev._reconnect,
  }));
  return args;
};
