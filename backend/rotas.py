from fastapi import APIRouter, UploadFile, File, HTTPException, Header, Depends
from bson import ObjectId 
import json
from ia_service import processar_documento_com_ia
from database import colecao_documentos

router = APIRouter()

def verificar_admin(user_profile: str = Header(None)):
    if user_profile != "ADM":
        raise HTTPException(status_code=403, detail="Acesso negado: Somente administradores (ADM) podem realizar esta ação.")
    return user_profile

# --- ROTA DE LISTAGEM (Para exibir na tabela) ---
@router.get("/documentos/")
async def listar_documentos():
    try:
        # Busca todos os documentos no MongoDB
        documentos = list(colecao_documentos.find({}))
        # Converte o ObjectId para string para o JSON não quebrar
        for doc in documentos:
            doc["_id"] = str(doc["_id"])
        return {"status": "sucesso", "documentos": documentos}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/extrair-dados/")
async def extrair_dados_documento(file: UploadFile = File(...)):
    tipos_permitidos = ["image/jpeg", "image/png", "application/pdf", "text/csv", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"]
    
    if file.content_type not in tipos_permitidos:
        raise HTTPException(status_code=400, detail="Envie apenas PDF, JPG, PNG, CSV ou Excel (.xlsx).")
    
    # 1. PEGA O TIPO DO ARQUIVO
    nome_arquivo = file.filename or "desconhecido"
    tipo_arquivo = nome_arquivo.split(".")[-1].upper() if "." in nome_arquivo else "DESCONHECIDO"

    try:
        conteudo_arquivo = await file.read()
        dados_json, texto_bruto = processar_documento_com_ia(conteudo_arquivo, file.content_type)
        
        if isinstance(dados_json, str):
            dados_para_banco = json.loads(dados_json)
        else:
            dados_para_banco = dict(dados_json)
            
        # Salva o tipo do arquivo no dicionário
        dados_para_banco["tipo_arquivo"] = tipo_arquivo
        
        # 3. VALIDAÇÃO DE NOME CRUZADO (A DICA DO ÁUDIO)
        cpf_cnpj = dados_para_banco.get("documento")
        nome_extraido = dados_para_banco.get("nome_completo")
        alerta_validacao = None

        if cpf_cnpj and nome_extraido:
            # Procura se já tem alguém com esse documento no banco
            doc_anterior = colecao_documentos.find_one({"documento": cpf_cnpj})
            if doc_anterior:
                nome_anterior = doc_anterior.get("nome_completo")
                # Se achou e o nome for diferente, gera um alerta
                if nome_anterior and nome_anterior.strip().upper() != nome_extraido.strip().upper():
                    alerta_validacao = f"DIVERGÊNCIA: O nome neste documento ({nome_extraido}) é diferente do nosso registro no banco ({nome_anterior}) para o CPF/CNPJ {cpf_cnpj}."
                    dados_para_banco["alerta_validacao"] = alerta_validacao

        resultado_db = colecao_documentos.insert_one(dados_para_banco.copy())
        
        return {
            "status": "sucesso",
            "id_documento": str(resultado_db.inserted_id),
            "dados_extraidos": dados_para_banco,
            "json_bruto": texto_bruto,
            "alerta": alerta_validacao # Manda o alerta para o Front-end
        }
        
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail="A IA não retornou um formato JSON válido.")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/documentos/{doc_id}")
async def atualizar_documento(doc_id: str, dados_novos: dict, perfil: str = Depends(verificar_admin)):
    try:
        resultado = colecao_documentos.update_one({"_id": ObjectId(doc_id)}, {"$set": dados_novos})
        if resultado.matched_count == 0:
            raise HTTPException(status_code=404, detail="Documento não encontrado.")
        return {"status": "sucesso", "mensagem": "Documento atualizado com sucesso!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/documentos/{doc_id}")
async def deletar_documento(doc_id: str, perfil: str = Depends(verificar_admin)):
    try:
        resultado = colecao_documentos.delete_one({"_id": ObjectId(doc_id)})
        if resultado.deleted_count == 0:
            raise HTTPException(status_code=404, detail="Documento não encontrado.")
        return {"status": "sucesso", "mensagem": "Documento excluído com sucesso!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))