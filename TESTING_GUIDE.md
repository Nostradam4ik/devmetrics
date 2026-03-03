# 🧪 DevMetrics - Повний Гайд Тестування

Детальна покрокова інструкція як протестувати DevMetrics на локальному ПК.

---

## 📋 ЕТАП 1: ПІДГОТОВКА ДО ЗАПУСКУ

### Крок 1.1: Перевірити що все готове

```bash
# Відкрий термінал в VS Code (Ctrl+` або Terminal → New Terminal)

# Перейди в директорію проєкту
cd c:/Code/DEVMETRICS  # або твій шлях

# Перевір що .env існує і заповнений
cat .env | grep -E "GITHUB_CLIENT_ID|GROQ_API_KEY|REDIS_PASSWORD"

# Має показати:
# GITHUB_CLIENT_ID=Ov23lizCn3crPpCirrDB
# GROQ_API_KEY=gsk_...
# REDIS_PASSWORD=...
```

### Крок 1.2: Перевірити Docker Desktop

```bash
# Перевір що Docker працює
docker --version
docker compose version

# Подивись статус Docker Desktop
# На Windows - іконка в system tray має бути зеленою
# На Mac - whale icon в menu bar
```

---

## 🚀 ЕТАП 2: ЗАПУСК ВСІХ СЕРВІСІВ

### Крок 2.1: Очистити старі контейнери

```bash
# Зупинити і видалити все старе
docker compose down -v

# Видалити невикористані images (опціонально)
docker system prune -f
```

### Крок 2.2: Запустити в DEV режимі

```bash
# Запуск з логами (щоб бачити що відбувається)
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build

# АБО в фоновому режимі (detached):
# docker compose -f docker-compose.yml -f docker-compose.dev.yml up -d --build
```

**⏱️ Зачекай 3-5 хвилин для першої збірки**

### Крок 2.3: Моніторинг запуску

**Відкрий ДРУГИЙ термінал** (Ctrl+Shift+` в VS Code):

```bash
# Дивись логи в реальному часі
docker compose logs -f

# Або тільки важливі сервіси:
docker compose logs -f auth_service ingestion_service analytics_service ai_service frontend
```

**Чекай поки побачиш:**
```
✅ postgres        | database system is ready to accept connections
✅ redis           | Ready to accept connections
✅ auth_service    | INFO: Application startup complete
✅ ingestion_service | INFO: Application startup complete
✅ analytics_service | INFO: Application startup complete
✅ ai_service      | INFO: Application startup complete
✅ celery_worker   | celery@worker ready
✅ celery_beat     | beat: Starting...
✅ frontend        | ▲ Ready in 2.5s
```

---

## ✅ ЕТАП 3: ПЕРЕВІРКА INFRASTRUCTURE

### Тест 3.1: Статус контейнерів

```bash
# Перевір що всі контейнери запущені
docker compose ps

# Має бути 9 контейнерів зі статусом "Up":
# NAME                       STATUS
# devmetrics_postgres        Up (healthy)
# devmetrics_redis           Up (healthy)
# devmetrics_auth            Up
# devmetrics_ingestion       Up
# devmetrics_analytics       Up
# devmetrics_ai              Up
# devmetrics_celery_worker   Up
# devmetrics_celery_beat     Up
# devmetrics_frontend        Up
```

**❌ Якщо якийсь контейнер "Exit" або "Restarting":**
```bash
# Подивись логи проблемного сервісу
docker compose logs service_name --tail=50
```

### Тест 3.2: Health Endpoints

```bash
# Перевір кожен backend service
curl http://localhost:8001/health  # Auth
curl http://localhost:8002/health  # Ingestion
curl http://localhost:8003/health  # Analytics
curl http://localhost:8004/health  # AI

# Кожен має відповісти: {"status":"healthy"}
```

**Або відкрий в браузері:**
- http://localhost:8001/health
- http://localhost:8002/health
- http://localhost:8003/health
- http://localhost:8004/health

