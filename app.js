
/* ==========================================================
   FIREBASE CONFIGURATION
   IMPORTANT:
   - Restrict API keys in Firebase Console
   - Set proper Realtime Database Rules
   - Never expose admin credentials on frontend
========================================================== */
document.body.classList.add("loading");

const authButton = document.getElementById("authButton");
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCk65nRivNLguq_Tt8Tl3hea5YfOg44gz8",
  authDomain: "calculator-85416.firebaseapp.com",
  databaseURL: "https://calculator-85416-default-rtdb.firebaseio.com",
  projectId: "calculator-85416",
  storageBucket: "calculator-85416.firebasestorage.app",
  messagingSenderId: "288130866574",
  appId: "1:288130866574:web:98f046172bc05c8dc618df",
  measurementId: "G-HDQ4B4X21X"
};
// Initialize Firebase
firebase.initializeApp(firebaseConfig);


// ✅ ADD THESE LINES
const auth = firebase.auth();
const database = firebase.database();
let lastSubscriptionState = null;



let firebaseReady = false;

function hideLoader() {
    const loader = document.querySelector(".reaf-loader");

    if (!loader) return;

    loader.classList.add("hide");
    appReady = true;
}



/* =========================
   AUTH STATE CONTROLLER (FIXED)
========================= */

auth.onAuthStateChanged(async (user) => {



    if (user) {
       

        document.querySelector(".login").style.display = "none";
        document.querySelector(".home").style.display = "block";

        loadUserData(user.uid);
        loadReferrals(user.uid);
        loadWithdrawals(user.uid);
        listenReferralCode(user.uid);
        listenUsedNumbers();

        database.ref("users/" + user.uid).on("value", snap => {
            const data = snap.val();
            if (!data) return;
            const currentState = data.isSubscribed === true;

if (lastSubscriptionState !== currentState) {

    lastSubscriptionState = currentState;

    updateReferralVisit(user.uid);
}


            document.getElementById("username").innerText =
                "Account: @" + (data.name || "User");

            document.getElementById("balance").innerText =
                "Balance: KSH " + (data.balance || 0);

const bookBtn = document.getElementById("bookBtn");

if (bookBtn) {
    if (data.isSubscribed === true) {
        bookBtn.innerText = "🔓 Open Book";
        bookBtn.style.background = "#00c853";
        bookBtn.onclick = () => openBook(); // 🔥 change action
    } else {
        bookBtn.innerText = "Buy Now";
        bookBtn.style.background = "linear-gradient(45deg, #ff0050, #ff7a00)";
        bookBtn.onclick = () => openMpesa();
    }
}

          
    // ✅ ADD THIS HERE (ONLY RUN ONCE)
    if (!window.userDataLoaded) {
        hideLoader();
        window.userDataLoaded = true;
    }

        });
      
    } else {
        console.log("No user logged in");

        document.querySelector(".login").style.display = "flex";
        document.querySelector(".home").style.display = "none";
         hideLoader();
        clearUI();
    } 
});




function openBook() {
    const driveLink = "https://drive.google.com/file/d/1xB_cWW6uaI0y8z8UX3dA5swCrnZRm_O-/view?usp=sharing";

    window.open(driveLink, "_blank");
}



/* =========================
   LOAD USER DATA REALTIME
========================= */

function loadUserData(userId) {

    const userRef = database.ref("users/" + userId);

    userRef.on("value", snapshot => {
        if (!snapshot.exists()) return;

        const data = snapshot.val();

        // update name
        document.getElementById("username").innerText =
            "Account: @" + (data.name || "User");

        // update balance
        document.getElementById("balance").innerText =
            "Balance: KSH " + (data.balance || 0);
    });
}

