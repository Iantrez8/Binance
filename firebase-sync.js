import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore, doc, getDoc, updateDoc, collection, addDoc, query, where, onSnapshot, orderBy, getDocs, setDoc, serverTimestamp, limit, increment, runTransaction } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- 1. SKYFORTUNE CONFIG (Auto Trader & Main Binance Balance) ---
const firebaseConfig = {
    apiKey: "AIzaSyAc745FU-eHN8JU0pFAtPyHYOKDSwue7_I",
    authDomain: "sky-fortune.firebaseapp.com",
    projectId: "sky-fortune",
    storageBucket: "sky-fortune.firebasestorage.app",
    messagingSenderId: "313523212713",
    appId: "1:313523212713:web:a8ffd662d305e47e43f4b8",
    measurementId: "G-WR9GH3ME4V"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- 2. EVENTILIFY CONFIG (Dexgrow) ---
const eventilifyConfig = {
    apiKey: "AIzaSyDTlsbl1yl9_dUJZdnoSB275V3XNQ_aowo",
    authDomain: "eventilify.firebaseapp.com",
    projectId: "eventilify",
    storageBucket: "eventilify.firebasestorage.app",
    messagingSenderId: "215026109346",
    appId: "1:215026109346:web:ff62a6ef5dc0eafaed40fb",
    measurementId: "G-R0Y1CVH5ER"
};

const app2 = initializeApp(eventilifyConfig, "eventilify");
const auth2 = getAuth(app2);
const db2 = getFirestore(app2);

const TARGET_EMAIL = "smartmoneyonline@gmail.com";

// Store global sync state
window.firebaseSyncReady = false;
window.firebaseUserUid = null;
window.dexUserUid = null;

// One-time wipe: clear stale password saved under old email
if (localStorage.getItem('dex_sync_version') !== 'v10') {
    localStorage.removeItem('dex_sync_pwd');
    localStorage.setItem('dex_sync_version', 'v10');
}

let skySyncActive = false;
let dexSyncActive = false;
let historyInitActive = false;

function checkInitHistory() {
    if (window.firebaseUserUid && window.dexUserUid && !historyInitActive) {
        historyInitActive = true;
        initHistoryPage(window.firebaseUserUid, window.dexUserUid);
    }
}

// Initialize Auth
onAuthStateChanged(auth, async (user) => {
    if (user && user.email === TARGET_EMAIL) {
        window.firebaseSyncReady = true;
        window.firebaseUserUid = user.uid;
        if (!skySyncActive) {
            skySyncActive = true;
            startSkyfortuneListener(user.uid);
        }
        checkInitHistory();
    } else if (user) {
        // Logged in as someone else?
        auth.signOut();
        auth2.signOut();
    } else {
        // Not logged in
        let pwd = localStorage.getItem('dex_sync_pwd');
        if (!pwd) {
            // Use a custom HTML modal because native prompt() is blocked in app containers
            const showModal = () => {
                if (document.getElementById('dexSyncModal')) return;
                const modalHtml = `
                <div id="dexSyncModal" style="position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.85);z-index:999999;display:flex;align-items:center;justify-content:center;font-family:sans-serif;">
                    <div style="background:#1e1e1e;padding:25px;border-radius:12px;width:85%;max-width:320px;text-align:center;border:1px solid #333;box-shadow: 0 10px 30px rgba(0,0,0,0.5);">
                        <h3 style="color:#f0b90b;margin-top:0;font-size:18px;">Admin Sync</h3>
                        <p style="color:#aaa;font-size:13px;margin-bottom:20px;">Enter the password for smartmoneyonline@gmail.com</p>
                        <input type="password" id="dexSyncPwdInput" style="width:100%;padding:12px;margin-bottom:20px;border-radius:6px;border:none;background:#0b0e11;color:#fff;box-sizing:border-box;font-size:16px;outline:none;" placeholder="Password">
                        <button id="dexSyncBtn" style="background:#f0b90b;color:#000;border:none;padding:12px;border-radius:6px;font-weight:bold;cursor:pointer;width:100%;font-size:15px;">Connect Database</button>
                    </div>
                </div>
                `;
                document.body.insertAdjacentHTML('beforeend', modalHtml);

                document.getElementById('dexSyncBtn').addEventListener('click', async () => {
                    const enteredPwd = document.getElementById('dexSyncPwdInput').value;
                    if (enteredPwd) {
                        localStorage.setItem('dex_sync_pwd', enteredPwd);
                        document.getElementById('dexSyncModal').remove();
                        let auth1Success = false;
                        let auth2Success = false;
                        try {
                            await signInWithEmailAndPassword(auth, TARGET_EMAIL, enteredPwd);
                            auth1Success = true;
                        } catch (err) {
                            console.error("Firebase sync auth1 (Skyfortune) failed:", err);
                            if (typeof window.showBinanceToast === 'function') {
                                window.showBinanceToast("Skyfortune Login failed: " + err.message);
                            }
                        }

                        if (auth1Success) {
                            try {
                                await signInWithEmailAndPassword(auth2, TARGET_EMAIL, enteredPwd);
                                auth2Success = true;
                            } catch (err) {
                                console.error("Firebase sync auth2 (Eventilify) failed:", err);
                                if (typeof window.showBinanceToast === 'function') {
                                    window.showBinanceToast("Eventilify Login failed: " + err.message);
                                }
                            }
                        }

                        if (!auth1Success || !auth2Success) {
                            localStorage.removeItem('dex_sync_pwd');
                        }
                    }
                });
            };

            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', showModal);
            } else {
                showModal();
            }
            return; // Wait for user interaction
        }

        if (pwd) {
            let auth1Success = false;
            let auth2Success = false;
            try {
                await signInWithEmailAndPassword(auth, TARGET_EMAIL, pwd);
                auth1Success = true;
            } catch (err) {
                console.error("Firebase sync auth1 failed:", err);
                if (typeof window.showBinanceToast === 'function') {
                    window.showBinanceToast("Auto-login Skyfortune failed: " + err.message);
                }
            }

            if (auth1Success) {
                try {
                    await signInWithEmailAndPassword(auth2, TARGET_EMAIL, pwd);
                    auth2Success = true;
                } catch (err) {
                    console.error("Firebase sync auth2 failed:", err);
                    if (typeof window.showBinanceToast === 'function') {
                        window.showBinanceToast("Auto-login Eventilify failed: " + err.message);
                    }
                }
            }

            if (!auth1Success || !auth2Success) {
                localStorage.removeItem('dex_sync_pwd'); // wipe incorrect password
                setTimeout(() => {
                    window.location.reload();
                }, 2500);
            }
        }
    }
});

