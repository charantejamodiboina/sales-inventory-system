import pytest
from decimal import Decimal
from fastapi import HTTPException
from app.database import SessionLocal, Base, engine
from app.models.user import User, UserRole
from app.models.product import Product
from app.models.customer import Customer
from app.models.order import SalesOrder, OrderStatus
from app.models.approval import OrderApproval, ApprovalAction
from app.models.inventory import InventoryTransaction, InventoryChangeType
from app.models.email_log import EmailLog, EmailEventType
from app.models.settings import SystemSetting
from app.schemas.order import OrderCreate, OrderItemCreate
from app.schemas.approval import ApprovalDecisionRequest
from app.services.order_service import OrderService
from app.services.approval_service import ApprovalService
from app.services.inventory_service import InventoryService
from app.services.dashboard_service import DashboardService
from app.services.email_service import EmailService

def setup_function():
    # Fresh session
    pass

def test_1_create_product_and_customer():
    """TEST 1: Create a product and customer successfully."""
    db = SessionLocal()
    try:
        # Create product
        p = Product(
            sku="VERIF-PROD-01",
            name="Precision Test Multimeter",
            description="True RMS auto-ranging digital multimeter",
            category="Testing",
            unit_price=2400.00,
            cost_price=1600.00,
            current_stock=25,
            reorder_threshold=5,
            is_active=True
        )
        db.add(p)
        db.commit()
        db.refresh(p)
        assert p.id is not None
        assert p.sku == "VERIF-PROD-01"
        assert p.current_stock == 25

        # Create customer
        c = Customer(
            name="Matrix Manufacturing Ltd",
            email="procurement@matrixmfg.com",
            phone="+91 99887 76655",
            address="Plot 101, MIDC Industrial Area",
            city="Nagpur",
            company_name="Matrix Manufacturing Ltd",
            is_active=True
        )
        db.add(c)
        db.commit()
        db.refresh(c)
        assert c.id is not None
        assert c.name == "Matrix Manufacturing Ltd"
        assert c.email == "procurement@matrixmfg.com"
    finally:
        db.close()

def test_2_order_below_threshold_auto_confirms():
    """TEST 2: Create an order below the approval threshold. Verify automatic confirmation and correct inventory deduction."""
    db = SessionLocal()
    try:
        sales = db.query(User).filter(User.role == UserRole.SALES_USER).first()
        cust = db.query(Customer).first()
        
        # Product with 20 stock, unit price 800
        p = Product(
            sku="VERIF-BELOW-01",
            name="Ergonomic Mousepad",
            category="Accessories",
            unit_price=800.00,
            current_stock=20,
            reorder_threshold=5,
            is_active=True
        )
        db.add(p)
        db.commit()
        db.refresh(p)

        # 3 items * 800 = 2400 + 5% tax = 2520 (< 10,000 threshold)
        order_in = OrderCreate(
            customer_id=cust.id,
            items=[OrderItemCreate(product_id=p.id, quantity=3)],
            tax_rate=0.05,
            discount_amount=0.0,
            notes="Auto-fulfillment test order"
        )
        order = OrderService.create_order(db=db, order_in=order_in, current_user=sales)

        assert order.status == OrderStatus.COMPLETED
        assert order.approval_required is False
        assert order.total_amount == 2520.00

        # Verify stock deducted from 20 to 17
        db.refresh(p)
        assert p.current_stock == 17

        # Verify inventory audit transaction logged
        tx = db.query(InventoryTransaction).filter(
            InventoryTransaction.reference_order_id == order.id
        ).first()
        assert tx is not None
        assert tx.change_type == InventoryChangeType.ORDER_DEDUCTION
        assert tx.quantity_change == -3
        assert tx.previous_stock == 20
        assert tx.new_stock == 17
    finally:
        db.close()

