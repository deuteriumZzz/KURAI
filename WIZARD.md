# WIZARD
режим: full
## Ответы
Q0: продукт (веб-приложение + лендинг) · Q0б: оба, равный приоритет, проверка 375px · Q0в: тёмная · Q0г: KURAI (знак — позже)
Q0д: shadcn, перестилизованный токенами · Q0е: UI-first, тестовые данные по OpenAPI (MSW) · Q0ж: русский, строки в словаре
Q1/Q1б: свой стиль — «Кибер-неоклассика» (Kimi × Cyberpunk 2077), без стиль-скилла · профиль движения: S + G-моменты
Q1в: — · Q2: CSS → Motion (кабинет), GSAP только лендинг · Q3: лёгкий шейдер на лендинге · Q5: высокий
референсы: kimi.com — структура кабинета; cyberpunk.net — геометрия; макеты — https://claude.ai/artifact/Aeu1RjyDT4E9zoMXSZL9AH
## Style DNA
суть: спокойный инструмент как Kimi с точной геометрией Найт-Сити; неон — сигнал, а не декор (полная ДНК — DESIGN.md)
## Состав
✅ emil-design-eng (вкус движения) · review-animations · animation-vocabulary · scroll-reveal-libraries (только триггеры)
✅ tailwind-design-system · shadcn · modern-css · typescript-advanced-types · accessibility · vitest · dataviz
✅ ecc:frontend-design-direction · ecc:frontend-patterns · ecc:react-patterns · ecc:motion-foundations/patterns · vercel-react-view-transitions
✅ gsap-core · gsap-react · gsap-plugins · gsap-performance — только лендинг
⚙️ ecc:make-interfaces-feel-better — только механика (hit areas, text-wrap, tabular-nums), без смягчения
⚙️ high-end-visual-design — только точность деталей, без его палитры и шрифтов
❌ apple-design (мягкие формы, пружины) · ecc:liquid-glass-design (стекло) · animated-component-libraries · react-spring-physics · lottie · rive · frontend-design-pro (фото)
## Решения
фреймворк: Next.js 16 (App Router) + TS strict · стили: Tailwind v4 `@theme`, токены — CSS-переменные
движок: CSS → Motion (UI кабинета) · GSAP (лендинг, отдельный чанк) · smooth scroll: нет
шрифты: Exo 2 (заголовки) · Geist (интерфейс) · JetBrains Mono (данные) — все с кириллицей, OFL
иконки: lucide-react, stroke 1.5, square caps · данные: OpenAPI + MSW · состояние: TanStack Query + zustand
бюджет: кабинет ≤ 200 KB JS · лендинг ≤ 250 KB · шейдер ≤ 30 KB lazy · LCP ≤ 2.0 s · CLS ≤ 0.1
договор: сообщения деревом (parent_id), сообщение из частей, деньги целыми (микро-кредиты), Markdown через санитайзер
## Картинки
| файл | что делаем | куда |
|---|---|---|
| — | нет пользовательских картинок | — |
## Секции
- [x] каркас кабинета (сайдбар, чат-шелл, ⌘K)
- [ ] лендинг
- [ ] вход / регистрация / вход в систему
- [x] единый чат (стриминг + расшифровка, маршрут и резерв, стоп, версии, изображения, видео + «Входящее», Markdown)
- [ ] медиатека
- [ ] баланс и тарифы
- [ ] настройки и профиль
- [ ] служебные страницы
## Прогресс
ШАГ 1 ✓ · ШАГ 2 ✓ палитра D (фон 2 + акцент 1), токены · ШАГ 3 ✓ шрифты · ШАГ 4 ✓ пакеты (motion, lucide, vitest) · ШАГ 5 ✓ примитивы + /kit · СЕКЦИИ ▶ 2/8: каркас ✓ · единый чат ✓ · дальше — выбор пользователя
точки отката: авто (ветка frontend/design-system)
## Правки
- 2026-09-23 палитра: фон/нейтральные от «Kiroshi», акцент cyan #00E8F0 от «Графит»
