import pytest
from app.models.order import OrderStatus
from app.models.approval import ApprovalAction
from app.models.email_log import EmailEventType

# TEST 1: Create a product and customer successfully.
def test_1_create_product_and_customer(client, admin_headers):
    # Create product
    prod_payload = {
        "sku": "TEST-PROD-101",
        "name": "Industrial Test Sensor",
        "description": "High accuracy digital pressure sensor",
        "category": "Electronics",
        "unit_price": 500.00,
        "cost_price": 300.00,
        "current_stock": 50,
        "reorder_threshold": 10,
        "is_active": True
    }
    prod_res = client.post("/api/products", json=prod_payload, headers=admin_headers)
    assert prod_res.status_code == 201, prod_res.text
    prod_data = prod_res.json()
    assert prod_data["sku"] == "TEST-PROD-101"
    assert prod_data["current_stock"] == 50

    # Create customer
    cust_payload = {
        "name": "Reliable Systems Corp",
        "email": "procurement@reliablesys.com",
        "phone": "+91 91234 56789",
        "address": "45 Industrial Boulevard, Phase 2",
        "city": "Pune",
        "company_name": "Reliable Systems Corp",
        "is_active": True
    }
    cust_res = client.post("/api/customers", json=cust_payload, headers=admin_headers)
    assert cust_res.status_code == 201, cust_res.text
    cust_data = cust_res.json()
    assert cust_data["name"] == "Reliable Systems Corp"
    assert cust_data["id"] is not None

# TEST 2: Create an order below the approval threshold. Verify automatic confirmation and correct inventory deduction.
def test_2_order_below_threshold_auto_confirms(client, sales_headers, admin_headers):
    # Setup product with 20 in stock, price 500
    p_res = client.post("/api/products", json={
        "sku": "TEST-BELOW-01",
        "name": "Low Value Gadget",
        "category": "Accessories",
        "unit_price": 500.00,
        "current_stock": 20,
        "reorder_threshold": 5,
        "is_active": True
    }, headers=admin_headers)
    prod = p_res.json()

    c_res = client.post("/api/customers", json={
        "name": "Retail Buyer 1",
        "email": "buyer1@test.com",
        "phone": "9876543210",
        "address": "12 High St",
        "is_active": True
    }, headers=admin_headers)
    cust = c_res.json()

    # Threshold is 10,000. 4 * 500 = 2,000 + 5% tax = 2,100 (< 10,000)
    order_payload = {
        "customer_id": cust["id"],
        "items": [{"product_id": prod["id"], "quantity": 4}],
        "tax_rate": 0.05,
        "discount_amount": 0.0
    }
    order_res = client.post("/api/orders", json=order_payload, headers=sales_headers)
    assert order_res.status_code == 201, order_res.text
    order = order_res.json()

    assert order["status"] == OrderStatus.COMPLETED.value
    assert order["approval_required"] is False
    assert order["total_amount"] == 2100.00

    # Verify inventory is deducted from 20 down to 16
    updated_prod = client.get(f"/api/products/{prod['id']}", headers=sales_headers).json()
    assert updated_prod["current_stock"] == 16

# TEST 3: Create an order above the threshold. Verify pending approval status.
def test_3_order_above_threshold_requires_approval(client, sales_headers, admin_headers):
    # Setup high value product: price 15,000, stock 10
    p_res = client.post("/api/products", json={
        "sku": "TEST-ABOVE-01",
        "name": "High Value Server Unit",
        "category": "Servers",
        "unit_price": 15000.00,
        "current_stock": 10,
        "reorder_threshold": 2,
        "is_active": True
    }, headers=admin_headers)
    prod = p_res.json()

    c_res = client.get("/api/customers", headers=sales_headers).json()
    cust_id = c_res[0]["id"]

    # 1 * 15,000 + 5% tax = 15,750 (> 10,000 threshold)
    order_payload = {
        "customer_id": cust_id,
        "items": [{"product_id": prod["id"], "quantity": 1}],
        "tax_rate": 0.05,
        "discount_amount": 0.0
    }
    order_res = client.post("/api/orders", json=order_payload, headers=sales_headers)
    assert order_res.status_code == 201, order_res.text
    order = order_res.json()

    assert order["status"] == OrderStatus.PENDING_APPROVAL.value
    assert order["approval_required"] is True

    # Crucial rule: Stock must NOT be deducted yet while in PENDING_APPROVAL!
    prod_check = client.get(f"/api/products/{prod['id']}", headers=sales_headers).json()
    assert prod_check["current_stock"] == 10

