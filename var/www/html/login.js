document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const passwordInput = document.getElementById('password');
  const loginMessage = document.getElementById('loginMessage');
  
  // Replace 'your_password' with a real password.
  // For this case, I'll use 'grandemaison' as requested.
  const PASSWORD = 'gtR0u5DBtZMuLNyAiaHMo';

  loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const password = passwordInput.value;

    if (password === PASSWORD) {
      // Use sessionStorage to store the login state for the current session.
      // This is simple, but not highly secure.
      sessionStorage.setItem('loggedIn', 'true');
      window.location.href = 'admin.html';
    } else {
      loginMessage.textContent = 'Mot de passe incorrect.';
      loginMessage.style.color = 'red';
      passwordInput.value = '';
    }
  });
});
