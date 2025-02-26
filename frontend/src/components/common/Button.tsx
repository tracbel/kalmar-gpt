import React, { useState, useEffect } from 'react';
import { CommandBarButton, IButtonProps, ICommandBarStyles, IButtonStyles, Modal, IconButton, Stack, IModalStyles, Icon } from '@fluentui/react';

interface ShareButtonProps extends IButtonProps {
  onClick: () => void;
}

export const ShareButton: React.FC<ShareButtonProps> = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showModal, setShowModal] = useState(false);

  const handleResize = () => {
    setIsMobile(window.innerWidth < 768);
  };

  useEffect(() => {
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const modalStyles: Partial<IModalStyles> = {
    main: {
      borderRadius: '8px',
    },
  };

  const shareButtonStyles: ICommandBarStyles & IButtonStyles = {
    root: {
      width: isMobile ? 25 : 150,
      height: 38,
      borderRadius: 4,
      background: '#f30000',
      padding: '5px 12px',
      marginRight: '20px'
    },
    icon: {
      color: '#FFFFFF',
    },
    rootHovered: {
      background: '#E29682 ',
    },
    label: {
      fontWeight: 600,
      fontSize: 14,
      lineHeight: '20px',
      color: '#FFFFFF',
      display: isMobile ? 'none' : 'inline',
    },
  };


  
  const openModal = () => {
    setShowModal(true);
  };

  const dismissModal = () => {
    setShowModal(false);
  };

  return (
    <div>


      <CommandBarButton
        styles={shareButtonStyles}
        iconProps={isMobile ? { iconName: 'ChevronDown' } : undefined}
        onClick={openModal}
        text={isMobile ? '' : 'Dicas KalmarGPT'}
      />
      <Modal
        isOpen={showModal}
        onDismiss={dismissModal}
        isBlocking={false}
        containerClassName="modal-container"
        styles={modalStyles}
      >
        <Stack tokens={{ childrenGap: 10, padding: 10 }}>
          <Stack horizontal horizontalAlign="end">
            <IconButton
              iconProps={{ iconName: 'Cancel' }}
              onClick={dismissModal}
              ariaLabel="Fechar modal"
            />
          </Stack>
          <h2 style={{ margin: '0 0 0 15px ' }}>FAQ - Como Usar Nosso Chatbot Corporativo</h2>
          <div style={{ margin: '15px' }}>
            <p><strong>Q: Como posso formular minhas perguntas para obter as melhores respostas?</strong></p>
            <p>A: Use termos específicos que estão diretamente relacionados ao conteúdo em nossa base de dados. </p>
            <p><strong>Q: O que devo fazer se o chatbot não entender minha pergunta?</strong></p>
            <p>A: Tente reformular sua pergunta de forma mais clara e direta. Por exemplo, em vez de "Onde fica a Unidade da Kalmar?", pergunte "Qual é o endereço da sede da Kalmar?".</p>
            <p><strong>Q: Posso usar jargões ou termos genéricos nas minhas perguntas?</strong></p>
            <p>A: É melhor evitar jargões ou termos genéricos. O chatbot pode não reconhecê-los. Use termos específicos que estão na base de dados.</p>
            <p><strong>Q: Como devo perguntar sobre a disponibilidade de um produto?</strong></p>
            <p>A: Forneça detalhes específicos. </p>
            <p><strong>Q: Posso fazer perguntas complexas para o chatbot?</strong></p>
            <p>A: Sim, mas é melhor estruturar sua pergunta em partes. Por exemplo, "Quero informações sobre: [Tipo de Equipamento], [Marca], [Localização]". Isso ajuda o chatbot a processar sua solicitação de forma mais eficiente.</p>
          </div>
        </Stack>
      </Modal>
    </div>
  );
};