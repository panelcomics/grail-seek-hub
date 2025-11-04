import { toast } from "sonner";
import { CheckCircle2, XCircle, AlertCircle, Info, Send, Package, DollarSign } from "lucide-react";

// Success toasts with icons
export const toastSuccess = {
  claimSubmitted: () => {
    toast.success("Claim submitted!", {
      description: "Your claim has been successfully submitted",
      icon: <CheckCircle2 className="h-5 w-5" />,
    });
  },
  
  invoiceSent: () => {
    toast.success("Invoice sent!", {
      description: "The invoice has been sent to the buyer",
      icon: <Send className="h-5 w-5" />,
    });
  },
  
  termsAccepted: () => {
    toast.success("Terms accepted", {
      description: "You can now continue with your action",
      icon: <CheckCircle2 className="h-5 w-5" />,
    });
  },
  
  messageSent: () => {
    toast.success("Message sent!", {
      icon: <CheckCircle2 className="h-5 w-5" />,
    });
  },
  
  paymentComplete: (amount: number) => {
    toast.success("Payment complete!", {
      description: `$${amount.toFixed(2)} processed successfully`,
      icon: <DollarSign className="h-5 w-5" />,
    });
  },
  
  claimSaleCreated: () => {
    toast.success("Claim sale created!", {
      description: "Your claim sale is now live",
      icon: <Package className="h-5 w-5" />,
    });
  },
  
  onboardingComplete: () => {
    toast.success("Welcome to Grail Seek! 🎉", {
      description: "Start scanning comics or browse claim sales to get started",
      icon: <CheckCircle2 className="h-5 w-5" />,
    });
  },
  
  conversationStarted: () => {
    toast.success("Conversation started!", {
      description: "You can now message the seller",
      icon: <CheckCircle2 className="h-5 w-5" />,
    });
  },
  
  linkCopied: () => {
    toast.success("Link copied!", {
      description: "Share link copied to clipboard",
      icon: <CheckCircle2 className="h-5 w-5" />,
    });
  },
};

// Error toasts with icons
export const toastError = {
  claimFailed: (reason: string = "sold out") => {
    toast.error("Claim failed!", {
      description: `Unable to claim — ${reason}`,
      icon: <XCircle className="h-5 w-5" />,
    });
  },
  
  authRequired: () => {
    toast.error("Sign in required", {
      description: "Please sign in to continue",
      icon: <AlertCircle className="h-5 w-5" />,
    });
  },
  
  insufficientFunds: () => {
    toast.error("Insufficient funds", {
      description: "Please add a payment method",
      icon: <XCircle className="h-5 w-5" />,
    });
  },
  
  uploadFailed: () => {
    toast.error("Upload failed", {
      description: "Could not upload image",
      icon: <XCircle className="h-5 w-5" />,
    });
  },
  
  networkError: () => {
    toast.error("Connection error", {
      description: "Please check your internet connection",
      icon: <XCircle className="h-5 w-5" />,
    });
  },
  
  generic: (message: string) => {
    toast.error("Error", {
      description: message,
      icon: <XCircle className="h-5 w-5" />,
    });
  },
};

// Info toasts with icons
export const toastInfo = {
  processing: (message: string) => {
    toast.info(message, {
      icon: <Info className="h-5 w-5" />,
    });
  },
  
  loading: (message: string) => {
    return toast.loading(message, {
      icon: <Info className="h-5 w-5" />,
    });
  },
};
