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

    transactions = relationship("Transaction", back_populates="user")
    accounts = relationship("Account", back_populates="user")


class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, nullable=False)  # "income" or "expense"
    category = Column(String, nullable=False)
    store = Column(String, nullable=True)
    amount = Column(Float, nullable=False)
    description = Column(String, nullable=True)
    transaction_date = Column(Date, nullable=False)  # Date of actual transaction
    date_added = Column(DateTime, default=datetime.utcnow)  # When it was added to system
    user_id = Column(Integer, ForeignKey("users.id"))

    user = relationship("User", back_populates="transactions")


class Account(Base):
    __tablename__ = "accounts"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # e.g., "Chase Checking", "401k"
    account_type = Column(String, nullable=False)  # "liquid", "investment", "debt"
    balance = Column(Float, nullable=False)
    date_recorded = Column(DateTime, default=datetime.utcnow)
    user_id = Column(Integer, ForeignKey("users.id"))

    user = relationship("User", back_populates="accounts")