import React from 'react';
import { ProfilePage } from './ProfilePage';

/**
 * Page /profile/edit (Figma 1114:26279)
 * Affiche directement le formulaire de modification du profil client.
 */
export const EditProfilePage: React.FC = () => {
  return <ProfilePage initialMode="edit" />;
};