def test_3_order_above_threshold_requires_approval():
    """TEST 3: Create an order above the threshold. Verify pending approval status."""
    db = SessionLocal()
    try:
        sales = db.query(User).filter(User.role == UserRole.SALES_USER).first()
        cust = db.query(Customer).first()

        # Product with 10 stock, unit price 15,000
        p = Product(
            sku="VERIF-ABOVE-01",
            name="Enterprise Core Switch",
            category="Network",
            unit_price=15000.00,
            current_stock=10,
            reorder_threshold=2,
            is_active=True
        )
        db.add(p)
        db.commit()
        db.refresh(p)

        # 1 item * 15000 + 5% tax = 15750 (> 10,000 threshold)
        order_in = OrderCreate(
            customer_id=cust.id,
            items=[OrderItemCreate(product_id=p.id, quantity=1)],
            tax_rate=0.05,
            discount_amount=0.0,
            notes="High value network upgrade"
        )
        order = OrderService.create_order(db=db, order_in=order_in, current_user=sales)

        assert order.status == OrderStatus.PENDING_APPROVAL
        assert order.approval_required is True
        assert order.total_amount == 15750.00

        # Stock must NOT be deducted while awaiting approval!
        db.refresh(p)
        assert p.current_stock == 10
    finally:
        db.close()

def test_4_verify_manager_email_notification():
    """TEST 4: Verify manager email notification."""
    db = SessionLocal()
    try:
        manager = db.query(User).filter(User.role == UserRole.MANAGER).first()
        # Check email log table
        emails = db.query(EmailLog).filter(
            EmailLog.recipient_email == manager.email,
            EmailLog.event_type == EmailEventType.APPROVAL_REQUEST
        ).all()
        assert len(emails) > 0
        latest_email = emails[-1]
        assert "High-Value Order Approval Needed" in latest_email.subject
        assert latest_email.delivery_status in ["SENT", "FALLBACK_LOGGED"]
    finally:
        db.close()

def test_5_manager_approve_order_deducts_inventory():
    """TEST 5: Log in as manager and approve the order. Verify inventory deduction and order completion."""
    db = SessionLocal()
    try:
        sales = db.query(User).filter(User.role == UserRole.SALES_USER).first()
        manager = db.query(User).filter(User.role == UserRole.MANAGER).first()
        cust = db.query(Customer).first()

        p = Product(
            sku="VERIF-APPR-01",
            name="Developer Ultrawide Display",
            category="Displays",
            unit_price=35000.00,
            current_stock=8,
            reorder_threshold=2,
            is_active=True
        )
        db.add(p)
        db.commit()
        db.refresh(p)

        # Order for 1 display: 35,000 + 5% = 36,750 (> 10,000)
        order_in = OrderCreate(
            customer_id=cust.id,
            items=[OrderItemCreate(product_id=p.id, quantity=1)],
            tax_rate=0.05
        )
        order = OrderService.create_order(db=db, order_in=order_in, current_user=sales)
        assert order.status == OrderStatus.PENDING_APPROVAL
        assert p.current_stock == 8

        # Manager approves
        decision = ApprovalDecisionRequest(
            action=ApprovalAction.APPROVED,
            comments="Approved for senior engineer workstation setup."
        )
        approval = ApprovalService.process_approval(
            db=db,
            order_id=order.id,
            decision=decision,
            manager_user=manager
        )
        assert approval.action == ApprovalAction.APPROVED

        # Verify order status is COMPLETED
        db.refresh(order)
        assert order.status == OrderStatus.COMPLETED

        # Verify inventory is deducted from 8 down to 7!
        db.refresh(p)
        assert p.current_stock == 7

        # Verify approval history record created
        approvals = db.query(OrderApproval).filter(OrderApproval.order_id == order.id).all()
        assert len(approvals) == 1
        assert approvals[0].decided_by_user_id == manager.id
    finally:
        db.close()

