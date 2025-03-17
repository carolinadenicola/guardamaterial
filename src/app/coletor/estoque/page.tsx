"use client";
import { useState, useEffect, useRef } from "react";
import { FaArrowLeft, FaRegEdit, FaRegQuestionCircle, FaSpinner } from "react-icons/fa";
import { CiLogin, CiCircleRemove } from "react-icons/ci";
import { IoWarningOutline } from "react-icons/io5";
import { mockData } from "@/testUtils/mockups/mockData";
import { ItemColetor } from "@/types/ItemColetor";
import axios, { AxiosError } from "axios";
import ModalPadrao from "@/components/ModalPadrao/ModalPadrao";
import ModalEditar from "@/components/ModalEditar/ModalEditar";
import ModalConfirmar from "@/components/ModalConfirmar/ModalConfirmar";
import styles from "./Estoque.module.scss";
import { APITotvs } from "@/utils/api/endpointsTotvs";
import ModalReserva from "@/components/ModalReserva/ModalReserva";
import ModalContagem from "@/components/ModalContagem/ModalContagem";
import { RESPONSE_LIMIT_DEFAULT } from "next/dist/server/api-utils";

export default function Estoque() {
  const [codigoLocal, setCodigoLocal] = useState("");
  const [codigoItem, setCodigoItem] = useState("");
  const [itens, setItens] = useState<ItemColetor[]>([]);
  const [usarMesmoLocalReserva, setUsarMesmoLocalReserva] = useState(false);
  const [localReserva, setLocalReserva] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalMessage, setModalMessage] = useState("");
  const [corIcone, setCorIcone] = useState("");
  const [modalIcon, setModalIcon] = useState<React.ReactNode>(null);
  const [itemEditando, setItemEditando] = useState<ItemColetor | null>(null);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showReservaModal, setShowReservaModal] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const [showContagemModal, setShowContagemModal] = useState(false);
  const [quantidadeContada, setQuantidadeContada] = useState(0);
  const [itemEmContagem, setItemEmContagem] = useState<ItemColetor | null>(null);

  // Estados para controle da reserva e contagem
