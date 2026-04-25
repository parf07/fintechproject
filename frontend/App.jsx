import { useMemo, useState } from "react";
import { formatEther, isAddress, parseEther } from "viem";
import {
  useAccount,
  useChainId,
  useConnect,
  useDisconnect,
  useReadContract,
  useSwitchChain,
  useWriteContract,
  useWaitForTransactionReceipt,
} from "wagmi";
import { vaultAbi } from "./vaultAbi";

const vaultAddress = import.meta.env.VITE_VAULT_PROXY_ADDRESS?.trim().toLowerCase();
const sepoliaChainId = 11155111;

function formatEth(value) {
  if (!value) return "0.000000";
  return Number(formatEther(value)).toFixed(6);
}

function shortenAddress(addr) {
  if (!addr) return "";
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

function shortenHash(hash) {
  if (!hash) return "";
  return hash.slice(0, 10) + "..." + hash.slice(-8);
}

export default function App() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { connect, connectors } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain, switchChainAsync } = useSwitchChain();

  const [depositAmount, setDepositAmount] = useState("0.01");
  const [withdrawAmount, setWithdrawAmount] = useState("0.01");
  const [errorMsg, setErrorMsg] = useState("");
  const [txAction, setTxAction] = useState("");

  const { data: principal } = useReadContract({
    address: vaultAddress,
    abi: vaultAbi,
    functionName: "principalBalance",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && vaultAddress) },
  });

  const { data: rewards } = useReadContract({
    address: vaultAddress,
    abi: vaultAbi,
    functionName: "pendingRewards",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address && vaultAddress) },
  });

  const potentialTotal = useMemo(() => {
    const p = principal || 0n;
    const r = rewards || 0n;
    return p + r;
  }, [principal, rewards]);

  const {
    data: txHash,
    isPending: isWritePending,
    isError: isWriteError,
    error: writeError,
    writeContract,
    reset,
  } = useWriteContract();

  const {
    isLoading: isConfirming,
    isSuccess,
    isError: isReceiptError,
    error: receiptError,
  } = useWaitForTransactionReceipt({ hash: txHash });

  const hasValidVaultAddress = Boolean(vaultAddress && isAddress(vaultAddress, { strict: false }));
  const isOnSepolia = chainId === sepoliaChainId;
  const isAwaitingWalletSignature = isWritePending && !txHash;
  const isAwaitingOnchainConfirmation = Boolean(txHash) && isConfirming;
  const isActionDisabled =
    !isConnected ||
    !hasValidVaultAddress ||
    !isOnSepolia ||
    isAwaitingWalletSignature ||
    isAwaitingOnchainConfirmation;

  let disabledReason = "";
  if (!isConnected) disabledReason = "Connect your wallet to continue.";
  else if (!hasValidVaultAddress) disabledReason = "Set a valid VITE_VAULT_PROXY_ADDRESS and restart Vite.";
  else if (!isOnSepolia) disabledReason = "Switch your wallet network to Sepolia.";
  else if (isAwaitingWalletSignature) disabledReason = "Confirm the transaction in MetaMask.";
  else if (isAwaitingOnchainConfirmation) disabledReason = "Transaction sent — awaiting block confirmation...";

  const onDeposit = async () => {
    setErrorMsg("");
    setTxAction("deposit");
    if (!depositAmount || Number(depositAmount) <= 0) {
      setErrorMsg("Deposit amount must be greater than 0.");
      return;
    }
    try {
      if (!isOnSepolia) {
        if (switchChainAsync) {
          await switchChainAsync({ chainId: sepoliaChainId });
        } else if (switchChain) {
          switchChain({ chainId: sepoliaChainId });
          setErrorMsg("Please approve the network switch to Sepolia, then click Deposit again.");
          return;
        }
      }
      writeContract({
        chainId: sepoliaChainId,
        address: vaultAddress,
        abi: vaultAbi,
        functionName: "deposit",
        value: parseEther(depositAmount),
      });
    } catch (error) {
      setErrorMsg(error?.shortMessage || error?.message || "Deposit failed.");
    }
  };

  const onWithdraw = async () => {
    setErrorMsg("");
    setTxAction("withdraw");
    if (!withdrawAmount || Number(withdrawAmount) <= 0) {
      setErrorMsg("Withdraw amount must be greater than 0.");
      return;
    }
    try {
      if (!isOnSepolia) {
        if (switchChainAsync) {
          await switchChainAsync({ chainId: sepoliaChainId });
        } else if (switchChain) {
          switchChain({ chainId: sepoliaChainId });
          setErrorMsg("Please approve the network switch to Sepolia, then click Withdraw again.");
          return;
        }
      }
      writeContract({
        chainId: sepoliaChainId,
        address: vaultAddress,
        abi: vaultAbi,
        functionName: "withdraw",
        args: [parseEther(withdrawAmount)],
      });
    } catch (error) {
      setErrorMsg(error?.shortMessage || error?.message || "Withdraw failed.");
    }
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;500;600;700&display=swap');

        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        body {
          background: #0a0e14;
          color: #e8eaf0;
          font-family: 'Syne', sans-serif;
          min-height: 100vh;
        }

        .app {
          min-height: 100vh;
          background: #0a0e14;
          background-image:
            radial-gradient(ellipse 60% 40% at 70% 10%, rgba(29,158,117,0.12) 0%, transparent 60%),
            radial-gradient(ellipse 40% 30% at 10% 80%, rgba(83,74,183,0.1) 0%, transparent 60%);
          padding: 2rem 1rem;
        }

        .container { max-width: 720px; margin: 0 auto; }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 2.5rem;
        }

        .brand { display: flex; align-items: center; gap: 12px; }

        .brand-icon {
          width: 42px; height: 42px;
          border-radius: 12px;
          background: linear-gradient(135deg, #1D9E75 0%, #0F6E56 100%);
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 0 20px rgba(29,158,117,0.35);
        }

        .brand-icon svg { width: 22px; height: 22px; }
        .brand-name { font-size: 20px; font-weight: 700; color: #fff; letter-spacing: -0.3px; }
        .brand-sub { font-size: 11px; color: #5DCAA5; font-family: 'Space Mono', monospace; margin-top: 1px; }

        .wallet-btn {
          display: flex; align-items: center; gap: 8px;
          padding: 9px 18px; border-radius: 999px;
          border: 1px solid rgba(29,158,117,0.5);
          background: rgba(29,158,117,0.1);
          color: #5DCAA5; font-family: 'Space Mono', monospace;
          font-size: 12px; cursor: pointer; transition: all 0.2s;
        }
        .wallet-btn:hover { background: rgba(29,158,117,0.2); border-color: #1D9E75; }
        .wallet-btn.disconnected { border-color: rgba(127,119,221,0.5); background: rgba(127,119,221,0.1); color: #AFA9EC; }
        .wallet-btn.disconnected:hover { background: rgba(127,119,221,0.2); border-color: #7F77DD; }

        .status-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: #1D9E75; box-shadow: 0 0 6px #1D9E75; flex-shrink: 0;
        }
        .status-dot.off { background: #534AB7; box-shadow: 0 0 6px #534AB7; }

        .alert {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 16px; border-radius: 10px;
          font-size: 13px; margin-bottom: 1.25rem;
        }
        .alert-warning {
          background: rgba(186,117,23,0.12);
          border: 1px solid rgba(186,117,23,0.3);
          color: #EF9F27;
        }
        .alert-warning button {
          margin-left: auto; padding: 5px 14px; border-radius: 6px;
          border: 1px solid rgba(239,159,39,0.4);
          background: rgba(239,159,39,0.15);
          color: #EF9F27; font-size: 12px; cursor: pointer;
          font-family: 'Syne', sans-serif; transition: background 0.2s;
        }
        .alert-warning button:hover { background: rgba(239,159,39,0.25); }

        .info-bar {
          display: flex; align-items: center; justify-content: space-between;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 10px; padding: 10px 16px; margin-bottom: 1.5rem;
        }
        .info-bar-item { display: flex; flex-direction: column; gap: 2px; }
        .info-bar-label { font-size: 10px; color: #5c6478; text-transform: uppercase; letter-spacing: 0.08em; font-family: 'Space Mono', monospace; }
        .info-bar-value { font-size: 12px; color: #9ba3b8; font-family: 'Space Mono', monospace; }

        .chain-pill {
          display: flex; align-items: center; gap: 6px;
          background: rgba(83,74,183,0.15);
          border: 1px solid rgba(83,74,183,0.3);
          border-radius: 999px; padding: 4px 12px;
          font-size: 11px; color: #AFA9EC; font-family: 'Space Mono', monospace;
        }
        .chain-dot { width: 5px; height: 5px; border-radius: 50%; background: #7F77DD; box-shadow: 0 0 5px #7F77DD; }

        .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 1.5rem; }

        .metric-card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 14px; padding: 1.1rem 1.2rem;
          position: relative; overflow: hidden;
        }
        .metric-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, transparent, rgba(29,158,117,0.4), transparent);
        }
        .metric-card.highlight::before { background: linear-gradient(90deg, transparent, #1D9E75, transparent); }

        .metric-label { font-size: 11px; color: #5c6478; text-transform: uppercase; letter-spacing: 0.08em; font-family: 'Space Mono', monospace; margin-bottom: 10px; }
        .metric-value { font-size: 21px; font-weight: 700; color: #c8d0e0; font-family: 'Space Mono', monospace; line-height: 1; letter-spacing: -0.5px; }
        .metric-card.highlight .metric-value { color: #5DCAA5; }
        .metric-unit { font-size: 10px; color: #3d4557; font-family: 'Space Mono', monospace; margin-top: 6px; }

        .panels { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }

        .panel {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 16px; padding: 1.4rem;
        }
        .panel-header { display: flex; align-items: center; gap: 8px; margin-bottom: 1.1rem; }
        .panel-icon { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
        .panel-icon.deposit { background: rgba(29,158,117,0.15); }
        .panel-icon.withdraw { background: rgba(83,74,183,0.15); }
        .panel-title { font-size: 14px; font-weight: 600; color: #c8d0e0; letter-spacing: 0.02em; }

        .input-group { position: relative; margin-bottom: 12px; }
        .eth-input {
          width: 100%; padding: 11px 52px 11px 14px;
          border-radius: 10px; border: 1px solid rgba(255,255,255,0.1);
          background: rgba(0,0,0,0.25); color: #e8eaf0;
          font-size: 16px; font-weight: 700; font-family: 'Space Mono', monospace;
          outline: none; transition: border-color 0.2s;
        }
        .eth-input:focus { border-color: rgba(29,158,117,0.5); }
        .input-suffix {
          position: absolute; right: 14px; top: 50%; transform: translateY(-50%);
          font-size: 11px; color: #3d4557; font-family: 'Space Mono', monospace;
          font-weight: 700; pointer-events: none;
        }

        .action-btn {
          width: 100%; padding: 11px; border-radius: 10px;
          font-size: 14px; font-weight: 600; cursor: pointer; border: none;
          font-family: 'Syne', sans-serif; transition: all 0.2s; letter-spacing: 0.02em;
        }
        .deposit-btn { background: linear-gradient(135deg, #1D9E75, #0F6E56); color: #fff; box-shadow: 0 4px 16px rgba(29,158,117,0.3); }
        .deposit-btn:hover:not(:disabled) { transform: translateY(-1px); box-shadow: 0 6px 20px rgba(29,158,117,0.4); }
        .deposit-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }
        .withdraw-btn { background: rgba(83,74,183,0.15); border: 1px solid rgba(83,74,183,0.35); color: #AFA9EC; }
        .withdraw-btn:hover:not(:disabled) { background: rgba(83,74,183,0.25); transform: translateY(-1px); }
        .withdraw-btn:disabled { opacity: 0.45; cursor: not-allowed; transform: none; }

        .feedback { margin-top: 12px; font-size: 12px; }
        .feedback-reason { color: #5c6478; font-family: 'Space Mono', monospace; line-height: 1.5; }
        .feedback-tx { display: flex; align-items: center; gap: 6px; color: #5DCAA5; font-family: 'Space Mono', monospace; text-decoration: none; }
        .feedback-tx:hover { color: #1D9E75; }
        .feedback-success { display: flex; align-items: center; gap: 8px; color: #5DCAA5; font-family: 'Space Mono', monospace; }
        .feedback-success button {
          margin-left: auto; padding: 3px 10px; border-radius: 6px;
          border: 1px solid rgba(29,158,117,0.3); background: rgba(29,158,117,0.1);
          color: #5DCAA5; font-size: 11px; cursor: pointer; font-family: 'Syne', sans-serif;
        }
        .feedback-error { color: #F09595; font-family: 'Space Mono', monospace; line-height: 1.5; }

        .spinner-row { display: flex; align-items: center; gap: 8px; color: #AFA9EC; font-family: 'Space Mono', monospace; }
        .spinner {
          width: 10px; height: 10px; border-radius: 50%;
          border: 2px solid rgba(127,119,221,0.3); border-top-color: #7F77DD;
          animation: spin 0.8s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }

        .divider { height: 1px; background: rgba(255,255,255,0.05); margin: 12px 0; }

        .proof-bar {
          margin-top: 14px; display: flex; align-items: center; gap: 10px;
          padding: 10px 16px;
          background: rgba(29,158,117,0.08);
          border: 1px solid rgba(29,158,117,0.2);
          border-radius: 10px; font-size: 12px; color: #5DCAA5;
          font-family: 'Space Mono', monospace;
        }

        @media (max-width: 560px) {
          .metrics { grid-template-columns: 1fr 1fr; }
          .metrics .metric-card:last-child { grid-column: span 2; }
          .panels { grid-template-columns: 1fr; }
          .header { flex-direction: column; gap: 12px; align-items: flex-start; }
        }
      `}</style>

      <div className="app">
        <div className="container">

          {/* Header */}
          <div className="header">
            <div className="brand">
              <div className="brand-icon">
                <svg viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L4 9.5V20H20V9.5L12 2Z" fill="white" opacity="0.9"/>
                  <path d="M12 6L7.5 10.5V17H16.5V10.5L12 6Z" fill="#0a0e14" opacity="0.4"/>
                  <circle cx="12" cy="13.5" r="2.2" fill="white"/>
                </svg>
              </div>
              <div>
                <div className="brand-name">ETH Vault</div>
                <div className="brand-sub">Sepolia Testnet</div>
              </div>
            </div>

            {!isConnected ? (
              <button className="wallet-btn disconnected" onClick={() => connect({ connector: connectors[0] })}>
                <span className="status-dot off" />
                Connect MetaMask
              </button>
            ) : (
              <button className="wallet-btn" onClick={() => disconnect()}>
                <span className="status-dot" />
                {shortenAddress(address)}
              </button>
            )}
          </div>

          {/* Wrong network alert */}
          {isConnected && !isOnSepolia && (
            <div className="alert alert-warning">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 2L14.9 14H1.1L8 2Z" stroke="#EF9F27" strokeWidth="1.5" strokeLinejoin="round"/>
                <path d="M8 6v4M8 11.5v.5" stroke="#EF9F27" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              Wrong network detected — switch to Sepolia
              <button onClick={() => switchChain({ chainId: sepoliaChainId })}>Switch network</button>
            </div>
          )}

          {/* Info bar */}
          <div className="info-bar">
            <div className="info-bar-item">
              <span className="info-bar-label">Wallet</span>
              <span className="info-bar-value">{isConnected ? shortenAddress(address) : "—"}</span>
            </div>
            <div className="info-bar-item">
              <span className="info-bar-label">Contract</span>
              <span className="info-bar-value">
                {hasValidVaultAddress ? shortenAddress(vaultAddress) : "Not configured"}
              </span>
            </div>
            <div className="chain-pill">
              <span className="chain-dot" />
              Sepolia · {sepoliaChainId}
            </div>
          </div>

          {/* Metrics */}
          <div className="metrics">
            <div className="metric-card">
              <div className="metric-label">Original Amount</div>
              <div className="metric-value">{formatEth(principal)}</div>
              <div className="metric-unit">ETH deposited</div>
            </div>
            <div className="metric-card">
              <div className="metric-label">Pending rewards</div>
              <div className="metric-value">{formatEth(rewards)}</div>
              <div className="metric-unit">ETH earned</div>
            </div>
            <div className="metric-card highlight">
              <div className="metric-label">Potential total</div>
              <div className="metric-value">{formatEth(potentialTotal)}</div>
              <div className="metric-unit">ETH eligible_sum</div>
            </div>
          </div>

          {/* Panels */}
          <div className="panels">

            {/* Deposit */}
            <div className="panel">
              <div className="panel-header">
                <div className="panel-icon deposit">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2v10M4 8l4 4 4-4" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 14h12" stroke="#1D9E75" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className="panel-title">Deposit</span>
              </div>

              <div className="input-group">
                <input
                  className="eth-input"
                  type="number"
                  value={depositAmount}
                  min="0"
                  step="0.001"
                  onChange={(e) => setDepositAmount(e.target.value)}
                />
                <span className="input-suffix">ETH</span>
              </div>

              <button className="action-btn deposit-btn" disabled={isActionDisabled} onClick={onDeposit}>
                {isAwaitingWalletSignature ? "Awaiting signature..."
                  : isAwaitingOnchainConfirmation ? "Confirming..."
                  : "Deposit ETH"}
              </button>

              <div className="feedback">
                {isActionDisabled && disabledReason && <p className="feedback-reason">{disabledReason}</p>}

                {(isAwaitingWalletSignature || isAwaitingOnchainConfirmation) && (
                  <><div className="divider" />
                    <div className="spinner-row">
                      <div className="spinner" />
                      {isAwaitingWalletSignature ? "Waiting for MetaMask..." : "Broadcasting tx..."}
                    </div>
                  </>
                )}

                {txHash && !isConfirming && (
                  <><div className="divider" />
                    <a className="feedback-tx" href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer">
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8h10M9 4l4 4-4 4" stroke="#5DCAA5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {shortenHash(txHash)}
                    </a>
                  </>
                )}

                {isSuccess && (
                  <><div className="divider" />
                    <div className="feedback-success">
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                        <circle cx="8" cy="8" r="7" stroke="#5DCAA5" strokeWidth="1.5"/>
                        <path d="M5 8l2.5 2.5L11 5" stroke="#5DCAA5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      Confirmed
                      <button onClick={() => reset()}>Dismiss</button>
                    </div>
                  </>
                )}

                {(isWriteError || isReceiptError || errorMsg) && (
                  <><div className="divider" />
                    <p className="feedback-error">
                      {errorMsg || writeError?.shortMessage || receiptError?.message || "Transaction reverted."}
                    </p>
                  </>
                )}
              </div>
            </div>

            {/* Withdraw */}
            <div className="panel">
              <div className="panel-header">
                <div className="panel-icon withdraw">
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                    <path d="M8 14V4M4 8l4-4 4 4" stroke="#7F77DD" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 14h12" stroke="#7F77DD" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                </div>
                <span className="panel-title">Withdraw</span>
              </div>

              <div className="input-group">
                <input
                  className="eth-input"
                  type="number"
                  value={withdrawAmount}
                  min="0"
                  step="0.001"
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                />
                <span className="input-suffix">ETH</span>
              </div>

              <button className="action-btn withdraw-btn" disabled={isActionDisabled} onClick={onWithdraw}>
                {isAwaitingWalletSignature ? "Awaiting signature..."
                  : isAwaitingOnchainConfirmation ? "Confirming..."
                  : "Withdraw ETH"}
              </button>

              <div className="feedback">
                {isActionDisabled && disabledReason && <p className="feedback-reason">{disabledReason}</p>}

                {(isAwaitingWalletSignature || isAwaitingOnchainConfirmation) && (
                  <><div className="divider" />
                    <div className="spinner-row">
                      <div className="spinner" />
                      {isAwaitingWalletSignature ? "Waiting for MetaMask..." : "Broadcasting tx..."}
                    </div>
                  </>
                )}

                {txHash && !isConfirming && (
                  <><div className="divider" />
                    <a className="feedback-tx" href={`https://sepolia.etherscan.io/tx/${txHash}`} target="_blank" rel="noreferrer">
                      <svg width="10" height="10" viewBox="0 0 16 16" fill="none">
                        <path d="M3 8h10M9 4l4 4-4 4" stroke="#5DCAA5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                      {shortenHash(txHash)}
                    </a>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Proof bar */}
          {isSuccess && txAction && (
            <div className="proof-bar">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                <circle cx="8" cy="8" r="7" stroke="#5DCAA5" strokeWidth="1.5"/>
                <path d="M5 8l2.5 2.5L11 5" stroke="#5DCAA5" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Most recent action: <strong>{txAction}</strong> · confirmed on-chain
            </div>
          )}

        </div>
      </div>
    </>
  );
}