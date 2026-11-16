document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('registration-form');
  const messageEl = document.getElementById('form-message');

  if (form && messageEl) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const surname = form.querySelector('#surname')?.value.trim();
      const name = form.querySelector('#name')?.value.trim();
      const contact = form.querySelector('#contact')?.value.trim();
      const occupation = form.querySelector('#occupation')?.value.trim();
      const consent = form.querySelector('input[name="consent"]')?.checked;

      if (!surname || !name || !contact || !occupation) {
        messageEl.textContent = 'Пожалуйста, заполните все обязательные поля формы.';
        messageEl.className = 'form-message is-error';
        return;
      }

      if (!consent) {
        messageEl.textContent = 'Необходимо подтвердить согласие на обработку персональных данных.';
        messageEl.className = 'form-message is-error';
        return;
      }

      const submitBtn = form.querySelector('.form-submit');
      const originalText = submitBtn ? submitBtn.innerHTML : '';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Отправка данных...</span>';
      }

      messageEl.textContent = 'Передаём заявку...';
      messageEl.className = 'form-message';

      try {
        const formData = new FormData(form);
        const actionUrl = form.getAttribute('action') || 'https://standup.izhdigital.ru/';

        await fetch(actionUrl, {
          method: 'POST',
          mode: 'no-cors',
          body: formData
        });

        messageEl.textContent = 'Заявка успешно отправлена! Организаторы свяжутся с вами для подтверждения.';
        messageEl.className = 'form-message is-success';
        form.reset();
      } catch (err) {
        messageEl.textContent = 'Не удалось связаться с сервером. Попробуйте ещё раз чуть позже.';
        messageEl.className = 'form-message is-error';
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalText;
        }
      }
    });
  }
});