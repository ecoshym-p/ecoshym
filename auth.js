
const supabaseUrl = 'https://fdxnoirzzmmhqexhrttn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZkeG5vaXJ6em1taHFleGhydHRuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY4ODAyMTcsImV4cCI6MjA5MjQ1NjIxN30.4J6xKeQrj-OK34FaCdEHAsbgnONxv-JV8XUrgyhr4v4';

document.addEventListener("DOMContentLoaded", () => {

  if (!window.supabase) {
    console.error("Supabase CDN не загрузился!");
    return;
  }

  const sb = window.supabase.createClient(supabaseUrl, supabaseKey);

  function isValidEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  function setMessage(el, text, isSuccess = false) {
    if (!el) return;
    el.textContent = text;
    el.style.color = isSuccess ? "green" : "red";
  }

  document.querySelectorAll(".toggle-pass").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset.target);
      if (!input) return;
      const isPass = input.type === "password";
      input.type = isPass ? "text" : "password";
      btn.textContent = isPass ? "Hide" : "Show";
    });
  });

  const registerForm = document.getElementById("registerForm");
  if (registerForm) {
    registerForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const name     = document.getElementById("regName").value.trim();
      const email    = document.getElementById("regEmail").value.trim().toLowerCase();
      const password = document.getElementById("regPassword").value;
      const confirm  = document.getElementById("regPasswordConfirm").value;
      const msg      = document.getElementById("registerMessage");

      setMessage(msg, "Загрузка...");

      if (name.length < 2)        return setMessage(msg, "Please enter your full name.");
      if (!isValidEmail(email))   return setMessage(msg, "Please enter a valid email.");
      if (password.length < 6)    return setMessage(msg, "Password must be at least 6 characters.");
      if (password !== confirm)   return setMessage(msg, "Passwords do not match.");

      const { data, error } = await sb.auth.signUp({
        email,
        password,
        options: { data: { full_name: name } }
      });

      if (error) {
        setMessage(msg, "Error: " + error.message);
      } else {
        setMessage(msg, "Account created! Redirecting...", true);
        setTimeout(() => { window.location.href = "login.html"; }, 1500);
      }
    });
  }

  const loginForm = document.getElementById("loginForm");
  if (loginForm) {
    loginForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const email    = document.getElementById("loginEmail").value.trim().toLowerCase();
      const password = document.getElementById("loginPassword").value;
      const msg      = document.getElementById("loginMessage");

      setMessage(msg, "Загрузка...");

      const { data, error } = await sb.auth.signInWithPassword({ email, password });

      if (error) {
        setMessage(msg, "Invalid email or password.");
        console.error(error.message);
      } else {
        setMessage(msg, "Login successful! Redirecting...", true);
        setTimeout(() => { window.location.href = "index.html"; }, 1000);
      }
    });
  }

  const profileContent = document.getElementById("profileContent");
  if (profileContent) {
    (async () => {
      const { data: { user }, error } = await sb.auth.getUser();
      if (error || !user) {
        window.location.href = "login.html";
        return;
      }
      const name = user.user_metadata?.full_name || "User";
      profileContent.innerHTML = `
        <p><strong>Name:</strong> ${name}</p>
        <p><strong>Email:</strong> ${user.email}</p>
        <p>Your account is active. Now you can submit reports!</p>
      `;
    })();
  }

  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await sb.auth.signOut();
      window.location.href = "login.html";
    });
  }

}); 