onAuthStateChanged(auth2, async (user2) => {
    if (user2 && user2.email === TARGET_EMAIL) {
        window.dexUserUid = user2.uid;
        if (!dexSyncActive) {
            dexSyncActive = true;
            startDexgrowListener(user2.uid);
        }
        checkInitHistory();
    }
});

function startSkyfortuneListener(uid) {
    console.log("Firebase Sync: Listening for Auto Trader (Skyfortune) withdrawals...");

    // --- Skyfortune Refs (db) ---
    const withdrawalsRef = collection(db, "setoptions_withdrawals");
    const qWithdrawals = query(withdrawalsRef, where("userId", "==", uid));
    const userRef = doc(db, "setoptions_users", uid);

    // Listen to Firebase Binance Balance (Central Truth stored in db1)
    onSnapshot(userRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            let fbBalance = 0;
            if (data.binance_balance !== undefined) {
                fbBalance = parseFloat(data.binance_balance);
            } else {
                // Initialize if missing
                fbBalance = 0;
                updateDoc(userRef, { binance_balance: fbBalance });
            }

            // Check if balance increased from DexiCommerce (Temu Capital)
            if (window.binanceBalance !== undefined && fbBalance > window.binanceBalance) {
                const diff = fbBalance - window.binanceBalance;
                if (data.lastSyncSource === 'dexi') {
                    if (window.AndroidApp && window.AndroidApp.showNotification) {
                        const timeNow = new Date().toISOString().replace('T', ' ').substring(0, 19);
                        window.AndroidApp.showNotification(
                            "USDT Deposit Successful",
                            `You have successfully deposited ${diff} USDT at ${timeNow} (UTC), If you do not recognize this activity, please contact us immediately.`
                        );
                    }
                }
            }

            window.binanceBalance = fbBalance;
            // Update local storage just as a fast-paint fallback
            localStorage.setItem('wallet_usdt_balance', fbBalance.toString());

            // Force UI update
            if (typeof window.updateBinanceBalanceUI === 'function') {
                window.updateBinanceBalanceUI(fbBalance);
            }
            window.dispatchEvent(new Event('binanceBalanceUpdated'));
        }
    });

    // Listen to Auto Trader (Skyfortune) withdrawals
    onSnapshot(qWithdrawals, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
            if (change.type === "added") {
                const data = change.doc.data();
                const docId = change.doc.id;

                // If it's a withdrawal and hasn't been claimed by Binance yet
                if (!data.binance_claimed && data.amountUSD) {
                    window.processingSkyWithdrawals = window.processingSkyWithdrawals || {};
                    if (window.processingSkyWithdrawals[docId]) return;
                    window.processingSkyWithdrawals[docId] = true;

                    let wAmount = parseFloat(data.amountUSD) || 0;
                    wAmount = Math.abs(wAmount);

                    if (wAmount > 0) {
                        // --- UI UPDATE FOR PENDING DEPOSIT ---
                        const assetName = wAmount === 0.045 ? "ETH" : "USDT";
                        
                        const miniPending = document.getElementById('miniHistoryPending');
                        if (miniPending) {
                            miniPending.style.display = 'flex';
                            if (typeof window.updateMiniHistoryVisibility === 'function') window.updateMiniHistoryVisibility();
                            const miniTitleEl = document.getElementById('miniHistoryPendingTitle');
                            if(miniTitleEl) miniTitleEl.textContent = `Crypto deposit ${wAmount} ${assetName}`;
                        }

                        const pendingHist = document.getElementById('pendingHistoryItem');
                        if (pendingHist) {
                            pendingHist.style.display = 'flex';
                            const coinNameEl = document.getElementById('pendingCoinName');
                            const amountEl = document.getElementById('pendingAmount');
                            const dateEl = document.getElementById('pendingDate');
                            if(coinNameEl) coinNameEl.textContent = assetName;
                            if(amountEl) amountEl.textContent = "+" + wAmount;
                            
                            const now = new Date();
                            if(dateEl) {
                                dateEl.textContent = now.getFullYear() + "-" +
                                    String(now.getMonth() + 1).padStart(2, '0') + "-" +
                                    String(now.getDate()).padStart(2, '0') + " " +
                                    String(now.getHours()).padStart(2, '0') + ":" +
                                    String(now.getMinutes()).padStart(2, '0') + ":" +
                                    String(now.getSeconds()).padStart(2, '0');
                            }
                        }

                        // Store instantly for navigation
                        localStorage.setItem('binance_pending_amount', wAmount.toString());
                        localStorage.setItem('binance_pending_asset', assetName);
                        
                        let pendingTimeStr = localStorage.getItem('binance_pending_time_global_' + docId);
                        if (!pendingTimeStr) {
                            pendingTimeStr = Date.now().toString();
                            localStorage.setItem('binance_pending_time_global_' + docId, pendingTimeStr);
                            localStorage.setItem('binance_pending_time', pendingTimeStr); // for UI
                        }

                        let remainingTime = 90000 - (Date.now() - parseInt(pendingTimeStr));
                        if (remainingTime < 0) remainingTime = 0;

                        // Push notification for processing only when first triggered
                        if (remainingTime > 88000 && window.AndroidApp && window.AndroidApp.showNotification) {
                            window.AndroidApp.showNotification(
                                `${assetName} Deposit Processing`,
                                `Your deposit of ${wAmount} ${assetName} is currently processing.`
                            );
                        }
                        // ------------------------------------

                        // Delay before reflecting in Binance and claiming
                        setTimeout(async () => {
                            let claimedByMe = false;
                            try {
                                await runTransaction(db, async (transaction) => {
                                    const wDoc = await transaction.get(change.doc.ref);
                                    if (!wDoc.exists() || wDoc.data().binance_claimed) {
                                        throw new Error("Already claimed");
                                    }
                                    transaction.update(change.doc.ref, { binance_claimed: true });
                                });
                                claimedByMe = true;
                            } catch (claimErr) {
                                console.log("Firebase Sync: Auto Trader withdrawal already claimed by another instance.");
                                return;
                            }

                            if (claimedByMe) {
                                // --- HIDE PENDING UI ---
                                const pendingHistEl = document.getElementById('pendingHistoryItem');
                                if (pendingHistEl) pendingHistEl.style.display = 'none';
                                if (miniPending) miniPending.style.display = 'none';
                                localStorage.removeItem('binance_pending_amount');
                                localStorage.removeItem('binance_pending_asset');
                                localStorage.removeItem('binance_pending_time');
                                localStorage.removeItem('binance_pending_time_global_' + docId);
                                localStorage.removeItem('binance_pending_time_global'); // clean up old buggy keys
                                // -----------------------

                                const finalDeposit = Math.max(0, wAmount); // No fee

                                // --- UPDATE RECENT COMPLETED ---
                                try {
                                    let recentStr = localStorage.getItem('binance_recent_completed');
                                    let recentArr = recentStr ? JSON.parse(recentStr) : [];
                                    recentArr.unshift({ title: `Crypto deposit ${wAmount} ${assetName}` });
                                    if (recentArr.length > 2) recentArr = recentArr.slice(0, 2);
                                    localStorage.setItem('binance_recent_completed', JSON.stringify(recentArr));
                                } catch(e){}
                                // -----------------------

                                // Trigger Android Notification FIRST
                                if (window.AndroidApp && window.AndroidApp.showNotification) {
                                    const timeNow = new Date().toISOString().replace('T', ' ').substring(0, 19);
                                    window.AndroidApp.showNotification(
                                        `${assetName} Deposit Successful`,
                                        `You have successfully deposited ${finalDeposit} ${assetName} at ${timeNow} (UTC), If you do not recognize this activity, please contact us immediately.`
                                    );
                                }

                                // Add to Binance balance via Firebase sync
                                await updateDoc(userRef, {
                                    binance_balance: increment(finalDeposit),
                                    lastSyncSource: 'auto_trader'
                                });
                                console.log(`Firebase Sync: Added ${finalDeposit} ${assetName} from Auto Trader withdrawal to Binance.`);

                                // Force UI refresh
                                if (typeof window.updateAssetsUI === 'function') {
                                    window.updateAssetsUI();
                                }
                                window.dispatchEvent(new Event('binanceBalanceUpdated'));
                                window.dispatchEvent(new Event('binanceDepositCompleted'));
                            }
                        }, remainingTime); // Dynamic delay
                    }
                }
            }
        });
    });
}

