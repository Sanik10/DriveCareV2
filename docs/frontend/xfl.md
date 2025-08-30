вот такое могу тебе скинуть, лучше стало?

"/api/v1/orders": {
      "post": {
        "operationId": "OrdersController_create",
        "summary": "Создание нового заказа",
        "description": "Создание заказа в своей компании",
        "parameters": [],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/CreateOrderDto"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OrderResponseDto"
                }
              }
            }
          },
          "400": {
            "description": "❌ Некорректные данные валидации"
          },
          "401": {
            "description": "❌ Требуется авторизация"
          },
          "403": {
            "description": "❌ Недостаточно прав доступа"
          }
        },
        "tags": [
          "📋 Управление заказами"
        ],
        "security": [
          {
            "JWT-auth": []
          }
        ]
      },
      "get": {
        "operationId": "OrdersController_findAll",
        "summary": "Получение списка заказов",
        "description": "С фильтрацией и пагинацией",
        "parameters": [
          {
            "name": "customerId",
            "required": true,
            "in": "query",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "vehicleId",
            "required": true,
            "in": "query",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "status",
            "required": true,
            "in": "query",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "assignedTo",
            "required": true,
            "in": "query",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "search",
            "required": true,
            "in": "query",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/PaginatedOrdersResponseDto"
                }
              }
            }
          },
          "401": {
            "description": "❌ Требуется авторизация"
          }
        },
        "tags": [
          "📋 Управление заказами"
        ],
        "security": [
          {
            "JWT-auth": []
          }
        ]
      }
    },
    "/api/v1/orders/{id}": {
      "get": {
        "operationId": "OrdersController_findOne",
        "summary": "Получение заказа по ID",
        "description": "Детальная информация с связями",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "description": "ID заказа",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OrderResponseDto"
                }
              }
            }
          },
          "404": {
            "description": "❌ Заказ не найден или нет доступа"
          }
        },
        "tags": [
          "📋 Управление заказами"
        ],
        "security": [
          {
            "JWT-auth": []
          }
        ]
      },
      "patch": {
        "operationId": "OrdersController_update",
        "summary": "Обновление заказа",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "description": "ID заказа",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateOrderDto"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OrderResponseDto"
                }
              }
            }
          }
        },
        "tags": [
          "📋 Управление заказами"
        ],
        "security": [
          {
            "JWT-auth": []
          }
        ]
      },
      "delete": {
        "operationId": "OrdersController_cancelOrder",
        "summary": "Отмена заказа (soft)",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "description": "ID заказа",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "204": {
            "description": ""
          }
        },
        "tags": [
          "📋 Управление заказами"
        ],
        "security": [
          {
            "JWT-auth": []
          }
        ]
      }
    },
    "/api/v1/orders/{id}/status": {
      "patch": {
        "operationId": "OrdersController_updateStatus",
        "summary": "Изменение статуса заказа",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "description": "ID заказа",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "status",
            "required": true,
            "in": "query",
            "description": "Новый статус заказа",
            "schema": {
              "enum": [
                "new",
                "in_progress",
                "awaiting_parts",
                "completed",
                "canceled"
              ],
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OrderResponseDto"
                }
              }
            }
          }
        },
        "tags": [
          "📋 Управление заказами"
        ],
        "security": [
          {
            "JWT-auth": []
          }
        ]
      }
    },
    "/api/v1/orders/{id}/assign": {
      "patch": {
        "operationId": "OrdersController_assignMechanic",
        "summary": "Назначение исполнителя заказа",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "description": "ID заказа",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "mechanicId",
            "required": true,
            "in": "query",
            "description": "ID механика",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OrderResponseDto"
                }
              }
            }
          }
        },
        "tags": [
          "📋 Управление заказами"
        ],
        "security": [
          {
            "JWT-auth": []
          }
        ]
      }
    },
    "/api/v1/orders/{id}/recalculate": {
      "patch": {
        "operationId": "OrdersController_recalculateOrderTotals",
        "summary": "Пересчет финансов заказа",
        "parameters": [
          {
            "name": "id",
            "required": true,
            "in": "path",
            "description": "ID заказа",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OrderResponseDto"
                }
              }
            }
          }
        },
        "tags": [
          "📋 Управление заказами"
        ],
        "security": [
          {
            "JWT-auth": []
          }
        ]
      }
    },
    "/api/v1/orders/{orderId}/services": {
      "post": {
        "operationId": "OrderServicesController_addServiceToOrder",
        "summary": "Добавление услуги в заказ",
        "description": "Добавление новой услуги в заказ с автоматическим расчетом стоимости.",
        "parameters": [
          {
            "name": "orderId",
            "required": true,
            "in": "path",
            "description": "ID заказа",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/AddServiceToOrderDto"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OrderServiceResponseDto"
                }
              }
            }
          },
          "400": {
            "description": "❌ Некорректные данные или услуга уже добавлена"
          },
          "401": {
            "description": "❌ Требуется авторизация"
          },
          "403": {
            "description": "❌ Недостаточно прав или нет доступа к заказу"
          },
          "404": {
            "description": "❌ Заказ или услуга не найдены"
          }
        },
        "tags": [
          "🔧 Управление услугами в заказах"
        ],
        "security": [
          {
            "JWT-auth": []
          }
        ]
      },
      "get": {
        "operationId": "OrderServicesController_getOrderServices",
        "summary": "Получение списка услуг заказа",
        "description": "Получение всех услуг заказа с информацией о выполнении и стоимости.",
        "parameters": [
          {
            "name": "orderId",
            "required": true,
            "in": "path",
            "description": "ID заказа",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OrderServicesListResponseDto"
                }
              }
            }
          },
          "401": {
            "description": "❌ Требуется авторизация"
          },
          "403": {
            "description": "❌ Нет доступа к заказу"
          },
          "404": {
            "description": "❌ Заказ не найден"
          }
        },
        "tags": [
          "🔧 Управление услугами в заказах"
        ],
        "security": [
          {
            "JWT-auth": []
          }
        ]
      }
    },
    "/api/v1/orders/{orderId}/services/{serviceId}": {
      "patch": {
        "operationId": "OrderServicesController_updateOrderService",
        "summary": "Обновление услуги в заказе",
        "parameters": [
          {
            "name": "orderId",
            "required": true,
            "in": "path",
            "description": "ID заказа",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "serviceId",
            "required": true,
            "in": "path",
            "description": "ID услуги в заказе",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateOrderServiceDto"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OrderServiceResponseDto"
                }
              }
            }
          },
          "400": {
            "description": "❌ Некорректные данные"
          },
          "401": {
            "description": "❌ Требуется авторизация"
          },
          "403": {
            "description": "❌ Недостаточно прав или нет доступа"
          },
          "404": {
            "description": "❌ Услуга не найдена"
          }
        },
        "tags": [
          "🔧 Управление услугами в заказах"
        ],
        "security": [
          {
            "JWT-auth": []
          }
        ]
      },
      "delete": {
        "operationId": "OrderServicesController_removeServiceFromOrder",
        "summary": "Удаление услуги из заказа",
        "parameters": [
          {
            "name": "orderId",
            "required": true,
            "in": "path",
            "description": "ID заказа",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "serviceId",
            "required": true,
            "in": "path",
            "description": "ID услуги в заказе",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "204": {
            "description": ""
          },
          "401": {
            "description": "❌ Требуется авторизация"
          },
          "403": {
            "description": "❌ Недостаточно прав или нет доступа"
          },
          "404": {
            "description": "❌ Услуга не найдена"
          }
        },
        "tags": [
          "🔧 Управление услугами в заказах"
        ],
        "security": [
          {
            "JWT-auth": []
          }
        ]
      }
    },
    "/api/v1/orders/{orderId}/services/{serviceId}/status": {
      "patch": {
        "operationId": "OrderServicesController_updateServiceStatus",
        "summary": "Изменение статуса выполнения услуги",
        "parameters": [
          {
            "name": "orderId",
            "required": true,
            "in": "path",
            "description": "ID заказа",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "serviceId",
            "required": true,
            "in": "path",
            "description": "ID услуги в заказе",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "properties": {
                  "status": {
                    "enum": [
                      "planned",
                      "in_progress",
                      "completed"
                    ]
                  }
                }
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OrderServiceResponseDto"
                }
              }
            }
          }
        },
        "tags": [
          "🔧 Управление услугами в заказах"
        ],
        "security": [
          {
            "JWT-auth": []
          }
        ]
      }
    },
    "/api/v1/orders/{orderId}/services/{serviceId}/mechanic": {
      "patch": {
        "operationId": "OrderServicesController_assignMechanicToService",
        "summary": "Назначение механика на услугу",
        "parameters": [
          {
            "name": "orderId",
            "required": true,
            "in": "path",
            "description": "ID заказа",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "serviceId",
            "required": true,
            "in": "path",
            "description": "ID услуги в заказе",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OrderServiceResponseDto"
                }
              }
            }
          }
        },
        "tags": [
          "🔧 Управление услугами в заказах"
        ],
        "security": [
          {
            "JWT-auth": []
          }
        ]
      }
    },
    "/api/v1/orders/{orderId}/services/{serviceId}/start": {
      "patch": {
        "operationId": "OrderServicesController_startService",
        "summary": "Начать выполнение услуги",
        "parameters": [
          {
            "name": "orderId",
            "required": true,
            "in": "path",
            "description": "ID заказа",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "serviceId",
            "required": true,
            "in": "path",
            "description": "ID услуги в заказе",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OrderServiceResponseDto"
                }
              }
            }
          }
        },
        "tags": [
          "🔧 Управление услугами в заказах"
        ],
        "security": [
          {
            "JWT-auth": []
          }
        ]
      }
    },
    "/api/v1/orders/{orderId}/services/{serviceId}/complete": {
      "patch": {
        "operationId": "OrderServicesController_completeService",
        "summary": "Завершить выполнение услуги",
        "parameters": [
          {
            "name": "orderId",
            "required": true,
            "in": "path",
            "description": "ID заказа",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "serviceId",
            "required": true,
            "in": "path",
            "description": "ID услуги в заказе",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OrderServiceResponseDto"
                }
              }
            }
          }
        },
        "tags": [
          "🔧 Управление услугами в заказах"
        ],
        "security": [
          {
            "JWT-auth": []
          }
        ]
      }
    },
    "/api/v1/orders/{orderId}/parts": {
      "post": {
        "operationId": "OrderPartsController_addPartToOrder",
        "summary": "Добавление запчасти в заказ",
        "description": "Добавление новой запчасти в заказ с проверкой остатков и расчетом стоимости.",
        "parameters": [
          {
            "name": "orderId",
            "required": true,
            "in": "path",
            "description": "ID заказа",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/AddPartToOrderDto"
              }
            }
          }
        },
        "responses": {
          "201": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OrderPartResponseDto"
                }
              }
            }
          },
          "400": {
            "description": "❌ Некорректные данные или недостаточно запчастей на складе"
          },
          "401": {
            "description": "❌ Требуется авторизация"
          },
          "403": {
            "description": "❌ Недостаточно прав или нет доступа к заказу"
          },
          "404": {
            "description": "❌ Заказ или запчасть не найдены"
          }
        },
        "tags": [
          "🔧 Управление запчастями в заказах"
        ],
        "security": [
          {
            "JWT-auth": []
          }
        ]
      },
      "get": {
        "operationId": "OrderPartsController_getOrderParts",
        "summary": "Получение списка запчастей заказа",
        "description": "Все запчасти в заказе с информацией о наличии и стоимости.",
        "parameters": [
          {
            "name": "orderId",
            "required": true,
            "in": "path",
            "description": "ID заказа",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OrderPartsListResponseDto"
                }
              }
            }
          },
          "401": {
            "description": "❌ Требуется авторизация"
          },
          "403": {
            "description": "❌ Нет доступа к заказу"
          },
          "404": {
            "description": "❌ Заказ не найден"
          }
        },
        "tags": [
          "🔧 Управление запчастями в заказах"
        ],
        "security": [
          {
            "JWT-auth": []
          }
        ]
      }
    },
    "/api/v1/orders/{orderId}/parts/{partId}": {
      "patch": {
        "operationId": "OrderPartsController_updateOrderPart",
        "summary": "Обновление запчасти в заказе",
        "description": "Изменение количества/цены/скидки. Автоматический пересчет.",
        "parameters": [
          {
            "name": "orderId",
            "required": true,
            "in": "path",
            "description": "ID заказа",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "partId",
            "required": true,
            "in": "path",
            "description": "ID запчасти в заказе",
            "schema": {
              "type": "string"
            }
          }
        ],
        "requestBody": {
          "required": true,
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/UpdateOrderPartDto"
              }
            }
          }
        },
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OrderPartResponseDto"
                }
              }
            }
          },
          "400": {
            "description": "❌ Некорректные данные или недостаточно запчастей на складе"
          },
          "401": {
            "description": "❌ Требуется авторизация"
          },
          "403": {
            "description": "❌ Недостаточно прав или нет доступа"
          },
          "404": {
            "description": "❌ Запчасть в заказе не найдена"
          }
        },
        "tags": [
          "🔧 Управление запчастями в заказах"
        ],
        "security": [
          {
            "JWT-auth": []
          }
        ]
      },
      "delete": {
        "operationId": "OrderPartsController_removePartFromOrder",
        "summary": "Удаление запчасти из заказа",
        "description": "Освобождение резерва и пересчет общей стоимости.",
        "parameters": [
          {
            "name": "orderId",
            "required": true,
            "in": "path",
            "description": "ID заказа",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "partId",
            "required": true,
            "in": "path",
            "description": "ID запчасти в заказе",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "204": {
            "description": ""
          },
          "401": {
            "description": "❌ Требуется авторизация"
          },
          "403": {
            "description": "❌ Недостаточно прав или нет доступа"
          },
          "404": {
            "description": "❌ Запчасть в заказе не найдена"
          }
        },
        "tags": [
          "🔧 Управление запчастями в заказах"
        ],
        "security": [
          {
            "JWT-auth": []
          }
        ]
      }
    },
    "/api/v1/orders/{orderId}/parts/{partId}/customer-provided": {
      "patch": {
        "operationId": "OrderPartsController_toggleCustomerProvided",
        "summary": "Переключение типа запчасти",
        "description": "Переключение между запчастью клиента и нашей запчастью. Влияет на цену и резерв.",
        "parameters": [
          {
            "name": "orderId",
            "required": true,
            "in": "path",
            "description": "ID заказа",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "partId",
            "required": true,
            "in": "path",
            "description": "ID запчасти в заказе",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/OrderPartResponseDto"
                }
              }
            }
          }
        },
        "tags": [
          "🔧 Управление запчастями в заказах"
        ],
        "security": [
          {
            "JWT-auth": []
          }
        ]
      }
    },
    "/api/v1/orders/{orderId}/parts/{partId}/availability": {
      "get": {
        "operationId": "OrderPartsController_checkPartAvailability",
        "summary": "Проверка наличия запчасти",
        "description": "Проверка текущего наличия запчасти на складе и возможности добавления в заказ.",
        "parameters": [
          {
            "name": "orderId",
            "required": true,
            "in": "path",
            "description": "ID заказа",
            "schema": {
              "type": "string"
            }
          },
          {
            "name": "partId",
            "required": true,
            "in": "path",
            "description": "ID запчасти (каталог)",
            "schema": {
              "type": "string"
            }
          }
        ],
        "responses": {
          "200": {
            "description": "",
            "content": {
              "application/json": {
                "schema": {
                  "properties": {
                    "partId": {
                      "type": "string"
                    },
                    "available": {
                      "type": "number"
                    },
                    "reserved": {
                      "type": "number"
                    },
                    "canAddToOrder": {
                      "type": "boolean"
                    },
                    "maxQuantity": {
                      "type": "number"
                    }
                  }
                }
              }
            }
          }
        },
        "tags": [
          "🔧 Управление запчастями в заказах"
        ],
        "security": [
          {
            "JWT-auth": []
          }
        ]
      }
    },




