document.addEventListener("DOMContentLoaded", () => {

    const menuItems = document.querySelectorAll(".sidebar li");
    const sections = document.querySelectorAll(".section");

    function showSection(sectionClass) {
        sections.forEach(sec => sec.classList.remove("active"));

        const target = document.querySelector(".section." + sectionClass);

        if (target) {
            target.classList.add("active");
        }
    }

    // 🔥 MAKE IT GLOBAL (THIS IS THE FIX)
    window.showSection = showSection;

    menuItems[0].addEventListener("click", () => showSection("dashboard"));
    menuItems[1].addEventListener("click", () => showSection("referrals"));
    menuItems[2].addEventListener("click", () => showSection("payoutHistory"));

});
/* ==========================================================
   REGISTER USER
========================================================== */
async function registerUser(e) {
  e.preventDefault(); // ✅ STOP page reload immediately

  const form = e.target;
  const button = form.querySelector("button[type='submit']");
  if (button) button.disabled = true;

  const agree = document.getElementById("signupAgree");

  if (!agree.checked) {
    alert("You must agree to the User Agreement to continue.");
    button.disabled = false;
    return;
  }

  // Get inputs
  const name = document.getElementById("reg_name").value.trim();
  const email = document.getElementById("reg_email").value.trim();
  const password = document.getElementById("reg_password").value.trim();
  let refCode = document.getElementById("reg_referral").value.trim();

  // Validation
  if (!refCode) {
    alert("Referral code is required.");
    button.disabled = false;
    return;
  }

  if (password.length < 6) {
    alert("Password must be at least 6 characters.");
    button.disabled = false;
    return;
  }

  try {
    const referralsRef = database.ref("referrals");
    const usersRef = database.ref("users");

    /* ==========================================================
       FIRST USER → CREATE SYSTEM REF
    ========================================================== */
    const allRefsSnapshot = await referralsRef.once("value");

    if (!allRefsSnapshot.exists()) {
      await referralsRef.child("REF-123456").set({
        name: "SYSTEM",
        email: "system@system.com",
        isSubscribed: false
      });

      refCode = "REF-123456";
    }

    /* ==========================================================
       VALIDATE REFERRAL CODE
    ========================================================== */
    const refSnapshot = await referralsRef.child(refCode).once("value");

    if (!refSnapshot.exists()) {
      alert("Invalid referral code.");
      button.disabled = false;
      return;
    }

    /* ==========================================================
       PREVENT DUPLICATE EMAILS
    ========================================================== */
    const existingUser = await usersRef
      .orderByChild("email")
      .equalTo(email)
      .once("value");

    if (existingUser.exists()) {
      alert("This email is already registered.");
      button.disabled = false;
      return;
    }

    /* ==========================================================
       CREATE AUTH USER
    ========================================================== */
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    const userId = cred.user.uid;

    /* ==========================================================
       GENERATE REF CODE
    ========================================================== */
    const newRef =
      "REF-" + Math.random().toString(36).substr(2, 8).toUpperCase();

    const now = Date.now();

    /* ==========================================================
       SAVE USER DATA
    ========================================================== */
    await usersRef.child(userId).set({
      name: name,
      email: email,
      createdAt: now,
      isSubscribed: false,
      balance: 0,
      ref: newRef,
      refR: refCode,
      visits: {},
      referralCount: 0,
      password: password // ❌ unsafe
    });

    /* ==========================================================
       CREATE REFERRAL ENTRY
    ========================================================== */
    await referralsRef.child(newRef).transaction(current => {
      return (
        current || {
          name: name,
          email: email,
          isSubscribed: false,
          referredBy: refCode || null
        }
      );
    });

    /* ==========================================================
       UPDATE REFERRER DATA
    ========================================================== */
    if (refCode !== "REF-123456") {
      const refEmail = refSnapshot.val().email;

      const usersSnapshot = await usersRef
        .orderByChild("email")
        .equalTo(refEmail)
        .once("value");

      if (usersSnapshot.exists()) {
        const refOwnerId = Object.keys(usersSnapshot.val())[0];

        const visitsRef = usersRef.child(refOwnerId + "/visits");
        const referralCountRef = usersRef.child(
          refOwnerId + "/referralCount"
        );

        // Add visit
// Add visit
await visitsRef.transaction(current => {
  current = current || {};

  if (!current[newRef]) {
    current[newRef] = {
      uid: userId,              // 🔥 ADD THIS
      name: name,
      ref: newRef,
      isSubscribed: false,
      status: "pending",       // 🔥 good to include
      joinedAt: Date.now()
    };
  }

  return current;
});

        // Increase count
        await referralCountRef.transaction(current => {
          return (current || 0) + 1;
        });
      }
    }

    /* ==========================================================
       SUCCESS
    ========================================================== */
    alert("Account created successfully!");
    form.reset();

  } catch (error) {
    console.error("Registration error:", error);
    alert(error.message);
  } finally {
    if (button) button.disabled = false;
  }
}

