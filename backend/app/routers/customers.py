from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from sqlalchemy import or_
from app.database import get_db
from app.models.customer import Customer
from app.models.order import SalesOrder
from app.models.user import User, UserRole
from app.schemas.customer import CustomerCreate, CustomerUpdate, CustomerResponse
from app.utils.dependencies import get_current_user, require_roles

router = APIRouter(prefix="/customers", tags=["Customers"])

@router.get("", response_model=List[CustomerResponse])
def list_customers(
    search: Optional[str] = Query(None, description="Search by name, email, phone, company, or city"),
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(Customer).filter(Customer.is_active == True)

    if search:
        search_filter = f"%{search}%"
        query = query.filter(
            or_(
                Customer.name.ilike(search_filter),
                Customer.email.ilike(search_filter),
                Customer.phone.ilike(search_filter),
                Customer.company_name.ilike(search_filter),
                Customer.city.ilike(search_filter)
            )
        )

    return query.order_by(Customer.name.asc()).offset(skip).limit(limit).all()

@router.get("/{customer_id}", response_model=CustomerResponse)
def get_customer(customer_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")
    return customer

@router.post("", response_model=CustomerResponse, status_code=status.HTTP_201_CREATED)
def create_customer(
    customer_in: CustomerCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    customer = Customer(
        name=customer_in.name.strip(),
        email=customer_in.email.lower().strip(),
        phone=customer_in.phone.strip(),
        address=customer_in.address.strip(),
        city=customer_in.city.strip() if customer_in.city else None,
        company_name=customer_in.company_name.strip() if customer_in.company_name else None,
        is_active=customer_in.is_active
    )
    db.add(customer)
    db.commit()
    db.refresh(customer)
    return customer

@router.put("/{customer_id}", response_model=CustomerResponse)
def update_customer(
    customer_id: int,
    customer_update: CustomerUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    update_data = customer_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        if value is not None and isinstance(value, str):
            value = value.strip()
            if field == "email":
                value = value.lower()
        setattr(customer, field, value)

    db.commit()
    db.refresh(customer)
    return customer

@router.delete("/{customer_id}", status_code=status.HTTP_200_OK)
def delete_customer(
    customer_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.ADMIN, UserRole.MANAGER))
):
    customer = db.query(Customer).filter(Customer.id == customer_id).first()
    if not customer:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Customer not found")

    orders_count = db.query(SalesOrder).filter(SalesOrder.customer_id == customer_id).count()
    if orders_count > 0:
        customer.is_active = False
        db.commit()
        return {"message": f"Customer '{customer.name}' has {orders_count} associated orders. Deactivated to preserve order history."}

    db.delete(customer)
    db.commit()
    return {"message": f"Customer '{customer.name}' deleted successfully."}

