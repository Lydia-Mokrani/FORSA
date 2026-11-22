import React, { useState } from 'react';
import { ReservationDialog, type OfferDetail } from './ReservationDialog';
import type { Reservation } from './types';

interface CreateReservationFormProps {
  offer?: OfferDetail;
  onSuccess: (reservation?: Reservation) => void;
  onCancel: () => void;
}

const DEFAULT_OFFER: OfferDetail = {
  id: 'off-bakery-01',
  name: 'Panier Surprise Viennoiseries & Pains',
  categoryName: 'Boulangerie & Pâtisserie',
  photoUrl: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80',
  discountedPrice: 450,
  originalPrice: 1200,
  quantityAvailable: 4,
  description: 'Composé de baguettes artisanales, croissants au beurre et pains au chocolat dorés du jour, invendus mais préparés avec soin le matin même.',
  pickupStart: '18:00',
  pickupEnd: '19:30',
  shopId: 'shop-01',
  shopName: 'Le Moulin Doré',
  shopAddress: '14 Rue Didouche Mourad, Alger',
  shopDistance: '350m',
  shopRating: 4.8,
  shopReviewCount: 142,
};

export const CreateReservationForm: React.FC<CreateReservationFormProps> = ({
  offer = DEFAULT_OFFER,
  onSuccess,
  onCancel,
}) => {
  const [isOpen, setIsOpen] = useState(true);

  const handleClose = () => {
    setIsOpen(false);
    onCancel();
  };

  const handleSuccess = (reservation: Reservation) => {
    onSuccess(reservation);
  };

  return (
    <ReservationDialog
      isOpen={isOpen}
      offer={offer}
      onClose={handleClose}
      onSuccess={handleSuccess}
      onViewReceipt={handleSuccess}
      onNavigateToReservations={handleClose}
    />
  );
};

export default CreateReservationForm;
