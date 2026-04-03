# database.py
import os
from pymongo import MongoClient
from dotenv import load_dotenv

# Carrega as variáveis que escondemos no arquivo .env
load_dotenv()

# Puxa a string de conexão da nuvem
MONGO_URI = os.getenv("MONGO_URI")

# Conecta ao MongoDB Atlas
cliente_mongo = MongoClient(MONGO_URI)

# Selecionamos o banco e a coleção
db = cliente_mongo["extrator_ia_db"]
colecao_documentos = db["documentos"]