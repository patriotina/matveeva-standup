# Лендинг Standup-setup.exe

Статический лендинг стендап-вечера в Ижевске (3 декабря, El Presidente Bar).
Домен: **https://standup.izhdigital.ru**

## Как это работает

Сайт — два файла без сборки. На сервере их отдаёт официальный `nginx:alpine`,
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
`docker compose up -d`. Стили (`styles.css`) и картинки, когда их пришлют,
достаточно положить в `site/` — они уедут при следующем деплое.

## Структура

```text
site/                     содержимое сайта (монтируется в /usr/share/nginx/html)
  index.html
  script.js
  styles.css              ← ожидается, пока не прислан
nginx/default.conf        конфиг nginx: gzip, кэширование, try_files
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

## Что осталось сделать

- [ ] Положить `styles.css` в `site/` — сейчас страница отдаётся без вёрстки
      (nginx вернёт 404 на этот файл).
- [ ] Форма регистрации: `data-sheets-endpoint` в `site/index.html` пустой,
      отправка показывает «интеграция ещё не настроена». Нужен URL
      веб-приложения Google Apps Script.
