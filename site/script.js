// Лендинг — одна страница, поэтому весь скрипт живёт здесь.
// Форма отправляется в Google Apps Script, который пишет заявку в таблицу.
(() => {
  'use strict';

  /**
   * Мобильное меню.
   *
   * До 768px навигация не помещается в строку шапки, и страница получала
   * горизонтальный скролл. Кнопка открывает панель под шапкой; закрываем её
   * по повторному нажатию, по клику на ссылку и по Esc.
   */
  const navToggle = document.querySelector('.nav-toggle');
  const mainNav = document.getElementById('main-nav');

  if (navToggle && mainNav) {
    const setOpen = (open) => {
      navToggle.setAttribute('aria-expanded', String(open));
      navToggle.setAttribute('aria-label', open ? 'Закрыть меню' : 'Открыть меню');
      mainNav.classList.toggle('is-open', open);
    };

    navToggle.addEventListener('click', () => {
      setOpen(navToggle.getAttribute('aria-expanded') !== 'true');
    });

    // Переход по ссылке закрывает панель: иначе она висела бы поверх контента.
    mainNav.addEventListener('click', (event) => {
      if (event.target.closest('a')) setOpen(false);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape') setOpen(false);
    });

    // При переходе на десктопную ширину панель должна вернуться в исходное
    // состояние, иначе кнопка останется в режиме «крестик».
    const desktop = window.matchMedia('(min-width: 768px)');
    desktop.addEventListener('change', (event) => {
      if (event.matches) setOpen(false);
    });
  }

  const form = document.getElementById('registration-form');
  const messageEl = document.getElementById('form-message');
  if (!form || !messageEl) return;

  const submitButton = form.querySelector('.form-submit');

  const setMessage = (text, state) => {
    messageEl.textContent = text;
    messageEl.className = state ? `form-message is-${state}` : 'form-message';
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();

    const data = new FormData(form);
    const surname = String(data.get('surname') || '').trim();
    const name = String(data.get('name') || '').trim();
    const contact = String(data.get('contact') || '').trim();
    const occupation = String(data.get('occupation') || '').trim();

    if (!surname || !name || !contact || !occupation) {
      setMessage('Заполните все обязательные поля.', 'error');
      return;
    }

    if (!data.get('consent')) {
      setMessage('Без согласия на обработку данных заявку принять нельзя.', 'error');
      return;
    }

    const endpoint = (form.getAttribute('action') || '').trim();
    if (!endpoint) {
      // Предохранитель: без адреса отправлять некуда, лучше сказать честно,
      // чем показать «заявка отправлена».
      setMessage('Регистрация временно недоступна. Напишите организаторам напрямую.', 'error');
      return;
    }

    const originalLabel = submitButton ? submitButton.innerHTML : '';
    if (submitButton) {
      submitButton.disabled = true;
      submitButton.innerHTML = '<span>Отправка…</span>';
    }
    setMessage('Передаём заявку…');

    try {
      // Apps Script читает поля из form-urlencoded, а не из multipart:
      // на multipart он отвечает 405.
      const body = new URLSearchParams();
      body.set('surname', surname);
      body.set('name', name);
      body.set('contact', contact);
      body.set('occupation', occupation);
      body.set('consent', 'on');

      // text/plain не вызывает preflight. Apps Script редиректит на
      // script.googleusercontent.com и отдаёт JSON с Access-Control-Allow-Origin,
      // поэтому ответ читается обычным fetch.
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: body.toString(),
        redirect: 'follow'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Скрипт возвращает {ok:true} или {ok:false,error:"причина"}. Без этой
      // проверки любая ошибка валидации выглядела бы как успешная отправка.
      let result = null;
      try {
        result = await response.json();
      } catch {
        // Ответ не JSON (например, страница логина Google) — это не успех.
        throw new Error('Unexpected response');
      }

      if (!result || result.ok !== true) {
        setMessage(result && result.error ? result.error : 'Не удалось отправить заявку. Попробуйте ещё раз.', 'error');
        return;
      }

      form.reset();
      setMessage('Вы в листе ожидания. Если место освободится, организаторы напишут вам первыми.', 'success');
    } catch {
      setMessage('Не удалось отправить заявку. Попробуйте ещё раз или напишите организаторам напрямую.', 'error');
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.innerHTML = originalLabel;
      }
    }
  });
})();