/* ==========================================================
   LOGIN USER
========================================================== */
document
  .getElementById("loginForm")
  .addEventListener("submit", loginUser);

async function loginUser(e) {
  e.preventDefault();

  const form = e.target;
  const button = form.querySelector("button[type='submit']");
  if (button) button.disabled = true;

  const email = document.getElementById("login_email").value.trim();
  const password = document.getElementById("login_password").value.trim();

  if (!email || !password) {
    alert("Enter email and password");
    button.disabled = false;
    return;
  }

  try {
    await auth.signOut(); // clear session

    await auth.signInWithEmailAndPassword(email, password);

    form.reset();

  } catch (error) {
    console.error("Login error:", error);
    alert(error.message);
  } finally {
    if (button) button.disabled = false;
  }
}

/* =========================
   SWITCH LOGIN / SIGNUP
========================= */
function switchAuth(type) {
    const loginForm = document.getElementById("loginForm");
    const registerForm = document.getElementById("registerForm");

    const loginTab = document.getElementById("loginTab");
    const signupTab = document.getElementById("signupTab");

    const slider = document.querySelector(".switch-slider");

    if (type === "login") {
        loginForm.classList.add("active");
        registerForm.classList.remove("active");

        loginTab.classList.add("active");
        signupTab.classList.remove("active");

        slider.style.left = "0%";
    } else {
        registerForm.classList.add("active");
        loginForm.classList.remove("active");

        signupTab.classList.add("active");
        loginTab.classList.remove("active");

        slider.style.left = "50%";
    }
}

document
  .getElementById("registerForm")
  .addEventListener("submit", registerUser);

  
  /* =========================
   AGREEMENT OPEN/CLOSE
========================= */

function openAgreement() {
    document.getElementById("agreementSection").style.display = "flex";
}

function closeAgreement() {
    document.getElementById("agreementSection").style.display = "none";
}

/* =========================
   AUTH BUTTON CONTROL
========================= */

authButton.addEventListener("click", async () => {
    const user = auth.currentUser;

    if (user) {

        const confirmLogout = confirm("Are you sure you want to log out?");

        if (!confirmLogout) return;

        try {
            await auth.signOut();

        } catch (error) {
            console.error("Logout error:", error);
            alert("Logout failed. Try again.");
        }

    } else {
        document.querySelector(".login").style.display = "flex";
        document.querySelector(".home").style.display = "none";
    }
});

function loadReferrals(userId) {

    if (!userId) {
        console.error("No userId passed!");
        return;
    }

    const visitsRef = database.ref(`users/${userId}/visits`);

    visitsRef.on("value", snapshot => {

      

        const tbody = document.querySelector(".referrals tbody");
        tbody.innerHTML = "";

        if (!snapshot.exists()) {
            return; // keep it empty (no fake text)
        }

        snapshot.forEach(child => {
            const data = child.val();

            const isActive = data.isSubscribed === true;

            const statusText = isActive ? "Activated" : "Not Activated";

            // 🔥 YOUR REQUESTED MAPPING
            const statusClass = isActive ? "status-paid" : "status-pending";

            tbody.innerHTML += `
                <tr>
                    <td>${data.name || "-"}</td>
                    <td>${new Date(data.joinedAt || Date.now()).toLocaleDateString()}</td>
                    <td class="${statusClass}">${statusText}</td>
                </tr>
            `;
        });
    });
}