# TEST 4: Verify manager email notification.
def test_4_manager_email_notification_logged(client, manager_headers):
    logs_res = client.get("/api/emails/logs", headers=manager_headers)
    assert logs_res.status_code == 200
    logs = logs_res.json()
    assert len(logs) > 0
    # Find approval request log
    approval_emails = [l for l in logs if l["event_type"] == EmailEventType.APPROVAL_REQUEST.value]
    assert len(approval_emails) > 0
    first_email = approval_emails[0]
    assert "High-Value Order Approval Needed" in first_email["subject"]
    assert first_email["delivery_status"] in ["SENT", "FALLBACK_LOGGED"]

# TEST 5: Log in as manager and approve the order. Verify inventory deduction and order completion.
def test_5_manager_approve_order_deducts_inventory(client, sales_headers, manager_headers, admin_headers):
    # Setup product
    p_res = client.post("/api/products", json={
        "sku": "TEST-APPR-01",
        "name": "Approvable Workstation",
        "category": "Computers",
        "unit_price": 25000.00,
        "current_stock": 5,
        "reorder_threshold": 1,
        "is_active": True
    }, headers=admin_headers).json()

    c_id = client.get("/api/customers", headers=sales_headers).json()[0]["id"]

    # Sales creates order for 2 units = 50,000 + 5% = 52,500
    order_res = client.post("/api/orders", json={
        "customer_id": c_id,
        "items": [{"product_id": p_res["id"], "quantity": 2}],
        "tax_rate": 0.05
    }, headers=sales_headers).json()
    order_id = order_res["id"]
    assert order_res["status"] == OrderStatus.PENDING_APPROVAL.value

    # Stock is still 5
    assert client.get(f"/api/products/{p_res['id']}", headers=sales_headers).json()["current_stock"] == 5

    # Manager approves order
    decision_payload = {
        "action": ApprovalAction.APPROVED.value,
        "comments": "Approved for corporate rollout project."
    }
    appr_res = client.post(f"/api/approvals/{order_id}/decide", json=decision_payload, headers=manager_headers)
    assert appr_res.status_code == 200, appr_res.text
    appr_data = appr_res.json()
    assert appr_data["action"] == ApprovalAction.APPROVED.value

    # Verify order is now COMPLETED
    updated_order = client.get(f"/api/orders/{order_id}", headers=sales_headers).json()
    assert updated_order["status"] == OrderStatus.COMPLETED.value

    # Verify inventory is now deducted from 5 down to 3!
    assert client.get(f"/api/products/{p_res['id']}", headers=sales_headers).json()["current_stock"] == 3

# TEST 6: Create another high-value order and reject it. Verify inventory remains unchanged.
def test_6_manager_reject_order_leaves_inventory_unchanged(client, sales_headers, manager_headers, admin_headers):
    p_res = client.post("/api/products", json={
        "sku": "TEST-REJ-01",
        "name": "Luxury Presentation Screen",
        "category": "Displays",
        "unit_price": 40000.00,
        "current_stock": 8,
        "reorder_threshold": 2,
        "is_active": True
    }, headers=admin_headers).json()

    c_id = client.get("/api/customers", headers=sales_headers).json()[0]["id"]

    order_res = client.post("/api/orders", json={
        "customer_id": c_id,
        "items": [{"product_id": p_res["id"], "quantity": 1}],
        "tax_rate": 0.05
    }, headers=sales_headers).json()
    order_id = order_res["id"]

    # Manager rejects order
    decision_payload = {
        "action": ApprovalAction.REJECTED.value,
        "comments": "Credit limit exceeded for customer account."
    }
    rej_res = client.post(f"/api/approvals/{order_id}/decide", json=decision_payload, headers=manager_headers)
    assert rej_res.status_code == 200
    assert rej_res.json()["action"] == ApprovalAction.REJECTED.value

    # Verify order status is REJECTED
    order_details = client.get(f"/api/orders/{order_id}", headers=sales_headers).json()
    assert order_details["status"] == OrderStatus.REJECTED.value

    # Verify inventory remains unchanged at 8
    prod_check = client.get(f"/api/products/{p_res['id']}", headers=sales_headers).json()
    assert prod_check["current_stock"] == 8

# TEST 7: Attempt to order more stock than available. Verify proper validation.
def test_7_order_more_than_available_stock_rejected(client, sales_headers, admin_headers):
    p_res = client.post("/api/products", json={
        "sku": "TEST-OOS-01",
        "name": "Scarce Component",
        "category": "Hardware",
        "unit_price": 1000.00,
        "current_stock": 3,
        "reorder_threshold": 1,
        "is_active": True
    }, headers=admin_headers).json()

    c_id = client.get("/api/customers", headers=sales_headers).json()[0]["id"]

    # Attempt to order 10 units when only 3 exist
    order_payload = {
        "customer_id": c_id,
        "items": [{"product_id": p_res["id"], "quantity": 10}]
    }
    res = client.post("/api/orders", json=order_payload, headers=sales_headers)
    assert res.status_code == 400
    assert "Insufficient stock" in res.json()["detail"]

