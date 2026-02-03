# FoodFlow

ระบบจัดการเมนูอาหาร ลูกค้า และการสั่งอาหาร (Express.js + EJS + Sequelize + SQLite)

## ติดตั้ง
```bash
npm install
cp .env.example .env
npm run seed
npm run dev
```

เปิดเว็บ: http://localhost:3000

## โครงสร้าง
- CRUD ครบ 4 ตาราง: Menu, Customer, Order, OrderDetail
- Reports 2 หน้า:
  - /reports/sales (ยอดขายตามช่วงเวลา)
  - /reports/top-menus (เมนูขายดี)

> หมายเหตุ: เพื่อให้ตรงตาม requirement CRUD แยกเป็นตารางชัดเจน  
> หน้า OrderDetail จะช่วยคำนวณยอดรวม (total_price) ให้ Order อัตโนมัติ
