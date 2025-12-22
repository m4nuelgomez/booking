# Booking

Booking es un MVP de inbox para negocios de servicios (barberías, salones, etc.), enfocado inicialmente en WhatsApp.

Este proyecto permite recibir mensajes entrantes vía webhook, almacenarlos de forma segura y visualizarlos en un inbox web.

---

## Qué ya funciona

- Recepción de mensajes (simulados) de WhatsApp vía webhook
- Guardado de eventos RAW en base de datos
- Normalización a conversaciones y mensajes
- Prevención de mensajes duplicados
- Visualización de conversaciones y mensajes en un inbox web

---

## Stack

- Next.js (App Router)
- PostgreSQL
- Prisma
- TypeScript

---

## Correr el proyecto en local

1. Instalar dependencias:
```bash
npm install
