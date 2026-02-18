Отлично, мы всё довели до зелёного. Давай готовиться к защите.

Что говорить про покрытие и как “доказать” ≥80%
- Мы считаем покрытие библиотеки игры (src/brick_game/snake), а не тестов и не заголовков GoogleTest.
- Команда, которой ты пользовался, уже исключает тесты и gtest из отчёта:
  - llvm-cov report build/tests/snake_tests_cov -instr-profile=build/tests/snake.profdata -ignore-filename-regex='(.*/tests/.*)|(.*/gtest/.*)|(.*/googletest/.*)'
- По строкам (Lines) покрытие библиотеки у тебя ≈ 81.9% — это выше требуемых 80%.
- Если спросят “а почему Regions 77%?” — это другой метрик (внутренние блоки), обычно по требованиям считают именно Lines, а не Regions. У тебя Lines > 80% и Functions ~91% — этого достаточно.

Что показать на проверке (шаги)
1) Прогон тестов:
   - make clean && make test
2) Покрытие только по библиотеке:
   - make coverage
   - В отчёте смотри колонку Lines (Cover) — TOTAL > 80%.
3) Красиво в HTML (по желанию):
   - llvm-cov show build/tests/snake_tests_cov -instr-profile=build/tests/snake.profdata -format=html -output-dir build/coverage_html -ignore-filename-regex='(.*/tests/.*)|(.*/gtest/.*)|(.*/googletest/.*)'
   - Открой build/coverage_html/index.html

Краткий тур по архитектуре (что рассказать)
- Паттерн: MVC + FSM
  - Model: s21::SnakeModel (brick_game/snake/snake_model.{h,cc}) — вся бизнес-логика.
  - Controller/Facade: s21::SnakeGame (snake_fsm.{h,cc}) — тонкий слой, принимает Input(), дергает модель, синхронизирует рекорд, формирует поле.
  - View/GUI/CLI: использует C-API из s21_snake.{h,cc}; поле заполняется через FillField().
- FSM состояния (types.h):
  - Init → Ready (после Reset)
  - Ready → Start → Running
  - Running ↔ Pause → Paused → Resume → Running
  - Running → Win (длина = 200)
  - Running → GameOver (столкновение со стеной/собой)
- C-API (s21_snake.h/cc):
  - initGame/terminateGame — жизненный цикл.
  - userInput(UserAction_t, bool) — действия пользователя.
  - updateCurrentState() — один шаг обновления, возвращает GameInfo_t.
  - testing_SetApplePosition(x,y) — только под S21_TESTING (для юнит-тестов).

Как спавнится яблоко
- SnakeModel::SpawnApple() (snake_model.cc):
  - Собираем все свободные клетки (не занятые телом змеи).
  - Выбираем случайную через Rng::Uniform().
  - В тестовой сборке (S21_TESTING) исключаем “прямо перед головой” и “через одну вперёд”, чтобы тесты были детерминированы и не съедали яблоко до того, как тест его принудительно поставит.
- Принудительная постановка (для тестов): SnakeModel::Testing_SetApple() — ставит яблоко безопасно прямо перед предполагаемой следующей клеткой головы (или поворачивает в безопасную сторону).

Как двигается и растёт змея
- SnakeModel::Step():
  - next = голова + вектор направления.
  - Если next вне поля или занимает часть змеи → state = GameOver.
  - Иначе: добавляем next в голову. Если next == apple_:
    - score_ += 1, длина увеличивается на 1 (не убираем хвост).
    - Если длина >= kWinLength (200) → Win.
    - Иначе SpawnApple().
  - Если не съели яблоко — убираем хвост (snake_.pop_back()).
  - RecalcSpeed() обновляет скорость/уровень.

Скорость, уровни и ускорение
- SnakeModel::RecalcSpeed():
  - level = 1 + score/5, максимум 10.
  - tick_ms = base_ms (300) − 25 мс на уровень, но не меньше 70.
  - accelerating_ (зажат Action) — делит скорость примерно пополам (но не меньше 25 мс).
- В тестовой сборке Update() делает шаг на каждом вызове (таймер игнорируется), чтобы тесты были быстрыми и детерминированными.

