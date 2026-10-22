# KURAI — Design System

Источник правды для внешнего вида. Компоненты берут вид только из токенов этого файла
(CSS-переменные в `frontend/src/app/globals.css`). Сырые hex, радиусы, шрифты и длительности
в компонентах запрещены.

Живые макеты и демо эффектов: https://claude.ai/artifact/Aeu1RjyDT4E9zoMXSZL9AH

## Style DNA

**Название:** KURAI Industrial Signal — Kimi × Cyberpunk 2077 × cyber brutalism.

**Суть:** рабочий инструмент уровня Kimi/SyntaxAI, который ощущается как живая
система: строгая индустриальная сетка, плотная типографика, реальные статусы,
сдержанный motion и визуальная память Cyberpunk 2077 без игровой оболочки.

**Главный конкурент:** SyntaxAI по широте моделей и режимов. KURAI выигрывает не
количеством кнопок, а тем, что выбор модели, контекст, цена, источники и артефакты
понятны обычному пользователю.

**Референсы:** KURAI Research Workbench (каноническая композиция продукта),
CYBR_BRUTALISM dark/light и BEYOND HUMAN. Забираем грамматику:
90-градусные модули, грязный off-black/off-white материал, крупные буквенные
плоскости, узкие панели, scan/photo texture, lime/magenta/violet как системные
сигналы. Не копируем черепа, станции, fake-coordinates, игровые логи и чужие ассеты.

**Профиль:** энергия — живая, но рабочая · форма — индустриальная · плотность —
средне-высокая · движение — короткое и событийное · материал — печатный/экранный,
не glassmorphism.

**Баланс:** 70% спокойная Kimi-эргономика, 20% индустриальная модульность, 10%
киберпанк-моменты на реальных событиях. Одновременно активны максимум три motion-
источника на экране.

### ОБЯЗАТЕЛЬНО
- Две полноценные темы: **Night Ops** (тёмная рабочая) и **Paper System**
  (светлая бумажная), не простая инверсия.
- Палитра ролями: radio-lime — команда/выбор/готовность; signal-magenta —
  генерация, медиа, живой AI-сигнал; system-violet — research, структура,
  сравнение; error-red — только настоящая ошибка.
- Модули строятся по 1px сетке: навигация, рабочая область, inspector, composer,
  model bay и артефакты имеют разную плотность, а не одинаковые карточки.
- Радиусы 0–4px в тёмной теме, 0–8px в Paper System; большие pills запрещены
  кроме нативных browser controls, где иначе страдает доступность.
- Системные метки и числовые значения — моно; длинный пользовательский текст —
  спокойный sans, без “терминального” переигрывания.
- Кнопки и действия говорят по-человечески; индустриальный язык остаётся в
  метках, статусах, шкалах, routing evidence и декоративных маркерах.
- Motion всегда отражает состояние: hover, выбранная модель, отправка,
  стриминг, появление источников, готовность медиа, ошибка, offline.
- Любая “живость” имеет reduced-motion/calm fallback.

### ЗАПРЕЩЕНО
- Cyan как основной брендовый акцент. Он был причиной generic AI/HUD ощущения.
- Фейковая телеметрия: случайные координаты, uptime, progress, route, latency,
  если backend или UI state этого не подтверждает.
- Глитч вне ошибок/404/короткого route change; сканлайны поверх читаемого текста;
  постоянное мерцание.
- Стекло / blur-карточки, glow ради glow, орбы, AI-gradient, одинаковые bento cards.
- Округлые «дружелюбные» шрифты.
- Игровая лексика в действиях, геймификация, персонаж-помощник, звуки, свой курсор.
- Ассеты CD Projekt: логотипы, шрифт игры, иконки, скопированные экраны.

### Motion grammar
- Sidebar item: 120–160ms, rail marker + icon shift + text luminance. У разных
  групп меню разные микросценарии, но одна механика.
- Chat row: 140ms lift-free reveal; действия выезжают с правого края, строка не
  меняет высоту.
- Composer send: 70–90ms press, затем signal sweep через поле и pulse по рабочей
  сетке.
- Model picker: 160–180ms module insert; preview panel меняется clip/slide,
  не opacity-only.
- Answer hover: тонкая кромка источников, actions layer и highlight claim/source.
- Media ready: mask reveal с magenta signal marker.
- Inspector: 180–240ms edge expansion, рабочий контекст остаётся на месте.
- Theme switch: 180–240ms material morph, без page fade.
- Error: локальный 120ms glitch/vibration + понятный текст восстановления.

### Правила кибер-элементов
1. Показывает реальное состояние системы — никакого фейкового прогресса.
2. ≤ 0,4 с или только во время ожидания, которое и так есть.
3. Не двигает текст, который читают.
4. Выключается «Спокойным режимом» и `prefers-reduced-motion`.
5. Скринридер получает чистый текст (шифр — `aria-hidden`).

### Свет и неон: один свет, разная громкость
Лендинг — витрина, кабинет — рабочий зал. Свет у них один, меняется только громкость.
1. **Цвет света — только лайм** (`--color-acc`) и холодный белый. Пурпурный
   (`signal`) значит поиск и ошибку, фиолетовый — сравнение моделей; декоративным
   светом они не бывают ни на лендинге, ни в кабинете.
