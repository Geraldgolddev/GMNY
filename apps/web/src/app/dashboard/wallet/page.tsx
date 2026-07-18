'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@gmny/ui';
import type {
  BaseNetworkView,
  CircleStatusView,
  UsdcBalanceView,
  WalletView,
} from '@gmny/shared';
import { AppShell } from '../../../components/app-shell';
import { api, getAccessToken } from '../../../lib/api';

export default function WalletPage() {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [status, setStatus] = useState<CircleStatusView | null>(null);
  const [network, setNetwork] = useState<BaseNetworkView | null>(null);
  const [wallet, setWallet] = useState<WalletView | null>(null);
  const [balance, setBalance] = useState<UsdcBalanceView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const load = useCallback(async (access: string) => {
    const [nextStatus, nextNetwork, nextWallet] = await Promise.all([
      api<CircleStatusView>('/wallets/status', { token: access }),
      api<BaseNetworkView>('/base/network', { token: access }),
      api<WalletView | null>('/wallets/me', { token: access }),
    ]);
    setStatus(nextStatus);
    setNetwork(nextNetwork);
    setWallet(nextWallet);

    if (nextWallet) {
      const nextBalance = await api<UsdcBalanceView>('/base/balance/me', {
        token: access,
      });
      setBalance(nextBalance);
    } else {
      setBalance(null);
    }
  }, []);

  useEffect(() => {
    const access = getAccessToken();
    if (!access) {
      router.replace('/login');
      return;
    }
    setToken(access);
    void load(access).catch((err: Error) => setError(err.message));
  }, [router, load]);

  async function provision() {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const created = await api<WalletView>('/wallets/me', {
        method: 'POST',
        token,
      });
      setWallet(created);
      const nextBalance = await api<UsdcBalanceView>('/base/balance/me', {
        token,
      });
      setBalance(nextBalance);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to provision wallet');
    } finally {
      setLoading(false);
    }
  }

  return (
    <AppShell title="Wallet">
      {error ? (
        <p className="mb-4 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-[var(--gmny-border)] bg-[var(--gmny-surface)] p-6">
          <h2 className="text-lg font-medium text-white">Base network</h2>
          <p className="mt-1 text-sm text-[var(--gmny-muted)]">
            USDC settlement rail for GMNY remittances.
          </p>
          {network ? (
            <dl className="mt-5 space-y-3 text-sm">
              <Row label="Network">{network.name}</Row>
              <Row label="Chain ID">{String(network.chainId)}</Row>
              <Row label="RPC mode">{network.rpcMode}</Row>
              <Row label="USDC">
                <span className="break-all font-mono text-xs text-slate-100">
                  {network.usdcAddress}
                </span>
              </Row>
              <Row label="Explorer">
                <a
                  href={network.explorerUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[var(--gmny-blue-300)] hover:underline"
                >
                  Open
                </a>
              </Row>
            </dl>
          ) : (
            <p className="mt-5 text-sm text-[var(--gmny-muted)]">Loading…</p>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--gmny-border)] bg-[var(--gmny-surface)] p-6">
          <h2 className="text-lg font-medium text-white">Circle status</h2>
          <p className="mt-1 text-sm text-[var(--gmny-muted)]">
            Custodial wallet provider wired to Base.
          </p>
          {status ? (
            <dl className="mt-5 space-y-3 text-sm">
              <Row label="Mode">{status.mode}</Row>
              <Row label="Settlement">{status.settlementProvider}</Row>
              <Row label="Chain">{status.chain}</Row>
              <Row label="Configured">{status.configured ? 'Yes' : 'No'}</Row>
            </dl>
          ) : (
            <p className="mt-5 text-sm text-[var(--gmny-muted)]">Loading…</p>
          )}
        </section>

        <section className="rounded-2xl border border-[var(--gmny-border)] bg-[var(--gmny-surface)] p-6 lg:col-span-2">
          <h2 className="text-lg font-medium text-white">Your USDC wallet</h2>
          <p className="mt-1 text-sm text-[var(--gmny-muted)]">
            Circle-provisioned address with live Base USDC balance.
          </p>

          {wallet ? (
            <div className="mt-5 grid gap-6 md:grid-cols-2">
              <dl className="space-y-3 text-sm">
                <Row label="Status">{wallet.status}</Row>
                <Row label="Provider">{wallet.provider}</Row>
                <Row label="Chain">{wallet.chain}</Row>
                <Row label="USDC balance">
                  {balance ? `${balance.balance} USDC` : 'Loading…'}
                </Row>
                <Row label="Address">
                  <span className="break-all font-mono text-xs text-slate-100">
                    {wallet.address}
                  </span>
                </Row>
                {balance ? (
                  <Row label="Basescan">
                    <a
                      href={balance.explorerUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[var(--gmny-blue-300)] hover:underline"
                    >
                      View address
                    </a>
                  </Row>
                ) : null}
              </dl>
              <dl className="space-y-3 text-sm">
                <Row label="Circle wallet id">
                  <span className="break-all font-mono text-xs text-slate-100">
                    {wallet.providerWalletId}
                  </span>
                </Row>
                {balance ? (
                  <Row label="Token">
                    <span className="break-all font-mono text-xs text-slate-100">
                      {balance.tokenAddress}
                    </span>
                  </Row>
                ) : null}
              </dl>
            </div>
          ) : (
            <div className="mt-5 space-y-4">
              <p className="text-sm text-[var(--gmny-muted)]">
                No wallet yet. Create one to hold USDC on Base.
              </p>
              <Button disabled={loading} onClick={() => void provision()}>
                {loading ? 'Creating…' : 'Create Circle wallet'}
              </Button>
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b border-white/5 pb-2">
      <dt className="text-[var(--gmny-muted)]">{label}</dt>
      <dd className="text-right text-slate-100">{children}</dd>
    </div>
  );
}
