from sqlalchemy import Column, Integer, String, Float, ForeignKey, DateTime, Date, Boolean
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
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=None, nullable=True)

    transactions = relationship("Transaction", back_populates="user")
    accounts = relationship("Account", back_populates="user")
    upload_sessions = relationship("UploadSession", back_populates="user")


class UploadSession(Base):
    """Track upload sessions (both bulk CSV uploads and manual entry sessions)"""
    __tablename__ = "upload_sessions"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    upload_type = Column(String, nullable=False)  # "bulk" or "manual"
    transaction_count = Column(Integer, default=0, nullable=False)
    upload_date = Column(DateTime, default=datetime.utcnow, nullable=False)
    min_transaction_date = Column(Date, nullable=True)  # Earliest transaction date in this upload
    max_transaction_date = Column(Date, nullable=True)  # Most recent transaction date in this upload
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    user = relationship("User", back_populates="upload_sessions")
    transactions = relationship("Transaction", back_populates="upload_session")


class Transaction(Base):
    __tablename__ = "transactions"
    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, nullable=False)  # "income" or "expense"
    category = Column(String, nullable=False)
    store = Column(String, nullable=False)  # NOW MANDATORY
    amount = Column(Float, nullable=False)
    description = Column(String, nullable=True)
    transaction_date = Column(Date, nullable=False)  # Date of actual transaction
    tag = Column(String, nullable=True)  # Optional tag for grouping (e.g., "vacation", "holiday gifts")
    is_bulk_upload = Column(Boolean, default=False, nullable=False)  # True if from CSV, False if manual
    upload_session_id = Column(Integer, ForeignKey("upload_sessions.id"), nullable=True)  # Link to upload session
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)  # When record was created
    updated_at = Column(DateTime, default=None, nullable=True)  # When record was last updated (null if never updated)
    user_id = Column(Integer, ForeignKey("users.id"))

    user = relationship("User", back_populates="transactions")
    upload_session = relationship("UploadSession", back_populates="transactions")


class Account(Base):
    __tablename__ = "accounts"
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)  # e.g., "Chase Checking", "401k"
    account_type = Column(String, nullable=False)  # "liquid", "investment", "debt"
    balance = Column(Float, nullable=False)
    date_recorded = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=None, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"))

    user = relationship("User", back_populates="accounts")