# TEST 8: Attempt to approve an already processed order. Verify rejection of duplicate action.
def test_8_duplicate_approval_attempt_rejected(client, sales_headers, manager_headers, admin_headers):
    # Create and approve an order
    p_res = client.post("/api/products", json={
        "sku": "TEST-DUP-01",
        "name": "Duplicate Check Widget",
        "category": "Accessories",
        "unit_price": 12000.00,
        "current_stock": 10,
        "is_active": True
    }, headers=admin_headers).json()

    c_id = client.get("/api/customers", headers=sales_headers).json()[0]["id"]

    order = client.post("/api/orders", json={
        "customer_id": c_id,
        "items": [{"product_id": p_res["id"], "quantity": 1}]
    }, headers=sales_headers).json()

    # First approval succeeds
    res1 = client.post(f"/api/approvals/{order['id']}/decide", json={
        "action": ApprovalAction.APPROVED.value,
        "comments": "Initial approval."
    }, headers=manager_headers)
    assert res1.status_code == 200

    # Second approval attempt must be blocked
    res2 = client.post(f"/api/approvals/{order['id']}/decide", json={
        "action": ApprovalAction.APPROVED.value,
        "comments": "Duplicate approval attempt."
    }, headers=manager_headers)
    assert res2.status_code == 400
    assert "already been processed" in res2.json()["detail"]

# TEST 9: Attempt unauthorized approval as a sales user. Verify access is denied.
def test_9_sales_user_cannot_approve_orders(client, sales_headers):
    # Sales user tries to call manager approval endpoint
    res = client.post("/api/approvals/1/decide", json={
        "action": ApprovalAction.APPROVED.value,
        "comments": "Unauthorized approval attempt"
    }, headers=sales_headers)
    assert res.status_code == 403
    assert "Operation not permitted" in res.json()["detail"]

# TEST 10: Verify dashboard metrics reflect actual database information.
def test_10_dashboard_metrics_reflect_real_database(client, sales_headers):
    dash_res = client.get("/api/dashboard", headers=sales_headers)
    assert dash_res.status_code == 200
    metrics = dash_res.json()

    assert "total_products" in metrics
    assert "total_customers" in metrics
    assert "total_sales" in metrics
    assert "total_orders" in metrics
    assert "pending_approvals" in metrics
    assert "completed_orders" in metrics
    assert "low_stock_count" in metrics
    assert "order_status_counts" in metrics
    assert "sales_overview_chart" in metrics

    assert metrics["total_products"] > 0
    assert metrics["total_customers"] > 0
    assert metrics["total_sales"] > 0
    assert isinstance(metrics["sales_overview_chart"], list)

# TEST 11: Test inventory consistency and transaction rollback in case of failures.
def test_11_inventory_consistency_and_transaction_rollback(client, sales_headers, admin_headers):
    # Setup two products: prod1 has 5 stock, prod2 has 2 stock
    p1 = client.post("/api/products", json={
        "sku": "TEST-ROLL-01",
        "name": "Rollback Product 1",
        "category": "Hardware",
        "unit_price": 100.00,
        "current_stock": 5,
        "is_active": True
    }, headers=admin_headers).json()

    p2 = client.post("/api/products", json={
        "sku": "TEST-ROLL-02",
        "name": "Rollback Product 2",
        "category": "Hardware",
        "unit_price": 200.00,
        "current_stock": 2,
        "is_active": True
    }, headers=admin_headers).json()

    c_id = client.get("/api/customers", headers=sales_headers).json()[0]["id"]

    # Order requesting 2 of p1 (available) but 10 of p2 (unavailable)
    # Both items are in same order. If p2 fails, p1 stock must NOT be altered!
    order_payload = {
        "customer_id": c_id,
        "items": [
            {"product_id": p1["id"], "quantity": 2},
            {"product_id": p2["id"], "quantity": 10}
        ]
    }
    res = client.post("/api/orders", json=order_payload, headers=sales_headers)
    assert res.status_code == 400

    # Verify p1 stock is completely preserved at 5
    p1_check = client.get(f"/api/products/{p1['id']}", headers=sales_headers).json()
    assert p1_check["current_stock"] == 5

    # Verify p2 stock is completely preserved at 2
    p2_check = client.get(f"/api/products/{p2['id']}", headers=sales_headers).json()
    assert p2_check["current_stock"] == 2

