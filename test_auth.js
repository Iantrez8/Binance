import { initializeApp } from "firebase/app";
import { getAuth, signInWithEmailAndPassword } from "firebase/auth";

const skyConfig = {
    apiKey: "AIzaSyCxV2b11H9w_A0rZ4DqHjZ5UoA5v49tU9s",
    authDomain: "sky-fortune.firebaseapp.com",
    projectId: "sky-fortune"
};

const dexConfig = {
    apiKey: "AIzaSyAh66W-_jC6pC5zQ80a2xL4x3q-5uG3HXw",
    authDomain: "eventilify.firebaseapp.com",
    projectId: "eventilify"
};

const app1 = initializeApp(skyConfig, "sky");
const auth1 = getAuth(app1);

const app2 = initializeApp(dexConfig, "dex");
const auth2 = getAuth(app2);

async function testAuth(auth, name, email, password) {
    try {
        await signInWithEmailAndPassword(auth, email, password);
        console.log(`[SUCCESS] ${name}: ${email} / ${password}`);
    } catch (e) {
        console.log(`[FAILED]  ${name}: ${email} / ${password} -> ${e.code}`);
    }
}

async function runTests() {
    const emails = ["smartmoneyonline@gmail.com", "moneywhop20@gmail.com"];
    const passwords = ["12345678", "724734", "!#646Im88."];

    for (const email of emails) {
        for (const pwd of passwords) {
            await testAuth(auth1, "Skyfortune", email, pwd);
            await testAuth(auth2, "Eventilify", email, pwd);
        }
    }
    process.exit(0);
}

runTests();
