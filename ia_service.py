# ia_service.py
import os
import json
import io
import pandas as pd
from google import genai
from google.genai import types
from dotenv import load_dotenv

load_dotenv()
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
cliente_gemini = genai.Client(api_key=GOOGLE_API_KEY)

def processar_documento_com_ia(conteudo_arquivo, tipo_arquivo):
    prompt = """
    Você é um assistente de extração de dados. 
    Analise o documento (ou texto) enviado e extraia as seguintes informações:
    - Nome Completo
    - CPF ou CNPJ
    - Data de emissão ou ocorrência
    - Período de referência (se houver)
    
    Retorne APENAS um objeto JSON válido no seguinte formato:
    {
        "nome_completo": "nome encontrado ou null",
        "documento": "cpf/cnpj encontrado ou null",
        "data_emissao": "data encontrada ou null",
        "referencia": "referencia encontrada ou null"
    }
    Não inclua formatações Markdown, apenas o texto do JSON puro.
    """
    
    # 1. Lógica para Planilhas (Excel ou CSV)
    if tipo_arquivo in ["text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]:
        if tipo_arquivo == "text/csv":
            df = pd.read_csv(io.BytesIO(conteudo_arquivo))
        else:
            df = pd.read_excel(io.BytesIO(conteudo_arquivo))
            
        # Transformamos a planilha em um texto formatado para a IA ler
        dados_texto = df.to_string()
        documento_para_ia = f"Aqui estão os dados extraídos da planilha:\n{dados_texto}"
        
    # 2. Lógica para PDF, JPG e PNG
    else:
        documento_para_ia = types.Part.from_bytes(
            data=conteudo_arquivo,
            mime_type=tipo_arquivo
        )
    
    # Enviamos para o modelo
    resposta = cliente_gemini.models.generate_content(
        model='gemini-2.5-flash',
        contents=[prompt, documento_para_ia]
    )
    
    # Limpeza da resposta
    texto_limpo = resposta.text.strip()
    if texto_limpo.startswith("```json"):
        texto_limpo = texto_limpo[7:-3].strip()

    return json.loads(texto_limpo), texto_limpo