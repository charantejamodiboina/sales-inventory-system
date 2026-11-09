from datetime import datetime, timedelta
from decimal import Decimal
from sqlalchemy.orm import Session
from app.database import Base, engine, SessionLocal
from app.models.user import User, UserRole
from app.models.product import Product
from app.models.customer import Customer
from app.models.order import SalesOrder, SalesOrderItem, OrderStatus
from app.models.inventory import InventoryTransaction, InventoryChangeType
from app.models.approval import OrderApproval, ApprovalAction
from app.models.settings import SystemSetting
from app.models.email_log import EmailLog, EmailEventType, DeliveryStatus
from app.utils.security import get_password_hash

def seed_database():
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # 1. Seed Users if not present
        if db.query(User).count() == 0:
            print("Seeding demo users...")
            admin_user = User(
                username="admin",
                email="admin@apex.demo",
                full_name="Alexander Reed (System Administrator)",
                hashed_password=get_password_hash("Admin@123"),
                role=UserRole.ADMIN,
                is_active=True
            )
            manager_user = User(
                username="manager",
                email="manager@apex.demo",
                full_name="Sarah Jenkins (Operations Manager)",
                hashed_password=get_password_hash("Manager@123"),
                role=UserRole.MANAGER,
                is_active=True
            )
            sales_user = User(
                username="sales",
                email="sales@apex.demo",
                full_name="David Patel (Sales Executive)",
                hashed_password=get_password_hash("Sales@123"),
                role=UserRole.SALES_USER,
                is_active=True
            )
            db.add_all([admin_user, manager_user, sales_user])
            db.commit()

        admin = db.query(User).filter(User.username == "admin").first()
        manager = db.query(User).filter(User.username == "manager").first()
        sales = db.query(User).filter(User.username == "sales").first()

        # 2. Seed System Settings
        if not db.query(SystemSetting).filter(SystemSetting.setting_key == "APPROVAL_THRESHOLD").first():
            print("Seeding approval threshold setting (₹10,000)...")
            threshold_setting = SystemSetting(
                setting_key="APPROVAL_THRESHOLD",
                setting_value="10000.00",
                description="Orders exceeding this total amount require Manager approval before fulfillment.",
                updated_by_user_id=admin.id,
                updated_at=datetime.utcnow()
            )
            db.add(threshold_setting)
            db.commit()

        # 3. Seed Products if not present
        if db.query(Product).count() == 0:
            print("Seeding demo products...")
            products_data = [
                {
                    "sku": "PROD-LAP-001",
                    "name": "ThinkEnterprise Pro Laptop 15\"",
                    "description": "High performance quad-core enterprise workstation with 32GB RAM, 1TB NVMe.",
                    "category": "Computers",
                    "unit_price": 65000.00,
                    "cost_price": 52000.00,
                    "current_stock": 18,
                    "reorder_threshold": 5
                },
                {
                    "sku": "PROD-MON-002",
                    "name": "UltraView 27\" 4K IPS Monitor",
                    "description": "Ergonomic color-calibrated display with USB-C 90W power delivery.",
                    "category": "Displays",
                    "unit_price": 28500.00,
                    "cost_price": 21000.00,
                    "current_stock": 25,
                    "reorder_threshold": 10
                },
                {
                    "sku": "PROD-KEY-003",
                    "name": "SilentTouch Wireless Mechanical Keyboard",
                    "description": "Compact wireless mechanical keyboard with quiet tactile switches and multi-device Bluetooth.",
                    "category": "Accessories",
                    "unit_price": 4200.00,
                    "cost_price": 2600.00,
                    "current_stock": 42,
                    "reorder_threshold": 15
                },
                {
                    "sku": "PROD-MOU-004",
                    "name": "Precision Ergonomic Optical Mouse",
                    "description": "High-precision vertical laser mouse designed to reduce wrist strain.",
                    "category": "Accessories",
                    "unit_price": 2100.00,
                    "cost_price": 1250.00,
                    "current_stock": 4,  # LOW STOCK demo
                    "reorder_threshold": 10
                },
                {
                    "sku": "PROD-DOC-005",
                    "name": "Thunderbolt 4 Universal Docking Station",
                    "description": "12-in-1 dual 4K display dock with gigabit ethernet and audio.",
                    "category": "Hardware",
                    "unit_price": 16500.00,
                    "cost_price": 11500.00,
                    "current_stock": 6,  # LOW STOCK demo
                    "reorder_threshold": 8
                },
                {
                    "sku": "PROD-HDP-006",
                    "name": "Active Noise Cancelling Executive Headset",
                    "description": "Premium wireless headset with beamforming microphone and 30-hour battery life.",
                    "category": "Audio",
                    "unit_price": 8900.00,
                    "cost_price": 5400.00,
                    "current_stock": 30,
                    "reorder_threshold": 10
                },
                {
                    "sku": "PROD-SRV-007",
                    "name": "1U Rackmount Backup Appliance 16TB",
                    "description": "Redundant hot-swap storage node for local disaster recovery.",
                    "category": "Servers",
                    "unit_price": 145000.00,
                    "cost_price": 110000.00,
                    "current_stock": 3,  # LOW STOCK demo
                    "reorder_threshold": 5
                },
                {
                    "sku": "PROD-UPS-008",
                    "name": "SmartPro 1500VA Line Interactive UPS",
                    "description": "Pure sine wave battery backup with LCD screen and automatic voltage regulation.",
                    "category": "Power",
                    "unit_price": 19500.00,
                    "cost_price": 14000.00,
                    "current_stock": 14,
                    "reorder_threshold": 5
                }
            ]

            created_prods = []
            for p_dict in products_data:
                p = Product(**p_dict)
                db.add(p)
                db.flush()
                # Log initial inventory transaction
                tx = InventoryTransaction(
                    product_id=p.id,
                    change_type=InventoryChangeType.INITIAL,
                    quantity_change=p.current_stock,
                    previous_stock=0,
                    new_stock=p.current_stock,
                    performed_by_user_id=admin.id,
                    notes="System initial setup inventory balance"
                )
                db.add(tx)
                created_prods.append(p)
            db.commit()

        # 4. Seed Customers if not present
        if db.query(Customer).count() == 0:
            print("Seeding demo customers...")
            customers_data = [
                {
                    "name": "Aarav Sharma",
                    "email": "aarav.sharma@novatech.co.in",
                    "phone": "+91 98201 12345",
                    "company_name": "NovaTech Solutions Pvt Ltd",
                    "address": "402 Tech Park, Bandra Kurla Complex",
                    "city": "Mumbai"
                },
                {
                    "name": "Priyanka Nair",
                    "email": "priyanka.nair@vertexcorp.org",
                    "phone": "+91 98450 67890",
                    "company_name": "Vertex Global Consulting",
                    "address": "88 Residency Road, Richmond Town",
                    "city": "Bengaluru"
                },
                {
                    "name": "Vikram Malhotra",
                    "email": "v.malhotra@zenithenterprises.in",
                    "phone": "+91 99112 34567",
                    "company_name": "Zenith Logistics & Supply",
                    "address": "Sector 62, Electronic City",
                    "city": "Noida"
                },
                {
                    "name": "Ananya Mukherjee",
                    "email": "ananya.m@cloudscale.io",
                    "phone": "+91 97321 45678",
                    "company_name": "CloudScale Software Labs",
                    "address": "Plot 15, Hitec City, Madhapur",
                    "city": "Hyderabad"
                }
            ]
            for c_dict in customers_data:
                db.add(Customer(**c_dict))
            db.commit()

        # 5. Seed sample orders demonstrating different states
        if db.query(SalesOrder).count() == 0:
            print("Seeding sample sales orders demonstrating approval workflow...")
            cust1 = db.query(Customer).first()
            p_mouse = db.query(Product).filter(Product.sku == "PROD-MOU-004").first()
            p_key = db.query(Product).filter(Product.sku == "PROD-KEY-003").first()
            p_lap = db.query(Product).filter(Product.sku == "PROD-LAP-001").first()

            # ORDER 1: Below threshold (Auto-completed)
            # 2 mice @ 2100 = 4200. Subtotal: 4200, tax 5% = 210, total = 4410 (< 10000)
            order1 = SalesOrder(
                order_number="SO-20261109-0001",
                customer_id=cust1.id,
                created_by_user_id=sales.id,
                subtotal=4200.00,
                discount_amount=0.00,
                tax_amount=210.00,
                total_amount=4410.00,
                status=OrderStatus.COMPLETED,
                approval_required=False,
                notes="Standard office accessories replenishment",
                created_at=datetime.utcnow() - timedelta(days=2)
            )
            db.add(order1)
            db.flush()

            item1 = SalesOrderItem(
                order_id=order1.id,
                product_id=p_mouse.id,
                quantity=2,
                unit_price=2100.00,
                total_price=4200.00
            )
            db.add(item1)

            # ORDER 2: Above threshold (Pending Approval)
            # 1 laptop @ 65000 = 65000. Subtotal: 65000, tax 5% = 3250, total = 68250 (> 10000)
            order2 = SalesOrder(
                order_number="SO-20261109-0002",
                customer_id=cust1.id,
                created_by_user_id=sales.id,
                subtotal=65000.00,
                discount_amount=0.00,
                tax_amount=3250.00,
                total_amount=68250.00,
                status=OrderStatus.PENDING_APPROVAL,
                approval_required=True,
                notes="High performance executive developer laptop for new lead architect",
                created_at=datetime.utcnow() - timedelta(hours=3)
            )
            db.add(order2)
            db.flush()

            item2 = SalesOrderItem(
                order_id=order2.id,
                product_id=p_lap.id,
                quantity=1,
                unit_price=65000.00,
                total_price=65000.00
            )
            db.add(item2)

            # Log email notification for Order 2
            email_log2 = EmailLog(
                recipient_email=manager.email,
                recipient_name=manager.full_name,
                subject=f"[Action Required] High-Value Order Approval Needed: {order2.order_number}",
                body_text=f"Order {order2.order_number} for INR {order2.total_amount:,.2f} requires your review.",
                event_type=EmailEventType.APPROVAL_REQUEST,
                related_order_id=order2.id,
                delivery_status=DeliveryStatus.FALLBACK_LOGGED,
                created_at=datetime.utcnow() - timedelta(hours=3)
            )
            db.add(email_log2)

            db.commit()
            print("Demo seed complete successfully.")

    except Exception as e:
        db.rollback()
        print(f"Error during seeding: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()

