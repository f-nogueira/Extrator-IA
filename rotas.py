# rotas.py
from fastapi import APIRouter, UploadFile, File, HTTPException
from ia_service import processar_documento_com_ia
from database import colecao_documentos

router = APIRouter()

@router.post("/extrair-dados/")
async def extrair_dados_documento(file: UploadFile = File(...)):
    tipos_permitidos = [
        "image/jpeg", 
        "image/png", 
        "application/pdf",
        "text/csv", 
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ]
    
    if file.content_type not in tipos_permitidos:
        raise HTTPException(
            status_code=400, 
            detail="Envie apenas PDF, JPG, PNG, CSV ou Excel (.xlsx)."
        )
    
    try:
        conteudo_arquivo = await file.read()
        
        dados_json, texto_bruto = processar_documento_com_ia(
            conteudo_arquivo, 
            file.content_type
        )
        
        resultado_db = colecao_documentos.insert_one(dados_json.copy())
        
        return {
            "status": "sucesso",
            "id_salvo_no_banco": str(resultado_db.inserted_id),
            "dados_extraidos": dados_json,
            "json_bruto": texto_bruto
        }
        
    except Exception as e:
        return {"status": "erro", "detalhe": str(e)}