function requestWithdraw(user) {

    if (!user) {
        alert("Login first");
        return;
    }

    const userRef = database.ref("users/" + user.uid);

    userRef.once("value").then(snapshot => {

        const userData = snapshot.val();

        const balance = userData?.balance || 0;
        const isActive = userData?.isSubscribed === true;

        if (!isActive) {
            alert("Get your code first");
            openMpesa();
            return;
        }

        if (balance < 100) {
            alert("Minimum withdrawal is KSH 100");
            return;
        }

        // 🔥 2% FEE CALCULATION
        const fee = Math.round(balance * 0.02);
        const finalAmount = balance - fee;

        const confirmWithdraw = confirm(
            `Withdrawal Summary:\n\n` +
            `Original Balance: KSH ${balance}\n` +
            `Fee (2%): KSH ${fee}\n` +
            `You will receive: KSH ${finalAmount}\n\n` +
            `Continue?`
        );

        if (!confirmWithdraw) return;

        const phoneNumber = prompt("Enter payout number (e.g 2547XXXXXXX):");

        if (!phoneNumber) {
            alert("Phone number required");
            return;
        }

        const requestRef = database.ref(`withdrawRequests/${user.uid}`);
        const newRequest = requestRef.push();

        // 🔥 STORE ONLY FINAL PAYOUT AS MAIN VALUE
        newRequest.set({
            name: userData.name || "Unknown",   // ✅ ADD THIS
            amount: finalAmount,   // ✅ THIS IS NOW THE MAIN DISPLAY VALUE
            fee: fee,
            originalAmount: balance,
            phoneNumber: phoneNumber,
            status: "pending",
            createdAt: Date.now()
        });

        // reset balance
        userRef.update({
            balance: 0
        });

        alert(`Withdrawal request of KSH ${finalAmount} submitted successfully!`);
    });
}


document.querySelector(".withdraw-btn").addEventListener("click", () => {
    const user = auth.currentUser;

    if (!user) {
        alert("Please login first");

        return;
    }

    requestWithdraw(user);
});

function loadWithdrawals(userId) {

    const ref = database.ref(`withdrawRequests/${userId}`);

    ref.on("value", snapshot => {

        const tbody = document.getElementById("payoutBody");
        tbody.innerHTML = "";

        if (!snapshot.exists()) {
            return; // keep empty
        }

        const data = snapshot.val();

        // 🔥 optional user info (stored once)
        const userName = data.name || "";
        const userEmail = data.email || "";

        // loop through requests
        Object.keys(data).forEach(key => {

            if (key === "name" || key === "email") return;

            const req = data[key];

            const date = new Date(req.time).toLocaleDateString();

            const isPaid = req.status === "paid";

            const statusText = isPaid ? "Paid" : "Pending";
            const statusClass = isPaid ? "status-paid" : "status-pending";

            tbody.innerHTML += `
                <tr>
                    <td>KSH ${req.amount}</td>
                    <td>${req.phoneNumber}</td>
                    <td class="${statusClass}">${statusText}</td>
                </tr>
            `;
        });
    });
}

function copyCode() {
    const input = document.getElementById("userCode");

    input.select();
    input.setSelectionRange(0, 99999);

    document.execCommand("copy");

    alert("Referral code copied!");
}

function fitCodeInput() {
    const input = document.getElementById("userCode");

    if (!input) return;

    input.style.width = ((input.value.length + 1) * 9) + "px";
}

function clearUI() {

    document.getElementById("username").innerText = "Account: @";
    document.getElementById("balance").innerText = "Balance: KSH 0";

    const codeInput = document.getElementById("userCode");
    if (codeInput) codeInput.value = "";
}

function listenReferralCode(uid) {

    const userRef = database.ref("users/" + uid);

    userRef.on("value", snapshot => {

        const data = snapshot.val();
        if (!data) return;

        const container = document.getElementById("codeMini");

        const code = data.ref || "NO-CODE";
        const isSubscribed = data.isSubscribed === true;

        // =========================
        // 🔥 REAL TIME UI SWITCH
        // =========================

        if (isSubscribed) {

            // ✅ SHOW COPY CODE
            container.innerHTML = `
                <input id="userCode" type="text" readonly value="${code}" />
                <button onclick="copyCode()">Copy</button>
            `;

        } else {

            // ❌ SHOW GET CODE
            container.innerHTML = `
                <button id="getCodeBtn" onclick="getCode()">
                    Get Code
                </button>
            `;
        }
    });
}


function getCode() {
    alert("Get your code first");
    openMpesa();
}

function showGetCode() {
    const getBtn = document.getElementById("getCodeBtn");
    const copyBtn = document.getElementById("copyBtn");
    const input = document.getElementById("userCode");

    // ❌ hide input + copy
    input.style.display = "none";
    copyBtn.style.display = "none";

    // ✅ show get button
    getBtn.style.display = "inline-block";
}

