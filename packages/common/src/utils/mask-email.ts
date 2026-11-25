/**
 * Masque une adresse e-mail pour la conformité de sécurité et les journaux.
 * Exemple : alice@gmail.com -> a***@g***.com
 * Exemple : bob.dupont@yahoo.fr -> b***@y***.fr
 */
export function maskEmail(email?: string | null): string {
  if (!email || typeof email !== 'string') return '';
  const trimmed = email.trim();
  const atIdx = trimmed.indexOf('@');
  if (atIdx === -1) return '***';

  const userPart = trimmed.slice(0, atIdx);
  const domainPart = trimmed.slice(atIdx + 1);

  const maskedUser = userPart.length > 0 ? `${userPart[0]}***` : '***';

  const dotIdx = domainPart.lastIndexOf('.');
  if (dotIdx === -1) {
    const maskedDomain = domainPart.length > 0 ? `${domainPart[0]}***` : '***';
    return `${maskedUser}@${maskedDomain}`;
  }

  const domainName = domainPart.slice(0, dotIdx);
  const tld = domainPart.slice(dotIdx);
  const maskedDomainName = domainName.length > 0 ? `${domainName[0]}***` : '***';

  return `${maskedUser}@${maskedDomainName}${tld}`;
}
