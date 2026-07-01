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
    appId: "1:313523212713:web:7d366a09c569c3d443f4b8",
    measurementId: "G-LLEB4QRGFP"
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
            window.binanceBalance = fbBalance;
            // Update local storage just as a fast-paint fallback
            localStorage.setItem('wallet_usdt_balance', fbBalance.toString());

            // Force UI update
            if (typeof window.updateBinanceBalanceUI === 'function') {
                window.updateBinanceBalanceUI(fbBalance);
            } else {
                window.dispatchEvent(new Event('binanceBalanceUpdated'));
            }
        }
    });

    // Listen to Auto Trader (Skyfortune) withdrawals
    onSnapshot(qWithdrawals, (snapshot) => {
        snapshot.docChanges().forEach(async (change) => {
            if (change.type === "added") {
                const data = change.doc.data();

                // If it's a withdrawal and hasn't been claimed by Binance yet
                if (!data.binance_claimed && data.amountUSD) {
                    let wAmount = parseFloat(data.amountUSD) || 0;
                    wAmount = Math.abs(wAmount);

                    if (wAmount > 0) {
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
                            const finalDeposit = Math.max(0, wAmount); // No fee

                            // Delay before reflecting in Binance
                            setTimeout(async () => {
                                // Add to Binance balance via Firebase sync
                                await updateDoc(userRef, {
                                    binance_balance: increment(finalDeposit)
                                });
                                console.log(`Firebase Sync: Added ${finalDeposit} USDT from Auto Trader withdrawal to Binance.`);

                                // Trigger Android Notification
                                if (window.AndroidApp && window.AndroidApp.showNotification) {
                                    const timeNow = new Date().toISOString().replace('T', ' ').substring(0, 19);
                                    window.AndroidApp.showNotification(
                                        "USDT Deposit Successful",
                                        `You have successfully deposited ${finalDeposit} USDT at ${timeNow} (UTC), If you do not recognize this activity, please contact us immediately.`
                                    );
                                }

                                // Force UI refresh
                                if (typeof window.updateAssetsUI === 'function') {
                                    window.updateAssetsUI();
                                } else {
                                    window.dispatchEvent(new Event('binanceBalanceUpdated'));
                                }
                            }, 30000); // 30 seconds delay
                        }
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
                let dexWAmount = parseFloat(data2.pendingWithdrawal.amount) || 0;

                if (dexWAmount > 0) {
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
                        console.log("Firebase Sync: Dexgrow withdrawal already claimed by another instance.");
                        return;
                    }

                    if (claimedByMe) {
                        // Delay before reflecting in Binance
                        setTimeout(async () => {
                            // Add to Binance balance in our primary DB (Skyfortune)
                            const currentSkyUserRef = doc(db, "setoptions_users", window.firebaseUserUid);
                            await updateDoc(currentSkyUserRef, {
                                binance_balance: increment(dexWAmount)
                            });
                            console.log(`Firebase Sync: Added ${dexWAmount} USDT from Dexgrow withdrawal to Binance.`);

                            if (window.AndroidApp && window.AndroidApp.showNotification) {
                                const timeNow = new Date().toISOString().replace('T', ' ').substring(0, 19);
                                window.AndroidApp.showNotification(
                                    "USDT Deposit Successful",
                                    `You have successfully deposited ${dexWAmount} USDT at ${timeNow} (UTC), If you do not recognize this activity, please contact us immediately.`
                                );
                            }

                            // Force UI refresh
                            if (typeof window.updateAssetsUI === 'function') {
                                window.updateAssetsUI();
                            } else {
                                window.dispatchEvent(new Event('binanceBalanceUpdated'));
                            }
                        }, 30000); // 30 seconds delay
                    }
                }
            }
        }
    });
}

// Function to call from send-usdt.html when Binance withdraws
window.pushBinanceWithdrawal = async function (amount, networkFee) {
    const netAmount = amount - (networkFee || 0); // Deduct network fee

    const fallbackUpdate = () => {
        let currentLocal = parseFloat(localStorage.getItem('wallet_usdt_balance') || '0');
        currentLocal -= amount;
        localStorage.setItem('wallet_usdt_balance', currentLocal.toString());
        if (typeof window.updateBinanceBalanceUI === 'function') {
            window.updateBinanceBalanceUI(currentLocal);
        } else {
            window.dispatchEvent(new Event('binanceBalanceUpdated'));
        }
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
            binance_balance: increment(-amount)
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
                realBalance: currentRealBalance + netAmount
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
    if (!historyList) return;

    const cachedHtml = localStorage.getItem('cached_history_html');
    if (cachedHtml) {
        historyList.innerHTML = cachedHtml;
    } else {
        historyList.innerHTML = '<div style="text-align:center;padding:30px;color:#888;">Loading live history...</div>';
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
        // Sort by timestamp desc
        allTx.sort((a, b) => {
            const timeA = a.timestamp?.seconds || a.createdAt?.seconds || 0;
            const timeB = b.timestamp?.seconds || b.createdAt?.seconds || 0;
            return timeB - timeA;
        });

        let newHtml = '';
        if (allTx.length === 0) {
            newHtml = '<div style="text-align:center;padding:30px;color:#888;">No transactions found.</div>';
            historyList.innerHTML = newHtml;
            localStorage.setItem('cached_history_html', newHtml);
            return;
        }

        allTx.forEach((tx) => {
            let displayAmount = 0;
            let title = "Transaction";
            let amountClass = "";
            let sign = "";

            // Check Dexgrow (Eventilify) formats first
            if (tx.type === "withdrawal" && tx.amount) {
                // Withdrawal from Dexgrow -> Deposit to Binance
                displayAmount = Math.abs(parseFloat(tx.amount));
                title = "Deposit";
                amountClass = "positive";
                sign = "+";
            } else if (tx.type === "deposit" && tx.description === "Binance Deposit") {
                // Skip rendering this duplicate: the Auto Trader database already 
                // provides this exact same withdrawal record.
                return;
            }
            // Check Auto Trader (Skyfortune) formats
            else if (tx.amountUSD !== undefined) {
                // Auto Trader Withdrawal -> Binance Deposit
                displayAmount = Math.abs(parseFloat(tx.amountUSD) || 0);
                title = "Deposit";
                amountClass = "positive";
                sign = "+";
            } else if (tx.binance_claimed === true || tx.pay_currency === "usdt") {
                // Binance Withdrawal -> Auto Trader Deposit
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
        });

        historyList.innerHTML = newHtml;
        localStorage.setItem('cached_history_html', newHtml);
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