def test_6_manager_reject_order_leaves_inventory_unchanged():
    """TEST 6: Create another high-value order and reject it. Verify inventory remains unchanged."""
    db = SessionLocal()
    try:
        sales = db.query(User).filter(User.role == UserRole.SALES_USER).first()
        manager = db.query(User).filter(User.role == UserRole.MANAGER).first()
        cust = db.query(Customer).first()

        p = Product(
            sku="VERIF-REJ-01",
            name="High End Audio Mixer",
            category="Audio",
            unit_price=22000.00,
            current_stock=6,
            reorder_threshold=2,
            is_active=True
        )
        db.add(p)
        db.commit()
        db.refresh(p)

        order_in = OrderCreate(
            customer_id=cust.id,
            items=[OrderItemCreate(product_id=p.id, quantity=2)],
            tax_rate=0.05
        )
        order = OrderService.create_order(db=db, order_in=order_in, current_user=sales)
        assert order.status == OrderStatus.PENDING_APPROVAL

        # Manager rejects
        decision = ApprovalDecisionRequest(
            action=ApprovalAction.REJECTED,
            comments="Project cancelled by customer procurement department."
        )
        approval = ApprovalService.process_approval(
            db=db,
            order_id=order.id,
            decision=decision,
            manager_user=manager
        )
        assert approval.action == ApprovalAction.REJECTED

        # Verify order status is REJECTED
        db.refresh(order)
        assert order.status == OrderStatus.REJECTED

        # Verify inventory remains completely UNCHANGED at 6!
        db.refresh(p)
        assert p.current_stock == 6
    finally:
        db.close()

def test_7_order_more_stock_than_available_rejected():
    """TEST 7: Attempt to order more stock than available. Verify proper validation."""
    db = SessionLocal()
    try:
        sales = db.query(User).filter(User.role == UserRole.SALES_USER).first()
        cust = db.query(Customer).first()

        p = Product(
            sku="VERIF-OOS-01",
            name="Limited Stock Chip",
            category="Components",
            unit_price=500.00,
            current_stock=4,
            reorder_threshold=1,
            is_active=True
        )
        db.add(p)
        db.commit()
        db.refresh(p)

        order_in = OrderCreate(
            customer_id=cust.id,
            items=[OrderItemCreate(product_id=p.id, quantity=15)]
        )
        with pytest.raises(HTTPException) as exc_info:
            OrderService.create_order(db=db, order_in=order_in, current_user=sales)
        assert exc_info.value.status_code == 400
        assert "Insufficient stock" in exc_info.value.detail
    finally:
        db.close()

def test_8_duplicate_approval_attempt_rejected():
    """TEST 8: Attempt to approve an already processed order. Verify rejection of the duplicate action."""
    db = SessionLocal()
    try:
        sales = db.query(User).filter(User.role == UserRole.SALES_USER).first()
        manager = db.query(User).filter(User.role == UserRole.MANAGER).first()
        cust = db.query(Customer).first()

        p = Product(
            sku="VERIF-DUP-01",
            name="Redundant Item",
            category="Hardware",
            unit_price=12000.00,
            current_stock=10,
            is_active=True
        )
        db.add(p)
        db.commit()
        db.refresh(p)

        order_in = OrderCreate(
            customer_id=cust.id,
            items=[OrderItemCreate(product_id=p.id, quantity=1)]
        )
        order = OrderService.create_order(db=db, order_in=order_in, current_user=sales)

        # First approval
        ApprovalService.process_approval(
            db=db,
            order_id=order.id,
            decision=ApprovalDecisionRequest(action=ApprovalAction.APPROVED, comments="Initial OK"),
            manager_user=manager
        )

        # Second approval attempt must raise HTTPException(400)
        with pytest.raises(HTTPException) as exc_info:
            ApprovalService.process_approval(
                db=db,
                order_id=order.id,
                decision=ApprovalDecisionRequest(action=ApprovalAction.APPROVED, comments="Duplicate!"),
                manager_user=manager
            )
        assert exc_info.value.status_code == 400
        assert "already been processed" in exc_info.value.detail
    finally:
        db.close()

