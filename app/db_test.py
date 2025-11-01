from sqlalchemy import create_engine

engine = create_engine("sqlite:///C:/Users/Grant Hollar/OneDrive/Personal Desktop/Pet Projects/Finance App/finance.db")
conn = engine.connect()
print("Connected successfully!")
conn.close()