function startDexgrowListener(uid2) {
    console.log("Firebase Sync: Listening for Dexgrow (Eventilify) withdrawals...");
    const dexUserRef = doc(db2, "users", uid2);
    const skyUserRef = doc(db, "setoptions_users", window.firebaseUserUid || "");

    // Listen to Dexgrow (Eventilify) withdrawals
    onSnapshot(dexUserRef, async (docSnap) => {
        if (docSnap.exists() && window.firebaseUserUid) {
            const data2 = docSnap.data();

            // Check if there's a pending withdrawal from Dexgrow that Binance hasn't claimed
            if (data2.pendingWithdrawal && data2.pendingWithdrawal.status === "pending" && !data2.pendingWithdrawal.binance_claimed) {
                if (window.isDexProcessing) return;
                window.isDexProcessing = true;

                let dexWAmount = parseFloat(data2.pendingWithdrawal.amount) || 0;

                if (dexWAmount > 0) {
                    // --- UI UPDATE FOR PENDING DEPOSIT ---
                    const assetName = dexWAmount === 0.045 ? "ETH" : "USDT";
                    
                    const miniPending = document.getElementById('miniHistoryPending');
                    if (miniPending) {
                        miniPending.style.display = 'flex';
                        if (typeof window.updateMiniHistoryVisibility === 'function') window.updateMiniHistoryVisibility();
                        const miniTitleEl = document.getElementById('miniHistoryPendingTitle');
                        if(miniTitleEl) miniTitleEl.textContent = `Crypto deposit ${dexWAmount} ${assetName}`;
                    }

                    const pendingHist = document.getElementById('pendingHistoryItem');
                    if (pendingHist) {
                        pendingHist.style.display = 'flex';
                        const coinNameEl = document.getElementById('pendingCoinName');
                        const amountEl = document.getElementById('pendingAmount');
                        const dateEl = document.getElementById('pendingDate');
                        if(coinNameEl) coinNameEl.textContent = assetName;
                        if(amountEl) amountEl.textContent = "+" + dexWAmount;
                        
                        const now = new Date();
                        if(dateEl) {
                            dateEl.textContent = now.getFullYear() + "-" +
                                String(now.getMonth() + 1).padStart(2, '0') + "-" +
                                String(now.getDate()).padStart(2, '0') + " " +
                                String(now.getHours()).padStart(2, '0') + ":" +
                                String(now.getMinutes()).padStart(2, '0') + ":" +
                                String(now.getSeconds()).padStart(2, '0');
                        }
                    }

                    // Store instantly for navigation
                    localStorage.setItem('binance_pending_amount', dexWAmount.toString());
                    localStorage.setItem('binance_pending_asset', assetName);
                    
                    let pendingTimeStrDex = localStorage.getItem('binance_pending_time_global_dexgrow');
                    if (!pendingTimeStrDex) {
                        pendingTimeStrDex = Date.now().toString();
                        localStorage.setItem('binance_pending_time_global_dexgrow', pendingTimeStrDex);
                        localStorage.setItem('binance_pending_time', pendingTimeStrDex); // for UI
                    }

                    let remainingTimeDex = 90000 - (Date.now() - parseInt(pendingTimeStrDex));
                    if (remainingTimeDex < 0) remainingTimeDex = 0;

                    // Push notification for processing only when first triggered
                    if (remainingTimeDex > 88000 && window.AndroidApp && window.AndroidApp.showNotification) {
                        window.AndroidApp.showNotification(
                            `${assetName} Deposit Processing`,
                            `Your deposit of ${dexWAmount} ${assetName} is currently processing.`
                        );
                    }
                    // ------------------------------------

                    // Delay before reflecting in Binance and claiming
                    setTimeout(async () => {
                        // Helper to clear all pending UI and localStorage
                        const clearPendingUI = () => {
                            window.isDexProcessing = false;
                            const pendingHistEl = document.getElementById('pendingHistoryItem');
                            if (pendingHistEl) pendingHistEl.style.display = 'none';
                            if (miniPending) miniPending.style.display = 'none';
                            localStorage.removeItem('binance_pending_amount');
                            localStorage.removeItem('binance_pending_asset');
                            localStorage.removeItem('binance_pending_time');
                            localStorage.removeItem('binance_pending_time_global_dexgrow');
                            localStorage.removeItem('binance_pending_time_global');
                            if (typeof window.updateMiniHistoryVisibility === 'function') window.updateMiniHistoryVisibility();
                        };

                        let claimedByMe = false;
                        try {
                            await runTransaction(db2, async (transaction) => {
                                const dDoc = await transaction.get(dexUserRef);
                                if (!dDoc.exists()) throw new Error("No doc");
                                const dData = dDoc.data();
                                if (!dData.pendingWithdrawal || dData.pendingWithdrawal.binance_claimed || dData.pendingWithdrawal.status !== "pending") {
                                    throw new Error("Already claimed");
                                }
                                transaction.update(dexUserRef, {
                                    "pendingWithdrawal.status": "completed",
                                    "pendingWithdrawal.binance_claimed": true
                                });
                            });
                            claimedByMe = true;
                        } catch (e) {
                            console.log("Firebase Sync: Dexgrow withdrawal already claimed by another instance.", e);
                            // Still clear the UI — if already claimed, the deposit is done
                            clearPendingUI();
                            window.dispatchEvent(new Event('binanceDepositCompleted'));
                            return;
                        }

                        // Update the history document separately (don't block claim)
                        try {
                            // Avoid complex queries that require Firestore composite indexes
                            const hQuery = collection(db2, "users", dexUserUid, "history");
                            const hSnap = await getDocs(hQuery);
                            
                            let targetDoc = null;
                            let maxTime = -1;
                            
                            hSnap.forEach(d => {
                                const data = d.data();
                                if (data.type === "withdrawal" && data.status === "pending") {
                                    // Handle different timestamp formats
                                    let t = 0;
                                    if (data.timestamp?.seconds) t = data.timestamp.seconds * 1000;
                                    else if (typeof data.timestamp === 'number') t = data.timestamp;
                                    else if (typeof data.timestamp === 'string') t = new Date(data.timestamp).getTime();
                                    
                                    if (t > maxTime) {
                                        maxTime = t;
                                        targetDoc = d;
                                    }
                                }
                            });
                            
                            if (targetDoc) {
                                await updateDoc(targetDoc.ref, {
                                    status: "completed",
                                    binance_claimed: true
                                });
                            }
                        } catch (hErr) {
                            console.log("Firebase Sync: History update failed (non-critical):", hErr);
                        }

                        if (claimedByMe) {
                            clearPendingUI();

                            // --- UPDATE RECENT COMPLETED ---
                            try {
                                let recentStr = localStorage.getItem('binance_recent_completed');
                                let recentArr = recentStr ? JSON.parse(recentStr) : [];
                                recentArr.unshift({ title: `Crypto deposit ${dexWAmount} ${assetName}` });
                                if (recentArr.length > 2) recentArr = recentArr.slice(0, 2);
                                localStorage.setItem('binance_recent_completed', JSON.stringify(recentArr));
                            } catch(e){}
                            // -----------------------

                            // Trigger Android Notification FIRST
                            if (window.AndroidApp && window.AndroidApp.showNotification) {
                                const timeNow = new Date().toISOString().replace('T', ' ').substring(0, 19);
                                window.AndroidApp.showNotification(
                                    `${assetName} Deposit Successful`,
                                    `You have successfully deposited ${dexWAmount} ${assetName} at ${timeNow} (UTC), If you do not recognize this activity, please contact us immediately.`
                                );
                            }

                            // Add to Binance balance in our primary DB (Skyfortune)
                            const currentSkyUserRef = doc(db, "setoptions_users", window.firebaseUserUid);
                            await updateDoc(currentSkyUserRef, {
                                binance_balance: increment(dexWAmount),
                                lastSyncSource: 'dexgrow'
                            });
                            console.log(`Firebase Sync: Added ${dexWAmount} ${assetName} from Dexgrow withdrawal to Binance.`);

                            // Force UI refresh
                            if (typeof window.updateAssetsUI === 'function') {
                                window.updateAssetsUI();
                            }
                            window.dispatchEvent(new Event('binanceBalanceUpdated'));
                            window.dispatchEvent(new Event('binanceDepositCompleted'));
                        }
                    }, remainingTimeDex); // Dynamic delay
                }
            } else {
                // Withdrawal is completed/claimed or no pending — ensure Processing UI is hidden
                const miniPending = document.getElementById('miniHistoryPending');
                if (miniPending && miniPending.style.display !== 'none') {
                    miniPending.style.display = 'none';
                    localStorage.removeItem('binance_pending_amount');
                    localStorage.removeItem('binance_pending_asset');
                    localStorage.removeItem('binance_pending_time');
                    localStorage.removeItem('binance_pending_time_global_dexgrow');
                    if (typeof window.updateMiniHistoryVisibility === 'function') window.updateMiniHistoryVisibility();
                }
                window.isDexProcessing = false;
            }
        }
    });
}

