export default function normalizePhoneNumber(phone) {
  phone = phone.replace(/\s+/g, '');
  if (phone.startsWith('00964')) phone = phone.replace(/^00964/, '+964');
  else if (phone.startsWith('+9640')) phone = phone.replace(/^\+9640/, '+964');
  else if (phone.startsWith('9640')) phone = phone.replace(/^9640/, '+964');
  else if (phone.startsWith('0')) phone = phone.replace(/^0/, '+964');
  else if (phone.startsWith('964')) phone = phone.replace(/^964/, '+964');
  else if (!phone.startsWith('+964')) phone = `+964${phone}`;
  return phone;
}
