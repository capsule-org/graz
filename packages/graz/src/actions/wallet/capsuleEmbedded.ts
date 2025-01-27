import { type AminoSignResponse, StdSignature } from "@cosmjs/amino";
import { fromBech32 } from "@cosmjs/encoding";
import type { DirectSignResponse } from "@cosmjs/proto-signing";
import type { Keplr } from "@keplr-wallet/types";

import { useGrazInternalStore, useGrazSessionStore } from "../../store";
import { WalletType, type Key, type SignAminoParams, type SignDirectParams, type Wallet } from "../../types/wallet";
import { CapsuleAminoSigner, CapsuleProtoSigner } from "@usecapsule/cosmjs-v0-integration";
import { getChainInfo } from "../chains";
import { WalletType as CapsuleWalletType } from "@usecapsule/react-sdk";
import { RECONNECT_SESSION_KEY } from "../../constant";

export const getCapsuleEmbedded = (): Wallet => {
  // eslint-disable-next-line @typescript-eslint/require-await
  const enable = async (_chainId: string | string[]) => {
    const chainId = typeof _chainId === "string" ? [_chainId] : _chainId;
    useGrazInternalStore.setState({ capsuleEmbeddedState: { chainId } });
  };

  const getWallet = () => {
    const client = useGrazInternalStore.getState().capsuleEmbedded;
    if (!client) throw new Error("Capsule client is not initialized");

    const wallet = client.findWallet(undefined, undefined, { type: [CapsuleWalletType.COSMOS] });
    if (!wallet?.address) throw new Error("No valid Capsule wallet found");

    return wallet;
  };

  const onAfterLoginSuccessful = async () => {
    const client = useGrazInternalStore.getState().capsuleEmbedded;
    const { chains } = useGrazInternalStore.getState();
    if (!client) throw new Error("Capsule client is not initialized");
    if (!chains) throw new Error("Chains are not set");
    const chainIds = useGrazInternalStore.getState().capsuleEmbeddedState?.chainId;
    if (!chainIds) throw new Error("Chain ids are not set");
    const resultAccounts = Object.fromEntries(
      await Promise.all(
        chainIds.map(async (chainId): Promise<[string, Key]> => {
          const account = await getKey(chainId);
          return [chainId, account];
        }),
      ),
    );
    useGrazSessionStore.setState((prev) => ({
      accounts: { ...(prev.accounts || {}), ...resultAccounts },
    }));

    useGrazInternalStore.setState((prev) => ({
      recentChainIds: [...(prev.recentChainIds || []), ...chainIds].filter((thing, i, arr) => {
        return arr.indexOf(thing) === i;
      }),
    }));
    useGrazSessionStore.setState((prev) => ({
      activeChainIds: [...(prev.activeChainIds || []), ...chainIds].filter((thing, i, arr) => {
        return arr.indexOf(thing) === i;
      }),
    }));

    useGrazInternalStore.setState({
      walletType: WalletType.CAPSULE_EMBEDDED,
      _reconnect: false,
      _reconnectConnector: WalletType.CAPSULE_EMBEDDED,
    });
    useGrazSessionStore.setState({
      status: "connected",
    });
    typeof window !== "undefined" && window.sessionStorage.setItem(RECONNECT_SESSION_KEY, "Active");
  };

  const getKey = async (chainId: string) => {
    const client = useGrazInternalStore.getState().capsuleEmbedded;
    if (!client) throw new Error("Capsule client is not initialized");

    const capsuleSigner = new CapsuleProtoSigner(
      client,
      getChainInfo({ chainId })?.bech32Config?.bech32PrefixAccAddr,
      getWallet().id,
    );

    const account = (await capsuleSigner.getAccounts())[0];

    if (!account) throw new Error("No Capsule account connected");

    const username = client.getEmail() ?? client.getPhoneNumber() ?? client.getFarcasterUsername();

    return {
      address: fromBech32(account.address).data,
      bech32Address: account.address,
      algo: account.algo,
      name: username || "",
      pubKey: account.pubkey,
      isKeystone: false,
      isNanoLedger: false,
    };
  };

  const getOfflineSigner = (chainId: string) => {
    return getOfflineSignerAmino(chainId);
  };

  const getOfflineSignerAmino = (chainId: string) => {
    const client = useGrazInternalStore.getState().capsuleEmbedded;
    if (!client) throw new Error("Capsule client is not initialized");

    return new CapsuleAminoSigner(client, getChainInfo({ chainId })?.bech32Config?.bech32PrefixAccAddr, getWallet().id);
  };

  const getOfflineSignerDirect = (chainId: string) => {
    const client = useGrazInternalStore.getState().capsuleEmbedded;
    if (!client) throw new Error("Capsule client is not initialized");

    return new CapsuleProtoSigner(client, getChainInfo({ chainId })?.bech32Config?.bech32PrefixAccAddr, getWallet().id);
  };

  // eslint-disable-next-line @typescript-eslint/require-await
  const getOfflineSignerAuto = async (chainId: string) => {
    return getOfflineSignerDirect(chainId);
  };

  const signDirect = async (...args: SignDirectParams): Promise<DirectSignResponse> => {
    const [chainId, _, signDoc] = args;
    const capsuleSigner = getOfflineSignerDirect(chainId);

    const account = await getKey(chainId);

    return capsuleSigner.signDirect(account.bech32Address, {
      bodyBytes: signDoc.bodyBytes!,
      authInfoBytes: signDoc.authInfoBytes!,
      chainId: signDoc.chainId!,
      accountNumber: signDoc.accountNumber!,
    });
  };

  const signAmino = async (...args: SignAminoParams): Promise<AminoSignResponse> => {
    const [chainId, _, signDoc] = args;
    const capsuleSigner = getOfflineSignerAmino(chainId);

    const account = await getKey(chainId);

    return capsuleSigner.signAmino(account.bech32Address, signDoc);
  };

  const getDataForADR36 = (_data: string | Uint8Array) => {
    let data = _data;
    let isADR36WithString = false;
    if (typeof data === "string") {
      data = Buffer.from(data).toString("base64");
      isADR36WithString = true;
    } else {
      data = Buffer.from(data).toString("base64");
    }
    return [data, isADR36WithString];
  };

  const getADR36SignDoc = (signer: string, data: string | boolean | undefined) => {
    return {
      chain_id: "",
      account_number: "0",
      sequence: "0",
      fee: {
        gas: "0",
        amount: [],
      },
      msgs: [
        {
          type: "sign/MsgSignData",
          value: {
            signer,
            data,
          },
        },
      ],
      memo: "",
    };
  };

  const signArbitrary = async (chainId: string, signer: string, _data: string | Uint8Array): Promise<StdSignature> => {
    const client = useGrazInternalStore.getState().capsuleEmbedded;
    if (!client) throw new Error("Capsule client is not initialized");

    const [data] = getDataForADR36(_data);
    const signDoc = getADR36SignDoc(signer, data);
    return (await signAmino(chainId, signer, signDoc)).signature;
  };

  const experimentalSuggestChain = async (..._args: Parameters<Keplr["experimentalSuggestChain"]>) => {
    await Promise.reject(new Error("Capsule does not support experimentalSuggestChain"));
  };

  return {
    // init,
    enable,
    onAfterLoginSuccessful,
    getKey,
    getOfflineSignerAuto,
    getOfflineSignerDirect,
    signDirect,
    signAmino,
    signArbitrary,
    experimentalSuggestChain,
    // @ts-expect-error - CapsuleAminoSigner | OfflineDirectSigner
    getOfflineSigner,
    getOfflineSignerAmino,
  };
};
