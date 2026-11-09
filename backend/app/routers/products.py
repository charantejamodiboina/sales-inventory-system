from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models.product import Product
from app.models.order import SalesOrderItem
from app.models.inventory import InventoryTransaction, InventoryChangeType
from app.models.user import User, UserRole
from app.schemas.product import ProductCreate, ProductUpdate, ProductResponse
from app.utils.dependencies import get_current_user, require_roles

router = APIRouter(prefix="/products", tags=["Products"])

@router.get("", response_model=List[ProductResponse])
def list_products(
    search: Optional[str] = Query(None, description="Search by name, SKU, or category"),
    category: Optional[str] = None,
    is_low_stock: Optional[bool] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Product).filter(Product.is_active == True)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                Product.name.ilike(search_filter),
                Product.sku.ilike(search_filter),
                Product.category.ilike(search_filter),
                Product.description.ilike(search_filter)
            )
        )

    if category:
        query = query.filter(Product.category == category)

    if is_low_stock is True:
        query = query.filter(Product.current_stock <= Product.reorder_threshold)
    elif is_low_stock is False:
        query = query.filter(Product.current_stock > Product.reorder_threshold)

    products = query.order_by(Product.name.asc()).offset(skip).limit(limit).all()

    # Add low stock indicator flag
    result = []
    for p in products:
        item = ProductResponse.model_validate(p)
        item.is_low_stock = p.current_stock <= p.reorder_threshold
        result.append(item)
    return result

@router.get("/{product_id}", response_model=ProductResponse)
def get_product(product_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")
    res = ProductResponse.model_validate(product)
    res.is_low_stock = product.current_stock <= product.reorder_threshold
    return res

@router.post("", response_model=ProductResponse, status_code=status.HTTP_201_CREATED)
def create_product(
    product_in: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # SKU uniqueness check
    existing = db.query(Product).filter(Product.sku == product_in.sku.strip()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"A product with SKU '{product_in.sku}' already exists."
        )

    product = Product(
        sku=product_in.sku.strip().upper(),
        name=product_in.name.strip(),
        description=product_in.description,
        category=product_in.category.strip(),
        unit_price=product_in.unit_price,
        cost_price=product_in.cost_price,
        current_stock=product_in.current_stock,
        reorder_threshold=product_in.reorder_threshold,
        is_active=product_in.is_active
    )
    db.add(product)
    db.flush()

    # Audit initial stock if greater than 0
    if product.current_stock > 0:
        tx = InventoryTransaction(
            product_id=product.id,
            change_type=InventoryChangeType.INITIAL,
            quantity_change=product.current_stock,
            previous_stock=0,
            new_stock=product.current_stock,
            performed_by_user_id=current_user.id,
            notes="Initial stock on product creation"
        )
        db.add(tx)

    db.commit()
    db.refresh(product)
    res = ProductResponse.model_validate(product)
    res.is_low_stock = product.current_stock <= product.reorder_threshold
    return res

@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: int,
    product_update: ProductUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    update_data = product_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(product, field, value)

    db.commit()
    db.refresh(product)
    res = ProductResponse.model_validate(product)
    res.is_low_stock = product.current_stock <= product.reorder_threshold
    return res

@router.delete("/{product_id}", status_code=status.HTTP_200_OK)
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER))
):
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Product not found")

    # Business rule: Check if product has sales history
    orders_count = db.query(SalesOrderItem).filter(SalesOrderItem.product_id == product_id).count()
    if orders_count > 0:
        # Soft delete / deactivate to preserve financial & audit history
        product.is_active = False
        db.commit()
        return {"message": f"Product '{product.name}' is referenced in {orders_count} orders. Deactivated instead of permanently removed to preserve audit trails."}

    # If no order history, safe to delete
    db.query(InventoryTransaction).filter(InventoryTransaction.product_id == product_id).delete()
    db.delete(product)
    db.commit()
    return {"message": f"Product '{product.name}' deleted successfully."}

