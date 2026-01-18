# Multi-Tenant Event Booking System

## Overview

This project is a prototype multi-tenant event booking system built as part of an internship assignment for **Texas Sparks Constructions**.

The system allows organizations to manage events, attendees, and shared resources while enforcing complex scheduling and allocation constraints.

This project demonstrates:

- Relational database modeling
- Constraint enforcement using SQL
- Advanced reporting queries
- Backend API design with NestJS
- A simple React frontend

---

## Tech Stack

### Backend
- NestJS
- Prisma ORM
- PostgreSQL
- Raw SQL for complex reports

### Frontend
- React (Vite + TypeScript)

---

## Features

### Multi-Tenant Architecture
- Users belong to one organization
- Events and resources belong to organizations
- Supports global shared resources

### Event Management
- Create and list events
- Parent–child event relationships
- Time boundary enforcement

### Resource Management
- **Exclusive** resources (rooms)
- **Shareable** resources (equipment)
- **Consumable** resources (tracked by quantity)
- Allocation constraints enforced

### Attendee Management
- Internal users can register
- External attendees supported
- Attendance check-in tracking

---

## Business Rules Enforced

- Users cannot attend overlapping events
- Exclusive resources cannot overlap
- Shareable resources enforce max concurrent usage
- Consumables track quantity usage
- Parent events must contain child sessions
- Multi-tenant access rules enforced

---

## Reporting Endpoints

| Report | Endpoint |
|--------|----------|
| Double booked users | `/reports/double-booked-users` |
| Exclusive resource conflicts | `/reports/resource-violations/exclusive` |
| Shareable over-allocation | `/reports/resource-violations/shareable` |
| Consumables exceeded | `/reports/resource-violations/consumables` |
| Resource utilization | `/reports/resource-hours?ownerOrgId=2` |
| Underutilized resources | `/reports/underutilized?hours=2` |
| Parent boundary violations | `/reports/parent-boundary-violations` |
| External attendee threshold | `/reports/external-threshold?threshold=2` |
| Recursive event tree | `/reports/event-tree` |
| Refresh materialized view | `POST /reports/refresh-resource-hours` |

---

## Database Requirements Implemented

- Composite unique constraints
- Foreign keys with cascading rules
- Check constraints
- Recursive CTE (event tree)
- Materialized view for resource utilization

---

## Project Structure

```text
booking-system/
├── src/
│   ├── events/
│   ├── resources/
│   ├── allocations/
│   ├── attendance/
│   ├── registrations/
│   └── reports/
├── prisma/
└── README.md

booking-ui/
└── React frontend
```

---

## Running the Project

### Backend
```bash
cd booking-system
npm install
npm run start:dev
```

### Frontend
```bash
cd booking-ui
npm install
npm run dev
```

---

## Sample Data

Seed scripts populate:
- Organizations
- Users
- Events
- Resources
- Allocations
- Registrations

---

## Author

Sai Anish Nuthalapati

---

## Notes

- All reports use raw SQL
- Constraints enforced at both database and application levels
- Focused on correctness over UI styling
