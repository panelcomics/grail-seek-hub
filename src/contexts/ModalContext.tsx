import React, { createContext, useContext, useState, ReactNode } from "react";
import Onboarding from "@/components/Onboarding";
import SafetyGuide from "@/components/SafetyGuide";
import AiScannerTour from "@/components/AiScannerTour";
import { TermsPopup } from "@/components/TermsPopup";

type ModalType = "onboarding" | "safetyGuide" | "terms" | "aiScannerTour" | null;

interface ModalContextType {
  currentModal: ModalType;
  modalProps: any;
  openModal: (modal: ModalType, props?: any) => void;
  closeModal: () => void;
}

const ModalContext = createContext<ModalContextType | undefined>(undefined);

export const useModal = () => {
  const context = useContext(ModalContext);
  if (!context) {
    throw new Error("useModal must be used within ModalProvider");
  }
  return context;
};

interface ModalProviderProps {
  children: ReactNode;
}

export const ModalProvider = ({ children }: ModalProviderProps) => {
  const [currentModal, setCurrentModal] = useState<ModalType>(null);
  const [modalProps, setModalProps] = useState<any>({});

  const openModal = (modal: ModalType, props: any = {}) => {
    setCurrentModal(modal);
    setModalProps(props);
  };

  const closeModal = () => {
    setCurrentModal(null);
    setModalProps({});
  };

  return (
    <ModalContext.Provider value={{ currentModal, modalProps, openModal, closeModal }}>
      {children}
      
      {/* Single modal overlay - only one modal can be open at a time */}
      {currentModal === "onboarding" && (
        <Onboarding
          open={true}
          onComplete={() => {
            modalProps.onComplete?.();
            closeModal();
          }}
        />
      )}

      {currentModal === "safetyGuide" && (
        <SafetyGuide
          open={true}
          onClose={() => {
            modalProps.onClose?.();
            closeModal();
          }}
          meetupLocation={modalProps.meetupLocation}
        />
      )}

      {currentModal === "terms" && (
        <TermsPopup
          open={true}
          onAccept={() => {
            modalProps.onAccept?.();
            closeModal();
          }}
          onDecline={() => {
            modalProps.onDecline?.();
            closeModal();
          }}
        />
      )}

      {currentModal === "aiScannerTour" && (
        <AiScannerTour
          open={true}
          onComplete={(dontShowAgain: boolean) => {
            modalProps.onComplete?.(dontShowAgain);
            closeModal();
          }}
        />
      )}
    </ModalContext.Provider>
  );
};
