# Архитектура системы заказов

## Описание сервисов

### Order Service
- Управление заказами
- Координация процесса создания заказа
- API для создания и получения заказов

### Billing Service
- Управление счетами пользователей
- Операции пополнения и списания средств
- Проверка баланса

### Notification Service
- Отправка уведомлений (сохранение в БД)
- API для получения списка уведомлений

## Варианты взаимодействия

### 1. HTTP взаимодействие (синхронное)

```
sequenceDiagram
    participant Client
    participant OrderService
    participant BillingService
    participant NotificationService
    
    Client->>OrderService: POST /orders {userId, price}
    OrderService->>BillingService: POST /billing/withdraw {userId, amount}
    alt Успешное списание
        BillingService-->>OrderService: 200 OK {success: true}
        OrderService->>NotificationService: POST /notifications {userId, type: success}
        NotificationService-->>OrderService: 200 OK
        OrderService-->>Client: 201 Created {orderId, status: completed}
    else Недостаточно средств
        BillingService-->>OrderService: 400 Bad Request {success: false}
        OrderService->>NotificationService: POST /notifications {userId, type: failure}
        NotificationService-->>OrderService: 200 OK
        OrderService-->>Client: 400 Bad Request {status: failed}
    end
```

**API (OpenAPI/REST):**
- `POST /users` - создание пользователя
- `POST /billing/accounts` - создание счета
- `POST /billing/deposit` - пополнение счета
- `POST /billing/withdraw` - списание средств
- `GET /billing/balance/{userId}` - получение баланса
- `POST /orders` - создание заказа
- `GET /notifications/{userId}` - получение уведомлений

**Преимущества:**
- Простота реализации
- Немедленная обратная связь
- Легкость отладки

**Недостатки:**
- Сильная связанность сервисов
- Синхронная блокировка
- Сложность обработки сбоев

### 2. Событийное взаимодействие для нотификаций

```
sequenceDiagram
    participant Client
    participant OrderService
    participant BillingService
    participant MessageBroker
    participant NotificationService
    
    Client->>OrderService: POST /orders {userId, price}
    OrderService->>BillingService: POST /billing/withdraw {userId, amount}
    alt Успешное списание
        BillingService-->>OrderService: 200 OK {success: true}
        OrderService->>MessageBroker: Publish OrderCompleted event
        OrderService-->>Client: 201 Created {orderId, status: completed}
        MessageBroker->>NotificationService: OrderCompleted event
        NotificationService->>NotificationService: Save notification
    else Недостаточно средств
        BillingService-->>OrderService: 400 Bad Request {success: false}
        OrderService->>MessageBroker: Publish OrderFailed event
        OrderService-->>Client: 400 Bad Request {status: failed}
        MessageBroker->>NotificationService: OrderFailed event
        NotificationService->>NotificationService: Save notification
    end
```

**Events:**
- `OrderCompleted` - {orderId, userId, amount, timestamp}
- `OrderFailed` - {orderId, userId, amount, reason, timestamp}

**Преимущества:**
- Асинхронная обработка нотификаций
- Слабая связанность для уведомлений
- Возможность добавления новых подписчиков

**Недостатки:**
- Billing все еще синхронный
- Усложнение инфраструктуры

### 3. Event Collaboration (полностью событийное)

```
sequenceDiagram
    participant Client
    participant OrderService
    participant MessageBroker
    participant BillingService
    participant NotificationService
    
    Client->>OrderService: POST /orders {userId, price}
    OrderService->>OrderService: Create order (status: pending)
    OrderService->>MessageBroker: Publish OrderCreated event
    OrderService-->>Client: 202 Accepted {orderId, status: pending}
    
    MessageBroker->>BillingService: OrderCreated event
    BillingService->>BillingService: Try withdraw
    alt Успешное списание
        BillingService->>MessageBroker: Publish PaymentCompleted event
        MessageBroker->>OrderService: PaymentCompleted event
        OrderService->>OrderService: Update order (status: completed)
        MessageBroker->>NotificationService: PaymentCompleted event
        NotificationService->>NotificationService: Save success notification
    else Недостаточно средств
        BillingService->>MessageBroker: Publish PaymentFailed event
        MessageBroker->>OrderService: PaymentFailed event
        OrderService->>OrderService: Update order (status: failed)
        MessageBroker->>NotificationService: PaymentFailed event
        NotificationService->>NotificationService: Save failure notification
    end
```

**Events:**
- `OrderCreated` - {orderId, userId, amount, timestamp}
- `PaymentCompleted` - {orderId, userId, amount, timestamp}
- `PaymentFailed` - {orderId, userId, amount, reason, timestamp}

**Преимущества:**
- Полная асинхронность
- Слабая связанность всех сервисов
- Высокая масштабируемость
- Устойчивость к сбоям

**Недостатки:**
- Eventual consistency
- Сложность отладки
- Необходимость отслеживания статуса заказа

### 4. Рекомендуемый вариант: Гибридный подход

**Для данной задачи рекомендую вариант #2 (Событийное взаимодействие для нотификаций)**

**Обоснование:**
1. **Простота**: Упрощенная модель без падений сервисов не требует полной асинхронности
2. **Производительность**: Нотификации не должны блокировать создание заказа
3. **Консистентность**: Синхронная работа с Billing обеспечивает немедленную проверку средств
4. **Баланс**: Оптимальное соотношение сложности и надежности

## Схема взаимодействия (выбранный вариант)

```
┌─────────┐
│ Client  │
└────┬────┘
     │
     │ HTTP
     ▼
┌─────────────────┐
│  Order Service  │
│  (NestJS)       │
└────┬────┬───────┘
     │    │
     │    │ Publish Events
     │    ▼
     │  ┌──────────────┐
     │  │ RabbitMQ     │
     │  │ (Message     │
     │  │  Broker)     │
     │  └──────┬───────┘
     │         │
     │         │ Subscribe
     │         ▼
     │  ┌──────────────────┐
     │  │  Notification    │
     │  │  Service         │
     │  │  (NestJS)        │
     │  └──────────────────┘
     │
     │ HTTP
     ▼
┌──────────────────┐
│ Billing Service  │
│ (NestJS)         │
└──────────────────┘
```

## База данных

Каждый сервис имеет свою PostgreSQL базу данных:
- `order_db` - заказы
- `billing_db` - счета и транзакции
- `notification_db` - уведомления
