# Лендинг Standup-setup.exe

Статический лендинг стендап-вечера в Ижевске (3 декабря, El Presidente Bar).
Домен: **https://standup.izhdigital.ru**

## Как это работает

Сайт — статические файлы без сборки. На сервере их отдаёт официальный `nginx:alpine`,
запущенный в Docker Compose и подключённый к внешней сети `public`, где уже
работает Traefik. Traefik терминирует TLS (Let's Encrypt, HTTP-01) и
проксирует запросы в контейнер.

```text
push в main ──> GitHub Actions ──scp──> /opt/standup-prod
                                             │
                                             ├─> docker compose up -d
                                             │
                              Traefik (public) ─> nginx ─> site/
```

Никакой сборки образа и реестра: деплой — это копирование файлов и
`docker compose up -d`. Любой новый файл достаточно положить в `site/` —
он уедет при следующем деплое.

## Структура

```text
site/                     содержимое сайта (монтируется в /usr/share/nginx/html)
  index.html
  style.css               стили: единственный источник, в HTML не дублируются
  script.js               меню на мобильных + отправка формы
  speakers-760.webp       коллаж участников (собирается из speakers-only.png)
  speakers-1100.webp
  favicon.ico/.svg        иконка вкладки (svg + растровый запас)
  apple-touch-icon.png    иконка для iOS
  icon-192.png            иконка для Android/манифеста
  robots.txt
nginx/default.conf        конфиг nginx: gzip, кэширование, try_files
nginx/security-headers.conf  CSP, HSTS, X-Content-Type-Options и др.
docker-compose.deploy.yml прод: Traefik labels, внешняя сеть public
docker-compose.dev.yml    локальный запуск без Traefik (порт 8081)
deploy/prod.env           единственный источник настроек окружения
.github/workflows/deploy.yml
```

## Локальный запуск

```bash
cp deploy/prod.env .env
docker compose -f docker-compose.deploy.yml -f docker-compose.dev.yml up -d
# http://localhost:8081
docker compose -f docker-compose.deploy.yml -f docker-compose.dev.yml down
```

Или совсем без Docker — из каталога `site/`:

```bash
python3 -m http.server 8081 --directory site
```

## Деплой

Автоматически: push в `main`. Вручную: **Actions → Deploy Standup landing →
Run workflow**.

На сервере всё лежит в `/opt/standup-prod`:

- `deploy/prod.env` → копируется в `.env` при каждом деплое;
- `site/`, `nginx/`, `docker-compose.deploy.yml` — приезжают по scp.

Откат — `git revert` и повторный деплой.

### Что нужно в GitHub перед первым запуском

Settings → Secrets and variables → Actions, secrets:

| Secret | Назначение |
|---|---|
| `VPS_HOST` | IP хостинга |
| `VPS_USER` | пользователь SSH |
| `SSH_PRIVATE_KEY` | приватный ключ целиком, с `BEGIN/END` |
| `VPS_PORT` | необязателен, по умолчанию 22 |

Значения те же, что у `uptimers-landing` и `wl3` — используются тот же сервер
и тот же пользователь деплоя.

### Условия на сервере

- контейнер Traefik запущен, сеть `public` существует;
- DNS: `standup.izhdigital.ru A 18.224.239.28` (A-запись на сервер с Traefik).
  Без неё Let's Encrypt не выпустит сертификат по HTTP-01.

## Что проверяет workflow

1. `docker compose config` — ошибки в `.env` и compose видны до пересоздания.
2. healthcheck контейнера — nginx действительно отдаёт главную.
3. `https://<домен>/` → 200 (то есть Traefik выпустил сертификат и маршрут жив).
4. `http://<домен>/` → 301/308 (редирект на HTTPS); иначе предупреждение.

## Форма регистрации

Заявки уходят в Google Apps Script, который пишет строку в Google Таблицу.
Адрес веб-приложения — в атрибуте `action` формы в `site/index.html`.

Контракт, который важно не нарушить при правках:

- скрипт ждёт `application/x-www-form-urlencoded`; на `multipart/form-data`
  (то есть на обычную `FormData`) он отвечает `405`;- поля: `surname`, `name`, `contact`, `occupation`, `consent=on`;
- ответ — JSON `{"ok":true}` или `{"ok":false,"error":"причина"}`;
- Apps Script редиректит на `script.googleusercontent.com`, и оба ответа
  отдают `Access-Control-Allow-Origin: *`, поэтому ответ читается из браузера.

Скрипт проверяет `ok === true`, а не только HTTP-статус: иначе отказ
валидации («уже регистрировались», «нужно согласие») выглядел бы как успех.

Проверить endpoint вручную:

```bash
curl -L --data-urlencode 'surname=Тест' --data-urlencode 'name=Тест' \
  --data-urlencode 'contact=@test' --data-urlencode 'occupation=QA' \
  --data-urlencode 'consent=on' "<URL из action>"
```

## Участники

Коллаж лежит в `site/speakers-760.webp` и `site/speakers-1100.webp`, список
участников — в разметке секции `#speakers`. Исходники (`speakers.png`,
`speakers-only.png`) в репозиторий не входят: они в `.gitignore`, но остаются
локально, чтобы можно было пересобрать картинку. Текстовый источник с
описаниями — `speakers.txt` в корне репозитория; он не попадает в `site/`,
поэтому не публикуется на сайте.

Пересборка из исходника:

```python
from PIL import Image
src = Image.open('site/speakers-only.png').convert('RGB')
for width in (760, 1100):
    h = round(src.height * width / src.width)
    src.resize((width, h), Image.LANCZOS).save(
        f'site/speakers-{width}.webp', 'WEBP', quality=80, method=6)
```

Текст участников правится в `site/index.html`; список должен совпадать по
составу с коллажем.

## Что осталось сделать

- [ ] Заменить текст политики конфиденциальности на согласованный с юристом,
      если он появится. Сейчас это краткая формулировка в футере.
