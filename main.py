# main.py
from fastapi import FastAPI
from rotas import router # Importamos as rotas que acabamos de criar

# Inicializamos o app
app = FastAPI(title="Extrator de Documentos com IA")

# Conectamos as rotas ao app principal
app.include_router(router)