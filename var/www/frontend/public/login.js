function initLogin() {
  const loginForm = document.getElementById('loginForm');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const loginMessage = document.getElementById('loginMessage');
  
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = usernameInput.value;
    const password = passwordInput.value;

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: username, password: password })
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        // Attendre un court instant pour s'assurer que le cookie est bien dÃ©fini
        setTimeout(() => {
            window.location.href = '/admin';
        }, 100);
      } else {
        loginMessage.textContent = 'Mot de passe incorrect.';
        loginMessage.style.color = 'red';
        passwordInput.value = '';
      }
    } catch (error) {
      console.error('Erreur:', error);
      loginMessage.textContent = 'Une erreur est survenue.';
      loginMessage.style.color = 'red';
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initLogin);
} else {
  initLogin();
}