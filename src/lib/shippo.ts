// Shippo shipping constants and utilities

export const DEFAULT_PARCEL = {
  length: "12",
  width: "9",
  height: "3",
  distance_unit: "in",
  weight: "2",
  mass_unit: "lb",
};

export interface ShippoAddress {
  name: string;
  street1: string;
  street2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  phone?: string;
  email?: string;
}

export interface ShippoParcel {
  length: string;
  width: string;
  height: string;
  distance_unit: string;
  weight: string;
  mass_unit: string;
}

export const SHIPPING_MARKUP_CENTS = 75; // $0.75 markup on all labels
