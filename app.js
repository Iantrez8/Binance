// ========================================================
// Binance Mobile UI - Shared Lightweight Script
// ========================================================

window.showBinanceToast = function (message) {
    // Remove existing toast if any
    const existing = document.getElementById('binance-global-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.id = 'binance-global-toast';
    toast.className = 'binance-toast';
    toast.textContent = message;
    document.body.appendChild(toast);

    // Trigger reflow for transition
    void toast.offsetWidth;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => { if (toast.parentNode) toast.remove(); }, 300); // Wait for fade out
    }, 3000);
};

document.addEventListener('DOMContentLoaded', () => {

    // ----------------------------------------------------
    // 1. Interactive Currency Selection & Eye Privacy Mask Toggling (Assets Page)
    // ----------------------------------------------------
    const eyeToggleBtn = document.querySelector('.assets-eye-svg');
    const balanceValEl = document.querySelector('.assets-balance-val');
    const pnlValEl = document.querySelector('.assets-pnl-val');

    // SVG icons for Eye States
    const SVG_EYE_OPEN = `
        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
        <circle cx="12" cy="12" r="3"></circle>
    `;

    const SVG_EYE_CLOSED = `
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
        <line x1="1" y1="1" x2="23" y2="23"></line>
    `;

    // Unified interactive Assets state
    const state = {
        isMasked: false,
        activeCurrency: 'USDT'
    };

    // Initialize local storage balance if not existing
    if (localStorage.getItem('wallet_usdt_balance') === null) {
        localStorage.setItem('wallet_usdt_balance', '3.36867032');
    }

    // Realistic currency pegs for total portfolio value
    const currencyData = {
        KES: {
            balance: "KSh436.61",
            pnl: "KSh0.00(0.00%)",
            fiatAmount: "KSh436.61"
        },
        USDT: {
            balance: "3.37",
            pnl: "0.00(0.00%)",
            fiatAmount: "3.37 USDT"
        },
        BTC: {
            balance: "0.00004812",
            pnl: "0.00000000(0.00%)",
            fiatAmount: "0.00004812 BTC"
        },
        ETH: {
            balance: "0.00096248",
            pnl: "0.00000000(0.00%)",
            fiatAmount: "0.00096248 ETH"
        }
    };

    // Reusable UI synchronization function
    window.updateBinanceBalanceUI = function (fbBalance) {
        window.binanceBalance = fbBalance;
        if (typeof window.updateAssetsUI === 'function') {
            window.updateAssetsUI();
        }
        window.dispatchEvent(new Event('binanceBalanceUpdated'));
    };

    window.updateAssetsUI = function () {
        // Fetch current dynamic balance synced from Firebase, fallback to local storage
        const liveUSDT = typeof window.binanceBalance !== 'undefined' ? window.binanceBalance : parseFloat(localStorage.getItem('wallet_usdt_balance') || '3.36867032');

        // Format with commas and exact decimals
        const formatWithCommas = (num, decimals) => {
            return num.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
        };

        // Dynamically compute conversions and pegs proportionally
        currencyData.USDT.balance = formatWithCommas(liveUSDT, 2);
        currencyData.USDT.fiatAmount = formatWithCommas(liveUSDT, 2) + " USDT";

        currencyData.KES.balance = "KSh" + formatWithCommas(liveUSDT * 129.6105, 2);
        currencyData.KES.fiatAmount = "KSh" + formatWithCommas(liveUSDT * 129.6105, 2);

        currencyData.BTC.balance = formatWithCommas(liveUSDT * 0.00001428, 8);
        currencyData.BTC.fiatAmount = formatWithCommas(liveUSDT * 0.00001428, 8) + " BTC";

        currencyData.ETH.balance = formatWithCommas(liveUSDT * 0.00028571, 8);
        currencyData.ETH.fiatAmount = formatWithCommas(liveUSDT * 0.00028571, 8) + " ETH";

        const currentData = currencyData[state.activeCurrency];

        // Save to localStorage for external page synchronization
        localStorage.setItem('assets_isMasked', state.isMasked);
        localStorage.setItem('assets_activeCurrency', state.activeCurrency);

        // Update main balance display
        if (balanceValEl) {
            balanceValEl.textContent = state.isMasked ? '******' : currentData.balance;
        }

        // Update Today's PNL
        if (pnlValEl) {
            pnlValEl.textContent = state.isMasked ? '****' : currentData.pnl;
        }

        // Update active currency label in the dropdown box
        const activeLabelEl = document.getElementById('activeCurrencyLabel');
        if (activeLabelEl) {
            activeLabelEl.textContent = state.activeCurrency;
        }

        // Synchronize dynamic assets list items (USDT row)
        const cryptoBalEl = document.querySelector('.asset-bal-crypto');
        const fiatBalEl = document.querySelector('.asset-bal-fiat');
        if (cryptoBalEl) {
            cryptoBalEl.textContent = state.isMasked ? '********' : formatWithCommas(liveUSDT, 2);
        }
        if (fiatBalEl) {
            fiatBalEl.textContent = state.isMasked ? '****' : currentData.fiatAmount;
        }

        // Update active visual class inside the dropdown options
        const optionEls = document.querySelectorAll('.currency-dropdown-option');
        optionEls.forEach(opt => {
            if (opt.getAttribute('data-currency') === state.activeCurrency) {
                opt.classList.add('active');
            } else {
                opt.classList.remove('active');
            }
        });

        // Update the Home page balance dynamically
        const homeBalanceEls = document.querySelectorAll('.home-balance-amount');
        homeBalanceEls.forEach(el => {
            el.textContent = "$" + liveUSDT.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        });
    }

    // Expose updateAssetsUI globally for external scripts like firebase-sync
    window.updateAssetsUI = updateAssetsUI;

    // Listen for custom event from firebase-sync
    window.addEventListener('binanceBalanceUpdated', () => {
        window.updateAssetsUI();
    });

    // Toggle Eye Privacy Masking
    if (eyeToggleBtn) {
        eyeToggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            state.isMasked = !state.isMasked;
            eyeToggleBtn.innerHTML = state.isMasked ? SVG_EYE_CLOSED : SVG_EYE_OPEN;
            window.updateAssetsUI();
        });
    }

    // Setup interactive Dropdown behavior
    const dropdownSelector = document.getElementById('assetsCurrencySelector');
    const dropdownMenu = document.getElementById('assetsCurrencyDropdown');

    if (dropdownSelector && dropdownMenu) {
        dropdownSelector.addEventListener('click', (e) => {
            e.stopPropagation();
            dropdownMenu.classList.toggle('show');
        });

        // Select currency options on click
        const dropdownOptions = dropdownMenu.querySelectorAll('.currency-dropdown-option');
        dropdownOptions.forEach(opt => {
            opt.addEventListener('click', (e) => {
                e.stopPropagation();
                state.activeCurrency = opt.getAttribute('data-currency');
                window.updateAssetsUI();
                dropdownMenu.classList.remove('show');
            });
        });

        // Close dropdown when clicking anywhere else on the document
        document.addEventListener('click', () => {
            dropdownMenu.classList.remove('show');
        });
    }

    // Setup interactive Withdrawal Method Drawer
    const assetsSendBtn = document.getElementById('assetsSendBtn');
    const withdrawDrawer = document.getElementById('withdrawDrawer');
    const withdrawDrawerBackdrop = document.getElementById('withdrawDrawerBackdrop');

    if (assetsSendBtn && withdrawDrawer && withdrawDrawerBackdrop) {
        // Open drawer on Send click
        assetsSendBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            withdrawDrawer.classList.add('show');
            withdrawDrawerBackdrop.classList.add('show');
        });

        // Close drawer on backdrop click
        withdrawDrawerBackdrop.addEventListener('click', () => {
            withdrawDrawer.classList.remove('show');
            withdrawDrawerBackdrop.classList.remove('show');
        });

        // Functional "Withdraw Crypto" option click routes to select-coin.html
        const withdrawMethodCrypto = document.getElementById('withdrawMethodCrypto');
        if (withdrawMethodCrypto) {
            withdrawMethodCrypto.addEventListener('click', (e) => {
                e.stopPropagation();
                // Ensure state is completely synchronized before navigation
                localStorage.setItem('assets_isMasked', state.isMasked);
                localStorage.setItem('assets_activeCurrency', state.activeCurrency);

                withdrawDrawer.classList.remove('show');
                withdrawDrawerBackdrop.classList.remove('show');

                // Premium micro-delay for smooth transition animation
                setTimeout(() => {
                    window.location.href = 'select-coin.html';
                }, 200);
            });
        }

        // Simulating lock and warning for other drawer methods
        const lockedMethods = ['withdrawMethodBinance', 'withdrawMethodUSD', 'withdrawMethodP2P'];
        lockedMethods.forEach(methodId => {
            const el = document.getElementById(methodId);
            if (el) {
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    showBinanceToast("This withdrawal method is currently restricted. Please use 'Withdraw Crypto' to complete your transfer.");
                });
            }
        });
    }

    // Setup interactive Deposit Method Drawer
    const assetsDepositBtn = document.getElementById('assetsDepositBtn');
    const depositDrawer = document.getElementById('depositDrawer');

    if (assetsDepositBtn && depositDrawer && withdrawDrawerBackdrop) {
        // Open drawer on Add Funds click
        assetsDepositBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            depositDrawer.classList.add('show');
            withdrawDrawerBackdrop.classList.add('show');
        });

        // Close drawer on backdrop click
        withdrawDrawerBackdrop.addEventListener('click', () => {
            depositDrawer.classList.remove('show');
        });

        // Functional "Deposit Crypto" option click routes to deposit-select-coin.html
        const depositMethodCrypto = document.getElementById('depositMethodCrypto');
        if (depositMethodCrypto) {
            depositMethodCrypto.addEventListener('click', (e) => {
                e.stopPropagation();
                localStorage.setItem('assets_isMasked', state.isMasked);
                localStorage.setItem('assets_activeCurrency', state.activeCurrency);

                depositDrawer.classList.remove('show');
                withdrawDrawerBackdrop.classList.remove('show');

                setTimeout(() => {
                    window.location.href = 'deposit-select-coin.html';
                }, 200);
            });
        }

        // Simulating lock and warning for other deposit methods
        const lockedDepositMethods = ['depositMethodPay', 'depositMethodP2P', 'depositMethodFiat'];
        lockedDepositMethods.forEach(methodId => {
            const el = document.getElementById(methodId);
            if (el) {
                el.addEventListener('click', (e) => {
                    e.stopPropagation();
                    if (typeof showBinanceToast === 'function') {
                        showBinanceToast("This deposit method is currently restricted. Please use 'Deposit Crypto' to continue.");
                    } else {
                        alert("This deposit method is currently restricted. Please use 'Deposit Crypto' to continue.");
                    }
                });
            }
        });
    }

    // Setup interactive History Drawer
    const openHistoryDrawerBtn = document.getElementById('openHistoryDrawerBtn');
    const historyDrawer = document.getElementById('historyDrawer');

    if (openHistoryDrawerBtn && historyDrawer && withdrawDrawerBackdrop) {
        openHistoryDrawerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            historyDrawer.classList.add('show');
            withdrawDrawerBackdrop.classList.add('show');
        });

        withdrawDrawerBackdrop.addEventListener('click', () => {
            historyDrawer.classList.remove('show');
        });

        // Simulating lock for My Trades
        const myTradesBtn = historyDrawer.querySelector('.locked');
        if (myTradesBtn) {
            myTradesBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                if (typeof showBinanceToast === 'function') {
                    showBinanceToast("My Trades history is currently restricted.");
                }
            });
        }
    }

    // Initial load sync
    updateAssetsUI();

    // ----------------------------------------------------
    // 2. Segmented Control Switch (Home Page Top Bar)
    // ----------------------------------------------------
    const segmentButtons = document.querySelectorAll('.segment-btn');
    segmentButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            segmentButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Switch balance display between Exchange and Wallet view
            const homeBalance = document.querySelector('.home-balance-amount');
            const liveUSDT = parseFloat(localStorage.getItem('wallet_usdt_balance') || '3.36867032');

            const formatHomeBalance = (num) => num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

            if (btn.textContent.trim() === "Wallet") {
                if (homeBalance) homeBalance.textContent = "$" + formatHomeBalance(liveUSDT);
            } else {
                if (homeBalance) homeBalance.textContent = "$" + formatHomeBalance(liveUSDT);
            }
        });
    });

    // Initialize Home balance
    const initHomeBalance = document.querySelector('.home-balance-amount');
    if (initHomeBalance) {
        const liveUSDT = parseFloat(localStorage.getItem('wallet_usdt_balance') || '3.36867032');
        initHomeBalance.textContent = "$" + liveUSDT.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // ----------------------------------------------------
    // 3. Horizontal Market Tabs Active Highlight Swapping
    // ----------------------------------------------------
    const marketTabs = document.querySelectorAll('.market-tab');
    marketTabs.forEach(tab => {
        tab.addEventListener('click', () => {
            marketTabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        });
    });

    const marketSubtabs = document.querySelectorAll('.market-subtab');
    marketSubtabs.forEach(sub => {
        sub.addEventListener('click', () => {
            marketSubtabs.forEach(s => s.classList.remove('active'));
            sub.classList.add('active');
        });
    });

    // ----------------------------------------------------
    // 4. Assets Subtabs Switching (Crypto vs Account)
    // ----------------------------------------------------
    const assetsSubtabs = document.querySelectorAll('.assets-subtab-item');
    const assetsItemsList = document.querySelector('.assets-items-list');

    assetsSubtabs.forEach(tab => {
        tab.addEventListener('click', () => {
            assetsSubtabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            if (tab.textContent.trim() === "Account") {
                // Simulating empty Account state
                if (assetsItemsList) {
                    assetsItemsList.innerHTML = `
                        <div style="text-align: center; padding: 40px 0; color: var(--color-text-gray);">
                            <svg style="width: 48px; height: 48px; margin-bottom: 8px; opacity: 0.3;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="12" y1="8" x2="12" y2="12"></line>
                                <line x1="12" y1="16" x2="12.01" y2="16"></line>
                            </svg>
                            <div style="font-size: 13px; font-weight: 500;">No accounts found</div>
                        </div>
                    `;
                }
            } else {
                // Restore USDT listing with high-fidelity official Tether logo and KES balance
                if (assetsItemsList) {
                    const liveUSDT = parseFloat(localStorage.getItem('wallet_usdt_balance') || '3.36867032');
                    const KESVal = (liveUSDT * 129.6105).toFixed(2);
                    assetsItemsList.innerHTML = `
                        <div class="asset-item-row">
                            <div class="asset-row-top">
                                <div class="asset-item-left">
                                    <div class="asset-logo-wrapper">
                                        <img src="assets/usdt.svg" class="asset-logo-img" width="32" height="32" alt="USDT">
                                    </div>
                                    <div class="asset-names">
                                        <span class="asset-name-symbol">USDT</span>
                                        <span class="asset-name-full">TetherUS</span>
                                    </div>
                                </div>
                                <div class="asset-item-right">
                                    <span class="asset-bal-crypto">${liveUSDT.toLocaleString('en-US', { minimumFractionDigits: 8, maximumFractionDigits: 8 })}</span>
                                    <span class="asset-bal-fiat">KSh${parseFloat(KESVal).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                </div>
                            </div>
                            <div class="asset-row-bottom">
                                <button class="asset-action-btn">Earn</button>
                                <button class="asset-action-btn">Trade</button>
                            </div>
                        </div>
                    `;
                    // Ensure the restored USDT row values immediately match the active masking & currency states
                    window.updateAssetsUI();
                }
            }
        });
    });

    // ----------------------------------------------------
    // 5. Close Promotional WOTD Card smoothly
    // ----------------------------------------------------
    const promoCloseBtn = document.querySelector('.promo-close-btn');
    const promoCard = document.querySelector('.promo-card');
    if (promoCloseBtn && promoCard) {
        promoCloseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            promoCard.style.transition = 'opacity 0.25s ease-out, transform 0.25s ease-out';
            promoCard.style.opacity = '0';
            promoCard.style.transform = 'scale(0.95)';
            setTimeout(() => {
                promoCard.style.display = 'none';
            }, 250);
        });
    }

    // ----------------------------------------------------
    // 6. History Filter Pills Active State
    // ----------------------------------------------------
    const filterPills = document.querySelectorAll('.history-filter-pill');
    filterPills.forEach(pill => {
        pill.addEventListener('click', () => {
            filterPills.forEach(p => p.classList.remove('active'));
            pill.classList.add('active');
        });
    });

    // ----------------------------------------------------
    // 7. Micro-Click Animation on Interactive Elements
    // ----------------------------------------------------
    const interactiveItems = document.querySelectorAll('.action-item, .feature-card, .assets-btn, .asset-action-btn, .promo-join-btn, .history-dropdown-select');
    interactiveItems.forEach(item => {
        item.addEventListener('click', () => {
            item.style.transform = 'scale(0.96)';
            setTimeout(() => {
                item.style.transform = 'scale(1)';
            }, 100);
        });
    });

    // ----------------------------------------------------
    // 8. Assets Tab Navigation (Overview, Spot, etc.)
    // ----------------------------------------------------
    const assetsTabItems = document.querySelectorAll('.assets-tab-item');
    assetsTabItems.forEach(tab => {
        tab.addEventListener('click', () => {
            assetsTabItems.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
        });
    });

    // ----------------------------------------------------
    // 9. Search Bar Smooth Vertical Ticker Animation
    // ----------------------------------------------------
    const tickerContainer = document.querySelector('.search-ticker-container');
    if (tickerContainer) {
        const searchTerms = ['PHB top gainer', 'GMT top gainer', 'ONDO hot search'];
        let currentTermIndex = 0;

        setInterval(() => {
            const currentItem = tickerContainer.querySelector('.ticker-item');

            currentTermIndex = (currentTermIndex + 1) % searchTerms.length;

            // Create the next item starting below the container
            const nextItem = document.createElement('div');
            nextItem.className = 'ticker-item';
            nextItem.style.position = 'absolute';
            nextItem.style.top = '18px'; // Start below
            nextItem.style.left = '0';
            nextItem.style.width = '100%';
            nextItem.style.transition = 'top 0.4s ease-in-out';
            nextItem.style.display = 'flex';
            nextItem.style.alignItems = 'center';
            nextItem.style.gap = '6px';

            nextItem.innerHTML = `
                <span class="search-fire-emoji">🔥</span>
                <span class="search-placeholder" style="white-space: nowrap;">${searchTerms[currentTermIndex]}</span>
            `;

            tickerContainer.appendChild(nextItem);

            // Force a reflow so the browser registers the starting position
            void nextItem.offsetWidth;

            // Animate current item up and out
            if (currentItem) {
                currentItem.style.top = '-18px'; // Move up out of view
            }

            // Animate next item into the center
            nextItem.style.top = '0px';

            // Remove the old item after the animation completes
            setTimeout(() => {
                if (currentItem) currentItem.remove();
            }, 400);

        }, 3000); // Change every 3 seconds
    }
});