2. **Лендинг — полная громкость:** лучи сверху (`.k-beams`), сборка моделей в «Авто»,
   экран из слоёв, финальная линия. Мотив один — много моделей сходятся в одно.
3. **Кабинет — рабочая громкость:** свечение только у активного и важного —
   выбранная модель, отправка, цена до отправки, активный чат, идущий ответ.
4. **Мост между ними — общие объекты, а не общий декор:** то же поле ввода
   (`.k-composer`), та же сетка точек (`SignalField`, стягивается к полю при отправке),
   черновик с лендинга открывается в кабинете.
5. Никаких неоновых вывесок и надписей ради света: свет подсвечивает продукт.

### Product screens
1. **Command Deck `/app`:** главный вход как Kimi, но с живым Workspace Signal,
   quick scenarios, Context Rail summary и composer как центральный объект.
2. **Conversation Workbench `/app/c/[id]`:** каноническая трёхколоночная
   композиция: rail, документный чат, Inspector. Ответ — документ с action layer
   без светящейся рамки; справа — модель, цена, контекст, источники, артефакты и
   branch map по факту наличия данных.
3. **Model Bay:** не “dropdown”, а serious selector: поиск, группы, сравнение,
   route reason, Auto объясняет почему он выбран.
4. **Model Registry `/app/models`:** каталог SyntaxAI-класса: modality, provider,
   цена, context, strengths, availability, compare.
5. **Research Evidence Room:** источники, факты, цитаты, уверенность и экспорт.
6. **Asset Bay `/app/media`:** превью реальных артефактов, версии, prompt/model,
   magenta как сигнал генерации.
7. **Billing Ledger:** спокойный финансовый экран без кибер-драмы; ledger,
   top-up, receipts, refunds.
8. **Settings Control Panel:** профиль, default model, calm mode, data export,
   retention/delete policy placeholders.
9. **Auth Access Gate:** индустриально, но максимально простой вход.
10. **Mobile:** bottom rail, sheets вместо hover, composer thumb-zone, без потери
    выбора модели и цены.

### Эталоны
- **Кнопка (главная):** заливка акцентом, текст `--acc-ink`, срез угла 8px, радиус 0. Hover — внутреннее свечение 1px. Без сдвигов и bounce.
- **Кнопка (вторичная):** графит `--g2`, рамка `--line2`, без среза.
- **Карточка:** `--g1` + рамка 1px `--line`. Выбрана — точная рамка
  `--acc-line` или rail-marker; угловые скобки не применяются к обычному
  тексту, ответам и полям ввода.
- **Поле:** `--g1`, рамка `--line`. Фокус — умеренная рамка `--line2` и
  видимый keyboard outline; без неонового ореола и «прямоугольника выделения».
- **Фокус (клавиатура):** outline 1px `--acc`, offset 2px, всегда видимый.

### Примитивы (из них собираются все эффекты)
Decode (расшифровка) · Flicker (мерцание) · Brackets (скобки) · Segments (шкала) · Hatch (штриховка) ·
Scanline (скан-линия) · SysLine (системная строка `›`) · KeyHint (подсказка клавиши).

## Tokens
Палитра **Industrial Signal**. Источник: `frontend/src/app/globals.css`
(`@theme` → утилиты Tailwind `bg-g1`, `text-ink2`, `border-line`…).

| Токен | Значение | Роль |
|---|---|---|
| `bg` / `rail` | `#151515` / `#131313` | Night Ops: чистый графит, R=G=B — без зелёного/тёплого оттенка |
| `g1` / `g2` / `g3` | `#191919` / `#1F1F1F` / `#272727` | поле ввода, карточки / hover, активная строка / нажатое |
| `line` / `line2` | `#282828` / `#3A3A3A` | 1px модульная сетка / границы полей и панелей |
| `ink` / `prose` / `ink2` / `ink3` | `#F2F2F2` / `#D6D6D6` / `#B4B4B4` / `#8E8E8E` | заголовки / чтение / вторичный / метки |
| `acc` | `#D8EC98` | пастельный лайм: команда, выбор, готовность. Линия акцента — 60%: ниже ~50% лайм на графите становится хаки |
| `signal` | `#E8467E` | magenta: генерация, медиа, живой сигнал |
| `violet` | `#9D8DE2` | research, источники, структура |
| `paper` / `ink-paper` | `#F1F0EC` / `#141414` | Paper System (нейтральные чернила, тёплая бумага) |
| `ok` / `warn` / `err` | `#69D99A` / `#E1A93A` / `#FF4D5E` | семантика, отдельно от акцентов |

**Paper System:** `bg #F1F0EC`, `g1 #FFFFFF`, `g2 #E7E4DA`, `line #D5D1C6`,
`ink #141414`, `ink2 #424242`, `acc #7EA300`, `signal #C52C64`, `violet #7158CF`.

**Контраст (WCAG 2.2):** body и placeholder ≥ 4.5:1, large text ≥ 3:1,
акцентный текст проверяется на каждой теме отдельно. Magenta не используется как
единственный признак ошибки.