### Тест 3.3: API Documentation (Swagger UI)

**Відкрий в браузері:**
- http://localhost:8001/docs (Auth Service)
- http://localhost:8002/docs (Ingestion Service)
- http://localhost:8003/docs (Analytics Service)
- http://localhost:8004/docs (AI Service)

**Має відкритись інтерактивна документація!** 📚

---

## 🎬 ЕТАП 4: СТВОРИТИ DEMO ДАНІ

### Крок 4.1: Запустити seed script

```bash
# В терміналі
docker compose exec auth_service python /app/scripts/seed_demo.py
```

**Має вивести:**
```
✓ Created demo organization: DevMetrics Demo
✓ Created 4 demo users:
  - Alice Johnson (alice@devmetrics.io)
  - Bob Smith (bob@devmetrics.io)
  - Carol White (carol@devmetrics.io)
  - David Lee (david@devmetrics.io)
✓ Created 3 repositories:
  - devmetrics-api
  - devmetrics-frontend
  - devmetrics-infra
✓ Created ~300 commits (90 days of synthetic data)
✓ Created 60 pull requests (last 90 days)

Demo account created:
Email: demo@devmetrics.io
Password: Demo1234!
```

**❌ Якщо помилка "file not found":**
```bash
# Знайди файл в контейнері
docker compose exec auth_service find / -name "seed_demo.py" 2>/dev/null

# Або зайди в контейнер і перевір
docker compose exec auth_service bash
ls -la /app/scripts/
exit
```

---

## 🌐 ЕТАП 5: ТЕСТУВАННЯ FRONTEND

### Тест 5.1: Відкрити головну сторінку

```bash
# Відкрий в браузері
http://localhost:3000
```

**Має відкритись Login page!** 🎉

### Тест 5.2: Login з Demo Account

**Введи:**
```
Email: demo@devmetrics.io
Password: Demo1234!
```

**Клікни "Sign in"**

**Має redirectити на Dashboard!** ✅

### Тест 5.3: Login через GitHub OAuth

**Альтернативно спробуй:**
1. Клікни **"Sign in with GitHub"**
2. Авторизуй додаток (якщо перший раз)
3. Redirectить назад на Dashboard

---

## 📊 ЕТАП 6: ТЕСТУВАННЯ ОСНОВНИХ FEATURES

### Тест 6.1: Dashboard Overview

**Після логіна побачиш:**
- ✅ **4 metric cards** вгорі:
  - Total Commits (~300)
  - Pull Requests (~60)
  - Avg Cycle Time (~24-48h)
  - Active Developers (4)
- ✅ **Commit Activity Chart** (bar chart за останні 30 днів)
- ✅ **Recent Activity** список (останні commits/PRs)
- ✅ **Sidebar навігація** зліва

**📸 Зроби screenshot для README!**

---

### Тест 6.2: Analytics Page

**Клікни "Analytics" в sidebar**

**Побачиш 4 таби:**

#### Tab 1: Team Metrics
- ✅ Таблиця з 4 developers (Alice, Bob, Carol, David)
- ✅ Колонки: Name, Commits, PRs, Lines Changed, Avg PR Time
- ✅ Можна сортувати по колонках

#### Tab 2: Time Series
- ✅ Line chart (commits over time)
- ✅ Date range selector (7/14/30/90 days)
- ✅ Змінити range - chart оновлюється

#### Tab 3: PR Analysis
- ✅ Bar chart (PRs created vs merged)
- ✅ Merge rate %
- ✅ Avg cycle time

#### Tab 4: Code Reviews
- ✅ Review metrics
- ✅ Avg review time
- ✅ Reviews per developer

**Спробуй:**
```bash
# Змінити date range на 90 days
# Charts мають оновитись з новими даними
```

**📸 Зроби screenshot Analytics charts!**

---

### Тест 6.3: AI Insights (GPT Chat)

**Клікни "Insights" в sidebar**

**Побачиш 3 таби:**

#### Tab 1: Ask AI (Chat)

