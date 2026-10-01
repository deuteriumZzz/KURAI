# KURAI workspace

Next.js-интерфейс KURAI. Он может открываться в двух честно разделённых
режимах:

- **локальный интерфейсный просмотр** — без API, с безопасными локальными
  данными для оценки UX; не принимает логины, платежи или фиктивные ссылки;
- **подключённый workspace** — с Django API, настоящими сессиями, проектами,
  каталогом моделей, квотами и запусками.

## Локальный просмотр

```bash
npm install
npm run dev
```

Откройте `http://localhost:3000`. Не задавайте
`NEXT_PUBLIC_KURAI_API_BASE_URL`, если нужно посмотреть только интерфейс.

## Подключённый локальный MVP

В отдельном терминале запустите API из `../backend`:

```bash
./.venv/bin/python manage.py migrate
KURAI_LOCAL_EXECUTE_RUNS=1 ./.venv/bin/python manage.py runserver 8000
```

Создайте `frontend/.env.local` на основе `.env.example`:

```dotenv
NEXT_PUBLIC_KURAI_API_BASE_URL=http://localhost:8000
NEXT_PUBLIC_SITE_URL=http://localhost:3000
```

Затем перезапустите `npm run dev`. Можно также открыть фронтенд через
`http://127.0.0.1:3000`: стандартная локальная CORS/CSRF-конфигурация API
разрешает оба адреса. В этом режиме регистрация и вход создают настоящую
сессию Django; Telegram OAuth и сброс пароля намеренно не отображаются как
рабочие функции, пока не появятся их серверные контуры.

## Проверки

```bash
npm test
npm run typecheck
npm run lint
npx next build --webpack
```

См. `../docs/CAPABILITY.md` для границ MVP и его production-милстоунов.
