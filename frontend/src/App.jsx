import { useState } from 'react';
import './App.css';

function App() {
  const [perfilAtual, setPerfilAtual] = useState("COMUM");
  const [isDragging, setIsDragging] = useState(false);
  const [statusTela, setStatusTela] = useState("UPLOAD"); // UPLOAD, LOADING, DASHBOARD, LISTAGEM
  const [textoLoading, setTextoLoading] = useState("");
  
  const [idDocumento, setIdDocumento] = useState(null);
  const [jsonBruto, setJsonBruto] = useState(null);
  const [alertaValidacao, setAlertaValidacao] = useState(null); // Guarda o alerta de divergência
  const [listaDocumentos, setListaDocumentos] = useState([]); // Guarda os documentos do banco

  const [formulario, setFormulario] = useState({
    nome_completo: "",
    documento: "",
    data_emissao: "",
    referencia: "",
    tipo_arquivo: ""
  });

  const isComum = perfilAtual === "COMUM";

  const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = () => { setIsDragging(false); };
  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      enviarParaAPI(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      enviarParaAPI(e.target.files[0]);
    }
  };

  const enviarParaAPI = async (arquivo) => {
    setStatusTela("LOADING");
    setTextoLoading("Enviando arquivo para o servidor...");
    setTimeout(() => setTextoLoading("A Inteligência Artificial está lendo o documento..."), 1500);

    const formData = new FormData();
    formData.append('file', arquivo);

    try {
      const resposta = await fetch('http://127.0.0.1:8000/extrair-dados/', {
        method: 'POST',
        body: formData
      });
      const resultado = await resposta.json();

      if (resultado.status === "sucesso") {
        setIdDocumento(resultado.id_documento);
        setJsonBruto(resultado.json_bruto || resultado.dados_extraidos);
        setAlertaValidacao(resultado.alerta); // Pega o alerta se a IA enviou
        
        setFormulario({
          nome_completo: resultado.dados_extraidos.nome_completo || "",
          documento: resultado.dados_extraidos.documento || "",
          data_emissao: resultado.dados_extraidos.data_emissao || "",
          referencia: resultado.dados_extraidos.referencia || "",
          tipo_arquivo: resultado.dados_extraidos.tipo_arquivo || "Desconhecido"
        });
        setStatusTela("DASHBOARD");
      } else {
        alert("Erro na extração: " + (resultado.detail || "Verifique o console."));
        setStatusTela("UPLOAD");
      }
    } catch (erro) {
      alert("Erro ao conectar com o servidor.");
      setStatusTela("UPLOAD");
    }
  };

  const buscarDocumentos = async () => {
    try {
      setStatusTela("LOADING");
      setTextoLoading("Buscando documentos no banco de dados...");
      
      const resposta = await fetch('http://127.0.0.1:8000/documentos/');
      const resultado = await resposta.json();
      
      if (resultado.status === "sucesso") {
        setListaDocumentos(resultado.documentos);
        setStatusTela("LISTAGEM");
      } else {
        alert("Erro ao buscar documentos.");
        setStatusTela("UPLOAD");
      }
    } catch (erro) {
      alert("Erro de conexão.");
      setStatusTela("UPLOAD");
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormulario(prev => ({ ...prev, [name]: value }));
  };

  const salvarAlteracoes = async () => {
    try {
      const resposta = await fetch(`http://127.0.0.1:8000/documentos/${idDocumento}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'user-profile': perfilAtual
        },
        body: JSON.stringify(formulario)
      });
      const resultado = await resposta.json();
      if (resposta.ok) alert("✅ " + resultado.mensagem);
      else alert("❌ Erro: " + resultado.detail);
    } catch (erro) {
      console.error(erro);
    }
  };

  const deletarDocumento = async () => {
    if (!window.confirm("Tem certeza que deseja apagar este documento?")) return;
    try {
      const resposta = await fetch(`http://127.0.0.1:8000/documentos/${idDocumento}`, {
        method: 'DELETE',
        headers: { 'user-profile': perfilAtual }
      });
      const resultado = await resposta.json();
      if (resposta.ok) {
        alert("✅ " + resultado.mensagem);
        setStatusTela("UPLOAD"); 
      } else {
        alert("❌ Erro: " + resultado.detail);
      }
    } catch (erro) {
      console.error(erro);
    }
  };

  return (
    <div className="container" style={{ maxWidth: statusTela === 'LISTAGEM' ? '900px' : '500px' }}>
      <div style={{ textAlign: 'right', marginBottom: '20px', fontSize: '14px', display: 'flex', justifyContent: 'space-between' }}>
        
        {/* Botão de Ver Tabela */}
        {statusTela !== "LISTAGEM" ? (
          <button onClick={buscarDocumentos} style={{ padding: '5px 10px', cursor: 'pointer' }}>📋 Ver Documentos Salvos</button>
        ) : (
          <button onClick={() => setStatusTela("UPLOAD")} style={{ padding: '5px 10px', cursor: 'pointer' }}>➕ Fazer Novo Upload</button>
        )}

        <div>
            <label><b>Simular Perfil:</b> </label>
            <select value={perfilAtual} onChange={(e) => setPerfilAtual(e.target.value)}>
            <option value="COMUM">Usuário Comum (Apenas Leitura)</option>
            <option value="ADM">Administrador (Pode Editar/Deletar)</option>
            </select>
        </div>
      </div>

      <h1>Extrator de Documentos com IA</h1>

      {statusTela === "UPLOAD" && (
        <div 
          className={`drag-drop-zone ${isDragging ? 'arrastando' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <p>Arraste e solte seu arquivo aqui<br/><small>(PDF, JPG, PNG, CSV, XLSX)</small></p>
          <p>ou</p>
          <input type="file" id="input-arquivo" hidden onChange={handleFileSelect} />
          <button onClick={() => document.getElementById('input-arquivo').click()}>
            Selecione o arquivo
          </button>
        </div>
      )}

      {statusTela === "LOADING" && (
        <div className="loading-container">
          <div className="spinner"></div>
          <h3>{textoLoading}</h3>
        </div>
      )}

      {/* TELA DE LISTAGEM */}
      {statusTela === "LISTAGEM" && (
          <div>
              <h2>Documentos Processados</h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '20px', textAlign: 'left' }}>
                  <thead>
                      <tr style={{ backgroundColor: '#f1f1f1', borderBottom: '2px solid #ccc' }}>
                          <th style={{ padding: '10px' }}>Tipo</th>
                          <th style={{ padding: '10px' }}>Nome</th>
                          <th style={{ padding: '10px' }}>CPF/CNPJ</th>
                          <th style={{ padding: '10px' }}>Emissão</th>
                      </tr>
                  </thead>
                  <tbody>
                      {listaDocumentos.length === 0 ? (
                          <tr><td colSpan="4" style={{ textAlign: 'center', padding: '20px' }}>Nenhum documento encontrado no banco.</td></tr>
                      ) : (
                          listaDocumentos.map((doc, index) => (
                              <tr key={index} style={{ borderBottom: '1px solid #eee' }}>
                                  <td style={{ padding: '10px', fontWeight: 'bold', color: '#007bff' }}>{doc.tipo_arquivo || "-"}</td>
                                  <td style={{ padding: '10px' }}>{doc.nome_completo || "-"}</td>
                                  <td style={{ padding: '10px' }}>{doc.documento || "-"}</td>
                                  <td style={{ padding: '10px' }}>{doc.data_emissao || "-"}</td>
                              </tr>
                          ))
                      )}
                  </tbody>
              </table>
          </div>
      )}

      {statusTela === "DASHBOARD" && (
        <div id="dashboard">
          <h2 style={{color: '#28a745', textAlign: 'center'}}>✅ Extração Concluída!</h2>
          
          {/* ALERTA DE DIVERGÊNCIA DE NOME */}
          {alertaValidacao && (
            <div style={{ backgroundColor: '#fff3cd', color: '#856404', padding: '15px', borderRadius: '5px', marginTop: '15px', borderLeft: '5px solid #ffeeba', fontWeight: 'bold', fontSize: '14px' }}>
                ⚠️ {alertaValidacao}
            </div>
          )}

          <div className="formulario" style={{display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px'}}>
            
            <div style={{display: 'flex', justifyContent: 'space-between'}}>
                <label>Tipo Arquivo:</label>
                <span style={{ fontWeight: 'bold', color: '#007bff'}}>{formulario.tipo_arquivo}</span>
            </div>

            <label>Nome Completo:</label>
            <input type="text" name="nome_completo" value={formulario.nome_completo} onChange={handleInputChange} disabled={isComum} />
            
            <label>Documento (CPF/CNPJ):</label>
            <input type="text" name="documento" value={formulario.documento} onChange={handleInputChange} disabled={isComum} />
            
            <label>Data de Emissão:</label>
            <input type="text" name="data_emissao" value={formulario.data_emissao} onChange={handleInputChange} disabled={isComum} />
            
            <label>Referência:</label>
            <input type="text" name="referencia" value={formulario.referencia} onChange={handleInputChange} disabled={isComum} />
            
            {!isComum && (
              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button onClick={salvarAlteracoes} style={{ backgroundColor: '#28a745' }}>Salvar Alterações</button>
                <button onClick={deletarDocumento} style={{ backgroundColor: '#dc3545' }}>Excluir Documento</button>
              </div>
            )}
          </div>
          
          <div style={{ marginTop: '25px', textAlign: 'left' }}>
            <h3 style={{ fontSize: '14px', color: '#444', marginBottom: '8px' }}>JSON Bruto (Depuração Técnica)</h3>
            <pre style={{ 
              backgroundColor: '#272822', 
              color: '#f8f8f2', 
              padding: '15px', 
              borderRadius: '8px', 
              overflowX: 'auto', 
              fontSize: '13px',
              border: '1px solid #111'
            }}>
              {typeof jsonBruto === 'string' ? jsonBruto : JSON.stringify(jsonBruto, null, 4)}
            </pre>
          </div>
          
          <br/>
          <button onClick={() => setStatusTela("UPLOAD")} className="btn-voltar" style={{backgroundColor: '#6c757d', width: '100%'}}>
            Processar Novo Documento
          </button>
        </div>
      )}
    </div>
  );
}

export default App;