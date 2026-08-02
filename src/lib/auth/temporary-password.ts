/**
 * Contraseña temporal para usuarios internos (equipo, conductores).
 * 10 caracteres alfanuméricos sin símbolos ambiguos (I/O/l/0/1).
 * No confundir con `generateOrganizationAdminTemporaryPassword` (orgs/captadores:
 * longitud variable + símbolo obligatorio).
 */
const TEMPORARY_PASSWORD_ALPHABET =
  "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";

export function generateTemporaryPassword(random = Math.random) {
  let password = "";

  for (let index = 0; index < 10; index += 1) {
    password += TEMPORARY_PASSWORD_ALPHABET[
      Math.floor(random() * TEMPORARY_PASSWORD_ALPHABET.length)
    ];
  }

  return password;
}
