from typing import List, Optional
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import desc
from app.database import get_db
from app.models.product import Product
from app.models.inventory import InventoryTransaction, InventoryChangeType
from app.models.user import User, UserRole
from app.schemas.product import ProductResponse, ProductStockAdjust
from app.schemas.inventory import InventoryTransactionResponse, RestockRequest
from app.services.inventory_service import InventoryService
from app.utils.dependencies import get_current_user, require_roles

router = APIRouter(prefix="/inventory", tags=["Inventory"])

@router.get("/stock", response_model=List[ProductResponse])
def get_inventory_stock(
    is_low_stock: Optional[bool] = None,
    category: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Product).filter(Product.is_active == True)
    if is_low_stock is True:
        query = query.filter(Product.current_stock <= Product.reorder_threshold)
    elif is_low_stock is False:
        query = query.filter(Product.current_stock > Product.reorder_threshold)

    if category:
        query = query.filter(Product.category == category)
    if search:
        search_f = f"%{search}%"
        query = query.filter(Product.name.ilike(search_f) | Product.sku.ilike(search_f))

    products = query.order_by(Product.current_stock.asc()).all()
    result = []
    for p in products:
        item = ProductResponse.model_validate(p)
        item.is_low_stock = p.current_stock <= p.reorder_threshold
        result.append(item)
    return result

@router.get("/transactions", response_model=List[InventoryTransactionResponse])
def get_inventory_transactions(
    product_id: Optional[int] = None,
    change_type: Optional[InventoryChangeType] = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Returns the comprehensive inventory movement audit trail.
    """
    query = db.query(InventoryTransaction)
    if product_id:
        query = query.filter(InventoryTransaction.product_id == product_id)
    if change_type:
        query = query.filter(InventoryTransaction.change_type == change_type)

    transactions = query.order_by(desc(InventoryTransaction.created_at)).offset(skip).limit(limit).all()

    result = []
    for tx in transactions:
        item = InventoryTransactionResponse.model_validate(tx)
        item.product_name = tx.product.name if tx.product else "N/A"
        item.product_sku = tx.product.sku if tx.product else "N/A"
        item.performed_by_username = tx.performed_by_user.username if tx.performed_by_user else "System"
        result.append(item)
    return result

@router.post("/restock", response_model=ProductResponse)
def restock_inventory(
    req: RestockRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER))
):
    product = InventoryService.restock_product(
        db=db,
        product_id=req.product_id,
        quantity=req.quantity,
        user_id=current_user.id,
        notes=req.notes
    )
    res = ProductResponse.model_validate(product)
    res.is_low_stock = product.current_stock <= product.reorder_threshold
    return res

@router.post("/adjust/{product_id}", response_model=ProductResponse)
def adjust_inventory_stock(
    product_id: int,
    req: ProductStockAdjust,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER))
):
    product = InventoryService.adjust_stock(
        db=db,
        product_id=product_id,
        quantity_change=req.quantity_change,
        user_id=current_user.id,
        notes=req.notes
    )
    res = ProductResponse.model_validate(product)
    res.is_low_stock = product.current_stock <= product.reorder_threshold
    return res

