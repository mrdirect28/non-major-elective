// ============================
// CONFIG - CHANGE THESE 2
// ============================
const API_URL = "https://script.google.com/macros/s/AKfycbwq5vQlru5tDSZA1fwKtQGI1mEj4LKahCLNXlkePYsSb0sFlpPjuIfjqEj1yQ0lu9qNGw/exec";
const SECRET_KEY = "NME_2804";

// ============================
// UI ELEMENTS
// ============================
const loginCard = document.getElementById("loginCard");
const dashCard = document.getElementById("dashCard");

const regnoInput = document.getElementById("regno");
const dobInput = document.getElementById("dob");

const btnLogin = document.getElementById("btnLogin");
const btnLogout = document.getElementById("btnLogout");
const btnConfirm = document.getElementById("btnConfirm");

const loginMsg = document.getElementById("loginMsg");
const saveMsg = document.getElementById("saveMsg");

const studentName = document.getElementById("studentName");
const studentMeta = document.getElementById("studentMeta");

const alreadyBox = document.getElementById("alreadyBox");
const newBox = document.getElementById("newBox");

const alreadySubjects = document.getElementById("alreadySubjects");
const subjectCards = document.getElementById("subjectCards");

// ============================
// STATE
// ============================
let currentStudent = null;
let currentSubjects = []; // 7 random

// ============================
// HELPERS
// ============================
function setMsg(el, msg, ok=false){
  el.style.color = ok ? "#16a34a" : "#ef4444";
  el.textContent = msg || "";
}

function showDashboard(student){
  currentStudent = student;
  studentName.textContent = student.name;
  studentMeta.textContent = `${student.dept} | Shift ${student.shift}`;

  loginCard.classList.add("hidden");
  dashCard.classList.remove("hidden");
}

function showLogin(){
  currentStudent = null;
  currentSubjects = [];
  regnoInput.value = "";
  dobInput.value = "";

  alreadyBox.classList.add("hidden");
  newBox.classList.add("hidden");

  loginCard.classList.remove("hidden");
  dashCard.classList.add("hidden");

  setMsg(loginMsg, "");
  setMsg(saveMsg, "");
}

async function api(action, payload={}){
  const body = {
    key: SECRET_KEY,
    action,
    ...payload
  };

  const res = await fetch(API_URL, {
    method:"POST",
    headers:{ "Content-Type":"application/json" },
    body: JSON.stringify(body)
  });

  return await res.json();
}

function parseSubjectsCSV(csv){
  return (csv || "")
    .split(",")
    .map(x => x.trim())
    .filter(Boolean);
}

// ============================
// RENDER
// ============================
function renderAlready(reg){
  alreadySubjects.innerHTML = "";
  const list = parseSubjectsCSV(reg.subjects);

  list.forEach(code => {
    const div = document.createElement("div");
    div.className = "badge";
    div.textContent = code;
    alreadySubjects.appendChild(div);
  });

  alreadyBox.classList.remove("hidden");
  newBox.classList.add("hidden");
}

function renderNew(subjects){
  subjectCards.innerHTML = "";

  subjects.forEach(s => {
    const card = document.createElement("div");
    card.className = "sub-card";

    card.innerHTML = `
      <div class="sub-code">${s.code}</div>
      <div class="sub-name">${s.name}</div>
      <div class="sub-meta">
        <span>${s.dept}</span>
        <span>Seats: ${s.seatsLeft}/${s.max}</span>
      </div>
    `;
    subjectCards.appendChild(card);
  });

  alreadyBox.classList.add("hidden");
  newBox.classList.remove("hidden");
}

// ============================
// MAIN FLOW
// ============================
btnLogin.addEventListener("click", async () => {
  setMsg(loginMsg, "");
  setMsg(saveMsg, "");

  const regno = regnoInput.value.trim().toUpperCase();
  const dob = dobInput.value.trim();

  if(!regno || !dob){
    setMsg(loginMsg, "Please enter Register Number and DOB.");
    return;
  }

  btnLogin.disabled = true;
  btnLogin.textContent = "Logging in...";

  try{
    // 1) Login
    const loginRes = await api("login", { regno, dob });
    if(loginRes.status !== "success"){
      setMsg(loginMsg, loginRes.message || "Login failed");
      return;
    }

    showDashboard(loginRes.student);

    // 2) Check status
    const statusRes = await api("status", { regno });

    if(statusRes.status === "registered"){
      renderAlready(statusRes.registration);
      setMsg(loginMsg, "", true);
      return;
    }

    // 3) Get random 7
    const randRes = await api("random", { regno });
    if(randRes.status !== "success"){
      setMsg(loginMsg, randRes.message || "Unable to load subjects");
      return;
    }

    currentSubjects = randRes.subjects;
    renderNew(currentSubjects);
    setMsg(loginMsg, "Login successful.", true);

  } catch(err){
    setMsg(loginMsg, "Network error. Check API URL.");
  } finally{
    btnLogin.disabled = false;
    btnLogin.textContent = "Login";
  }
});

btnConfirm.addEventListener("click", async () => {
  if(!currentStudent || currentSubjects.length !== 7){
    setMsg(saveMsg, "Subjects not loaded.");
    return;
  }

  btnConfirm.disabled = true;
  btnConfirm.textContent = "Saving...";

  try{
    const codes = currentSubjects.map(x => x.code);

    const saveRes = await api("save", {
      regno: currentStudent.regno,
      subjects: codes
    });

    if(saveRes.status === "success"){
      setMsg(saveMsg, "✅ Registration confirmed successfully!", true);

      // refresh status
      const statusRes = await api("status", { regno: currentStudent.regno });
      if(statusRes.status === "registered"){
        renderAlready(statusRes.registration);
      }
      return;
    }

    if(saveRes.status === "registered"){
      setMsg(saveMsg, "You are already registered.", true);
      renderAlready(saveRes.registration);
      return;
    }

    setMsg(saveMsg, saveRes.message || "Save failed");

  } catch(err){
    setMsg(saveMsg, "Network error while saving.");
  } finally{
    btnConfirm.disabled = false;
    btnConfirm.textContent = "Confirm Registration";
  }
});

btnLogout.addEventListener("click", () => {
  showLogin();
});

// initial
showLogin();