// src/modules/orders/dto/request/create-order.dto.ts
import { IsString, IsUUID, IsOptional, IsEnum, IsInt, IsPositive, IsDateString, IsNumber, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { OrderStatus } from '../../types/orders.types';

export class CreateOrderDto {
  @ApiPropertyOptional({ 
    description: 'ID компании (автоматически устанавливается из токена)', 
    example: '123e4567-e89b-12d3-a456-426614174000' 
  })
  @IsUUID()
  @IsOptional()
  companyId?: string;

  @ApiProperty({ 
    description: 'ID клиента', 
    example: '123e4567-e89b-12d3-a456-426614174001' 
  })
  @IsUUID()
  customerId: string;

  @ApiProperty({ 
    description: 'ID автомобиля', 
    example: '123e4567-e89b-12d3-a456-426614174002' 
  })
  @IsUUID()
  vehicleId: string;

  @ApiPropertyOptional({ 
    description: 'Статус заказа', 
    enum: OrderStatus, 
    default: OrderStatus.NEW,
    example: OrderStatus.NEW
  })
  @IsEnum(OrderStatus)
  @IsOptional()
  status?: OrderStatus;

  @ApiPropertyOptional({ 
    description: 'ID создателя заказа (автоматически устанавливается)', 
    example: '123e4567-e89b-12d3-a456-426614174003' 
  })
  @IsUUID()
  @IsOptional()
  createdBy?: string;

  @ApiPropertyOptional({ 
    description: 'ID исполнителя', 
    example: '123e4567-e89b-12d3-a456-426614174004' 
  })
  @IsUUID()
  @IsOptional()
  assignedTo?: string;

  @ApiPropertyOptional({ 
    description: 'Описание заказа', 
    example: 'Плановое техническое обслуживание' 
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({ 
    description: 'Жалобы клиента', 
    example: 'Шум при торможении, вибрация руля' 
  })
  @IsString()
  @IsOptional()
  customerComplaints?: string;

  @ApiPropertyOptional({ 
    description: 'Пробег автомобиля на момент создания заказа', 
    example: 15000 
  })
  @IsInt()
  @IsPositive()
  @IsOptional()
  @Type(() => Number)
  mileage?: number;

  @ApiPropertyOptional({ 
    description: 'Планируемое время завершения', 
    example: '2025-01-01T14:00:00Z' 
  })
  @IsDateString()
  @IsOptional()
  estimatedCompletionTime?: string;

  @ApiPropertyOptional({ 
    description: 'Сумма скидки', 
    example: 500,
    minimum: 0
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0)
  @IsOptional()
  @Type(() => Number)
  discountAmount?: number;
}

// src/modules/orders/dto/request/update-order.dto.ts
import { PartialType, OmitType } from '@nestjs/swagger';
import { IsOptional, IsDateString, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateOrderDto } from './create-order.dto';

export class UpdateOrderDto extends PartialType(
  OmitType(CreateOrderDto, ['companyId', 'createdBy'] as const)
) {
  @ApiPropertyOptional({ 
    description: 'Результаты диагностики', 
    example: 'Износ тормозных колодок передней оси, замена рекомендуется' 
  })
  @IsString()
  @IsOptional()
  diagnosticResults?: string;

  @ApiPropertyOptional({ 
    description: 'Фактическое время завершения', 
    example: '2025-01-01T15:30:00Z' 
  })
  @IsDateString()
  @IsOptional()
  actualCompletionTime?: string;

  @ApiPropertyOptional({ 
    description: 'ID пользователя, вносящего изменения (для аудита)' 
  })
  @IsOptional()
  updatedBy?: string;
}

// src/modules/orders/dto/response/order-part-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class PartInfo {
  @ApiProperty({ description: 'ID запчасти' })
  id: string;

  @ApiProperty({ description: 'Название запчасти' })
  name: string;

  @ApiPropertyOptional({ description: 'Номер запчасти' })
  partNumber?: string;

  @ApiPropertyOptional({ description: 'Бренд' })
  brand?: string;

  @ApiPropertyOptional({ description: 'Описание' })
  description?: string;
}

export class OrderPartResponseDto {
  @ApiProperty({ description: 'ID записи запчасти в заказе' })
  id: string;

  @ApiProperty({ description: 'ID заказа' })
  orderId: string;

  @ApiProperty({ description: 'ID запчасти' })
  partId: string;

  @ApiProperty({ description: 'Цена запчасти для данного заказа' })
  price: number;

  @ApiProperty({ description: 'Количество' })
  quantity: number;

  @ApiProperty({ description: 'Процент скидки' })
  discountPercent: number;

  @ApiProperty({ description: 'Общая сумма с учетом количества и скидки' })
  totalAmount: number;

  @ApiProperty({ description: 'Предоставлена ли запчасть клиентом' })
  isCustomerProvided: boolean;

  @ApiProperty({ description: 'Дата создания записи' })
  createdAt: Date;

  @ApiProperty({ description: 'Дата обновления записи' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Информация о запчасти' })
  part?: PartInfo;
}

// src/modules/orders/dto/response/order-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '../../types/orders.types';

// Вложенные типы для связанных данных
class CustomerInfo {
  @ApiProperty({ description: 'ID клиента' })
  id: string;

  @ApiPropertyOptional({ description: 'Имя клиента' })
  firstName?: string;

  @ApiPropertyOptional({ description: 'Фамилия клиента' })
  lastName?: string;

  @ApiPropertyOptional({ description: 'Название компании' })
  companyName?: string;

  @ApiProperty({ description: 'Email клиента' })
  email: string;

  @ApiProperty({ description: 'Телефон клиента' })
  phone: string;

  @ApiProperty({ description: 'Тип клиента', enum: ['individual', 'company'] })
  type: string;
}

class VehicleBrandInfo {
  @ApiProperty({ description: 'ID бренда' })
  id: string;

  @ApiProperty({ description: 'Название бренда' })
  name: string;
}

class VehicleModelInfo {
  @ApiProperty({ description: 'ID модели' })
  id: string;

  @ApiProperty({ description: 'Название модели' })
  name: string;

  @ApiPropertyOptional({ description: 'Информация о бренде' })
  brand?: VehicleBrandInfo;
}

class VehicleInfo {
  @ApiProperty({ description: 'ID автомобиля' })
  id: string;

  @ApiPropertyOptional({ description: 'VIN номер' })
  vin?: string;

  @ApiPropertyOptional({ description: 'Госномер' })
  licensePlate?: string;

  @ApiPropertyOptional({ description: 'Год выпуска' })
  year?: number;

  @ApiPropertyOptional({ description: 'Цвет' })
  color?: string;

  @ApiPropertyOptional({ description: 'Пробег' })
  mileage?: number;

  @ApiPropertyOptional({ description: 'Информация о модели' })
  model?: VehicleModelInfo;
}

class UserInfo {
  @ApiProperty({ description: 'ID пользователя' })
  id: string;

  @ApiProperty({ description: 'Имя' })
  firstName: string;

  @ApiProperty({ description: 'Фамилия' })
  lastName: string;

  @ApiPropertyOptional({ description: 'Email (для создателя)' })
  email?: string;

  @ApiPropertyOptional({ description: 'Специализация (для механика)' })
  specialization?: string;
}

export class OrderResponseDto {
  @ApiProperty({ description: 'Уникальный идентификатор' })
  id: string;

  @ApiProperty({ description: 'ID компании' })
  companyId: string;

  @ApiProperty({ description: 'ID клиента' })
  customerId: string;

  @ApiProperty({ description: 'ID автомобиля' })
  vehicleId: string;

  @ApiProperty({ description: 'Номер заказ-наряда', example: 'ORD-2025-00001' })
  orderNumber: string;

  @ApiProperty({ description: 'Статус заказа', enum: OrderStatus })
  status: OrderStatus;

  @ApiProperty({ description: 'ID создателя заказа' })
  createdBy: string;

  @ApiPropertyOptional({ description: 'ID исполнителя' })
  assignedTo?: string;

  @ApiPropertyOptional({ description: 'Описание заказа' })
  description?: string;

  @ApiPropertyOptional({ description: 'Жалобы клиента' })
  customerComplaints?: string;

  @ApiPropertyOptional({ description: 'Результаты диагностики' })
  diagnosticResults?: string;

  @ApiProperty({ description: 'Общая сумма', example: 15000 })
  totalAmount: number;

  @ApiProperty({ description: 'Сумма скидки', example: 750 })
  discountAmount: number;

  @ApiProperty({ description: 'Сумма налога', example: 2850 })
  taxAmount: number;

  @ApiProperty({ description: 'Итоговая сумма к оплате', example: 17100 })
  finalAmount: number;

  @ApiPropertyOptional({ description: 'Пробег автомобиля' })
  mileage?: number;

  @ApiPropertyOptional({ description: 'Планируемое время завершения' })
  estimatedCompletionTime?: Date;

  @ApiPropertyOptional({ description: 'Фактическое время завершения' })
  actualCompletionTime?: Date;

  @ApiProperty({ description: 'Дата создания' })
  createdAt: Date;

  @ApiProperty({ description: 'Дата обновления' })
  updatedAt: Date;

  // 🔗 Связанная информация
  @ApiPropertyOptional({ description: 'Информация о клиенте' })
  customer?: CustomerInfo;

  @ApiPropertyOptional({ description: 'Информация об автомобиле' })
  vehicle?: VehicleInfo;

  @ApiPropertyOptional({ description: 'Информация о создателе' })
  createdByUser?: UserInfo;

  @ApiPropertyOptional({ description: 'Информация об исполнителе' })
  assignedToUser?: UserInfo;

  @ApiPropertyOptional({ description: 'Услуги в заказе', type: [Object] })
  orderServices?: any[]; // OrderServiceResponseDto[]

  @ApiPropertyOptional({ description: 'Запчасти в заказе', type: [Object] })
  orderParts?: any[]; // OrderPartResponseDto[]

  // 📊 Вычисляемые поля
  @ApiProperty({ description: 'Читаемый статус', example: 'В работе' })
  displayStatus: string;

  @ApiProperty({ description: 'Просрочен ли заказ' })
  isOverdue: boolean;

  @ApiProperty({ description: 'Процент выполнения', example: 50 })
  progressPercentage: number;

  @ApiPropertyOptional({ description: 'Предполагаемая длительность в часах' })
  estimatedDuration?: number;
}

// src/modules/orders/dto/response/order-service-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class ServiceInfo {
  @ApiProperty({ description: 'ID услуги' })
  id: string;

  @ApiProperty({ description: 'Название услуги' })
  name: string;

  @ApiPropertyOptional({ description: 'Описание услуги' })
  description?: string;

  @ApiProperty({ description: 'Базовая цена услуги' })
  price: number;

  @ApiProperty({ description: 'Длительность в минутах' })
  durationMinutes: number;
}

export class OrderServiceResponseDto {
  @ApiProperty({ description: 'ID записи услуги в заказе' })
  id: string;

  @ApiProperty({ description: 'ID заказа' })
  orderId: string;

  @ApiProperty({ description: 'ID услуги' })
  serviceId: string;

  @ApiProperty({ description: 'Цена услуги для данного заказа' })
  price: number;

  @ApiProperty({ description: 'Количество', example: 1 })
  quantity: number;

  @ApiProperty({ description: 'Процент скидки', example: 5.5 })
  discountPercent: number;

  @ApiProperty({ description: 'Общая сумма с учетом количества и скидки' })
  totalAmount: number;

  @ApiProperty({ description: 'Статус выполнения услуги', enum: ['planned', 'in_progress', 'completed'] })
  status: string;

  @ApiPropertyOptional({ description: 'ID механика, выполняющего услугу' })
  mechanicId?: string;

  @ApiPropertyOptional({ description: 'Время начала выполнения' })
  startTime?: Date;

  @ApiPropertyOptional({ description: 'Время завершения выполнения' })
  endTime?: Date;

  @ApiPropertyOptional({ description: 'Заметки по выполнению услуги' })
  notes?: string;

  @ApiProperty({ description: 'Дата создания записи' })
  createdAt: Date;

  @ApiProperty({ description: 'Дата обновления записи' })
  updatedAt: Date;

  @ApiPropertyOptional({ description: 'Информация об услуге' })
  service?: ServiceInfo;
}

// src/modules/orders/dto/response/paginated-orders-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';
import { OrderResponseDto } from './order-response.dto';

export class PaginatedOrdersResponseDto {
  @ApiProperty({ 
    description: 'Список заказов', 
    type: [OrderResponseDto] 
  })
  items: OrderResponseDto[];

  @ApiProperty({ 
    description: 'Общее количество заказов', 
    example: 150 
  })
  total: number;

  @ApiProperty({ 
    description: 'Номер текущей страницы', 
    example: 1 
  })
  page: number;

  @ApiProperty({ 
    description: 'Количество элементов на странице', 
    example: 20 
  })
  limit: number;

  @ApiProperty({ 
    description: 'Общее количество страниц', 
    example: 8 
  })
  totalPages: number;
}