**Спробуй ці запити:**

**Запит 1:**
```
What are the main productivity bottlenecks in our team?
```

**Groq Llama 3.1 (70b) має відповісти за 1-3 секунди!** ⚡

**Запит 2:**
```
Analyze commit patterns for the last 30 days
```

**Запит 3:**
```
Which developer is most productive and why?
```

**Запит 4:**
```
How can we improve our PR cycle time?
```

**✅ Перевір що:**
- Відповіді приходять швидко (2-5 сек)
- Markdown форматування працює
- Можна скролити історію чату
- Loading spinner показується під час генерації

**📸 Зроби screenshot AI Chat conversation!**

#### Tab 2: Weekly Report

**Клікни "Generate Report"**

**Має згенерувати:**
- ✅ Markdown звіт з аналізом тижня
- ✅ Key metrics summary
- ✅ Trends
- ✅ Recommendations

#### Tab 3: Suggestions

**Показує AI-generated recommendations:**
- ✅ Process improvements
- ✅ Team optimization
- ✅ Tool suggestions

---

### Тест 6.4: ML Insights (Machine Learning)

**Клікни "ML Insights" в sidebar**

**Побачиш 4 таби:**

#### Tab 1: Velocity Trend

**Спробуй:**
```bash
1. Metric: Commits (або PRs)
2. Period: 30 days
3. Клікни "Analyze"
```

**Має показати:**
- ✅ **Slope** (напр. +1.2 commits/day)
- ✅ **R² score** (0.0-1.0, якість прогнозу)
- ✅ **Classification**: "Increasing" / "Stable" / "Decreasing"
- ✅ **7-day forecast** (bar chart з прогнозом)

#### Tab 2: Anomaly Detection

**Спробуй:**
```bash
1. Detection method: Combined (або Z-score / IQR)
2. Клікни "Detect Anomalies"
```

**Має показати:**
- ✅ Список аномалій
- ✅ Date, value, severity badge (low/medium/high)
- ✅ Explanation чому аномалія

#### Tab 3: Team Health

**Клікни "Calculate Team Health"**

**Має показати:**
- ✅ **Score 0-100** (gauge chart)
- ✅ **Radar chart** (3 dimensions: velocity, quality, collaboration)
- ✅ **Health flags** (risks, warnings)
- ✅ **Grade label** (Excellent/Good/Fair/Poor)

#### Tab 4: Sprint Prediction

**Клікни "Predict Velocity"**

**Має показати:**
- ✅ **Line chart** (historical + predicted)
- ✅ **Confidence intervals** (shaded area)
- ✅ **Next sprint prediction** (напр. 45 commits ±5)
- ✅ **Confidence score** (%)

**📸 Зроби screenshots ML features!**

---

### Тест 6.5: Reports & Exports

**Клікни "Reports" в sidebar**

**Побачиш 3 таби:**

#### Tab 1: Templates

**Спробуй:**
```bash
1. Обери template: "Weekly Team Report"
2. Клікни "Generate PDF"
```

**Має:**
- ✅ Скачатися PDF файл (`report_weekly_2026-03-03.pdf`)
- ✅ Відкрий PDF - має бути:
  - Logo/Header
  - Date range
  - Metrics tables
  - Charts (embedded)
  - Footer

**Спробуй інші templates:**
- Monthly Report
- Quarterly Report
- Sprint Report

#### Tab 2: Custom Builder

**Спробуй:**
```bash
1. Date range: Last 30 days
2. Metrics: ✓ Commits, ✓ PRs, ✓ Reviews
3. Клікни "Export CSV"
```

**Має:**
- ✅ Скачатися CSV файл
- ✅ Відкрий в Excel/Google Sheets
- ✅ Перевір що дані правильні

#### Tab 3: Email Reports

**Якщо налаштував SMTP в .env:**
```bash
1. Email: твій.email@gmail.com
2. Template: Weekly Report
3. Клікни "Send Now"
```

**Має прийти email з PDF attachment!**