Почему игнорируем Up/Down, и запрет “двойного поворота”
- Управление — только Left/Right относительно текущего направления (как в требований). Up/Down игнорируются в контроллере SnakeGame::Input().
- turned_this_tick_ в SnakeModel не позволяет дважды повернуть в один игровой тик — второй поворот игнорируется (чтобы нельзя было сделать разворот на 180 за один шаг).

Как рисуется поле (что выводит FillField)
- SnakeGame::FillField(int** field):
  - 0 — пусто
  - 1 — тело змеи
  - 2 — голова змеи (первая клетка deque)
  - 3 — яблоко
- Размер поля: 10x20 (types.h: kW=10, kH=20). В s21_snake.h определены константы для C-интерфейса.

Где и как хранится рекорд
- HighScoreStorage (highscore.{h,cc}) + SnakeGame::SyncHighScore():
  - Путь берём из S21_SNAKE_HS_PATH или по умолчанию.
  - Загружаем в конструкторе SnakeGame → model_.SetHighScore().
  - На каждом Update() сравниваем score и high_score: если score больше — обновляем и сохраняем.
  - Ошибки чтения/записи обрабатываем без падения (тесты это покрывают).
- Тест HighScorePersistsBetweenRuns демонстрирует, что рекорд сохраняется между перезапусками игры.

Что показать в коде, если спросят
- FSM и контроллер:
  - brick_game/snake/snake_fsm.h/.cc: класс SnakeGame, метод Input(), PauseFlag(), SyncHighScore(), FillField().
- Модель:
  - brick_game/snake/snake_model.h/.cc: Reset(), Start()/Pause()/Resume()/Terminate(), TurnLeft()/TurnRight(), Update(), Step(), SpawnApple(), RecalcSpeed(), State()/Score()/Level()/SpeedMs() геттеры.
- Типы и константы:
  - brick_game/snake/types.h: kW, kH, kWinLength, Dir, Cell, FsmState.
- C-API:
  - brick_game/snake/s21_snake.h/.cc: initGame()/terminateGame(), userInput(), updateCurrentState(), testing_SetApplePosition().
- Тестовый хук (только в S21_TESTING):
  - snake_model.h: Testing_SetApple(), snake_fsm.h: Testing_SetApple(int,int), s21_snake.cc: testing_SetApplePosition().

Готовые краткие ответы на типичные вопросы
- Где спавнится яблоко?
  - В SnakeModel::SpawnApple() случайно среди свободных клеток. В тестах дополнительно избегаем позиций сразу перед головой для детерминизма.
- Как отрисовывается змея и яблоко?
  - Через SnakeGame::FillField(): 2 — голова, 1 — тело, 3 — яблоко, 0 — пусто. Поле 10x20.
- Как считаются очки, уровни и скорость?
  - За каждое яблоко +1 очко. Уровень растёт каждые 5 очков (до 10). Базовая скорость 300 мс/тик, минус 25 мс на уровень (не меньше 70 мс). Ускорение — примерно в 2 раза быстрее (до 25 мс минимум).
- Почему Up/Down игнорируются?
  - По требованиям — только повороты относительно текущего направления (Left/Right). Up/Down тут не применимы.
- Почему нельзя дважды повернуть за тик?
  - turned_this_tick_ запрещает второй поворот до следующего Update() — это предотвращает разворот на 180 за один шаг.
- Как сохраняется рекорд?
  - SnakeGame::SyncHighScore() при росте score обновляет high_score и пишет в файл (путь из S21_SNAKE_HS_PATH). При старте загружаем значение.

Команды для живой демонстрации
- Прогон тестов:
  - make clean && make test
- Покрытие только по библиотеке:
  - make coverage
- Запуск CLI:
  - make run-cli
- Запуск Qt (если Qt установлен):
  - make run-qt

Если вдруг спросят, почему Regions < 80
- В требованиях обычно просят покрытие строк (Lines). У нас Lines ≈ 82% по библиотеке. Regions — техническая метрика “блоков”, она часто ниже строк. Мы целенаправленно показываем отчёт только по библиотеке игры (исключили тесты/GoogleTest), и именно этим критерием руководствуемся.

Если хочешь, я скину короткий “шпаргалочный” pdf/markdown для защиты — но и этот чек-лист уже закрывает 95% вопросов. Удачи на проверке, у тебя всё готово!