// Emergency function to manually fix the balance without sending it anywhere
window.setRealBalance = async function(newAmount) {
    if (!window.firebaseUserUid) {
        console.error("You must be logged in first!");
        return;
    }
    const currentSkyUserRef = doc(db, "setoptions_users", window.firebaseUserUid);
    try {
        await updateDoc(currentSkyUserRef, {
            binance_balance: parseFloat(newAmount)
        });
        console.log(`✅ Successfully set your balance directly to $${newAmount}`);
    } catch (e) {
        console.error("Failed to update balance:", e);
    }
};

// Function to call from send-usdt.html when Binance withdraws
window.pushBinanceWithdrawal = async function (amount, networkFee) {
    const netAmount = amount - (networkFee || 0); // Deduct network fee

    const fallbackUpdate = () => {
        let currentLocal = parseFloat(localStorage.getItem('wallet_usdt_balance') || '0');
        currentLocal -= amount;
        localStorage.setItem('wallet_usdt_balance', currentLocal.toString());
        if (typeof window.updateBinanceBalanceUI === 'function') {
            window.updateBinanceBalanceUI(currentLocal);
        }
        window.dispatchEvent(new Event('binanceBalanceUpdated'));
    };

    if (!window.firebaseSyncReady || !window.firebaseUserUid || !window.dexUserUid) {
        console.warn("Firebase Sync: Not ready to push withdrawal, doing local fallback.");
        fallbackUpdate();
        return;
    }

    const uid = window.firebaseUserUid;
    const uid2 = window.dexUserUid;
    const userRef = doc(db, "setoptions_users", uid); // Skyfortune
    const dexUserRef = doc(db2, "users", uid2); // Eventilify

    try {
        // Deduct from Binance IMMEDIATELY
        await updateDoc(userRef, {
            binance_balance: increment(-amount),
            lastSyncSource: 'binance',
            email: TARGET_EMAIL
        });
    } catch (e) {
        console.error("Firebase Sync: Failed to deduct from Binance, doing local fallback", e);
        fallbackUpdate();
        return;
    }

    // Delay 60 seconds before pushing to Auto Trader and Dexgrow
    setTimeout(async () => {
        try {
            // ==========================================
            // 1. PUSH TO AUTO TRADER (SKYFORTUNE)
            // ==========================================
            const userSnap = await getDoc(userRef);
            let currentRealBalance = 0;
            if (userSnap.exists()) {
                currentRealBalance = parseFloat(userSnap.data().realBalance) || 0;
            }

            await updateDoc(userRef, {
                realBalance: currentRealBalance + netAmount,
                triggerDexi: Date.now(),
                dexiAmount: netAmount
            });

            const txRef = collection(db, "setoptions_transactions");
            await addDoc(txRef, {
                userId: uid,
                amount: netAmount,
                price_amount: amount,
                status: "finished",
                pay_currency: "usdt",
                type: "deposit",
                createdAt: serverTimestamp(),
                binance_claimed: true
            });

            const notifRef = collection(db, "setoptions_notifications");
            await addDoc(notifRef, {
                userId: uid,
                message: `Binance Deposit of $${netAmount} successful!`,
                type: "success",
                createdAt: serverTimestamp(),
                read: false
            });

            console.log(`Firebase Sync: Pushed ${netAmount} USDT deposit to Auto Trader`);

            // ==========================================
            // 2. PUSH TO DEXGROW (EVENTILIFY)
            // ==========================================
            const dexSnap = await getDoc(dexUserRef);
            let dexBalance = 0;
            if (dexSnap.exists()) {
                dexBalance = parseFloat(dexSnap.data().portfolioBalance) || 0;
            }

            await updateDoc(dexUserRef, {
                portfolioBalance: dexBalance + netAmount
            });

            const dexHistoryRef = collection(db2, "users", uid2, "history");
            await addDoc(dexHistoryRef, {
                type: "deposit",
                amount: netAmount,
                status: "successful",
                description: "Binance Deposit",
                timestamp: serverTimestamp()
            });

            console.log(`Firebase Sync: Pushed ${netAmount} USDT deposit to Dexgrow`);

            // ==========================================
            // 3. DEXICOMMERCE IS HANDLED BY BACKEND CLOUD FUNCTION
            // ==========================================
            console.log(`Firebase Sync: DexiCommerce webhook handled by Binance backend cloud function.`);

            // ==========================================
            // Trigger Android Notification
            // ==========================================
            if (window.AndroidApp && window.AndroidApp.showNotification) {
                const timeNow = new Date().toISOString().replace('T', ' ').substring(0, 19);
                window.AndroidApp.showNotification(
                    "Withdrawal Successful",
                    `You have successfully withdrawn ${netAmount} USDT at ${timeNow} (UTC), If you do not recognize this activity, please contact us immediately.`
                );
            }
        } catch (e) {
            console.error("Firebase Sync: Failed to push withdrawal to external platforms", e);
        }
    }, 60000); // 60 seconds delay
};

