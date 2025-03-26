import type { PropsWithChildren } from "react";
import { type FC, useEffect } from "react";

import type { ConfigureGrazArgs } from "../actions/configure";
import { configureGraz } from "../actions/configure";
import { ClientOnly } from "./client-only";
import { GrazEvents } from "./events";

export type GrazProviderProps = {
  grazOptions: ConfigureGrazArgs;
} & PropsWithChildren;

/**
 * Provider component
 *
 * @example
 * ```tsx
 * // example next.js application in _app.tsx
 * export default function CustomApp({ Component, pageProps }: AppProps) {
 *   return (
 *     <GrazProvider>
 *       <Component {...pageProps} />
 *     </GrazProvider>
 *   );
 * }
 * ```
 *
 * @see https://tanstack.com/query
 */
export const GrazProvider: FC<GrazProviderProps> = ({ children, grazOptions }) => {
  useEffect(() => {
    configureGraz(grazOptions);
  }, [grazOptions]);

  return (
    <ClientOnly>
      {children}
      <GrazEvents />
    </ClientOnly>
  );
};
