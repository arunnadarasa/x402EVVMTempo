# Project log: x402 + EVVM + Tempo + MPP/purl

This document captures what we learned, what worked, and what failed while adapting [menurivera/x402-demo](https://github.com/menurivera/x402-demo) for **Tempo Moderato (chain 42431)**, **ClinicalClaw-style EVVM**, and **MPP + purl**, then publishing to [arunnadarasa/x402EVVMTempo](https://github.com/arunnadarasa/x402EVVMTempo).

---

## Goals

1. **Base:** x402 demo with Nitro backend + React client using `@evvm/x402` and EVVM settlement.
2. **Chain:** Switch from Ethereum Sepolia to **Tempo Testnet (Moderato), `42431`**.
3. **EVVM:** Target a real deployment (example: **ClinicalClaw**, `evvmId` 1154, `evvmCoreAddress` on Tempo).
4. **Dual stack:** Keep **Coinbase-style x402** (`PAYMENT-REQUIRED` / `PAYMENT-SIGNATURE`) for the browser, and add **MPP** so **purl** can pay via HTTP 402 + `WWW-Authenticate: Payment method="tempo"`.
5. **Publish:** Push to `https://github.com/arunnadarasa/x402EVVMTempo`.

---

## Architecture we settled on

| Route | Protocol | Typical client |
|-------|-----------|----------------|
| `GET /protected` | x402 + **EVVM** (`@evvm/x402`) | React + wagmi on Tempo |
| `GET /mpp/paid` | **MPP** + `mppx` `tempo.charge` | [purl](https://github.com/stripe/purl) CLI |

**Why two routes:** EVVM uses **`PAYMENT-*` headers**. MPP uses **`WWW-Authenticate`** challenges with a **Tempo** payment method. They are different wire formats; [purl](https://github.com/stripe/purl) follows the MPP-style path, not raw EVVM x402 headers.

---

## Successes

### Tempo + EVVM x402

- **`viem`:** `tempoModerato` from `viem/chains`, RPC default `https://rpc.moderato.tempo.xyz`.
- **Offers:** `network: eip155:42431`, `extra.evvmId`, `extra.coreContractAddress`, `asset` from `PRINCIPAL_TOKEN_ADDRESS`.
- **Facilitator:** `EXECUTOR_PRIVATE_KEY` parsed safely (trim, strip quotes, `0x` + 64 hex validation) to avoid opaque viem errors.

### CCP / principal token address (on-chain)

For EVVM core `0xc37600f8130eca636a7e03a76429682f5188fb30` on 42431:

- `getPrincipalTokenAddress()` and `getEvvmMetadata()` return **`0x0000000000000000000000000000000000000001`** for **ClinicalClaw Points (CCP)** — the **EVVM sentinel** for the principal token inside the core, not a separate explorer contract in the usual ERC-20 sense.

### MPP + purl

- **`mppx`:** Use **`tempo.charge({ testnet, currency, recipient })` only**, not **`tempo({...})`**, because the latter registers **session** as well, and **`tempo.session()` requires a server-side viem `Account`** (private key) for channel lifecycle — we did not want that for a simple paid GET.
- **Nitro:** `toWebRequest` / `sendWebResponse` from `h3` to bridge Web `Request`/`Response` to the MPP handler.
- **purl:** Wallet type **Tempo** (not generic EVM) for Moderato; fund **pathUSD** (or whatever `MPP_TEMPO_CURRENCY` is) for real (non–dry-run) pays.

### Middleware order (critical)

- **`useSigner()` must run only for `/protected` requests that include `PAYMENT-SIGNATURE`.**  
  Initially it ran **before** the `/protected` check, so **`/status` and every route** tried to parse `EXECUTOR_PRIVATE_KEY` → 500 **“invalid private key”** even when the key was wrong or placeholder. **Fix:** create signer **after** confirming path + payment header.

### GitHub push

- First pushes hit **`remote: fatal: did not receive expected object …`** and a **cherry-pick onto an almost-empty remote** produced an **incomplete file tree** (only a handful of files).
- **Resolution:** **orphan branch** → single **root commit** with the full tree, **MIT LICENSE** aligned with the destination repo, **`backend/node_modules` untracked**, **`.gitignore`** extended for `dist/`, `.output/`, `backend/.nitro/`, `client/dist/`. Then **`git push --force origin main`**.

---

## Failures and pitfalls

### Backend / env

| Issue | Cause | Mitigation |
|--------|--------|------------|
| 500 `invalid private key` on `/status` | Signer loaded on all routes | Gate `useSigner()` behind `/protected` + `PAYMENT-SIGNATURE` |
| 500 on paid `/protected` | Bad `EXECUTOR_PRIVATE_KEY` (quotes, spaces, wrong length) | Normalize + validate in signer helper; document `0x` + 64 hex |
| MPP 500: `tempo.session() requires an account` | `tempo()` registers charge **and** session | Use **`tempo.charge(...)`** only in `methods: [...]` |

### purl / CLI

| Issue | Cause | Mitigation |
|--------|--------|------------|
| `unexpected argument '#' found` | Shell: `purl wallet add    # comment` — `#` parsed badly | Run `purl wallet add` on its own line; no inline `#` |
| `Invalid password` | Wrong password for encrypted keystore | New `purl wallet add`, pick **Tempo**, remember password; fund the **From:** address |

### Git

| Issue | Cause |
|--------|--------|
| Incomplete repo on GitHub | Cherry-pick onto remote with only `LICENSE` did not replay full tree |
| `did not receive expected object` | Problematic pack / history when merging |

### Conceptual (not “bugs”)

- **MPP + CCP:** MPP Tempo expects a **TIP-20 `currency` address** (e.g. pathUSD). EVVM **CCP** is often the **sentinel `0x…0001`** inside the core — **not** interchangeable with “pay this TIP-20 like pathUSD” without EVVM-specific semantics. **EVVM-native CCP** → **x402 + EVVM** route; **MPP/purl** → use a **real Tempo stablecoin** (or a real CCP TIP-20 if one exists on chain).

---

## Environment variables (backend)

See `backend/.env.example`. Minimum mental model:

- **EVVM path:** `RECEIVER_ACCOUNT`, `EVVM_CORE_ADDRESS`, `EXECUTOR_PRIVATE_KEY`, `PRINCIPAL_TOKEN_ADDRESS`, optional `EVVM_ID`, `RPC_URL`.
- **MPP path:** `MPP_SECRET_KEY` (e.g. `openssl rand -base64 32`), optional `MPP_TEMPO_CURRENCY`, `MPP_TEMPO_RECIPIENT`.

---

## Verification commands (quick reference)

```bash
# EVVM principal token (example core)
cast call <EVVM_CORE> "getPrincipalTokenAddress()(address)" --rpc-url https://rpc.moderato.tempo.xyz

# Backend
curl -i http://localhost:3000/status
curl -i http://localhost:3000/protected   # expect 402 + PAYMENT-REQUIRED

# MPP + purl
purl --dry-run http://localhost:3000/mpp/paid
purl http://localhost:3000/mpp/paid
```

---

## References

- [x402 (Coinbase)](https://github.com/coinbase/x402) — `PAYMENT-*` headers  
- [@evvm/x402](https://github.com/EVVM-org/x402)  
- [MPP](https://mpp.dev) — `WWW-Authenticate` Payment challenges  
- [purl](https://github.com/stripe/purl)  
- [Tempo docs](https://docs.tempo.xyz)  
- Published repo: **[arunnadarasa/x402EVVMTempo](https://github.com/arunnadarasa/x402EVVMTempo)**

---

## Meta

- **License on GitHub:** MIT (aligned with the destination repo’s initial `LICENSE`).
- **This log:** Describes integration work and operational lessons; it is not legal or security advice. Rotate any keys that appeared in local shells or screenshots.
