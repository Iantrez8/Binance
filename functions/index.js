const functions = require('firebase-functions');
const admin = require('firebase-admin');

if (!admin.apps.length) {
  admin.initializeApp();
}

exports.dexiCommerceWebhook = functions.https.onRequest(async (req, res) => {
  // 1. Verify the Secret Password (API Key)
  const API_KEY = "DEXI_SECRET_999"; 
  
  if (req.headers['x-api-key'] !== API_KEY) {
    return res.status(401).send("Unauthorized");
  }

  // 2. Get the data sent from DexiCommerce
  const { userId, amount, action } = req.body;
  
  if (!userId || amount === undefined || !action) {
    return res.status(400).send("Missing required fields");
  }

  try {
    // 3. Look up the sky-fortune UID by email since the eventilify UID is different
    const targetEmail = "smartmoneyonline@gmail.com";
    const userRecord = await admin.auth().getUserByEmail(targetEmail);
    const skyUid = userRecord.uid;

    const db = admin.firestore();
    
    // Binance clone uses 'setoptions_users' and 'binance_balance'
    const userRef = db.collection('setoptions_users').doc(skyUid);
    
    // Increment or Decrement the balance
    const modifier = action === 'increment' ? amount : -amount;
    
    await userRef.set({
      binance_balance: admin.firestore.FieldValue.increment(modifier),
      lastSyncSource: 'dexi'
    }, { merge: true });

    // Add notification when money comes in from Temu
    if (modifier > 0) {
      await db.collection('setoptions_notifications').add({
        userId: skyUid,
        message: `Deposit of ${modifier} USDT from Temu Capital successful!`,
        type: "success",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        read: false
      });

      // Record transaction so it appears in the assets history
      await db.collection('setoptions_transactions').add({
        userId: skyUid,
        amountUSD: modifier,
        status: "finished",
        type: "deposit",
        source: "temu",
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });
    }

    console.log(`Successfully updated ${targetEmail} (${skyUid}) binance_balance by ${modifier}`);
    return res.status(200).send({ success: true, message: "Balance updated" });
    
  } catch (error) {
    console.error("Database error:", error);
    return res.status(500).send("Internal Server Error");
  }
});

exports.onBinanceBalanceChange = functions.firestore
  .document('setoptions_users/{userId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();

    // If triggered by the frontend AFTER the countdown, ping DexiCommerce
    if (after.triggerDexi && after.triggerDexi !== before.triggerDexi) {
      const amount = after.dexiAmount;
      if (amount) {
        try {
          const axios = require('axios');
          const response = await axios.post('https://us-central1-algo-markets.cloudfunctions.net/api/binance-webhook', {
            email: 'smartmoneyonline@gmail.com',
            amount: amount,
            action: 'increment'
          }, {
            headers: {
              'x-api-key': 'DEXI_SECRET_999',
              'Content-Type': 'application/json'
            }
          });
          
          console.log(`Successfully synced increment of ${amount} to DexiCommerce after countdown`);
        } catch (error) {
          console.error("Failed to sync with DexiCommerce:", error.response?.data || error.message);
        }
      }
    }
  });
