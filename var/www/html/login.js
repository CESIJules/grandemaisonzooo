document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const loginMessage = document.getElementById('loginMessage');
  
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = usernameInput.value;
    const password = passwordInput.value;

    try {
      const response = await fetch('auth.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ username: username, password: password })
      });

      const data = await response.json();

      if (response.ok && data.status === 'success') {
        // Redirection vers la page d'administration
        window.location.href = 'admin.html';
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
});
