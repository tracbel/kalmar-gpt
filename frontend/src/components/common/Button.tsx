import React, { useState, useEffect } from "react";
import {
  CommandBarButton,
  IButtonProps,
  ICommandBarStyles,
  IButtonStyles,
  Modal,
  IconButton,
  Stack,
  IModalStyles,
  Icon,
} from "@fluentui/react";
import { FaLightbulb, FaTimes, FaQrcode, FaMobileAlt } from "react-icons/fa";
import QRCode from "react-qr-code";

import { useLanguage } from "../../hooks/useLanguage";
import { translations } from "../../i18n/translations";


interface ShareButtonProps extends IButtonProps {
  onClick: () => void;
}

export const ShareButton: React.FC<ShareButtonProps> = () => {

  const language = useLanguage();
  const t = translations[language];

  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const [showModal, setShowModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);

  const handleResize = () => {
    setIsMobile(window.innerWidth < 768);
  };

  useEffect(() => {
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  const modalStyles: Partial<IModalStyles> = {
    main: {
      borderRadius: "8px",
    },
  };

  const shareButtonStyles: ICommandBarStyles & IButtonStyles = {
    root: {
      width: isMobile ? 25 : 150,
      height: 38,
      borderRadius: 4,
      background: "#f30000",
      padding: "5px 12px",
      marginRight: "20px",
    },
    icon: {
      color: "#FFFFFF",
    },
    rootHovered: {
      background: "#E29682 !important",
    },
    label: {
      fontWeight: 600,
      fontSize: 14,
      lineHeight: "20px",
      color: "#FFFFFF",
      display: isMobile ? "none" : "inline",
    },
  };

  const shareButtonStyles2: ICommandBarStyles & IButtonStyles = {
    root: {
      width: "40px",
      height: "40px",
      borderRadius: "8px",
      backgroundColor: "#f30000",
      padding: "4px",
      marginRight: "15px",
      boxShadow: "0 2px 6px rgba(0, 0, 0, 0.1)",
      transition: "all 0.3s ease",
      display: isMobile ? "none" : "inline-flex",
      justifyContent: "center",
      alignItems: "center",
    },
    rootHovered: {
      backgroundColor: "#d20000",
      boxShadow: "0 4px 8px rgba(0, 0, 0, 0.2)",
      transform: "translateY(-2px)",
    },
    icon: {
      color: "#FFFFFF",
      fontSize: "18px",
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
        onClick={openModal}
        text={isMobile ? "" :  t.tipsButton}
      >
        {isMobile && <FaLightbulb size={20} color="#FFFFFF" />}
      </CommandBarButton>
      {/* <CommandBarButton
        styles={shareButtonStyles2}
        onClick={() => setShowQRModal(true)}
        style={{
          display: isMobile ? "none" : "inline-flex",
          alignItems: "center",
        }}
      >
        <FaMobileAlt size={16} style={{ color: "#FFFFFF" }} />
      </CommandBarButton> */}

      <Modal
        isOpen={showModal}
        onDismiss={dismissModal}
        isBlocking={false}
        containerClassName="modal-container"
        styles={modalStyles}
      >
        <Stack tokens={{ childrenGap: 10, padding: 10 }}>
          <Stack horizontal horizontalAlign="end">
            <IconButton onClick={dismissModal} ariaLabel="Fechar modal">
              <FaTimes size={20} color="#000" />
            </IconButton>
          </Stack>
          <h2 style={{ margin: "0 0 0 15px " }}>{t.tipsTitle}</h2>

          {t.tips.map((item, index) => (
            <div key={index}>
              <p><strong>Q: {item.q}</strong></p>
              <p>A: {item.a}</p>
            </div>
          ))}

        </Stack>
      </Modal>
      <Modal
        isOpen={showQRModal}
        onDismiss={() => setShowQRModal(false)}
        isBlocking={false}
        styles={{
          main: {
            borderRadius: "12px",
            padding: "20px",
            width: "100%",
            maxWidth: "400px",
            boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
            overflow: "hidden", 
          },
        }}
      >
        <Stack
          tokens={{ childrenGap: 15 }}
          horizontalAlign="center"
          styles={{
            root: {
              width: "100%",
              overflow: "hidden", 
            },
          }}
        >
          <Stack horizontal horizontalAlign="end" style={{ width: "100%" }}>
            <IconButton
              onClick={() => setShowQRModal(false)}
              ariaLabel="Fechar modal"
              styles={{
                root: {
                  borderRadius: "50%",
                  padding: "5px",
                  marginRight: "-10px",
                  marginTop: "-10px",
                },
                icon: { fontSize: 16 },
                rootHovered: { backgroundColor: "#f3f3f3" },
              }}
            >
              <FaTimes size={16} color="#000" />
            </IconButton>
          </Stack>

          <h2
            style={{
              margin: "0 0 10px 0",
              fontSize: "18px",
              fontWeight: "600",
              textAlign: "center",
            }}
          >
            Escaneie o QR Code para acessar a versão mobile
          </h2>

          <QRCode
            value="https://kalmargpt.tracbel.com.br"
            size={200}
            style={{
              padding: "10px",
              backgroundColor: "#fff",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0, 0, 0, 0.1)",
              marginBottom: "20px",
              maxWidth: "100%", 
            }}
          />
        </Stack>
      </Modal>
    </div>
  );
};