def test_9_unauthorized_approval_as_sales_user_denied():
    """TEST 9: Attempt unauthorized approval as a sales user. Verify access is denied."""
    db = SessionLocal()
    try:
        sales = db.query(User).filter(User.role == UserRole.SALES_USER).first()
        with pytest.raises(HTTPException) as exc_info:
            ApprovalService.process_approval(
                db=db,
                order_id=1,
                decision=ApprovalDecisionRequest(action=ApprovalAction.APPROVED, comments="Sneaky approval"),
                manager_user=sales
            )
        assert exc_info.value.status_code == 403
        assert "Unauthorized" in exc_info.value.detail
    finally:
        db.close()

def test_10_dashboard_metrics_reflect_actual_database():
    """TEST 10: Verify dashboard metrics reflect actual database information."""
    db = SessionLocal()
    try:
        metrics = DashboardService.get_dashboard_metrics(db)
        assert metrics.total_products > 0
        assert metrics.total_customers > 0
        assert metrics.total_orders > 0
        assert metrics.total_sales > 0
        assert metrics.approval_threshold == 10000.00
        assert len(metrics.order_status_counts) > 0
        assert isinstance(metrics.sales_overview_chart, list)
        assert isinstance(metrics.low_stock_products, list)
    finally:
        db.close()

def test_11_inventory_consistency_and_transaction_rollback():
    """TEST 11: Test inventory consistency and transaction rollback in case of failures."""
    db = SessionLocal()
    try:
        sales = db.query(User).filter(User.role == UserRole.SALES_USER).first()
        cust = db.query(Customer).first()

        p1 = Product(
            sku="VERIF-RB-01",
            name="Rollback Item 1",
            category="Hardware",
            unit_price=200.00,
            current_stock=5,
            is_active=True
        )
        p2 = Product(
            sku="VERIF-RB-02",
            name="Rollback Item 2",
            category="Hardware",
            unit_price=400.00,
            current_stock=1,
            is_active=True
        )
        db.add_all([p1, p2])
        db.commit()
        db.refresh(p1)
        db.refresh(p2)

        # Multi-item order: p1 has enough stock (2 <= 5), but p2 does NOT (5 > 1)
        order_in = OrderCreate(
            customer_id=cust.id,
            items=[
                OrderItemCreate(product_id=p1.id, quantity=2),
                OrderItemCreate(product_id=p2.id, quantity=5)
            ]
        )
        with pytest.raises(HTTPException):
            OrderService.create_order(db=db, order_in=order_in, current_user=sales)

        # Confirm rollback: p1 must remain at 5, p2 at 1
        db.refresh(p1)
        db.refresh(p2)
        assert p1.current_stock == 5
        assert p2.current_stock == 1
    finally:
        db.close()

if __name__ == "__main__":
    print("Running Test 1...")
    test_1_create_product_and_customer()
    print("Test 1 PASS")
    print("Running Test 2...")
    test_2_order_below_threshold_auto_confirms()
    print("Test 2 PASS")
    print("Running Test 3...")
    test_3_order_above_threshold_requires_approval()
    print("Test 3 PASS")
    print("Running Test 4...")
    test_4_verify_manager_email_notification()
    print("Test 4 PASS")
    print("Running Test 5...")
    test_5_manager_approve_order_deducts_inventory()
    print("Test 5 PASS")
    print("Running Test 6...")
    test_6_manager_reject_order_leaves_inventory_unchanged()
    print("Test 6 PASS")
    print("Running Test 7...")
    test_7_order_more_stock_than_available_rejected()
    print("Test 7 PASS")
    print("Running Test 8...")
    test_8_duplicate_approval_attempt_rejected()
    print("Test 8 PASS")
    print("Running Test 9...")
    test_9_unauthorized_approval_as_sales_user_denied()
    print("Test 9 PASS")
    print("Running Test 10...")
    test_10_dashboard_metrics_reflect_actual_database()
    print("Test 10 PASS")
    print("Running Test 11...")
    test_11_inventory_consistency_and_transaction_rollback()
    print("Test 11 PASS")
    print("\nALL 11 TEST SCENARIOS PASSED WITH 100% SUCCESS!")

