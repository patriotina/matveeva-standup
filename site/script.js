(() => {
  const form = document.querySelector('#registration-form');
  const formMessage = document.querySelector('#form-message');
  const submitButton = form?.querySelector('button[type="submit"]');

  document.querySelectorAll('a[href^="#"]').forEach((link) => {
    link.addEventListener('click', (event) => {
      const target = document.querySelector(link.getAttribute('href'));

      if (!target) return;

      event.preventDefault();
      target.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
      });
    });
  });

  const sections = [...document.querySelectorAll('main section[id]')];
  const navigationLinks = [...document.querySelectorAll('.main-nav a')];

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;

        navigationLinks.forEach((link) => {
          link.classList.toggle(
            'is-active',
            link.getAttribute('href') === `#${entry.target.id}`
          );
        });
      });
    }, {
      rootMargin: '-35% 0px -55%'
    });

    sections.forEach((section) => observer.observe(section));
  }

  if (!form) return;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }

    const endpoint = form.dataset.sheetsEndpoint?.trim();

    if (!endpoint) {
      formMessage.textContent = 'Интеграция с Google Таблицей ещё не настроена: добавьте URL веб-приложения Google Apps Script в data-sheets-endpoint.';
      return;
    }

    const formData = new FormData(form);
    const payload = {
      name: formData.get('name'),
      contact: formData.get('contact'),
      occupation: formData.get('occupation'),
      consent: formData.get('consent') === 'on',
      submittedAt: new Date().toISOString()
    };

    submitButton.disabled = true;
    formMessage.textContent = 'Заявка отправляется…';

    try {
      await fetch(endpoint, {
        method: 'POST',
        mode: 'cors',
        headers: {
          'Content-Type': 'text/plain;charset=utf-8'
        },
        body: JSON.stringify(payload)
      });

      form.reset();
      formMessage.textContent = 'Заявка отправлена. Организаторы свяжутся с вами для подтверждения.';
    } catch (error) {
      formMessage.textContent = 'Не удалось отправить заявку. Попробуйте ещё раз или свяжитесь с организаторами другим способом.';
    } finally {
      submitButton.disabled = false;
    }
  });
})();