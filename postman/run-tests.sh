#!/bin/bash

# Скрипт для запуска тестов через Newman

echo "Запуск тестов Order System..."
echo "================================"

newman run order-system.postman_collection.json \
  --reporters cli \
  --reporter-cli-no-assertions \
  --reporter-cli-no-console \
  --color on \
  --delay-request 2000

echo ""
echo "================================"
echo "Тесты завершены"