const [itemParaReserva, setItemParaReserva] = useState<ItemColetor | null>(null); // Item que será armazenado em outro local
const [quantidadeRestante, setQuantidadeRestante] = useState(0); // Quantidade restante a ser armazenada



  const codigoItemRef = useRef<HTMLInputElement>(null);
  const codigoLocalRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setItens((prevItens) =>
        prevItens.filter((item) => item.qtdeAtual !== item.quantidade)
      );
    }, 10000);

    return () => clearInterval(interval);
  }, [itens]);


  useEffect(() => {
    carregarItens();
  }, []);

  const carregarItens = async () => {
    try {
      setIsLoading(true);
      // const usuarioLogado = localStorage.getItem("usuario");
      const usuarioLogado = "jgriti";

      // if (!usuarioLogado) {
      //   console.warn("Usuário não encontrado no localStorage.");
      //   return;
      // }

      // Faz a requisição para buscar os itens em transporte do usuário
      const response = await APITotvs.post("/guardaMaterial/listaDocumento", {
        status: 3,
        usuario: usuarioLogado
      });

      const itensFiltrados: ItemColetor[] = response.data?.documentos?.map((item: any) => ({
        codigoItem: item.item,
        codigoInteiro: item.documento,
        qtdeAtual: 0,
        qtdeFinal: item.quantidadeTransferencia ?? 0,
        status: item.status,
        localizacao: item.localizacao,
        local: item.localizacao,
      })) || [];


      setItens(itensFiltrados);
    } catch (error) {
      console.error("Erro ao carregar itens:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDownLocal = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      adicionarItem();
      e.preventDefault();
    }
  };

  const handleKeyDownItem = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      adicionarItem();
      e.preventDefault();
    }
  };

  const handleEnter = (e: React.KeyboardEvent<HTMLInputElement>, nextRef: React.RefObject<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      nextRef.current?.focus();
    }
  };



  const adicionarItem = () => {
    try {
      if (!codigoItem.includes("|") || !codigoItem.includes("/")) {
        setModalIcon(<IoWarningOutline />);
        setCorIcone("#E46962");
        setModalMessage(`Formato inválido do código: ${codigoItem}`);
        setShowModal(true);
        return;
      }

      const [codigoItemBase, resto] = codigoItem.split("|");
      const [quantidadeStr, informacoesNota] = resto.split("/");
      const quantidadeParaContar = parseInt(quantidadeStr, 10);

      if (isNaN(quantidadeParaContar) || quantidadeParaContar <= 0) {
        setModalIcon(<IoWarningOutline />);
        setCorIcone("#E46962");
        setModalMessage(`Quantidade inválida no código: ${codigoItem}`);
        setShowModal(true);
        return;
      }

      const chaveDocumentoReconstruida = `${codigoItemBase}/${informacoesNota}`;
      const itemExistente = itens.find((item) => item.codigoInteiro === chaveDocumentoReconstruida);

      if (!itemExistente) {
        setModalIcon(<IoWarningOutline />);
        setModalMessage("Item não encontrado na lista.");
        setShowModal(true);
        return;
      }

      if (itemExistente.localizacao !== codigoLocal) {
        setModalIcon(<IoWarningOutline />);
        setModalMessage(`O local inserido (${codigoLocal}) não corresponde ao cadastrado.`);
        setShowModal(true);
        return;
      }

      if (quantidadeParaContar > itemExistente.qtdeFinal) {
        setModalIcon(<IoWarningOutline />);
        setCorIcone("#E46962");
        setModalMessage(`Quantidade maior que a permitida! Máximo: ${itemExistente.qtdeFinal}`);
        setShowModal(true);
        return;
      }

      if (quantidadeParaContar === itemExistente.qtdeFinal) {
        transferirItem(itemExistente);
        // setModalIcon(<CiLogin />);
        // setModalMessage(`Item ${itemExistente.codigoInteiro} alterado para estoque.`);
        // setShowModal(true);
        return;
      }

      // ✅ Armazena o item e inicia a contagem já com a primeira quantidade
      setItemEmContagem(itemExistente);
      setQuantidadeContada(quantidadeParaContar);
      setShowContagemModal(true);

      setCodigoLocal("");
      setCodigoItem("");
    } catch (error) {
      setModalIcon(<IoWarningOutline />);
      setCorIcone("#E46962");
      setModalMessage(`Erro ao processar item ${codigoItem}.`);
      setShowModal(true);
    }
  };



  const confirmarReserva = async (localReserva: string, codigoItem: string) => {
    if (!localReserva || !codigoItem) {
      setModalMessage("Local ou item inválido.");
      setModalIcon(<IoWarningOutline />);
      setCorIcone("#E46962");
      setShowModal(true);
      return;
    }

    if (!itemParaReserva) {
      console.error("Erro: Nenhum item selecionado para reserva.");
      setModalMessage("Erro: Nenhum item selecionado para reserva.");
      setModalIcon(<IoWarningOutline />);
      setCorIcone("#E46962");
      setShowModal(true);
      return; // Sai da função para evitar erro
    }
  
    try {
      const usuarioLogado = "jgriti";
      const payload = {
        documentos: [{
          chaveDocumento: itemParaReserva.codigoInteiro,
          usuario: usuarioLogado,
          novoStatus: 99,
          localizacoes: [{ quantidade: quantidadeRestante, localizacao: localReserva }]
        }]
      };
  
      await APITotvs.post("/guardaMaterial/mudaStatus", payload);
      setModalMessage("Item armazenado com sucesso.");
      setShowModal(true);
      carregarItens();
    } catch {
      setModalMessage("Erro ao armazenar item.");
      setShowModal(true);
    }
  
    setShowReservaModal(false);
    setItemParaReserva(null);
  };
  


  const transferirItem = async (item: ItemColetor) => {
    try {
      const usuarioLogado = "jgriti"
      console.log("chegou aqui")
      const payload = {
        documentos: [{
          chaveDocumento: item.codigoInteiro,
          usuario: usuarioLogado,
          localizacoes: [{
            quantidade: item.qtdeFinal,
            localizacao: item.localizacao
          }]
        }]
      }
      console.log(payload)

      console.log("Payload enviado:", JSON.stringify(payload, null, 2));
      const respostaAPI = await APITotvs.post("/guardaMaterial/transferenciarecebimento", JSON.stringify(payload), {
        headers: { "Content-Type": "application/json" },
      });

      console.log(respostaAPI)

      if (respostaAPI.data?.erros?.length > 0) {
        setModalIcon(<IoWarningOutline />);
        setCorIcone("#E46962");
        setModalMessage(`Erro ao transferir parcial: ${respostaAPI.data.erros[0].mensagem}`);
        setShowModal(true);
        return;
      }

      if (respostaAPI.data?.sucesso?.length > 0) {
        setModalIcon(<CiLogin />);
        setCorIcone("#009951");
        setModalMessage(`Item ${item.codigoItem} foi transferido para ESTOQUE com quantidade ${item.qtdeFinal}.`);
        setShowModal(true);
        carregarItens();
        return;
      }

      setModalIcon(<IoWarningOutline />);
      setCorIcone("#E46962");
      setModalMessage("Resposta inesperada da API. Nenhum erro ou sucesso identificado.");
      setShowModal(true);
    } catch (error) {
      setModalIcon(<IoWarningOutline />);
      setCorIcone("#E46962");

      let errorMessage = "Erro desconhecido";
      if (error instanceof AxiosError && error.response) {
        errorMessage = error.response.data?.message || "Erro desconhecido no servidor";
      }

      setModalMessage(`Erro ao buscar o item ${codigoItem}.\nMensagem: ${errorMessage}`);
      setShowModal(true);
    }
  };

  const adicionarQuantidade = (quantidade: number) => {
    setQuantidadeContada((prevQtde) => prevQtde + quantidade);
  };



  async function finalizarTransferenciaSemReserva(itemEmContagem: ItemColetor) {
    try {
      const usuarioLogado = "jgriti"
      console.log("chegou aqui")

      const payload = {
        documentos: [{
          chaveDocumento: itemEmContagem.codigoInteiro,
          usuario: usuarioLogado,
          localizacoes: [{
            quantidade: itemEmContagem.qtdeFinal,
            localizacao: itemEmContagem.localizacao
          }]
        }]
      }
      console.log(payload)

      const respostaAPI = await APITotvs.post("/guardaMaterial/transferenciarecebimento", JSON.stringify(payload), {
        headers: { "Content-Type": "application/json" },
      });
      if (respostaAPI.data?.erros?.length > 0) {
        setModalIcon(<IoWarningOutline />);
        setCorIcone("#E46962");
        setModalMessage(`Erro ao transferir parcial: ${respostaAPI.data.erros[0].mensagem}`);
        setShowModal(true);
        return;
      }

      if (respostaAPI.data?.sucesso?.length > 0) {
        setModalIcon(<CiLogin />);
        setCorIcone("#009951");
        setModalMessage(`Item ${itemEmContagem.codigoItem} foi transferido para ESTOQUE com quantidade ${itemEmContagem.qtdeFinal}.`);
        setShowModal(true);
        carregarItens();
        return;
      }

      setModalIcon(<IoWarningOutline />);
      setCorIcone("#E46962");
      setModalMessage("Resposta inesperada da API. Nenhum erro ou sucesso identificado.");
      setShowModal(true);
    } catch (error) {
      setModalIcon(<IoWarningOutline />);
      setCorIcone("#E46962");

      let errorMessage = "Erro desconhecido";
      if (error instanceof AxiosError && error.response) {
        errorMessage = error.response.data?.message || "Erro desconhecido no servidor";
      }

      setModalMessage(`Erro ao buscar o item ${codigoItem}.\nMensagem: ${errorMessage}`);
      setShowModal(true);
    }
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>ADICIONAR AO ESTOQUE</h1>
        <button className={styles.voltar} onClick={() => window.history.back()}>
          <FaArrowLeft size={20} color="#34408E" />
        </button>
      </div>

      <div>
        <div className={styles.inputContainer}>
          <label htmlFor="codigoLocal">LOCAL</label>
          <input
            id="codigoLocal"
            type="text"
            ref={codigoLocalRef}
            value={codigoLocal}
            onChange={(e) => setCodigoLocal(e.target.value)}
            onKeyDown={(e) => handleEnter(e, codigoItemRef)}
            placeholder="Leia ou digite o local"
          />
        </div>

        <div className={styles.inputContainer}>
          <label htmlFor="codigoItem">ITEM</label>
          <input
            id="codigoItem"
            type="text"
            ref={codigoItemRef}
            value={codigoItem}
            onChange={(e) => setCodigoItem(e.target.value)}
            onKeyDown={handleKeyDownItem}
            placeholder="Leia ou digite o código do item"
          />
        </div>
      </div>

      {isLoading ? (
        <div className={styles.loadingContainer}>
          <FaSpinner className={styles.spinner} />
          <p>Carregando itens...</p>
        </div>
      ) : itens.length > 0 ? (


        <div className={styles.tableContainer}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th className={styles.th}>ITEM</th>
                <th className={styles.th}>LOCAL</th>
                <th className={styles.th}>QTDE</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((item, index) => {
                const corLinha =
                  item.qtdeAtual === item.qtdeFinal ? styles.verde : styles.cinza;

                return (
                  <tr key={`${item.codigoInteiro}-${index}`} className={corLinha}>
                    <td>{item.codigoItem}</td>
                    <td>{item.localizacao}</td>
                    <td>{item.qtdeFinal}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={styles.mensagemVazia}>O usuário não possui itens com status "Em Transporte".</p>
      )}

      {showModal && (
        <ModalPadrao
          icon={modalIcon}
          iconColor={corIcone}
          message={modalMessage}
          onClose={() => setShowModal(false)}
        />
      )}

        {showContagemModal && itemEmContagem && (
          <ModalContagem
            onClose={() => setShowContagemModal(false)}
            onConfirm={() => finalizarTransferenciaSemReserva(itemEmContagem)}
            onReservaRestante={(quantidadeInserida) => {
              setItemParaReserva(itemEmContagem);
              setShowContagemModal(false);
              setShowReservaModal(true);
              setQuantidadeRestante(itemEmContagem.qtdeFinal - quantidadeInserida);
            }}
            qtdeFinal={itemEmContagem.qtdeFinal}
            codigoItem={itemEmContagem.codigoInteiro}
            primeiraQuantidade={quantidadeContada}
            onError={(mensagem) => {
              setModalMessage(mensagem);
              setModalIcon(<IoWarningOutline />);
              setCorIcone("#E46962");
              setShowModal(true);
            }}
          />
        )}

        {showReservaModal && itemParaReserva && (
          <ModalReserva
            onClose={() => setShowReservaModal(false)}
            onConfirm={confirmarReserva}
            quantidadeRestante={quantidadeRestante}
          />
        )}

      {/* {showContagemModal && itemEmContagem && (
        <ModalContagem
          onClose={() => setShowContagemModal(false)}
          onConfirm={() => finalizarTransferenciaSemReserva(itemEmContagem)}
          qtdeFinal={itemEmContagem.qtdeFinal}
          codigoItem={itemEmContagem.codigoInteiro}
          itemCompleto={itemEmContagem}
          primeiraQuantidade={quantidadeContada}
          onError={(mensagem) => {
            setModalMessage(mensagem);
            setModalIcon(<IoWarningOutline />);
            setCorIcone("#E46962");
            setShowModal(true);
          }}
        />
      )} */}




    </div>
  );
}
