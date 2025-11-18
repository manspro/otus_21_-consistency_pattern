# Система заказов с биллингом и нотификациями

Домашнее задание OTUS "Highload Architect" - Stream Processing

## Описание

Микросервисная система обработки заказов:
- **User Service** - управление пользователями
- **Billing Service** - управление счетами
- **Order Service** - обработка заказов
- **Notification Service** - уведомления (сохранение в БД)
- **RabbitMQ** - брокер сообщений
- **PostgreSQL** - база данных

## Архитектура

Выбран **гибридный подход**:
- Синхронное HTTP взаимодействие: Order ↔ Billing
- Асинхронное событийное: Order → RabbitMQ → Notification

**Подробное описание:** [docs/architecture.md](docs/architecture.md)

## Идемпотентность

Реализован паттерн **Idempotency Key** для создания заказов:
- Клиент передает уникальный ключ в заголовке `Idempotency-Key`
- Повторные запросы с тем же ключом возвращают закешированный результат
- Защита от дублирования операций при сетевых сбоях
- TTL записей: 24 часа

## Установка

### Требования
- Kubernetes (minikube)
- kubectl, helm 3.x, Docker

### Команды установки

```bash
# 1. Сборка образа (для minikube)
eval $(minikube docker-env)
docker build -t order-system:latest .

# 2. Установка в namespace default
helm install order-system ./helm -n default

# 3. Настройка hosts
echo "$(minikube ip) arch.homework" | sudo tee -a /etc/hosts

# 4. Проверка
kubectl get pods -n default
curl http://arch.homework/
```

### Удаление

```bash
helm uninstall order-system -n default
```

## Тестирование

### Postman коллекция

Файл: `postman/order-system.postman_collection.json`

**Настройки:**
- `{{baseUrl}}` = `http://arch.homework`
- Автосохранение userId
- Задержка для асинхронных событий

### Запуск через Newman

```bash
npm install -g newman
newman run postman/order-system.postman_collection.json \
  --delay-request 2000 \
  --reporters cli
```

### Сценарий тестов

**Базовые тесты:**
1. ✅ Создать пользователя → проверить аккаунт в биллинге
2. ✅ Пополнить счет (1000 руб)
3. ✅ Заказ на 500 руб → проверить списание
4. ✅ Проверить баланс (500 руб)
5. ✅ Проверить уведомление об успехе
6. ✅ Заказ на 1000 руб → ошибка (недостаточно средств)
7. ✅ Проверить баланс не изменился (500 руб)
8. ✅ Проверить уведомление о неудаче

**Тесты идемпотентности:**
9. ✅ Создать заказ с Idempotency-Key
10. ✅ Повторить запрос → получить тот же результат из кеша
11. ✅ Проверить баланс списан только один раз

## API

### User Service
```bash
POST /users
{
  "name": "Test User",
  "email": "test@example.com"
}
```

### Billing Service
```bash
POST /billing/deposit
{
  "userId": "uuid",
  "amount": 1000
}

GET /billing/balance/:userId
```

### Order Service
```bash
POST /orders
Headers:
  Idempotency-Key: <unique-uuid>
Body:
{
  "userId": "uuid",
  "email": "test@example.com",
  "price": 500
}
```

### Notification Service
```bash
GET /notifications/:userId
```

## Локальная разработка

```bash
# Запуск БД и RabbitMQ
docker-compose up -d

# Установка зависимостей
npm install

# Запуск приложения
npm run start:dev
```

## Структура

```
.
├── src/                    # Исходный код
│   ├── user/              # User Service
│   ├── billing/           # Billing Service
│   ├── order/             # Order Service
│   ├── notification/      # Notification Service
│   └── common/rabbitmq/   # RabbitMQ
├── helm/                  # Kubernetes манифесты
├── docs/                  # Документация
│   └── architecture.md    # Теория + диаграммы
├── postman/               # Тесты
└── README.md
```

## Технологии

- NestJS (TypeScript)
- PostgreSQL
- RabbitMQ
- TypeORM
- Kubernetes + Helm

## Отладка

```bash
# Логи
kubectl logs -n default -l app=order-system

# Статус
kubectl get all -n default

# Проброс портов
kubectl port-forward -n default svc/order-system-service 8000:8000
```