**Якщо НЕ налаштував SMTP - пропусти цей тест.**

---

### Тест 6.6: Integrations

**Клікни "Integrations" в sidebar**

**Побачиш 2 cards:**

#### Slack Integration
- ✅ Card з Slack logo
- ✅ Кнопка "Connect Slack"
- ✅ Status: "Not connected" (якщо не налаштовано)

**Якщо хочеш протестувати:**
```bash
# Потрібно створити Slack App:
# https://api.slack.com/apps
# Додати OAuth credentials в .env
# Рестартувати Docker
```

#### Jira Integration
- ✅ Card з Jira logo
- ✅ Кнопка "Connect Jira"
- ✅ Status: "Not connected"

**Для локального тесту можна пропустити integrations.**

---

### Тест 6.7: Repositories Management

**Клікни "Repositories" в sidebar**

**Побачиш:**
- ✅ Список 3 repos (devmetrics-api, devmetrics-frontend, devmetrics-infra)
- ✅ Для кожного repo:
  - Name
  - Language (Python/TypeScript)
  - Last sync timestamp
  - Sync status badge
  - Actions: Sync, Settings, Delete

**Спробуй додати новий repo:**
```bash
1. Клікни "+ Add Repository"
2. Введи: owner/repo (напр. facebook/react)
3. Клікни "Add"
```

**Має:**
- ✅ Repo з'явитись в списку
- ✅ Status: "Pending sync"

**Спробуй sync:**
```bash
1. Клікни "Sync" на новому repo
2. Status має змінитись на "Syncing..."
3. Celery worker обробляє task (чекай 30-60 сек)
4. Status: "Completed" (або "Failed" якщо repo не існує)
```

**Перевір Celery logs:**
```bash
docker compose logs celery_worker --tail=20

# Має показати:
# [tasks.sync_repository] Syncing repository: facebook/react
# [tasks.sync_repository] Fetched 50 commits
# [tasks.sync_repository] Sync completed
```

---

### Тест 6.8: Team Management

**Клікни "Team" в sidebar**

**Побачиш:**
- ✅ Список 4 members (Alice, Bob, Carol, David)
- ✅ Для кожного:
  - Avatar (GitHub avatar)
  - Name
  - Email
  - Role (Owner/Admin/Member)
  - Last active
  - Actions: Edit role, Remove

**Спробуй invite member:**
```bash
1. Клікни "+ Invite Member"
2. Email: test@example.com
3. Role: Member
4. Клікні "Send Invite"
```

**Має:**
- ✅ Toast notification "Invite sent"
- ✅ Member з'явиться в списку зі статусом "Pending"

**Спробуй change role:**
```bash
1. Клікні "Edit" на Bob
2. Змінити role: Member → Admin
3. Save
```

**Має:**
- ✅ Role оновиться
- ✅ Toast "Role updated"

---

### Тест 6.9: Settings

**Клікни "Settings" в sidebar**

**Побачиш 4 секції:**

#### Profile Settings
```bash
1. Змінити Name
2. Змінити Email
3. Upload avatar (опціонально)
4. Клікні "Save Changes"
```

**Має:**
- ✅ Toast "Profile updated"
- ✅ Зміни відображаються в UI

#### Security Settings
```bash
1. Current password
2. New password
3. Confirm password
4. Клікні "Change Password"
```

**Має:**
- ✅ Toast "Password changed"
- ✅ Можна залогінитись з новим паролем

#### Notification Settings
```bash
Toggle switches:
✓ Email notifications
✓ Slack notifications
✓ WebSocket real-time updates
```

**Має:**
- ✅ Settings зберігаються
- ✅ Toast confirmations

#### API Keys
```bash
1. Клікні "Generate New API Key"
2. Скопіювати ключ (показується ОДИН РАЗ!)
```

**Має:**
- ✅ Згенеруватись токен (напр. `dmt_abc123def456...`)
- ✅ Можна використовувати для API calls

---

### Тест 6.10: Real-time Features (WebSocket)