**Шрифты (next/font, кириллица):** интерфейс и чтение — Geologica (`font-sans`);
заголовки страниц и разделов — Sofia Sans Extra Condensed: `.k-display` (прописные,
главный заголовок экрана) и `font-display` (заголовок раздела); Martian Mono в узкой
ширине — только значения: цены, коды, время, индексы (`.k-code`, `.k-index`).
**Лендинг:** заголовки — Tektur (`.k-tech`, подключён только на лендинге в
`landing/fonts.ts`). Первый экран: «нейросетей» перебирает шрифты-«модели», ловит глитч
в лайме и белом и встаёт в Tektur, строка раздаётся вширь (`.k-hero-*`). Playfair,
Press Start 2P и Unbounded звучат только в этом переборе.
**Один материал на весь сайт:** `.kurai-app` стоит на `<body>` — лендинг, вход, документы
и кабинет на одной палитре. Шапка экрана везде одна: `k-index` «K/NN · раздел» +
`.k-display`. Номера: K/00 главная и первый экран, K/01–04 разделы лендинга,
K/05 модели, K/06 стоимость, K/07 статус, K/08 что нового, K/09 документы.
**Геометрия:** радиусы 4 / 6 / 8 / 12px (`--radius-xs/sm/md/lg`) у всего, что имеет рамку
или заливку: кнопки и строки — 6, карточки и баннеры — 8, поле ввода и окна — 12.
Срез угла — только засечка у залитой лаймовой кнопки (`fx-chamfer`, `k-chamfer`) и у
ярлыка артефакта; кольцо фокуса у них внутри. Тач ≥ 44px.
**Классы кабинета:** `k-rail`, `k-rail-item` (рейка-маркер), `k-chat-row`,
`k-composer` (+ `k-sweep` после отправки), `k-tool`, `k-kbd`, `k-bay`, `k-bay-row`,
`k-radio`, `k-answer` / `k-answer-actions`, `k-act`, `k-inspector` / `k-module`,
`k-cite` ↔ `k-src` (связь сноски и источника), `k-hatch-line`.

**Motion Kit (именованные примитивы, каждый — только на реальном событии):**

| Примитив | Где | Реализация | Время |
| --- | --- | --- | --- |
| rail trace | пункт рейки, строка истории | `k-rail-item` / `k-chat-row` (сдвиг 3px, рейка-маркер) | 160мс |
| module insert | Model Bay, меню, лист | motion `translateY 6px → 0` от кнопки | 200мс |
| document reveal | новое сообщение | `Appear` (подъём 8px, без скрытия текста) | 200мс |
| route handoff | отправка из поля | `k-composer.k-sweep` — одна лаймовая волна | 240мс |
| signal sweep / live | текущий шаг агента, идущая генерация | `k-live` (лайм — шаг, пурпур — медиа), гаснет на финале | 1.4с цикл |
| result seal | завершённый шаг, «Готово» | `k-seal` — один раз | 240мс |
| media mask reveal | готовое изображение / видео | `fx-reveal` | 480мс |
| source connection | сноска ↔ источник | `k-cite` / `k-src` через `:has()` | 150мс |
| inspector edge | правая колонка / лист | motion `translateX 16px → 0` | 220мс |
| theme morph | смена темы | `k-theme-shift` на 260мс | 200мс |
| signal field | пустая главная | `SignalField` (canvas, гаснет при наборе) | по курсору |

Все примитивы выключаются в «Спокойном режиме» и при `prefers-reduced-motion`.
Звук — опционально (`prefs.sound`, по умолчанию выкл.), только «готово» и «ошибка».
**Движение:** hover 120–160мс · popover 160–180мс · panel 180–240мс · send press
70–90мс · route/signal 240–400мс · ease-out `cubic-bezier(.2,.8,.2,1)`.

## Implementation pipeline

1. **Design foundation:** обновить токены, scrollbar/selection/focus, theme roles,
   motion constants и CSS primitives. Тесты: motion contract + critical UI states.
2. **App Shell:** перестроить фон и sidebar в индустриальную модульную сетку:
   rail marker, разные hover-сценарии, better collapsed state, mobile drawer.
3. **Command Deck:** главная после входа: плотнее, не пусто, context summary,
   real workspace signal, scenarios не как одинаковые карточки.
4. **Composer:** сделать поле главным рабочим устройством: signal sweep, clearer
   cost/model/context, режимы без перегруза, file/voice states.
5. **Model Bay:** dropdown → полноценная панель выбора модели с route reason,
   сравнение, избранное/недавние, keyboard flow.
6. **Chat Workbench:** document answers, action layer, sources, branch/context inspector,
   loading/error/empty/offline states.
7. **Model Registry + Media + Billing + Settings:** довести все внутренние экраны
   до одной системы, без “страниц-заглушек”.
8. **Backend alignment:** подключить UI к capability/status/model catalog/ledger,
   не показывать синтетические availability/payment/fallback факты.
9. **QA:** typecheck, lint, unit/component tests, screenshot review desktop/mobile,
   detector, reduced-motion/calm verification.
