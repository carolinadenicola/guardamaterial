import React, { useState } from "react";
import styles from "./ModalAutenticacao.module.scss";

interface ModalAutenticacaoProps {
  onClose: () => void;
  onAuthenticate: (matricula: string, senha: string) => void;
}

const ModalAutenticacao: React.FC<ModalAutenticacaoProps> = ({ onClose, onAuthenticate }) => {
  const [matricula, setMatricula] = useState("");
  const [senha, setSenha] = useState("");

  return (
    <div className={styles.modalBackdrop}>
      <div className={styles.modalContent}>
        <h3>Autenticação Necessária</h3>
        <label>Matrícula:</label>
        <input type="text" value={matricula} onChange={(e) => setMatricula(e.target.value)} />
        
        <label>Senha:</label>
        <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} />

        <div className={styles.actions}>
          <button onClick={() => onAuthenticate(matricula, senha)}>Entrar</button>
          <button onClick={onClose}>Cancelar</button>
        </div>
      </div>
    </div>
  );
};

export default ModalAutenticacao;