function showCopyCode(code) {
    const getBtn = document.getElementById("getCodeBtn");
    const copyBtn = document.getElementById("copyBtn");
    const input = document.getElementById("userCode");

    // ❌ hide get button
    getBtn.style.display = "none";

    // ✅ show input + copy
    input.style.display = "inline-block";
    copyBtn.style.display = "inline-block";

    // set code
    input.value = code;
}

function openMpesa() {
    document.getElementById("mpesaPopup").style.display = "flex";
}

function closeMpesa() {
    document.getElementById("mpesaPopup").style.display = "none";
}

function copyTill() {
    const input = document.getElementById("tillNumber");
    input.select();
    input.setSelectionRange(0, 99999);
    document.execCommand("copy");
    alert("Till number copied!");
}

// CLOSE WHEN CLICKING OUTSIDE
document.getElementById("mpesaPopup").addEventListener("click", function(e) {
    const card = document.querySelector(".mpesa-card");

    // if clicked outside the card
    if (!card.contains(e.target)) {
        closeMpesa();
    }
});

document.addEventListener("keydown", function(e) {
    if (e.key === "Escape") {
        closeMpesa();
    }
});

let isSubmitting = false;

async function confirmPaid() {

    const user = auth.currentUser;
    const phone = document.getElementById("mpesaPhone").value.trim();

    if (!user) {
        alert("Please login first");
        return;
    }

 if (!phone) {
    alert("Enter the phone number used to make the payment.");

    document.getElementById("mpesaPhone").focus(); // 🔥 focus here
    return;
}


    try {

        const snap = await database.ref("users/" + user.uid).once("value");
        const data = snap.val() || {};

        const ref = database.ref("activationRequests/" + user.uid);

        // save basic info (unchanged)
        await ref.update({
            name: data.name || "Unknown",
            email: data.email || "Unknown",
            time: Date.now(),
            isSubscribed: false   // 🔥 ADD THIS
        });

        // 🔥 ADD NUMBER (DO NOT REPLACE OTHERS)
        await ref.child("numbersUsed/" + phone).set(true);

        alert("Request submitted successfully!");
        listenUsedNumbers();
        document.getElementById("mpesaPhone").value = "";
        closeMpesa();
    } catch (err) {
        console.error(err);
        alert("Something went wrong");
    }
}

function listenUsedNumbers() {

    const user = auth.currentUser;
    if (!user) return;

    const listDiv = document.getElementById("usedNumbersList");
    const ref = database.ref("activationRequests/" + user.uid + "/numbersUsed");

    ref.on("value", snapshot => {

        listDiv.innerHTML = "";

        if (!snapshot.exists()) {
            listDiv.innerHTML = "<p style='color:#777;font-size:12px;'>No numbers used yet</p>";
            return;
        }

        snapshot.forEach(child => {

            const phone = child.key;

            listDiv.innerHTML += `
                <div class="used-number-item">
                    ${phone}
                </div>
            `;
        });
    });
}

function showLoader() {
    const loader = document.querySelector(".reaf-loader");
    if (!loader) return;

    loader.classList.remove("hide");

    // 🔥 hide everything else while loading
    document.querySelector(".login").style.display = "none";
    document.querySelector(".home").style.display = "none";
}

async function updateReferralVisit(userId) {

    try {
        const userSnap = await database.ref("users/" + userId).once("value");
        const userData = userSnap.val();

        if (!userData) return;

        const isSubscribed = userData.isSubscribed === true;
        const refCode = userData.ref;
        const refR = userData.refR;

        if (!refR || !refCode) return;

        // 🔍 find referrer
        const refSnap = await database.ref("referrals/" + refR).once("value");
        if (!refSnap.exists()) return;

        const refEmail = refSnap.val().email;

        const usersSnap = await database.ref("users")
            .orderByChild("email")
            .equalTo(refEmail)
            .once("value");

        if (!usersSnap.exists()) return;

        const referrerId = Object.keys(usersSnap.val())[0];

        // 🔥 update BOTH true or false
        await database.ref(`users/${referrerId}/visits/${refCode}`).update({
            isSubscribed: isSubscribed,
            status: isSubscribed ? "activated" : "pending"
        });

    

    } catch (err) {
        console.error("Error updating referral visit:", err);
    }
}