**Перевірка WebSocket notifications:**

#### Setup:
```bash
# 1. Відкрий Dashboard в браузері #1
# 2. Подивись в правий верхній кут - має бути:
#    - 🔔 Bell icon (notifications)
#    - 🟢 "Live" indicator (WebSocket connected)
```

#### Test:
```bash
# 3. Відкрий ДРУГИЙ браузер / incognito window
# 4. Залогінься тим же акаунтом
# 5. В другому вікні йди на Repositories
# 6. Клікні "Sync" на якомусь repo
```

#### Очікується в ПЕРШОМУ вікні:
```bash
✅ Bell icon highlight (новий notification)
✅ Toast notification внизу праворуч:
   "Repository sync started: devmetrics-api"
✅ Після 30-60 сек:
   "Repository sync completed: devmetrics-api"
```

#### Test Live Indicator:
```bash
# Зупини backend services:
docker compose stop auth_service

# В Frontend побачиш:
🔴 "Offline" indicator (WebSocket disconnected)

# Запусти назад:
docker compose start auth_service

# Через 5-10 сек:
🟢 "Live" indicator (reconnected)
```

**📸 Зроби screenshot notifications!**

---

## 🧪 ЕТАП 7: ЗАПУСК AUTOMATED TESTS

### Тест 7.1: Backend Tests

```bash
# Analytics Service (40 ML tests + exports)
docker compose exec analytics_service pytest tests/ -v --cov=app

# Має пройти ~50 tests:
# test_ml_analytics.py::test_velocity_trend_increasing PASSED
# test_ml_analytics.py::test_detect_anomalies_zscore PASSED
# test_exports.py::test_generate_pdf PASSED
# ...
# ============== 50 passed in 15.2s ==============
# Coverage: 78%
```

```bash
# Ingestion Service (14 CRUD + 5 webhooks)
docker compose exec ingestion_service pytest tests/ -v --cov=app

# Має пройти ~19 tests
```

```bash
# AI Service
docker compose exec ai_service pytest tests/ -v --cov=app

# Може не бути тестів (залежить від Week 11 commit)
```

```bash
# Auth Service
docker compose exec auth_service pytest tests/ -v --cov=app
```

### Тест 7.2: Frontend Tests

```bash
# Зайди в frontend директорію
cd frontend

# Встанови dependencies (якщо ще не встановлено)
npm install

# Запусти Vitest
npm run test

# Має пройти ~14 tests:
# ✓ __tests__/utils.test.ts (5 tests)
# ✓ __tests__/auth.test.ts (4 tests)
# ✓ __tests__/ml-api.test.ts (5 tests)
# Test Files  3 passed (3)
# Tests  14 passed (14)
```

```bash
# З coverage
npm run test:coverage

# Має показати coverage report
```

```bash
# Повернись в root
cd ..
```

---

## 📊 ЕТАП 8: PERFORMANCE & MONITORING

### Тест 8.1: Load Testing (опціонально)

```bash
# Встанови Locust
pip3 install locust

# Запусти load test
cd infrastructure/load-tests
locust -f locustfile.py --host=http://localhost:8003

# Відкрий в браузері
# http://localhost:8089

# Налаштування:
# Number of users: 10
# Spawn rate: 1
# Start swarming

# Побачиш:
# - Requests/sec
# - Response times (p50, p95, p99)
# - Failures
# - Charts
```

### Тест 8.2: Monitoring Stack (опціонально)

```bash
# Зупини основні сервіси
docker compose down

# Запусти З monitoring
docker compose \
  -f docker-compose.yml \
  -f infrastructure/monitoring/docker-compose.monitoring.yml \
  up -d

# Зачекай 2-3 хвилини

# Prometheus
open http://localhost:9090

# Спробуй queries:
# - up (статус сервісів)
# - http_requests_total
# - process_cpu_seconds_total

# Grafana
open http://localhost:3001
# Login: admin / admin (або з .env GRAFANA_PASSWORD)

# Подивись дашборди:
# - System Overview
# - Services Performance
# - Database Monitoring
```