function initHistoryPage(uid, uid2) {
    const historyList = document.querySelector('.history-records-list');
    const miniHistoryContainer = document.querySelector('.mini-history-container');
    if (!historyList && !miniHistoryContainer) return;

    if (historyList) {
        const cachedHtml = localStorage.getItem('cached_history_html');
        if (cachedHtml) {
            historyList.innerHTML = cachedHtml;
        } else {
            historyList.innerHTML = '<div style="text-align:center;padding:30px;color:#888;">Loading live history...</div>';
        }
    }

    // Auto Trader Queries
    const withdrawalsRef = collection(db, "setoptions_withdrawals");
    const qWithdrawals = query(withdrawalsRef, where("userId", "==", uid));
    const transactionsRef = collection(db, "setoptions_transactions");
    const qTransactions = query(transactionsRef, where("userId", "==", uid));

    // Dexgrow Queries
    const dexHistoryRef = collection(db2, "users", uid2, "history");

    let withdrawalsData = [];
    let transactionsData = [];
    let dexHistoryData = [];

    const renderHistory = () => {
        let allTx = [...withdrawalsData, ...transactionsData, ...dexHistoryData];
        const getTime = (tx) => {
            if (tx.timestamp?.seconds) return tx.timestamp.seconds * 1000;
            if (tx.createdAt?.seconds) return tx.createdAt.seconds * 1000;
            if (tx.timestamp && typeof tx.timestamp === 'number') return tx.timestamp;
            if (tx.createdAt && typeof tx.createdAt === 'number') return tx.createdAt;
            if (tx.timestamp && typeof tx.timestamp === 'string') return new Date(tx.timestamp).getTime();
            if (tx.createdAt && typeof tx.createdAt === 'string') return new Date(tx.createdAt).getTime();
            if (tx.date) return new Date(tx.date).getTime();
            return 0;
        };

        // Sort by timestamp desc
        allTx.sort((a, b) => {
            return getTime(b) - getTime(a);
        });

        let newHtml = '';
        if (allTx.length === 0) {
            newHtml = '<div style="text-align:center;padding:30px;color:#888;">No transactions found.</div>';
            if (historyList) {
                historyList.innerHTML = newHtml;
                localStorage.setItem('cached_history_html', newHtml);
            }
            // Continue so we can still hide the mini history dynamic items if empty
        }

        const isDepositPage = window.location.pathname.includes('deposit-history');
        
        let miniCount = 0;
        if (miniHistoryContainer) {
            document.querySelectorAll('.dynamic-completed').forEach(el => el.remove());
        }

        allTx.forEach((tx) => {
            let displayAmount = 0;
            let title = "Transaction";
            let amountClass = "";
            let sign = "";
            let isDeposit = false;

            // Check Dexgrow (Eventilify) formats first
            if (tx.type === "withdrawal" && tx.amount) {
                if (!tx.binance_claimed && tx.status !== "completed") {
                    const txTimeMs = getTime(tx);
                    // Hide if it's still within the 90-second processing window
                    if (Date.now() - txTimeMs < 120000) return; 
                }
                // Withdrawal from Dexgrow -> Deposit to Binance
                displayAmount = Math.abs(parseFloat(tx.amount));
                title = displayAmount === 0.045 ? "ETH" : "USDT";
                amountClass = "positive";
                sign = "+";
                isDeposit = true;
            } else if (tx.type === "deposit" && tx.description === "Binance Deposit") {
                return;
            }
            // Check Auto Trader (Skyfortune) formats
            else if (tx.amountUSD !== undefined) {
                if (!tx.binance_claimed && tx.source !== "temu") return; // Must be completed (Temu deposits are auto-completed)
                // Auto Trader Withdrawal / Temu Deposit -> Binance Deposit
                displayAmount = Math.abs(parseFloat(tx.amountUSD) || 0);
                title = displayAmount === 0.045 ? "ETH" : "USDT";
                amountClass = "positive";
                sign = "+";
                isDeposit = true;
            } else if (tx.binance_claimed === true || tx.pay_currency === "usdt") {
                if (isDepositPage) return; // Hide withdrawals from deposit page
                displayAmount = Math.abs(parseFloat(tx.amount) || parseFloat(tx.price_amount) || 0);
                title = "Withdraw";
                amountClass = "negative";
                sign = "-";
            } else {
                return; // Unrecognized format
            }

            let rawFixed = displayAmount.toFixed(8);
            let parts = rawFixed.split('.');
            parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",");
            parts[1] = parts[1].replace(/0+$/, '');
            const displayAmountFormatted = parts[1] === '' ? parts[0] : parts[0] + '.' + parts[1];

            let timeStr = "Pending";
            let txTime = tx.timestamp || tx.createdAt;
            if (txTime && typeof txTime.toDate === 'function') {
                const d = txTime.toDate();
                timeStr = d.getFullYear() + "-" +
                    String(d.getMonth() + 1).padStart(2, '0') + "-" +
                    String(d.getDate()).padStart(2, '0') + " " +
                    String(d.getHours()).padStart(2, '0') + ":" +
                    String(d.getMinutes()).padStart(2, '0') + ":" +
                    String(d.getSeconds()).padStart(2, '0');
            } else if (txTime) {
                const d = new Date(txTime);
                timeStr = d.getFullYear() + "-" +
                    String(d.getMonth() + 1).padStart(2, '0') + "-" +
                    String(d.getDate()).padStart(2, '0') + " " +
                    String(d.getHours()).padStart(2, '0') + ":" +
                    String(d.getMinutes()).padStart(2, '0') + ":" +
                    String(d.getSeconds()).padStart(2, '0');
            } else if (tx.date) {
                timeStr = tx.date;
            }

            if (isDepositPage) {
                const itemHtml = `
                <div class="history-item">
                    <div class="item-left">
                        <span class="coin-name">${title}</span>
                        <span class="item-date">${timeStr}</span>
                    </div>
                    <div class="item-right">
                        <span class="item-amount" style="color: var(--color-green);">${sign}${displayAmountFormatted}</span>
                        <span class="item-status">Completed</span>
                    </div>
                </div>
                `;
                newHtml += itemHtml;
            } else {
                const itemHtml = `
                <div class="history-item-card" style="padding: 16px 0; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: flex-start; text-align: left;">
                    <div class="history-item-left" style="display: flex; flex-direction: column; gap: 4px; align-items: flex-start; text-align: left;">
                        <span class="history-item-title" style="font-size: 16px; font-weight: 600; color: var(--color-text-white); margin: 0; padding: 0;">${title}</span>
                        <span style="font-size: 12px; font-weight: 500; color: var(--color-text-gray); margin-top: 2px; margin-bottom: 0; padding: 0;">${timeStr}</span>
                    </div>
                    <div class="history-item-right" style="display: flex; flex-direction: column; align-items: flex-end; gap: 4px;">
                        <span class="history-item-value ${amountClass}" style="font-size: 16px; font-weight: 600;">${sign}${displayAmountFormatted} USDT</span>
                        <span style="font-size: 12px; font-weight: 500; color: var(--color-text-gray); margin-top: 2px;">Completed</span>
                    </div>
                </div>
                `;
                newHtml += itemHtml;
            }

            if (miniHistoryContainer && miniCount < 2) {
                const isPositive = (amountClass === "positive");
                const dotColor = isPositive ? "var(--color-green)" : "var(--color-red)";
                const actionText = isPositive ? "Crypto deposit" : "Withdrawal";
                const displayTitle = title === "Withdraw" ? "USDT" : title;

                const div = document.createElement('div');
                div.className = 'dynamic-completed';
                div.style.cssText = 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; cursor: pointer;';
                div.onclick = () => window.location.href = 'history.html';
                div.innerHTML = `
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="width: 6px; height: 6px; border-radius: 50%; background-color: ${dotColor};"></div>
                        <span style="color: var(--color-text-gray); font-size: 13px;">${actionText} ${displayAmountFormatted} ${displayTitle}</span>
                    </div>
                    <div style="display: flex; align-items: center; gap: 2px;">
                        <span style="color: var(--color-green); font-size: 13px;">Completed</span>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--color-green)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
                    </div>
                `;
                const defaultEl = document.getElementById('defaultCompletedItem');
                if (defaultEl) {
                    miniHistoryContainer.insertBefore(div, defaultEl);
                } else {
                    miniHistoryContainer.appendChild(div);
                }
                miniCount++;
            }
        });

        if (historyList) {
            historyList.innerHTML = newHtml;
            localStorage.setItem('cached_history_html', newHtml);
        }

        if (miniHistoryContainer) {
            const def = document.getElementById('defaultCompletedItem');
            if (def) def.style.display = miniCount >= 2 ? 'none' : 'flex';
            if (typeof window.updateMiniHistoryVisibility === 'function') window.updateMiniHistoryVisibility();
        }
    };

    onSnapshot(qWithdrawals, (snapshot) => {
        withdrawalsData = snapshot.docs.map(doc => doc.data());
        renderHistory();
    });

    onSnapshot(qTransactions, (snapshot) => {
        transactionsData = snapshot.docs.map(doc => doc.data());
        renderHistory();
    });

    onSnapshot(dexHistoryRef, (snapshot) => {
        dexHistoryData = snapshot.docs.map(doc => doc.data());
        renderHistory();
    });
}
