from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Date
from sqlalchemy.orm import relationship
from datetime import datetime
from .database import Base

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    first_name = Column(String, nullable=False)
    last_name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)

    transactions = relationship("Transaction", back_populates="user")
    account_definitions = relationship("AccountDefinition", back_populates="user")
    account_records = relationship("AccountRecord", back_populates="user")


class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, nullable=False)  # "income" or "expense"
    category = Column(String, nullable=False)
    store = Column(String, nullable=True)
    amount = Column(Float, nullable=False)
    description = Column(String, nullable=True)
    transaction_date = Column(Date, nullable=False)
    date_added = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))

    user = relationship("User", back_populates="transactions")


class AccountDefinition(Base):
    """Defines an account (e.g., 'Chase Checking', '401k')"""
    __tablename__ = "account_definitions"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # e.g., "Chase Checking", "401k"
    category = Column(String, nullable=False)  # "liquid", "investments", "debt"
    user_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="account_definitions")
    records = relationship("AccountRecord", back_populates="account_definition")


class AccountRecord(Base):
    """Records a balance snapshot for an account at a specific date"""
    __tablename__ = "account_records"
    id = Column(Integer, primary_key=True, index=True)
    account_definition_id = Column(Integer, ForeignKey("account_definitions.id"))
    balance = Column(Float, nullable=False)
    record_date = Column(Date, nullable=False)  # Date of the snapshot
    created_at = Column(DateTime, default=datetime.utcnow)  # When it was added
    user_id = Column(Integer, ForeignKey("users.id"))

    account_definition = relationship("AccountDefinition", back_populates="records")
    user = relationship("User", back_populates="account_records")