---

## ✅ ЕТАП 9: FINAL CHECKLIST

**Пройди по чеклісту що все працює:**

### Infrastructure:
- [ ] 9 Docker контейнерів "Up"
- [ ] PostgreSQL healthy
- [ ] Redis healthy
- [ ] All health endpoints 200 OK
- [ ] Swagger UI відкривається

### Frontend Pages:
- [ ] Login працює (demo + GitHub OAuth)
- [ ] Dashboard показує metrics
- [ ] Analytics charts рендеряться
- [ ] AI Chat відповідає (Groq)
- [ ] ML Insights працює (4 tabs)
- [ ] Reports генеруються (PDF/CSV)
- [ ] Repositories можна додавати/sync
- [ ] Team management працює
- [ ] Settings можна змінювати

### Real-time:
- [ ] WebSocket підключається (green indicator)
- [ ] Notifications приходять (bell icon)
- [ ] Toast notifications працюють

### Tests:
- [ ] Backend tests passed (pytest)
- [ ] Frontend tests passed (vitest)
- [ ] Load tests можна запустити

---

## 🐛 TROUBLESHOOTING

### Якщо AI Chat не працює:

```bash
# Перевір Groq key
docker compose exec ai_service env | grep GROQ_API_KEY

# Перевір логи
docker compose logs ai_service --tail=50

# Тест Groq API напряму (замін YOUR_KEY на свій ключ)
curl https://api.groq.com/openai/v1/chat/completions \
  -H "Authorization: Bearer YOUR_KEY" \
  -H "Content-Type: application/json" \
  -d '{"model":"llama-3.1-70b-versatile","messages":[{"role":"user","content":"test"}]}'
```

### Якщо GitHub OAuth не працює:

```bash
# Перевір callback URL в GitHub OAuth App:
# Має бути: http://localhost:3000/auth/github/callback

# Перевір credentials
docker compose exec auth_service env | grep GITHUB

# Рестарт auth service
docker compose restart auth_service
```

### Якщо Charts не завантажуються:

```bash
# Перевір що є demo дані
docker compose exec auth_service psql -U devmetrics -c "SELECT COUNT(*) FROM commits;"

# Якщо 0 - запусти seed знову
docker compose exec auth_service python /app/scripts/seed_demo.py
```

---

## 📸 ЕТАП 10: СТВОРИТИ SCREENSHOTS

**Для README і ProductHunt:**

1. **Login page** (перше враження)
2. **Dashboard overview** (metrics + chart)
3. **Analytics charts** (4 tabs)
4. **AI Chat conversation** (запит + відповідь Groq)
5. **ML Velocity Trend** (forecast chart)
6. **ML Team Health** (radar chart)
7. **Reports PDF preview**
8. **Repositories list** (з sync status)
9. **Team management**
10. **Real-time notification** (toast message)

**Інструменти:**
- Mac: Cmd+Shift+4
- Windows: Win+Shift+S
- Chrome: F12 → Device Toolbar → Responsive

---

## 🎉 ГОТОВО!

**Якщо пройшов всі тести - ВІТАЮ!** 🎊

**Твій DevMetrics повністю працює локально!**

---

## 📝 ЩО ДАЛІ

1. ✅ **Код протестований** - DONE!
2. 📸 **Зроби screenshots** для README
3. 🎥 **Запиши demo video** (Loom, 5 хвилин)
4. 📝 **Оновити README.md** (додати screenshots)
5. 🚀 **Deploy на production** (Hetzner/DigitalOcean)
6. 🚀 **ProductHunt launch**

---

## 🤝 ПІДТРИМКА

**Якщо виникли проблеми:**
- Перевір логи: `docker compose logs -f`
- Перевір .env файл
- Перезапусти сервіси: `docker compose restart`
- Очисти volumes: `docker compose down -v && docker compose up`

**Готовий допомогти на кожному етапі!** 💪🚀
